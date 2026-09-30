import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BUDGETS, classifyRoute, measurePage, upfrontScripts } from './budgets';

describe('budgets', () => {
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
