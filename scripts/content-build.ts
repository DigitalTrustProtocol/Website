/**
 * `npm run content:build` (runs before every build)
 *
 * Renders the synced sources in content/_imported/raw into page JSON under
 * content/_imported/rendered, then enforces the pipeline's build errors:
 * unknown relative links, missing anchors, and a `modelVersion` mismatch.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { RenderedIndex, RenderedPage } from '../app/content/rendered-types';
import { SOURCES_CONFIG } from '../app/content/sources';
import { checkModelVersions, readAuthoredPages } from './lib/pages';
import {
  checkAnchors,
  createSpecHighlighter,
  extractModelVersion,
  renderMissing,
  renderSource,
  type InternalLink,
} from './lib/render';
import { readSyncManifest } from './lib/sync';

const root = resolve(import.meta.dirname, '..');
const importedDir = join(root, 'content', '_imported');
const MODEL_SOURCE_ID = 'wot-model';

async function main(): Promise<void> {
  const manifest = await readSyncManifest(importedDir);
  const trees = Object.fromEntries(
    Object.entries(manifest.trees).map(([repo, files]) => [repo, files ? new Set(files) : null]),
  );
  const highlighter = await createSpecHighlighter();

  const pages = new Map<string, RenderedPage>();
  const links: InternalLink[] = [];
  const problems: string[] = [];
  const warnings: string[] = [];
  let modelVersion: string | null = null;

  for (const source of SOURCES_CONFIG.sources) {
    const synced = manifest.sources[source.id];
    if (!synced || synced.status !== 'ok' || !synced.file) {
      warnings.push(`${source.id}: not synced; rendering a placeholder page`);
      pages.set(source.route, renderMissing(SOURCES_CONFIG, source, synced));
      continue;
    }
    const text = await readFile(join(importedDir, 'raw', synced.file), 'utf8');
    if (source.id === MODEL_SOURCE_ID) {
      modelVersion = extractModelVersion(text);
      if (modelVersion === null) problems.push(`${source.id}: no dtp-wot/<n> version in the first heading`);
    }
    const output = await renderSource(source, text, { config: SOURCES_CONFIG, trees, highlighter, synced });
    pages.set(source.route, output.page);
    links.push(...output.links);
    problems.push(...output.problems);
    warnings.push(...output.warnings);
    if (!output.page.source.pinned) warnings.push(`${source.id}: rendered from an unpinned working tree`);
  }
  highlighter.dispose();

  const anchors = checkAnchors(pages, links);
  problems.push(...anchors.problems);
  warnings.push(...anchors.warnings);

  const authored = await readAuthoredPages(root);
  problems.push(...checkModelVersions(authored, modelVersion));
  if (modelVersion === null && authored.some((page) => page.frontmatter.modelVersion)) {
    warnings.push('wot-model.md was not synced; modelVersion summaries are unchecked');
  }

  for (const warning of warnings) console.warn(`warn: ${warning}`);
  if (problems.length > 0) {
    console.error(`content:build failed with ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  const renderedDir = join(importedDir, 'rendered');
  await mkdir(renderedDir, { recursive: true });
  for (const name of await readdir(renderedDir)) await rm(join(renderedDir, name), { force: true });
  const index: RenderedIndex = {
    generatedAt: new Date().toISOString(),
    syncMode: manifest.mode,
    modelVersion,
    pages: {},
  };
  for (const page of pages.values()) {
    await writeFile(join(renderedDir, `${page.id}.json`), JSON.stringify(page), 'utf8');
    index.pages[page.route] = page.id;
  }
  await writeFile(join(renderedDir, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

  const missing = [...pages.values()].filter((page) => page.missing).length;
  console.log(
    `content:build: ${pages.size} pages (${missing} placeholders), ${links.length} internal links checked, model ${modelVersion ?? 'unknown'}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : error);
  process.exitCode = 1;
});
