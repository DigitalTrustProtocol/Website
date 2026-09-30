import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';

const execFileAsync = promisify(execFile);

/**
 * Vendored TrustGraph engine (PLAN.md decision W-D9).
 *
 * `vendor/trust-graph/` holds, for one TrustGraph commit:
 * - `packages/<name>/dist/**` — `@dtp/trust-graph`, `@dtp/trust-protocol`,
 *   `@dtp/trust-query`, and `@dtp/conformance` compiled from `src/` at that
 *   commit with TrustGraph's own `tsconfig.base.json` (JS + declarations);
 * - `packages/<name>/package.json` and `corpus/**` byte-for-byte at that commit;
 * - `VENDOR.json` — the commit and a sha256 per file (checked in CI).
 */
export const TRUST_GRAPH_REPO = 'DigitalTrustProtocol/TrustGraph';
export const VENDOR_DIR = 'vendor/trust-graph';
export const VENDOR_LOCK = 'VENDOR.json';
export const VENDORED_PACKAGES = ['trust-graph', 'trust-protocol', 'trust-query', 'conformance'] as const;

/** Package entry points compiled from `src/` (everything they import comes along). */
const ENTRY_POINTS: Record<(typeof VENDORED_PACKAGES)[number], string[]> = {
  'trust-graph': ['main.ts', 'constants.ts', 'threshold.ts'],
  'trust-protocol': ['index.ts'],
  'trust-query': ['index.ts', 'testing.ts'],
  conformance: ['index.ts'],
};

export interface VendorLock {
  repo: string;
  ref: string;
  /** `name@version` of every vendored package, from its package.json at `ref`. */
  packages: Record<string, string>;
  compiler: string;
  /** Path under VENDOR_DIR → sha256 hex, for every file except VENDOR.json. */
  files: Record<string, string>;
}

async function git(cwd: string, args: string[], encoding: 'utf8' | 'buffer' = 'utf8'): Promise<string | Buffer> {
  const { stdout } = await execFileAsync('git', ['-C', cwd, ...args], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: encoding === 'buffer' ? 'buffer' : 'utf8',
  });
  return stdout;
}

export async function resolveCommit(repoDir: string, ref: string): Promise<string> {
  return String(await git(repoDir, ['rev-parse', '--verify', `${ref}^{commit}`])).trim();
}

function sha256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

async function listFiles(dir: string, root = dir, out: string[] = []): Promise<string[]> {
  if (!existsSync(dir)) return out;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(path, root, out);
    else out.push(relative(root, path).replace(/\\/g, '/'));
  }
  return out.sort();
}

/** Files under `vendorDir` (except the lock) with their sha256. */
export async function hashVendorFiles(vendorDir: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const file of await listFiles(vendorDir)) {
    if (file === VENDOR_LOCK) continue;
    files[file] = sha256(await readFile(join(vendorDir, file)));
  }
  return files;
}

export async function readVendorLock(vendorDir: string): Promise<VendorLock> {
  return JSON.parse(await readFile(join(vendorDir, VENDOR_LOCK), 'utf8')) as VendorLock;
}

/** Differences between the files on disk and the lock; empty when the vendored copy is intact. */
export async function verifyVendor(vendorDir: string): Promise<string[]> {
  if (!existsSync(join(vendorDir, VENDOR_LOCK))) return [`${VENDOR_LOCK} missing in ${vendorDir}`];
  const lock = await readVendorLock(vendorDir);
  const actual = await hashVendorFiles(vendorDir);
  const problems: string[] = [];
  for (const [file, hash] of Object.entries(lock.files)) {
    if (!(file in actual)) problems.push(`missing: ${file}`);
    else if (actual[file] !== hash) problems.push(`changed: ${file}`);
  }
  for (const file of Object.keys(actual)) if (!(file in lock.files)) problems.push(`not in lock: ${file}`);
  return problems;
}

function isVendoredSource(path: string): boolean {
  if (path === 'tsconfig.base.json' || path.startsWith('corpus/')) return true;
  return VENDORED_PACKAGES.some(
    (name) =>
      path === `packages/${name}/package.json` ||
      (path.startsWith(`packages/${name}/src/`) && path.endsWith('.ts') && !path.endsWith('.test.ts')),
  );
}

