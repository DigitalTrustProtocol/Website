import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUDGETS, classifyRoute, islandFiles, measurePage, upfrontScripts } from './budgets';

describe('budgets', () => {
  it('counts an island with its static and dynamic imports, not the up-front entry', () => {
    const manifest = {
      'app/enhance/index.ts': { file: 'assets/enhance/enhance.js', isEntry: true, imports: ['_shared.js'], dynamicImports: ['island.tsx', 'mermaid'] },
      '_shared.js': { file: 'assets/enhance/shared.js' },
      'island.tsx': { file: 'assets/enhance/island.js', imports: ['_shared.js', '_react.js'], dynamicImports: ['engine.ts', 'GraphView.tsx'] },
      '_react.js': { file: 'assets/enhance/react.js' },
      'engine.ts': { file: 'assets/enhance/engine.js', imports: ['_react.js'] },
      'GraphView.tsx': { file: 'assets/enhance/graph.js', imports: ['_style.css'] },
      '_style.css': { file: 'assets/enhance/style.css' },
      mermaid: { file: 'assets/enhance/mermaid.js' },
    };
    expect(islandFiles(manifest, 'island.tsx').sort()).toEqual([
      'assets/enhance/engine.js',
      'assets/enhance/graph.js',
      'assets/enhance/island.js',
      'assets/enhance/react.js',
    ]);
  });

  it('classifies docs and spec pages separately from marketing pages', () => {
    expect(classifyRoute('/protocol/nip-32009')).toBe('docs');
    expect(classifyRoute('/docs')).toBe('docs');
    expect(classifyRoute('/attention/privacy')).toBe('docs');
    expect(classifyRoute('/')).toBe('marketing');
    expect(classifyRoute('/attention')).toBe('marketing');
    expect(classifyRoute('/protocolx')).toBe('marketing');
  });

  it('finds scripts loaded up front, including imports in inline module scripts', () => {
    const html = '<script type="module" src="/a.js"></script><link rel="modulepreload" href="/b.js"><script type="module">import "/c.js"; import * as r from "/d.js"; import("/e.js")</script>';
    expect(upfrontScripts(html).sort()).toEqual(['/a.js', '/b.js', '/c.js', '/d.js', '/e.js']);
  });

  it('measures gzip size against the page class budget', () => {
    const big = randomBytes(200_000);
    const result = measurePage('/docs', '<script src="/big.js"></script>', (url) => (url === '/big.js' ? big : null));
    expect(result.budget).toBe(BUDGETS.docs);
    expect(result.over).toBe(true);
    expect(measurePage('/', '<p>static</p>', () => null)).toMatchObject({ jsGzip: 0, over: false });
  });
});
