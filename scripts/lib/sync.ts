import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { SourceEntry, SourcesConfig } from '../../app/content/sources';

const execFileAsync = promisify(execFile);

export type SyncMode = 'local' | 'remote';

export interface SyncedSource {
  id: string;
  status: 'ok' | 'missing';
  /** Where the bytes came from. */
  origin: 'git' | 'working-tree' | 'remote' | 'none';
  /** Commit the content was read at, or `working-tree` for an unversioned checkout. */
  resolvedRef: string;
  /** File name inside `content/_imported/raw/`. */
  file: string | null;
  warning?: string;
}

export interface SyncManifest {
  mode: SyncMode;
  syncedAt: string;
  sources: Record<string, SyncedSource>;
  /** Repo file lists at the pinned ref; `null` when unavailable. */
  trees: Record<string, string[] | null>;
}

export interface SyncResult {
  manifest: SyncManifest;
  contents: Map<string, string>;
  warnings: string[];
}

const SKIP_DIRS = new Set(['.git', 'node_modules', 'build', 'dist', 'target', 'coverage', '.react-router']);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], { maxBuffer: 64 * 1024 * 1024 });
  return stdout;
}

async function isGitRoot(dir: string): Promise<boolean> {
  try {
    const top = (await git(dir, ['rev-parse', '--show-toplevel'])).trim();
    return resolve(top).toLowerCase() === resolve(dir).toLowerCase();
  } catch {
    return false;
  }
}

async function walkFiles(root: string, dir = root, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walkFiles(root, join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(relative(root, join(dir, entry.name)).replace(/\\/g, '/'));
    }
  }
  return out;
}

function rawFileName(source: SourceEntry): string {
  return `${source.id}${extname(source.path)}`;
}

function missing(source: SourceEntry, warning: string): SyncedSource {
  return { id: source.id, status: 'missing', origin: 'none', resolvedRef: source.ref, file: null, warning };
}

/**
 * Local mode: reads sibling checkouts. A sibling that is a git repo is read
 * at the pinned ref (`git show <ref>:<path>`), so local builds match CI. A
 * sibling without git is read from its working tree with a warning.
 */
export async function syncLocal(config: SourcesConfig, websiteRoot: string): Promise<SyncResult> {
  const manifest: SyncManifest = { mode: 'local', syncedAt: new Date().toISOString(), sources: {}, trees: {} };
  const contents = new Map<string, string>();
  const warnings: string[] = [];

  for (const [repoName, repo] of Object.entries(config.repos)) {
    const dir = resolve(websiteRoot, repo.localDir);
    const repoSources = config.sources.filter((source) => source.repo === repoName);
    const ref = repoSources[0]?.ref ?? repo.defaultBranch;

    if (!existsSync(dir)) {
      manifest.trees[repoName] = null;
      for (const source of repoSources) {
        const warning = `${repoName}: sibling folder ${repo.localDir} not found; "${source.id}" skipped`;
        manifest.sources[source.id] = missing(source, warning);
        warnings.push(warning);
      }
      continue;
    }

    let resolvedRef: string | null = null;
    if (await isGitRoot(dir)) {
      try {
        resolvedRef = (await git(dir, ['rev-parse', '--verify', `${ref}^{commit}`])).trim();
      } catch {
        warnings.push(`${repoName}: ref "${ref}" not found in ${repo.localDir}; reading the working tree`);
      }
    } else {
      warnings.push(`${repoName}: ${repo.localDir} is not a git repo; reading the working tree (unpinned)`);
    }

    if (resolvedRef) {
      const listing = await git(dir, ['ls-tree', '-r', '--name-only', resolvedRef]);
      manifest.trees[repoName] = listing.split('\n').filter(Boolean).sort();
    } else {
      manifest.trees[repoName] = (await walkFiles(dir)).sort();
    }

    for (const source of repoSources) {
      try {
        const text = resolvedRef
          ? await git(dir, ['show', `${resolvedRef}:${source.path}`])
          : await readFile(join(dir, source.path), 'utf8');
        contents.set(source.id, text);
        manifest.sources[source.id] = {
          id: source.id,
          status: 'ok',
          origin: resolvedRef ? 'git' : 'working-tree',
          resolvedRef: resolvedRef ?? 'working-tree',
          file: rawFileName(source),
        };
      } catch {
        throw new Error(`${source.id}: ${repoName}/${source.path} does not exist at ${resolvedRef ?? 'the working tree'}`);
      }
    }
  }
  return { manifest, contents, warnings };
}

