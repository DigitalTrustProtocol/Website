import type { Highlighter } from 'shiki';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RenderedPage } from '../../app/content/rendered-types';
import {
  checkAnchors,
  createSpecHighlighter,
  detectStatus,
  extractModelVersion,
  renderMissing,
  renderSource,
  type InternalLink,
} from './render';
import { fixtureConfig, fixtureTrees, source } from './test-fixtures';

const config = fixtureConfig();
let highlighter: Highlighter;

beforeAll(async () => {
  highlighter = await createSpecHighlighter();
});
afterAll(() => highlighter.dispose());

function render(id: string, text: string) {
  return renderSource(source(config, id), text, {
    config,
    trees: fixtureTrees(),
    highlighter,
    synced: { id, status: 'ok', origin: 'git', resolvedRef: source(config, id).ref, file: `${id}.md` },
  });
}

describe('GitHub-compatible heading slugs', () => {
  it('matches the anchors the specs already link to', async () => {
    const { page } = await render(
      'wot-model',
      [
        '# DTP WoT model — `dtp-wot/1`',
        '## 9. Product profile `attention` (scope profile `x.com`)',
        '### 7.1 Trust (`K = 32009`)',
        '### 2.4 Slot winner',
        '## Ingest (`EVENT`)',
        '## Scope policy: Attention on x.com',
      ].join('\n\n'),
    );
    expect(page.ids).toEqual(
      expect.arrayContaining([
        '9-product-profile-attention-scope-profile-xcom',
        '71-trust-k--32009',
        '24-slot-winner',
        'ingest-event',
        'scope-policy-attention-on-xcom',
      ]),
    );
  });

  it('numbers duplicate headings like GitHub', async () => {
    const { page } = await render('wot-model', '# T\n\n## Examples\n\n## Examples\n\n### Examples');
    expect(page.ids).toEqual(['examples', 'examples-1', 'examples-2']);
  });
});

describe('renderSource', () => {
  it('moves the first h1 into the title and reads status and description', async () => {
    const { page } = await render('wot-model', '# Model\n\nStatus: **draft** · 2026-09-30\n\nThe first real paragraph.\n\n## A\n\n## B\n\n## C');
    expect(page.title).toBe('Model');
    expect(page.html).not.toContain('<h1');
    expect(page.status).toBe('draft');
    expect(page.description).toBe('The first real paragraph.');
    expect(page.headings.map((heading) => heading.id)).toEqual(['a', 'b', 'c']);
  });

  it('rewrites links, marks externals noopener, and records internal links', async () => {
    const { page, links, problems } = await render(
      'nip-32009',
      '# N\n\nSee [ratings](NIP-32014.md#score), [arch](architecture.md), [NIPs](https://github.com/nostr-protocol/nips).',
    );
    expect(problems).toEqual([]);
    expect(page.html).toContain('href="/protocol/nip-32014#score"');
    expect(page.html).toContain('href="https://github.com/DigitalTrustProtocol/BrowserExtension/blob/');
    expect(page.html).toMatch(/href="https:\/\/github.com\/nostr-protocol\/nips" rel="noopener"/);
    expect(links).toEqual([{ from: 'nip-32009', href: 'NIP-32014.md#score', route: '/protocol/nip-32014', anchor: 'score' }]);
  });

  it('reports unknown relative links as problems (the build fails)', async () => {
    const { problems } = await render('nip-32009', '# N\n\n[gone](missing.md)');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('unknown relative path');
  });

  it('sanitizes raw HTML', async () => {
    const { page } = await render('nip-32009', '# N\n\n<script>alert(1)</script>\n\n<p onclick="x()">ok</p>');
    expect(page.html).not.toContain('<script');
    expect(page.html).not.toContain('onclick');
  });

  it('turns Mermaid blocks into diagram placeholders that the highlighter leaves alone', async () => {
    const { page } = await render('wot-model', '# M\n\n```mermaid\nflowchart LR\n  a --> b\n```\n\n```json\n{"a": 1}\n```');
    expect(page.hasDiagrams).toBe(true);
    expect(page.html).toContain('<figure class="diagram" data-diagram="mermaid"><pre class="diagram-source">flowchart LR');
    expect(page.html).toContain('class="shiki');
  });

  it('wraps tables in a focusable scroll region and adds heading anchors', async () => {
    const { page } = await render('wot-model', '# M\n\n## Kinds\n\n| a | b |\n| - | - |\n| 1 | 2 |');
    expect(page.html).toContain('<div class="table-wrap" tabindex="0"><table>');
    expect(page.html).toContain('<a class="heading-anchor" href="#kinds"');
  });

  it('renders an HTML policy from its body only', async () => {
    const html = '<!doctype html><html><head><title>P</title><style>p{}</style></head><body><h1>Privacy Policy</h1><p>Hello.</p><h2>What data</h2><a href="mailto:a@b.c">mail</a></body></html>';
    const output = await renderSource({ ...source(config, 'nip-32009'), path: 'docs/privacy.html', kind: 'policy' }, html, {
      config,
      trees: fixtureTrees(),
      highlighter,
      synced: undefined,
    });
    expect(output.page.title).toBe('Privacy Policy');
    expect(output.page.status).toBeNull();
    expect(output.page.html).not.toContain('<style');
    expect(output.page.html).toContain('<h2 id="what-data">');
  });
});

describe('status and model version', () => {
  it('detects both status styles', () => {
    expect(detectStatus('# X\n\nStatus: **draft** · 2026')).toBe('draft');
    expect(detectStatus('# NIP\n\n## Title\n\n`draft` `optional`\n')).toBe('draft');
    expect(detectStatus('# Plain doc\n\nText')).toBeNull();
  });

  it('reads the model version from the first heading', () => {
    expect(extractModelVersion('# DTP WoT model — `dtp-wot/1`\n\nBody mentions dtp-wot/2')).toBe('dtp-wot/1');
    expect(extractModelVersion('# No version\n\ndtp-wot/3')).toBeNull();
  });
});

describe('checkAnchors', () => {
  const page = (route: string, ids: string[], missing = false): RenderedPage => ({
    ...renderMissing(config, source(config, 'wot-model'), undefined),
    route,
    ids,
    missing,
  });
  const pages = new Map([
    ['/protocol/wot-model', page('/protocol/wot-model', ['62-guardrails'])],
    ['/protocol/conformance', page('/protocol/conformance', [], true)],
  ]);
  const link = (route: string, anchor: string | null): InternalLink => ({ from: 'x', href: 'h', route, anchor });

  it('accepts existing anchors and flags missing ones', () => {
    const result = checkAnchors(pages, [link('/protocol/wot-model', '62-guardrails'), link('/protocol/wot-model', 'nope')]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]).toContain('#nope');
  });

  it('only warns for anchors into placeholder pages', () => {
    const result = checkAnchors(pages, [link('/protocol/conformance', 'known-gaps')]);
    expect(result.problems).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
