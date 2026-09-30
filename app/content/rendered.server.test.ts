import { describe, expect, it } from 'vitest';
import { prefixInternalLinks, routeFromPathname } from './rendered.server';

describe('rendered page loading', () => {
  it('maps request paths to routes under any base path', () => {
    expect(routeFromPathname('/protocol/nip-39/', '/')).toBe('/protocol/nip-39');
    expect(routeFromPathname('/Website/protocol/nip-39', '/Website/')).toBe('/protocol/nip-39');
    expect(routeFromPathname('/', '/')).toBe('/');
  });

  it('prefixes site-absolute links with the base path and leaves the rest alone', () => {
    const html = '<a href="/protocol/nip-32014#x">a</a> <a href="https://github.com/x">b</a> <a href="#y">c</a> <a href="//cdn.example/x">d</a>';
    expect(prefixInternalLinks(html, '/Website/')).toBe(
      '<a href="/Website/protocol/nip-32014#x">a</a> <a href="https://github.com/x">b</a> <a href="#y">c</a> <a href="//cdn.example/x">d</a>',
    );
    expect(prefixInternalLinks(html, '/')).toBe(html);
  });
});