export interface RemoteOptions {
  fetchImpl?: typeof fetch;
  token?: string;
}

/**
 * Remote mode (CI): GitHub raw files at the pinned ref. A repo that does not
 * exist on GitHub yet is skipped with a warning; a missing file in an
 * existing repo fails the sync.
 */
export async function syncRemote(config: SourcesConfig, options: RemoteOptions = {}): Promise<SyncResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiHeaders: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'dtp-website-content-sync',
  };
  if (options.token) apiHeaders.authorization = `Bearer ${options.token}`;

  const manifest: SyncManifest = { mode: 'remote', syncedAt: new Date().toISOString(), sources: {}, trees: {} };
  const contents = new Map<string, string>();
  const warnings: string[] = [];
  const repoExists = new Map<string, boolean>();

  async function checkRepo(repo: string): Promise<boolean> {
    const known = repoExists.get(repo);
    if (known !== undefined) return known;
    const response = await fetchImpl(`https://api.github.com/repos/${repo}`, { headers: apiHeaders });
    if (response.status !== 200 && response.status !== 404) {
      throw new Error(`GitHub API returned ${response.status} for ${repo}`);
    }
    const exists = response.status === 200;
    repoExists.set(repo, exists);
    return exists;
  }

  for (const [repoName, repo] of Object.entries(config.repos)) {
    const repoSources = config.sources.filter((source) => source.repo === repoName);
    const ref = repoSources[0]?.ref ?? repo.defaultBranch;

    if (!(await checkRepo(repoName))) {
      manifest.trees[repoName] = null;
      for (const source of repoSources) {
        const warning = `${repoName} is not published on GitHub yet; "${source.id}" skipped`;
        manifest.sources[source.id] = missing(source, warning);
        warnings.push(warning);
      }
      continue;
    }

    const treeResponse = await fetchImpl(
      `https://api.github.com/repos/${repoName}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
      { headers: apiHeaders },
    );
    if (treeResponse.ok) {
      const body = (await treeResponse.json()) as { tree?: { path: string; type: string }[]; truncated?: boolean };
      manifest.trees[repoName] = (body.tree ?? [])
        .filter((item) => item.type === 'blob')
        .map((item) => item.path)
        .sort();
      if (body.truncated) warnings.push(`${repoName}: file list is truncated; some links may be unverified`);
    } else {
      manifest.trees[repoName] = null;
      warnings.push(`${repoName}: file list unavailable (HTTP ${treeResponse.status}); links into it are unverified`);
    }

    for (const source of repoSources) {
      const url = `https://raw.githubusercontent.com/${repoName}/${source.ref}/${source.path}`;
      const response = await fetchImpl(url, { headers: { 'user-agent': apiHeaders['user-agent'] ?? '' } });
      if (!response.ok) {
        throw new Error(`${source.id}: ${url} returned HTTP ${response.status}`);
      }
      contents.set(source.id, await response.text());
      manifest.sources[source.id] = {
        id: source.id,
        status: 'ok',
        origin: 'remote',
        resolvedRef: source.ref,
        file: rawFileName(source),
      };
    }
  }
  return { manifest, contents, warnings };
}

/** Replaces `content/_imported/raw` and `sync.json` with the result of one sync. */
export async function writeSyncResult(importedDir: string, result: SyncResult): Promise<void> {
  const rawDir = join(importedDir, 'raw');
  await mkdir(rawDir, { recursive: true });
  for (const name of await readdir(rawDir)) await rm(join(rawDir, name), { force: true });
  for (const [id, text] of result.contents) {
    const file = result.manifest.sources[id]?.file;
    if (file) await writeFile(join(rawDir, file), text, 'utf8');
  }
  await writeFile(join(importedDir, 'sync.json'), `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8');
}

export async function readSyncManifest(importedDir: string): Promise<SyncManifest> {
  const file = join(importedDir, 'sync.json');
  try {
    await stat(file);
  } catch {
    throw new Error('No synced content found. Run `npm run content:sync` (local) or `npm run content:sync -- --remote` first.');
  }
  return JSON.parse(await readFile(file, 'utf8')) as SyncManifest;
}
