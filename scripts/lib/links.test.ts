import { describe, expect, it } from 'vitest';
import { resolveLink, workspacePath } from './links';
import { EXT_REF, fixtureConfig, fixtureTrees, source, TG_REF } from './test-fixtures';

const config = fixtureConfig();
const context = { config, trees: fixtureTrees() };
const nip = source(config, 'nip-32009');
const model = source(config, 'wot-model');

describe('resolveLink — the content-pipeline rewrite table', () => {
  it('maps a sibling rendered source in the same folder to its route, keeping the anchor', () => {
    expect(resolveLink('NIP-32014.md#context-c', nip, context)).toEqual({
      type: 'route',
      href: '/protocol/nip-32014#context-c',
      route: '/protocol/nip-32014',
      anchor: 'context-c',
    });
  });

  it('maps a cross-repo sibling-folder link (../../AttentionX/…) to the Website route', () => {
    const result = resolveLink('../../AttentionX/docs/NIP-32009.md', model, context);
    expect(result).toMatchObject({ type: 'route', href: '/protocol/nip-32009', anchor: null });
  });

  it('keeps an anchor on a rendered source in the same repo', () => {
    expect(resolveLink('conformance.md#known-gaps', model, context)).toMatchObject({
      type: 'route',
      href: '/protocol/conformance#known-gaps',
    });
  });

  it('turns a file that is not rendered into a GitHub blob URL at the pinned ref', () => {
    expect(resolveLink('architecture.md#scope-policy-attention-on-xcom', nip, context)).toEqual({
      type: 'github',
      href: `https://github.com/DigitalTrustProtocol/BrowserExtension/blob/${EXT_REF}/docs/architecture.md#scope-policy-attention-on-xcom`,
    });
    expect(resolveLink('../src/graph/trust/IndexResolver.ts', nip, context)).toMatchObject({
      href: `https://github.com/DigitalTrustProtocol/BrowserExtension/blob/${EXT_REF}/src/graph/trust/IndexResolver.ts`,
    });
  });

  it('uses the target repo ref for a non-rendered file in another repo', () => {
    expect(resolveLink('../../TrustGraph/README.md', nip, context)).toMatchObject({
      href: `https://github.com/DigitalTrustProtocol/TrustGraph/blob/${TG_REF}/README.md`,
    });
  });

  it('links a directory with a GitHub tree URL', () => {
    expect(resolveLink('../src/graph/trust/', nip, context)).toMatchObject({
      href: `https://github.com/DigitalTrustProtocol/BrowserExtension/tree/${EXT_REF}/src/graph/trust`,
    });
  });

  it('treats a leading slash as the repo root, like GitHub', () => {
    expect(resolveLink('/docs/NIP-32014.md', model, context)).toMatchObject({ type: 'error' });
    expect(resolveLink('/specs/conformance.md', model, context)).toMatchObject({ href: '/protocol/conformance' });
  });

  it('decodes percent-encoded paths', () => {
    expect(resolveLink('NIP%2D32014.md', nip, context)).toMatchObject({ href: '/protocol/nip-32014' });
  });

  it('leaves external URLs and mail links unchanged', () => {
    expect(resolveLink('https://github.com/nostr-protocol/nips/blob/master/39.md', nip, context)).toEqual({
      type: 'external',
      href: 'https://github.com/nostr-protocol/nips/blob/master/39.md',
    });
    expect(resolveLink('mailto:attention@trust.dance', nip, context)).toMatchObject({ type: 'external' });
  });

  it('keeps same-page anchors', () => {
    expect(resolveLink('#guardrails', model, context)).toEqual({ type: 'anchor', href: '#guardrails', anchor: 'guardrails' });
  });

  it('fails on an unknown relative path', () => {
    const result = resolveLink('does-not-exist.md', nip, context);
    expect(result.type).toBe('error');
    expect(result.type === 'error' && result.message).toContain('unknown relative path');
  });

  it('fails on links into unknown folders and outside the workspace', () => {
    expect(resolveLink('../../Elsewhere/x.md', model, context)).toMatchObject({ type: 'error' });
    expect(resolveLink('../../../outside.md', model, context)).toMatchObject({ type: 'error' });
  });

  it('refuses images from other hosts (no third-party assets)', () => {
    expect(resolveLink('../store/icon-128.png', nip, context, 'img')).toMatchObject({ type: 'error' });
  });

  it('accepts but warns about links into a repo whose file list is unknown', () => {
    const unknownTree = { config, trees: { ...fixtureTrees(), 'DigitalTrustProtocol/TrustGraph': null } };
    const result = resolveLink('../../TrustGraph/specs/library.md', nip, unknownTree);
    expect(result).toMatchObject({ type: 'github', href: `https://github.com/DigitalTrustProtocol/TrustGraph/blob/${TG_REF}/specs/library.md` });
    expect(result.type === 'github' && result.warning).toBeTruthy();
  });

  it('computes workspace paths from the sibling folder name', () => {
    expect(workspacePath(config, model)).toBe('TrustGraph/specs/wot-model.md');
  });
});
