import { fileURLToPath } from 'node:url';
import type { Alias } from 'vite';

const vendor = fileURLToPath(new URL('./vendor/trust-graph/', import.meta.url));

/**
 * Module aliases shared by the site, enhance, and test builds. `@dtp/*`
 * resolves to the vendored TrustGraph build (decision W-D9); tsconfig.json
 * maps the same names to its declarations.
 */
export const aliases: Alias[] = [
  { find: /^~\//, replacement: `${fileURLToPath(new URL('./app/', import.meta.url))}` },
  { find: /^@dtp\/trust-graph$/, replacement: `${vendor}packages/trust-graph/dist/main.js` },
  { find: /^@dtp\/trust-protocol$/, replacement: `${vendor}packages/trust-protocol/dist/index.js` },
  { find: /^@dtp\/trust-query$/, replacement: `${vendor}packages/trust-query/dist/index.js` },
  { find: /^@dtp\/conformance\/(.+)$/, replacement: `${vendor}packages/conformance/dist/$1.js` },
  { find: /^@dtp\/corpus\//, replacement: `${vendor}corpus/` },
];
