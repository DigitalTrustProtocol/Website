import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import en from '../public/locales/en.json';
import { StatusBadge } from './components/content/StatusBadge';
import { SiteHeader } from './components/layout/SiteHeader';
import { ThemeToggle } from './components/layout/ThemeToggle';
import { Playground } from './components/playground/Playground';
import { DEMO_GRAPH } from './components/playground/demo-graph';
import type { PlaygroundEngine } from './components/playground/engine';
import { SourceFrame } from './components/source/SourceFrame';
import { RulesAtAGlance } from './components/source/RulesAtAGlance';
import type { RenderedPageData } from './content/rendered-types';
import './i18n';
import routes from './routes';

const root = resolve(import.meta.dirname, '..');

function html(node: React.ReactNode): string {
  return renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
}

function routePaths(): string[] {
  return routes.map((entry) => (entry.index ? '/' : `/${entry.path ?? ''}`));
}

describe('routes (specs/site.md sitemap)', () => {
  it('has a route for every page in this increment', () => {
    expect(routePaths()).toEqual(
      expect.arrayContaining([
        '/', '/trust', '/how-it-works', '/protocol', '/protocol/two-questions', '/protocol/nip-32009',
        '/protocol/nip-32014', '/protocol/nip-39', '/protocol/wot-model', '/protocol/identity-binding',
        '/protocol/conformance', '/attention', '/attention/privacy', '/attention/support', '/personal-server',
        '/global-server', '/docs', '/code', '/about',
      ]),
    );
  });

  it('gives every authored MDX page a route that exists', () => {
    const paths = new Set(routePaths());
    const dir = join(root, 'content', 'pages', 'en');
    const unrouted = readdirSync(dir)
      .map((name) => ({ name, route: /^route:\s*(\S+)/m.exec(readFileSync(join(dir, name), 'utf8'))?.[1] ?? '' }))
      .filter(({ route }) => !paths.has(route));
    expect(unrouted).toEqual([]);
  });
});

describe('copy rules (specs/site.md § Copy rules)', () => {
  it('never calls a result a score of a person on authored pages', () => {
    const dir = join(root, 'content', 'pages', 'en');
    const personScore = /\b(?:trust|reputation|social|person(?:'s)?|their|his|her)\s+score\b/i;
    const offenders = readdirSync(dir).filter((name) => personScore.test(readFileSync(join(dir, name), 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('i18n catalog', () => {
  it('has every key the components use', () => {
    const keys = new Set<string>();
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes('.test.')) {
          for (const match of readFileSync(path, 'utf8').matchAll(/\bt\(\s*'([a-zA-Z.]+)'/g)) keys.add(match[1]!);
        }
      }
    };
    walk(join(root, 'app'));
    const lookup = (key: string) => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
    const missing = [...keys].filter((key) => typeof lookup(key) !== 'string');
    expect(missing).toEqual([]);
  });
});

describe('layout', () => {
  it('renders the main navigation and a theme toggle with both labels', () => {
    const markup = html(<SiteHeader />);
    expect(markup).toContain('aria-label="Main"');
    expect(markup).toContain('href="/protocol"');
    expect(markup).toContain('data-label-to-light="Switch to light theme"');
  });

  it('keeps the toggle usable as a plain button before scripts run', () => {
    const markup = html(<ThemeToggle />);
    expect(markup).toMatch(/<button type="button"[^>]*aria-label="Switch to dark theme"/);
  });

  it('labels statuses in plain words', () => {
    expect(html(<StatusBadge status="in-design" />)).toContain('In design');
    expect(html(<StatusBadge status="draft" />)).toContain('Draft');
    expect(html(<StatusBadge status="experimental" />)).toContain('experimental');
  });
});

const page: RenderedPageData = {
  id: 'wot-model',
  route: '/protocol/wot-model',
  kind: 'spec',
  section: 'protocol',
  navTitle: 'Model',
  title: 'DTP WoT model',
  description: 'd',
  status: 'draft',
  html: '<h2 id="a">A</h2><h2 id="b">B</h2><h2 id="c">C</h2>',
  headings: [
    { depth: 2, id: 'a', text: 'A' },
    { depth: 2, id: 'b', text: 'B' },
    { depth: 2, id: 'c', text: 'C' },
  ],
  hasDiagrams: true,
  missing: false,
  source: {
    repo: 'DigitalTrustProtocol/TrustGraph',
    repoLabel: 'TrustGraph',
    path: 'specs/wot-model.md',
    ref: '8a4c43abfabefbcb2912e57c739cb80a05747f12',
    refShort: '8a4c43a',
    origin: 'git',
    resolvedRef: '8a4c43abfabefbcb2912e57c739cb80a05747f12',
    pinned: true,
    viewUrl: 'https://github.com/DigitalTrustProtocol/TrustGraph/blob/8a4c43a/specs/wot-model.md',
    editUrl: 'https://github.com/DigitalTrustProtocol/TrustGraph/edit/main/specs/wot-model.md',
  },
};

describe('SourceFrame', () => {
  it('shows the status badge, table of contents, body, and source footer', () => {
    const markup = html(<SourceFrame page={page} />);
    expect(markup).toContain('Draft');
    expect(markup).toContain('On this page');
    expect(markup).toContain('data-diagrams=""');
    expect(markup).toMatch(/TrustGraph<\/strong> · <code>specs\/wot-model\.md<\/code> @/);
    expect(markup).toContain('Edit on GitHub');
    expect(markup).not.toContain('unpinned');
  });

  it('shows a placeholder for sources that are not published yet', () => {
    const markup = html(<SourceFrame page={{ ...page, missing: true, html: '' }} />);
    expect(markup).toContain('Not published yet');
    expect(markup).toContain('DigitalTrustProtocol/TrustGraph · specs/wot-model.md');
  });

  it('warns when a local build rendered an unpinned working tree', () => {
    const markup = html(<SourceFrame page={{ ...page, source: { ...page.source, pinned: false } }} />);
    expect(markup).toContain('unpinned working tree');
  });

  it('puts the rules-at-a-glance box, with its model version, on the model page', () => {
    const markup = html(<RulesAtAGlance />);
    expect(markup).toContain('Rules at a glance');
    expect(markup).toContain('dtp-wot/1');
    expect(markup).toContain('href="#6-the-trust-walk"');
  });
});

describe('Playground', () => {
  it('explains that the engine is not connected and still lists the demo statements', () => {
    const markup = html(<Playground graph={DEMO_GRAPH} engine={null} />);
    expect(markup).toContain('not connected yet');
    expect(markup).toContain(`Demo statements (${DEMO_GRAPH.statements.length})`);
    expect(markup).toContain('Green knob: 75 %');
  });

  it('shows engine results as a text table', () => {
    const engine: PlaygroundEngine = {
      label: 'fake-engine 0.0.0',
      resolve: (_graph, query) => ({
        resolution: query.bindingMode === 'strict' ? 'none' : 'trusted',
        degree: 2,
        trust: 2,
        distrust: 0,
        neutral: 1,
        evidence: [{ eventId: 's8', author: 'alice', value: 1, distance: 1 }],
        path: [],
        bindings: [{ xId: '1001', state: 'bound', pubkey: 'news-desk' }],
        truncated: false,
      }),
    };
    const markup = html(<Playground graph={DEMO_GRAPH} engine={engine} />);
    expect(markup).toContain('Trusted');
    expect(markup).toContain('2 trust · 0 distrust · 1 Neutral');
    expect(markup).toContain('Alice: trust');
    expect(markup).toContain('@newsdesk (X): bound');
    expect(markup).toContain('fake-engine 0.0.0');
  });
});
