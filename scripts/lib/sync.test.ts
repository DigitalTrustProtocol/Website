import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateSourcesConfig } from '../../app/content/sources';
import { syncLocal, syncRemote } from './sync';

let workspace: string;
let pinned: string;

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

function config(pinnedRef: string) {
  return validateSourcesConfig({
    repos: {
      'Org/Versioned': { label: 'Versioned', localDir: '../Versioned', defaultBranch: 'main' },
      'Org/Plain': { label: 'Plain', localDir: '../Plain', defaultBranch: 'main' },
      'Org/Absent': { label: 'Absent', localDir: '../Absent', defaultBranch: 'main' },
    },
    sources: [
      { id: 'spec', repo: 'Org/Versioned', path: 'specs/spec.md', ref: pinnedRef, route: '/a', section: 'docs', title: 'A' },
      { id: 'plain', repo: 'Org/Plain', path: 'notes.md', ref: 'main', route: '/b', section: 'docs', title: 'B' },
      { id: 'absent', repo: 'Org/Absent', path: 'x.md', ref: 'main', route: '/c', section: 'docs', title: 'C' },
    ],
  });
}

beforeAll(() => {
  workspace = mkdtempSync(join(tmpdir(), 'dtp-sync-'));
  const versioned = join(workspace, 'Versioned');
  mkdirSync(join(versioned, 'specs'), { recursive: true });
  git(workspace, 'init', '-q', '-b', 'main', versioned);
  writeFileSync(join(versioned, 'specs', 'spec.md'), '# Pinned version\n');
  git(versioned, '-c', 'core.autocrlf=false', 'add', '.');
  git(versioned, '-c', 'core.autocrlf=false', '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'one');
  pinned = git(versioned, 'rev-parse', 'HEAD');
  // A later, uncommitted edit must not leak into a pinned sync.
  writeFileSync(join(versioned, 'specs', 'spec.md'), '# Working tree edit\n');

  mkdirSync(join(workspace, 'Plain'));
  writeFileSync(join(workspace, 'Plain', 'notes.md'), '# Plain notes\n');
  mkdirSync(join(workspace, 'Website'));
});

afterAll(() => rmSync(workspace, { recursive: true, force: true }));

describe('syncLocal', () => {
  it('reads a git sibling at the pinned ref, not its working tree', async () => {
    const result = await syncLocal(config(pinned), join(workspace, 'Website'));
    expect(result.contents.get('spec')).toBe('# Pinned version\n');
    expect(result.manifest.sources.spec).toMatchObject({ status: 'ok', origin: 'git', resolvedRef: pinned });
    expect(result.manifest.trees['Org/Versioned']).toEqual(['specs/spec.md']);
  });

  it('reads a folder without git from its working tree, with a warning', async () => {
    const result = await syncLocal(config(pinned), join(workspace, 'Website'));
    expect(result.contents.get('plain')).toBe('# Plain notes\n');
    expect(result.manifest.sources.plain).toMatchObject({ origin: 'working-tree', resolvedRef: 'working-tree' });
    expect(result.warnings.some((warning) => warning.includes('not a git repo'))).toBe(true);
  });

  it('skips a missing sibling folder with a warning', async () => {
    const result = await syncLocal(config(pinned), join(workspace, 'Website'));
    expect(result.manifest.sources.absent).toMatchObject({ status: 'missing', file: null });
    expect(result.manifest.trees['Org/Absent']).toBeNull();
  });

  it('fails when a pinned file does not exist', async () => {
    const broken = config(pinned);
    broken.sources[0] = { ...broken.sources[0]!, path: 'specs/gone.md' };
    await expect(syncLocal(broken, join(workspace, 'Website'))).rejects.toThrow('specs/gone.md');
  });
});

function fakeFetch(routes: Record<string, { status: number; body?: unknown }>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const route = routes[url];
    if (!route) return new Response('not found', { status: 404 });
    const body = typeof route.body === 'string' ? route.body : JSON.stringify(route.body ?? {});
    return new Response(body, { status: route.status });
  }) as typeof fetch;
}

describe('syncRemote', () => {
  const remoteConfig = validateSourcesConfig({
    repos: {
      'Org/Live': { label: 'Live', localDir: '../Live', defaultBranch: 'main' },
      'Org/Future': { label: 'Future', localDir: '../Future', defaultBranch: 'main' },
    },
    sources: [
      { id: 'live', repo: 'Org/Live', path: 'docs/a.md', ref: 'abc', route: '/a', section: 'docs', title: 'A' },
      { id: 'future', repo: 'Org/Future', path: 'specs/b.md', ref: 'main', route: '/b', section: 'docs', title: 'B' },
    ],
  });

  it('fetches raw files at the ref and skips repos that are not published yet', async () => {
    const result = await syncRemote(remoteConfig, {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/Org/Live': { status: 200 },
        'https://api.github.com/repos/Org/Live/git/trees/abc?recursive=1': {
          status: 200,
          body: { tree: [{ path: 'docs/a.md', type: 'blob' }, { path: 'docs', type: 'tree' }] },
        },
        'https://raw.githubusercontent.com/Org/Live/abc/docs/a.md': { status: 200, body: '# Live' },
      }),
    });
    expect(result.contents.get('live')).toBe('# Live');
    expect(result.manifest.trees['Org/Live']).toEqual(['docs/a.md']);
    expect(result.manifest.sources.future).toMatchObject({ status: 'missing' });
    expect(result.warnings.some((warning) => warning.includes('Org/Future is not published'))).toBe(true);
  });

  it('fails when a published repo lacks the pinned file', async () => {
    await expect(
      syncRemote(remoteConfig, {
        fetchImpl: fakeFetch({
          'https://api.github.com/repos/Org/Live': { status: 200 },
          'https://api.github.com/repos/Org/Future': { status: 404 },
        }),
      }),
    ).rejects.toThrow('HTTP 404');
  });

  it('keeps going without a file list when the tree API fails', async () => {
    const result = await syncRemote(remoteConfig, {
      fetchImpl: fakeFetch({
        'https://api.github.com/repos/Org/Live': { status: 200 },
        'https://raw.githubusercontent.com/Org/Live/abc/docs/a.md': { status: 200, body: '# Live' },
      }),
    });
    expect(result.manifest.trees['Org/Live']).toBeNull();
    expect(result.warnings.some((warning) => warning.includes('file list unavailable'))).toBe(true);
  });

  it('stops on unexpected API errors such as rate limits', async () => {
    await expect(
      syncRemote(remoteConfig, { fetchImpl: fakeFetch({ 'https://api.github.com/repos/Org/Live': { status: 403 } }) }),
    ).rejects.toThrow('403');
  });
});
