import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveRequest } from './static-server';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'dtp-static-'));
  mkdirSync(join(root, 'trust'));
  writeFileSync(join(root, 'index.html'), 'home');
  writeFileSync(join(root, 'trust', 'index.html'), 'trust');
  writeFileSync(join(root, 'robots.txt'), 'robots');
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('resolveRequest (GitHub Pages semantics)', () => {
  it('serves directory indexes and files', () => {
    expect(resolveRequest(root, '/', '/')).toEqual({ kind: 'file', path: join(root, 'index.html') });
    expect(resolveRequest(root, '/', '/trust/')).toEqual({ kind: 'file', path: join(root, 'trust', 'index.html') });
    expect(resolveRequest(root, '/', '/robots.txt')).toEqual({ kind: 'file', path: join(root, 'robots.txt') });
  });

  it('redirects a directory without trailing slash', () => {
    expect(resolveRequest(root, '/', '/trust')).toEqual({ kind: 'redirect', location: '/trust/' });
  });

  it('honors the base path', () => {
    expect(resolveRequest(root, '/Website/', '/Website/trust/')).toMatchObject({ kind: 'file' });
    expect(resolveRequest(root, '/Website/', '/Website')).toEqual({ kind: 'redirect', location: '/Website/' });
    expect(resolveRequest(root, '/Website/', '/trust/')).toEqual({ kind: 'not-found' });
  });

  it('never serves files outside the root', () => {
    expect(resolveRequest(root, '/', '/../secret')).toEqual({ kind: 'not-found' });
    expect(resolveRequest(root, '/', '/%2e%2e/secret')).toEqual({ kind: 'not-found' });
    expect(resolveRequest(root, '/', '/missing')).toEqual({ kind: 'not-found' });
  });
});
