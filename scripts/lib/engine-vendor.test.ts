import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { hashVendorFiles, VENDOR_LOCK, vendorEngine, verifyVendor, type VendorLock } from './engine-vendor';
import { pinRefs } from './pin';

const workspace = mkdtempSync(join(tmpdir(), 'dtp-vendor-'));
afterAll(() => rmSync(workspace, { recursive: true, force: true }));

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
}

async function lockedDir(name: string): Promise<string> {
  const dir = join(workspace, name);
  mkdirSync(join(dir, 'packages', 'a', 'dist'), { recursive: true });
  writeFileSync(join(dir, 'packages', 'a', 'dist', 'index.js'), 'export const a = 1;\n');
  writeFileSync(join(dir, 'corpus.json'), '{}\n');
  const lock: VendorLock = { repo: 'Org/TrustGraph', ref: 'abc', packages: {}, compiler: 'test', files: await hashVendorFiles(dir) };
  writeFileSync(join(dir, VENDOR_LOCK), JSON.stringify(lock));
  return dir;
}

describe('verifyVendor', () => {
  it('accepts an untouched copy', async () => {
    expect(await verifyVendor(await lockedDir('intact'))).toEqual([]);
  });

  it('reports changed, missing, and extra files', async () => {
    const dir = await lockedDir('tampered');
    writeFileSync(join(dir, 'packages', 'a', 'dist', 'index.js'), 'export const a = 2;\n');
    unlinkSync(join(dir, 'corpus.json'));
    writeFileSync(join(dir, 'extra.js'), '');
    expect((await verifyVendor(dir)).sort()).toEqual([
      'changed: packages/a/dist/index.js',
      'missing: corpus.json',
      'not in lock: extra.js',
    ]);
  });

  it('fails without a lock', async () => {
    const dir = join(workspace, 'empty');
    mkdirSync(dir);
    expect(await verifyVendor(dir)).toEqual([`${VENDOR_LOCK} missing in ${dir}`]);
  });
});

describe('vendorEngine', () => {
  it('refuses a TrustGraph commit that has no packages', async () => {
    const repo = join(workspace, 'TrustGraph');
    mkdirSync(join(repo, 'specs'), { recursive: true });
    git(workspace, 'init', '-q', '-b', 'main', repo);
    writeFileSync(join(repo, 'specs', 'wot-model.md'), '# dtp-wot/1\n');
    git(repo, '-c', 'core.autocrlf=false', 'add', '.');
    git(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'Import design specs');
    await expect(
      vendorEngine({ repoDir: repo, repoName: 'Org/TrustGraph', ref: 'HEAD', websiteRoot: join(workspace, 'site') }),
    ).rejects.toThrow(/has no packages\/trust-graph/);
  });
});

describe('pinRefs', () => {
  const config = {
    repos: { 'Org/A': {}, 'Org/B': {} },
    sources: [
      { id: 'a1', repo: 'Org/A', ref: 'old', title: 'kept' },
      { id: 'a2', repo: 'Org/A', ref: 'old', title: 'kept' },
      { id: 'b1', repo: 'Org/B', ref: 'same', title: 'kept' },
    ],
  };

  it('pins every source of a repo to its head and reports only real changes', () => {
    const { config: pinned, changes } = pinRefs(config, { 'Org/A': 'new', 'Org/B': 'same' });
    expect(pinned.sources.map((source) => source.ref)).toEqual(['new', 'new', 'same']);
    expect(pinned.sources.every((source) => source.title === 'kept')).toBe(true);
    expect(changes).toEqual([{ repo: 'Org/A', from: 'old', to: 'new', sources: 2 }]);
  });

  it('leaves repos without a head alone', () => {
    const { config: pinned, changes } = pinRefs(config, {});
    expect(pinned.sources.map((source) => source.ref)).toEqual(['old', 'old', 'same']);
    expect(changes).toEqual([]);
  });
});
