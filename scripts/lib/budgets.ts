import { gzipSync } from 'node:zlib';
import { inlineScripts } from './html';

/** tech.md § Budgets, JavaScript loaded up front (lazy chunks are budgeted separately). */
export const BUDGETS = {
  marketing: 100 * 1024,
  docs: 60 * 1024,
  lazyChunk: 250 * 1024,
} as const;

export type PageClass = 'marketing' | 'docs';

/** Docs and spec pages; everything else is a marketing page. */
export function classifyRoute(route: string): PageClass {
  return /^\/(?:protocol|docs)(?:\/|$)/.test(route) || route === '/attention/privacy' ? 'docs' : 'marketing';
}

export interface PageBudget {
  route: string;
  pageClass: PageClass;
  jsGzip: number;
  budget: number;
  over: boolean;
}

const SCRIPT_SRC = /<script\b[^>]*\bsrc="([^"]+)"/gi;
const MODULE_PRELOAD = /<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"|<link\b[^>]*href="([^"]+)"[^>]*rel="modulepreload"/gi;
/** `import "x.js"`, `import * as a from "x.js"`, and `import("x.js")` inside inline module scripts. */
const INLINE_IMPORT = /(?:\bimport|\bfrom)\s*\(?\s*["']([^"']+\.js)["']/g;

/** Script URLs a page loads up front: `<script src>`, module preloads, and imports in inline entry scripts. */
export function upfrontScripts(html: string): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(SCRIPT_SRC)) if (match[1]) urls.add(match[1]);
  for (const match of html.matchAll(MODULE_PRELOAD)) {
    const url = match[1] ?? match[2];
    if (url) urls.add(url);
  }
  for (const script of inlineScripts(html)) {
    for (const match of script.matchAll(INLINE_IMPORT)) if (match[1]) urls.add(match[1]);
  }
  return [...urls];
}

export function gzipSize(content: string | Buffer): number {
  return gzipSync(content, { level: 9 }).length;
}

export function measurePage(
  route: string,
  html: string,
  readAsset: (url: string) => Buffer | null,
): PageBudget {
  const pageClass = classifyRoute(route);
  let jsGzip = inlineScripts(html).reduce((sum, script) => sum + gzipSize(script), 0);
  for (const url of upfrontScripts(html)) {
    const asset = readAsset(url);
    if (asset) jsGzip += gzipSize(asset);
  }
  const budget = BUDGETS[pageClass];
  return { route, pageClass, jsGzip, budget, over: jsGzip > budget };
}
