import { posix } from 'node:path';
import {
  localDirBaseName,
  refForRepo,
  type SourceEntry,
  type SourcesConfig,
} from '../../app/content/sources';

/**
 * Files known to exist per repo at its pinned ref. `null` means the listing
 * is unavailable (for example a remote repo that is not published yet); links
 * into such a repo are accepted with a warning instead of verified.
 */
export type RepoTrees = Record<string, ReadonlySet<string> | null>;

export interface LinkContext {
  config: SourcesConfig;
  trees: RepoTrees;
}

export type LinkResolution =
  | { type: 'external'; href: string }
  | { type: 'anchor'; href: string; anchor: string }
  | { type: 'route'; href: string; route: string; anchor: string | null }
  | { type: 'github'; href: string; warning?: string }
  | { type: 'error'; message: string };

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function splitHref(href: string): { path: string; hash: string | null } {
  const hashIndex = href.indexOf('#');
  const beforeHash = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? null : href.slice(hashIndex + 1);
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  return { path, hash: hash === '' ? null : hash };
}

function safeDecode(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

/** Workspace-relative location of a source, for example `TrustGraph/specs/wot-model.md`. */
export function workspacePath(config: SourcesConfig, source: SourceEntry): string {
  const repo = config.repos[source.repo];
  if (!repo) throw new Error(`Unknown repo ${source.repo}`);
  return `${localDirBaseName(repo.localDir)}/${source.path}`;
}

function repoForWorkspaceFolder(config: SourcesConfig, folder: string): string | undefined {
  return Object.entries(config.repos).find(([, repo]) => localDirBaseName(repo.localDir) === folder)?.[0];
}

function pathExists(tree: ReadonlySet<string>, repoPath: string): 'file' | 'dir' | null {
  if (tree.has(repoPath)) return 'file';
  const prefix = repoPath.endsWith('/') ? repoPath : `${repoPath}/`;
  for (const file of tree) if (file.startsWith(prefix)) return 'dir';
  return null;
}

/**
 * Applies the content-pipeline rewrite table to one link found in `from`:
 *
 * - another rendered source → its Website route, keeping the anchor;
 * - a file that is not rendered → GitHub blob URL at the pinned ref;
 * - an external URL → unchanged;
 * - an unknown relative path → error (the build fails).
 */
export function resolveLink(
  href: string,
  from: SourceEntry,
  context: LinkContext,
  element: 'a' | 'img' = 'a',
): LinkResolution {
  const trimmed = href.trim();
  if (trimmed === '') return { type: 'error', message: 'empty link' };
  if (SCHEME.test(trimmed) || trimmed.startsWith('//')) return { type: 'external', href: trimmed };

  const { path: rawPath, hash } = splitHref(trimmed);
  if (rawPath === '') {
    return hash === null
      ? { type: 'error', message: `link "${href}" has no target` }
      : { type: 'anchor', href: `#${hash}`, anchor: hash };
  }

  const { config, trees } = context;
  const decoded = safeDecode(rawPath);
  const fromWorkspace = workspacePath(config, from);
  const fromFolder = fromWorkspace.split('/')[0] ?? '';
  // A leading slash is relative to the repo root on GitHub.
  const joined = decoded.startsWith('/')
    ? posix.join(fromFolder, decoded)
    : posix.join(posix.dirname(fromWorkspace), decoded);
  const normalized = posix.normalize(joined).replace(/\/$/, '');

  if (normalized.startsWith('..') || normalized === '.') {
    return { type: 'error', message: `link "${href}" leaves the workspace` };
  }

  const [folder = '', ...rest] = normalized.split('/');
  const repo = repoForWorkspaceFolder(config, folder);
  if (!repo) {
    return { type: 'error', message: `link "${href}" points into "${folder}", which is not a known repo` };
  }
  const repoPath = rest.join('/');

  const rendered = config.sources.find((source) => source.repo === repo && source.path === repoPath);
  if (rendered && element === 'a') {
    return {
      type: 'route',
      href: hash === null ? rendered.route : `${rendered.route}#${hash}`,
      route: rendered.route,
      anchor: hash,
    };
  }

  if (element === 'img') {
    return {
      type: 'error',
      message: `image "${href}" is not hosted by the Website; copy it into public/ (no third-party hosts)`,
    };
  }

  const ref = refForRepo(config, repo);
  const suffix = hash === null ? '' : `#${hash}`;
  const tree = trees[repo];
  if (tree === null || tree === undefined) {
    return {
      type: 'github',
      href: `https://github.com/${repo}/blob/${ref}/${repoPath}${suffix}`,
      warning: `cannot verify "${href}": no file list for ${repo}`,
    };
  }

  const kind = pathExists(tree, repoPath);
  if (kind === null) {
    return { type: 'error', message: `unknown relative path "${href}" (${repo}/${repoPath} does not exist at ${ref})` };
  }
  const view = kind === 'dir' ? 'tree' : 'blob';
  return { type: 'github', href: `https://github.com/${repo}/${view}/${ref}/${repoPath}${suffix}` };
}