/** Writes the files the vendored copy is built from, read at `commit` with `git show`. */
async function stageSources(repoDir: string, commit: string, stageDir: string): Promise<string[]> {
  const listing = String(await git(repoDir, ['ls-tree', '-r', '--name-only', commit])).split('\n').filter(Boolean);
  const wanted = listing.filter(isVendoredSource);
  for (const name of VENDORED_PACKAGES) {
    if (!wanted.includes(`packages/${name}/package.json`)) {
      throw new Error(`TrustGraph ${commit.slice(0, 12)} has no packages/${name}; pick a commit that contains the packages`);
    }
  }
  if (!wanted.includes('corpus/manifest.json')) throw new Error(`TrustGraph ${commit.slice(0, 12)} has no corpus/manifest.json`);
  await rm(stageDir, { recursive: true, force: true });
  for (const path of wanted) {
    const target = join(stageDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, (await git(repoDir, ['show', `${commit}:${path}`], 'buffer')) as Buffer);
  }
  return wanted;
}

/** Compiles the staged `src/` trees; returns emitted files keyed by their vendored path. */
function compile(stageDir: string): Map<string, string> {
  const paths: Record<string, string[]> = {
    '@dtp/trust-graph': ['./packages/trust-graph/src/main.ts'],
    '@dtp/trust-graph/*': ['./packages/trust-graph/src/*'],
    '@dtp/trust-protocol': ['./packages/trust-protocol/src/index.ts'],
    '@dtp/trust-query': ['./packages/trust-query/src/index.ts'],
    '@dtp/trust-query/*': ['./packages/trust-query/src/*'],
  };
  const files = VENDORED_PACKAGES.flatMap((name) => ENTRY_POINTS[name].map((entry) => `./packages/${name}/src/${entry}`));
  const config = {
    extends: './tsconfig.base.json',
    compilerOptions: {
      rootDir: '.',
      outDir: './out',
      declarationMap: false,
      sourceMap: false,
      newLine: 'lf',
      noEmitOnError: true,
      types: ['node'],
      paths,
    },
    files,
  };
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, stageDir);
  if (parsed.errors.length > 0) throw new Error(ts.formatDiagnostics(parsed.errors, formatHost(stageDir)));
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const emitted = new Map<string, string>();
  const outRoot = resolve(stageDir, 'out');
  const result = program.emit(undefined, (fileName, text) => {
    const rel = relative(outRoot, fileName).replace(/\\/g, '/');
    const match = /^packages\/([^/]+)\/src\/(.+)$/.exec(rel);
    if (!match) throw new Error(`unexpected compiler output ${rel}`);
    emitted.set(`packages/${match[1]}/dist/${match[2]}`, text);
  });
  const diagnostics = [...ts.getPreEmitDiagnostics(program), ...result.diagnostics];
  if (diagnostics.length > 0 || result.emitSkipped) {
    throw new Error(`TrustGraph sources do not compile:\n${ts.formatDiagnostics(diagnostics, formatHost(stageDir))}`);
  }
  return emitted;
}

function formatHost(cwd: string): ts.FormatDiagnosticsHost {
  return { getCanonicalFileName: (name) => name, getCurrentDirectory: () => cwd, getNewLine: () => '\n' };
}

export interface VendorOptions {
  repoDir: string;
  repoName: string;
  ref: string;
  /**
   * Website root. The stage lives in `.cache/` under it so the compiler finds
   * the Website's nostr-tools and @types/node (a stage inside node_modules
   * would count as library code and not be emitted).
   */
  websiteRoot: string;
}

/** Rebuilds `vendor/trust-graph` from TrustGraph at `ref`. */
export async function vendorEngine(options: VendorOptions): Promise<VendorLock> {
  const commit = await resolveCommit(options.repoDir, options.ref);
  const stageDir = join(options.websiteRoot, '.cache', 'dtp-engine', commit.slice(0, 12));
  const staged = await stageSources(options.repoDir, commit, stageDir);
  const emitted = compile(stageDir);

  const vendorDir = join(options.websiteRoot, VENDOR_DIR);
  await rm(vendorDir, { recursive: true, force: true });
  const write = async (path: string, content: string | Buffer) => {
    const target = join(vendorDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  };
  for (const [path, text] of emitted) await write(path, text);
  const packages: Record<string, string> = {};
  for (const path of staged) {
    if (path.startsWith('corpus/') || path.endsWith('/package.json')) {
      const content = await readFile(join(stageDir, path));
      await write(path, content);
      if (path.endsWith('/package.json')) {
        const pkg = JSON.parse(content.toString('utf8')) as { name: string; version: string };
        packages[pkg.name] = pkg.version;
      }
    }
  }
  await rm(stageDir, { recursive: true, force: true });

  const lock: VendorLock = {
    repo: options.repoName,
    ref: commit,
    packages,
    compiler: `typescript ${ts.version}`,
    files: await hashVendorFiles(vendorDir),
  };
  await writeFile(join(vendorDir, VENDOR_LOCK), `${JSON.stringify(lock, null, 2)}\n`);
  return lock;
}
