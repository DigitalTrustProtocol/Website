/**
 * Runs after `react-router build` and the enhance build, on build/client:
 *
 * 1. static pages: router hydration removed, the enhance bundle linked
 *    (decision W-D6), React Router's client JS and route data deleted;
 * 2. /404.html for GitHub Pages;
 * 3. a Content Security Policy per page, hashing that page's inline scripts;
 * 4. sitemap.xml and robots.txt;
 * 5. link check over every built page (fails the build);
 * 6. JavaScript budgets (tech.md § Budgets; fails the build when exceeded).
 */
import { existsSync, readFileSync } from 'node:fs';
import { cp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { BASE_PATH, SITE_URL } from '../site.config';
import { BUDGETS, gzipSize, islandFiles, measurePage, type BuildManifest } from './lib/budgets';
import { applyCsp, CSP_PLACEHOLDER, toStaticPage } from './lib/html';
import { checkBuiltLinks } from './lib/link-check';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'build', 'client');
const ENHANCE_MANIFEST = 'enhance-manifest.json';
const PLAYGROUND_ISLAND = 'app/components/playground/island.tsx';

async function listFiles(dir: string, out: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(path, out);
    else out.push(relative(outDir, path).replace(/\\/g, '/'));
  }
  return out;
}

function routeOf(file: string): string {
  const path = file.replace(/(?:^|\/)index\.html$/, '');
  return `/${path}`.replace(/\/$/, '') || '/';
}

function formatKb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function readEnhanceManifest(): Promise<{ entrySrc: string; manifest: BuildManifest }> {
  const manifestPath = join(outDir, ENHANCE_MANIFEST);
  if (!existsSync(manifestPath)) throw new Error(`${ENHANCE_MANIFEST} not found; run the enhance build first`);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as BuildManifest;
  await rm(manifestPath);
  const entry = Object.values(manifest).find((chunk) => chunk.isEntry);
  if (!entry) throw new Error('enhance build has no entry chunk');
  return { entrySrc: `${BASE_PATH}${entry.file}`, manifest };
}

/**
 * With a base path, React Router writes prerendered pages under
 * build/client/<base>/ while assets stay at the root. Move the pages up so
 * build/client maps one-to-one onto the URL prefix it is deployed under.
 */
async function hoistBasePathPages(): Promise<void> {
  if (BASE_PATH === '/') return;
  const nested = join(outDir, ...BASE_PATH.split('/').filter(Boolean));
  if (!existsSync(nested)) return;
  await cp(nested, outDir, { recursive: true, force: true });
  await rm(join(outDir, BASE_PATH.split('/').filter(Boolean)[0] ?? ''), { recursive: true, force: true });
}

