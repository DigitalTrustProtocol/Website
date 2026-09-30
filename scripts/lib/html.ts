import { createHash } from 'node:crypto';
import { CSP_PLACEHOLDER } from '../../app/lib/csp';

export { CSP_PLACEHOLDER };

const INLINE_SCRIPT = /<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;

/** Contents of every inline `<script>` (no `src`), in document order. */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(INLINE_SCRIPT)].map((match) => match[1] ?? '');
}

export function sha256Base64(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('base64');
}

/**
 * The site's Content Security Policy for one page: scripts only from this
 * origin plus the exact inline scripts on that page (by hash). Inline styles
 * stay allowed for highlighted code and diagrams. `frame-ancestors` cannot be
 * set from a meta tag; it needs a host that supports headers.
 */
export function buildCsp(scriptHashes: string[]): string {
  const hashes = [...new Set(scriptHashes)].map((hash) => `'sha256-${hash}'`);
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

/** Fills the CSP placeholder of one page. Throws when the page has none. */
export function applyCsp(html: string): string {
  if (!html.includes(CSP_PLACEHOLDER)) throw new Error('page has no CSP placeholder');
  const policy = buildCsp(inlineScripts(html).map(sha256Base64));
  return html.replace(CSP_PLACEHOLDER, policy);
}

/**
 * Makes a prerendered page static (decision W-D6): removes React Router's
 * hydration scripts, route data, and module preloads, keeps the theme
 * bootstrap, and loads the enhance bundle instead.
 */
export function toStaticPage(html: string, enhanceSrc: string): string {
  const stripped = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => (/\bid="theme-init"/.test(tag) ? tag : ''))
    .replace(/<link\b[^>]*rel="modulepreload"[^>]*\/?>/gi, '');
  if (!stripped.includes('</body>')) throw new Error('page has no </body>');
  return stripped.replace('</body>', `<script type="module" src="${enhanceSrc}"></script></body>`);
}
