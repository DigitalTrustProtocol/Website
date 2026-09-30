import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { applyCsp, buildCsp, CSP_PLACEHOLDER, inlineScripts, toStaticPage } from './html';

const page = `<!DOCTYPE html><html><head>
<meta http-equiv="Content-Security-Policy" content="${CSP_PLACEHOLDER}"/>
<script id="theme-init">(function(){})();</script>
<link rel="modulepreload" href="/assets/entry.client-x.js"/>
<link rel="stylesheet" href="/assets/root-x.css"/>
</head><body><main>Hi</main>
<script>window.__reactRouterContext = {"a":1};</script>
<script type="module" async="">import "/assets/manifest-x.js";</script>
</body></html>`;

describe('toStaticPage', () => {
  const html = toStaticPage(page, '/assets/enhance/enhance-abc.js');

  it('removes router hydration and keeps the theme bootstrap and styles', () => {
    expect(html).not.toContain('__reactRouterContext');
    expect(html).not.toContain('modulepreload');
    expect(html).not.toContain('manifest-x.js');
    expect(html).toContain('id="theme-init"');
    expect(html).toContain('root-x.css');
  });

  it('loads the enhance bundle', () => {
    expect(html).toContain('<script type="module" src="/assets/enhance/enhance-abc.js"></script></body>');
  });
});

describe('CSP', () => {
  it('hashes exactly the inline scripts of the page', () => {
    const html = applyCsp(toStaticPage(page, '/e.js'));
    const expected = createHash('sha256').update('(function(){})();').digest('base64');
    expect(inlineScripts(toStaticPage(page, '/e.js'))).toEqual(['(function(){})();']);
    expect(html).toContain(`script-src 'self' 'sha256-${expected}'`);
    expect(html).not.toContain(CSP_PLACEHOLDER);
  });

  it('allows no third-party origins', () => {
    const policy = buildCsp([]);
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).not.toMatch(/https?:/);
  });

  it('refuses pages without the placeholder', () => {
    expect(() => applyCsp('<html></html>')).toThrow('no CSP placeholder');
  });
});
