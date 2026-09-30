import { describe, expect, it } from 'vitest';
import { checkBuiltLinks } from './link-check';

function site(basePath: string, pages: Record<string, string>, assets: string[] = []) {
  return {
    basePath,
    html: new Map(Object.entries(pages)),
    files: new Set([...Object.keys(pages), ...assets]),
  };
}

describe('checkBuiltLinks', () => {
  it('accepts links to pages, anchors, and assets', () => {
    const { problems } = checkBuiltLinks(
      site('/', {
        'index.html': '<a href="/protocol">p</a><a href="/protocol/#kinds">k</a><link rel="stylesheet" href="/assets/a.css"><a href="#top">t</a><p id="top"></p>',
        'protocol/index.html': '<h2 id="kinds">Kinds</h2><a href="../">home</a><a href="https://example.com/x">ext</a>',
      }, ['assets/a.css']),
    );
    expect(problems).toEqual([]);
  });

  it('reports missing pages, missing assets, and missing anchors', () => {
    const { problems } = checkBuiltLinks(
      site('/', {
        'index.html': '<a href="/nowhere">x</a><img src="/img/none.webp" alt=""><a href="/about#missing">y</a>',
        'about/index.html': '<h1 id="about">About</h1>',
      }),
    );
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/nowhere[\s\S]*none\.webp[\s\S]*no element with id "missing"/);
  });

  it('works under a GitHub Pages project base path and rejects links that escape it', () => {
    const { problems } = checkBuiltLinks(
      site('/Website/', {
        'index.html': '<a href="/Website/docs/">ok</a><a href="/docs/">escapes</a>',
        'docs/index.html': '<p>docs</p>',
      }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('outside the base path');
  });

  it('only warns about anchors into placeholder pages of unpublished sources', () => {
    const result = checkBuiltLinks(
      site('/', {
        'index.html': '<a href="/protocol/wot-model#6-the-trust-walk">walk</a>',
        'protocol/wot-model/index.html': '<div data-source-missing="">Not published yet</div>',
      }),
    );
    expect(result.problems).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('ignores canonical links, which point at the public URL', () => {
    const { problems } = checkBuiltLinks(site('/', { 'index.html': '<link rel="canonical" href="https://example.org/">' }));
    expect(problems).toEqual([]);
  });
});
