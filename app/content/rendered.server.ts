import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RenderedIndex, RenderedPage, RenderedPageData } from './rendered-types';

const RENDERED_DIR = join(process.cwd(), 'content', '_imported', 'rendered');

let indexCache: Promise<RenderedIndex> | null = null;

function readIndex(): Promise<RenderedIndex> {
  indexCache ??= readFile(join(RENDERED_DIR, 'index.json'), 'utf8').then((text) => JSON.parse(text) as RenderedIndex);
  return indexCache;
}

/** Strips the base path and trailing slash: `/Website/protocol/nip-39/` → `/protocol/nip-39`. */
export function routeFromPathname(pathname: string, basePath: string): string {
  let route = pathname;
  if (basePath !== '/' && route.startsWith(basePath)) route = `/${route.slice(basePath.length)}`;
  if (route.length > 1) route = route.replace(/\/+$/, '');
  return route;
}

/** Rendered HTML carries site-absolute links; serve them under the base path. */
export function prefixInternalLinks(html: string, basePath: string): string {
  if (basePath === '/') return html;
  return html.replace(/(\s(?:href|src))="\/(?!\/)/g, `$1="${basePath}`);
}

/**
 * Loads a page produced by `npm run content:build`. Runs only at build time
 * (prerender); the result is embedded in the static HTML.
 */
export async function loadRenderedPage(pathname: string, basePath: string): Promise<RenderedPageData> {
  const route = routeFromPathname(pathname, basePath);
  const index = await readIndex();
  const id = index.pages[route];
  if (!id) throw new Response(`No rendered page for ${route}`, { status: 404 });
  const page = JSON.parse(await readFile(join(RENDERED_DIR, `${id}.json`), 'utf8')) as RenderedPage;
  const { ids: _ids, ...data } = page;
  return { ...data, html: prefixInternalLinks(data.html, basePath) };
}