async function main(): Promise<void> {
  if (!existsSync(outDir)) throw new Error('build/client not found; run react-router build first');
  await hoistBasePathPages();
  const { entrySrc: enhanceSrc, manifest: enhanceManifest } = await readEnhanceManifest();

  // 1–2. Static pages; the 404 route becomes /404.html.
  await rename(join(outDir, '404', 'index.html'), join(outDir, '404.html'));
  for (const file of await listFiles(outDir)) {
    const isRouterJs = file.startsWith('assets/') && !file.startsWith('assets/enhance/') && file.endsWith('.js');
    if (file.endsWith('.data') || file === '__spa-fallback.html' || isRouterJs || file.startsWith('404/')) {
      await rm(join(outDir, file));
    }
  }
  await rm(join(outDir, '404'), { recursive: true, force: true });

  // 3. Static pages with a CSP.
  const files = await listFiles(outDir);
  const htmlFiles = files.filter((file) => file.endsWith('.html'));
  const html = new Map<string, string>();
  for (const file of htmlFiles) {
    const path = join(outDir, file);
    const page = applyCsp(toStaticPage(await readFile(path, 'utf8'), enhanceSrc));
    if (page.includes(CSP_PLACEHOLDER)) throw new Error(`${file}: CSP placeholder left behind`);
    await writeFile(path, page);
    html.set(file, page);
  }

  // 4. Sitemap and robots.txt (placeholder pages are noindex and left out).
  const indexable = htmlFiles
    .filter((file) => file !== '404.html')
    .filter((file) => !/<meta name="robots" content="noindex"/.test(html.get(file) ?? ''))
    .map(routeOf)
    .sort();
  const urls = indexable.map((route) => `  <url><loc>${SITE_URL}${route === '/' ? '' : `${route.slice(1)}/`}</loc></url>`);
  await writeFile(
    join(outDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  );
  await writeFile(join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`);

  // 5. Links.
  const { problems, warnings } = checkBuiltLinks({
    files: new Set([...files, 'sitemap.xml', 'robots.txt']),
    html,
    basePath: BASE_PATH,
  });
  if (warnings.length > 0) console.warn(`warn: ${warnings.length} anchor(s) into placeholder pages left unchecked`);
  if (problems.length > 0) {
    console.error(`Link check failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  // 6. Budgets.
  const readAsset = (url: string): Buffer | null => {
    const path = join(outDir, url.startsWith(BASE_PATH) ? url.slice(BASE_PATH.length) : url.replace(/^\//, ''));
    return existsSync(path) ? readFileSync(path) : null;
  };
  const pages = htmlFiles
    .filter((file) => file !== '404.html')
    .map((file) => measurePage(routeOf(file), html.get(file) ?? '', readAsset));
  const lazyChunks = files
    .filter((file) => file.startsWith('assets/enhance/') && file.endsWith('.js') && `${BASE_PATH}${file}` !== enhanceSrc)
    .map((file) => ({ file, gzip: gzipSize(readFileSync(join(outDir, file))) }))
    .sort((a, b) => b.gzip - a.gzip);
  const playground = islandFiles(enhanceManifest, PLAYGROUND_ISLAND).map((file) => ({
    file,
    gzip: gzipSize(readFileSync(join(outDir, file))),
  }));
  if (playground.length === 0) throw new Error(`${PLAYGROUND_ISLAND} is not in ${ENHANCE_MANIFEST}`);
  const playgroundTotal = playground.reduce((sum, chunk) => sum + chunk.gzip, 0);

  console.log(`postbuild: ${htmlFiles.length} static pages (${indexable.length} in sitemap), links OK, CSP applied`);
  for (const pageClass of ['marketing', 'docs'] as const) {
    const worst = pages.filter((page) => page.pageClass === pageClass).sort((a, b) => b.jsGzip - a.jsGzip)[0];
    if (worst) {
      console.log(
        `  JS up front, ${pageClass}: max ${formatKb(worst.jsGzip)} gzip (${worst.route}) / budget ${formatKb(BUDGETS[pageClass])}`,
      );
    }
  }
  const lazyTotal = lazyChunks.reduce((sum, chunk) => sum + chunk.gzip, 0);
  console.log(`  lazy chunks: ${lazyChunks.length}, ${formatKb(lazyTotal)} gzip in total (Mermaid, playground island)`);
  console.log(
    `  playground (island, engine, corpus scenarios, drawing): ${formatKb(playgroundTotal)} gzip in ${playground.length} chunks / budget ${formatKb(BUDGETS.lazyChunk)}`,
  );
  for (const chunk of [...playground].sort((a, b) => b.gzip - a.gzip)) console.log(`    ${formatKb(chunk.gzip).padStart(9)}  ${chunk.file}`);

  await writeFile(
    join(root, 'build', 'budgets.json'),
    `${JSON.stringify({ pages, lazyChunks, playground: { total: playgroundTotal, chunks: playground }, budgets: BUDGETS }, null, 2)}\n`,
  );

  const over = pages.filter((page) => page.over);
  if (over.length > 0) {
    console.error(`JavaScript budget exceeded on: ${over.map((page) => page.route).join(', ')}`);
    process.exitCode = 1;
  }
  if (playgroundTotal > BUDGETS.lazyChunk) {
    console.error(`Playground budget exceeded: ${formatKb(playgroundTotal)} gzip > ${formatKb(BUDGETS.lazyChunk)}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
