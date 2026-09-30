import type { Element, Root } from 'hast';
import rehypeParse from 'rehype-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

export interface BuiltSite {
  /** Every output file, relative to the output root with forward slashes (`protocol/index.html`). */
  files: ReadonlySet<string>;
  /** HTML files and their contents. */
  html: ReadonlyMap<string, string>;
  /** `/` or `/Website/`. */
  basePath: string;
}

interface ParsedPage {
  ids: Set<string>;
  links: { attribute: string; value: string }[];
  /** A rendered-source placeholder (source repo not published yet): its anchors cannot exist. */
  placeholder: boolean;
}

export interface LinkCheckResult {
  problems: string[];
  warnings: string[];
}

const LINK_ATTRIBUTES: Record<string, string> = { a: 'href', link: 'href', script: 'src', img: 'src', source: 'src' };

function parsePage(html: string): ParsedPage {
  const tree = unified().use(rehypeParse).parse(html) as Root;
  const ids = new Set<string>();
  const links: ParsedPage['links'] = [];
  let placeholder = false;
  visit(tree, 'element', (node: Element) => {
    if (node.properties.dataSourceMissing !== undefined) placeholder = true;
    const id = node.properties.id;
    if (typeof id === 'string') ids.add(id);
    const name = node.properties.name;
    if (node.tagName === 'a' && typeof name === 'string') ids.add(name);
    const attribute = LINK_ATTRIBUTES[node.tagName];
    if (!attribute) return;
    if (node.tagName === 'link') {
      const rel = node.properties.rel;
      const rels = Array.isArray(rel) ? rel.map(String) : [];
      if (rels.includes('canonical') || rels.includes('alternate')) return;
    }
    const value = node.properties[attribute];
    if (typeof value === 'string') links.push({ attribute, value });
  });
  return { ids, links, placeholder };
}

/** Output file for a site path, or null. `/protocol` → `protocol/index.html`. */
function resolveFile(path: string, files: ReadonlySet<string>): string | null {
  const clean = decodeURIComponent(path).replace(/^\//, '');
  if (clean === '' || clean.endsWith('/')) {
    const index = `${clean}index.html`;
    return files.has(index) ? index : null;
  }
  if (files.has(clean)) return clean;
  const index = `${clean}/index.html`;
  return files.has(index) ? index : null;
}

function pageUrl(file: string, basePath: string): URL {
  const path = file.endsWith('index.html') ? file.slice(0, -'index.html'.length) : file;
  return new URL(`${basePath}${path}`, 'https://site.invalid');
}

/**
 * Checks every internal link, stylesheet, script, and image in the built HTML:
 * the target file must exist under the base path, and a `#fragment` must be
 * an id on the target page. External URLs are skipped (checked weekly).
 * Anchors into a placeholder page only warn (content-pipeline.md, W-D8).
 */
export function checkBuiltLinks(site: BuiltSite): LinkCheckResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  const parsed = new Map<string, ParsedPage>();
  const pageFor = (file: string): ParsedPage => {
    let page = parsed.get(file);
    if (!page) {
      page = parsePage(site.html.get(file) ?? '');
      parsed.set(file, page);
    }
    return page;
  };

  for (const file of site.html.keys()) {
    const base = pageUrl(file, site.basePath);
    for (const { value } of pageFor(file).links) {
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue;
      const url = new URL(value, base);
      const where = `${file}: "${value}"`;
      if (url.origin !== base.origin || !url.pathname.startsWith(site.basePath)) {
        problems.push(`${where} is outside the base path ${site.basePath}`);
        continue;
      }
      const target = resolveFile(url.pathname.slice(site.basePath.length - 1), site.files);
      if (!target) {
        problems.push(`${where} does not resolve to a built file`);
        continue;
      }
      const fragment = decodeURIComponent(url.hash.slice(1));
      if (!fragment || !target.endsWith('.html')) continue;
      const targetPage = pageFor(target);
      if (targetPage.ids.has(fragment)) continue;
      if (targetPage.placeholder) warnings.push(`${where}: #${fragment} unchecked (${target} is a placeholder)`);
      else problems.push(`${where}: ${target} has no element with id "${fragment}"`);
    }
  }
  return { problems, warnings };
}
