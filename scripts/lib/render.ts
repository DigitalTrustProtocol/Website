import rehypeShikiFromHighlighter from '@shikijs/rehype/core';
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { toString as hastToString } from 'hast-util-to-string';
import rehypeParse from 'rehype-parse';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { createHighlighter, type Highlighter } from 'shiki';
import { unified, type Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import {
  shortRef,
  type SourceEntry,
  type SourceKind,
  type SourcesConfig,
} from '../../app/content/sources';
import type { RenderedHeading, RenderedPage, RenderedSource } from '../../app/content/rendered-types';
import { resolveLink, type LinkContext } from './links';
import { SHIKI_LANGS, SHIKI_OPTIONS, SHIKI_THEMES } from './shiki';
import type { SyncedSource } from './sync';

/** An internal link that still needs its anchor checked once every page is rendered. */
export interface InternalLink {
  from: string;
  href: string;
  route: string;
  anchor: string | null;
}

export interface RenderOutput {
  page: RenderedPage;
  links: InternalLink[];
  problems: string[];
  warnings: string[];
}

export function createSpecHighlighter(): Promise<Highlighter> {
  return createHighlighter({ themes: Object.values(SHIKI_THEMES), langs: SHIKI_LANGS });
}

// ── Status and title ────────────────────────────────────────────────────────

/**
 * Reads a status declared near the top of a spec: `Status: **draft**` (the
 * TrustGraph and server specs) or a line of code tokens such as
 * `` `draft` `optional` `` (the NIP documents).
 */
export function detectStatus(text: string): string | null {
  const head = text.split('\n').slice(0, 20).join('\n');
  const bold = /^Status:\s*\*\*([^*]+)\*\*/im.exec(head);
  if (bold?.[1]) return bold[1].trim().toLowerCase();
  const tokens = /^`([a-z-]+)`(?:\s+`[a-z-]+`)*\s*$/m.exec(head);
  return tokens?.[1] ?? null;
}

/** The model version declared in the first heading of `wot-model.md`, for example `dtp-wot/1`. */
export function extractModelVersion(markdown: string): string | null {
  const heading = /^#\s+(.+)$/m.exec(markdown)?.[1] ?? '';
  return /dtp-wot\/\d+/.exec(heading)?.[0] ?? null;
}

// ── hast plugins ────────────────────────────────────────────────────────────

function isElement(node: RootContent | ElementContent | Root, tag?: string): node is Element {
  return node.type === 'element' && (tag === undefined || node.tagName === tag);
}

function classList(node: Element): string[] {
  const value: unknown = node.properties.className;
  return Array.isArray(value) ? value.map(String) : typeof value === 'string' ? value.split(/\s+/) : [];
}

/** Keeps only `<body>` children of a full HTML document (the privacy policy). */
const rehypeBodyOnly: Plugin<[], Root> = () => (tree) => {
  let body: Element | undefined;
  visit(tree, 'element', (node) => {
    if (node.tagName === 'body') {
      body = node;
      return false;
    }
    return undefined;
  });
  if (body) tree.children = body.children as RootContent[];
};

/** Moves the first `<h1>` out of the body; the page frame renders it. */
function rehypeExtractTitle(out: { title: string | null }): () => (tree: Root) => void {
  return () => (tree) => {
    const index = tree.children.findIndex((node) => isElement(node, 'h1'));
    if (index === -1) return;
    const node = tree.children[index];
    if (node && isElement(node)) out.title = hastToString(node).trim();
    tree.children.splice(index, 1);
  };
}

function rehypeDescription(out: { description: string }): () => (tree: Root) => void {
  return () => (tree) => {
    for (const node of tree.children) {
      if (!isElement(node, 'p')) continue;
      const text = hastToString(node).replace(/\s+/g, ' ').trim();
      if (text === '' || /^status:/i.test(text)) continue;
      if (node.children.every((child) => (isElement(child, 'code') || (child.type === 'text' && child.value.trim() === '')))) continue;
      out.description = text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
      return;
    }
  };
}

/** Mermaid blocks become placeholders; the client renders them lazily (see PLAN.md, decision W-D4). */
function rehypeDiagrams(out: { hasDiagrams: boolean }): () => (tree: Root) => void {
  return () => (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index === undefined) return undefined;
      const code = node.children.find((child): child is Element => isElement(child, 'code'));
      if (!code || !classList(code).includes('language-mermaid')) return undefined;
      out.hasDiagrams = true;
      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { className: ['diagram'], dataDiagram: 'mermaid' },
        children: [
          {
            type: 'element',
            tagName: 'pre',
            // Plain text without a <code> child, so the highlighter leaves it alone.
            properties: { className: ['diagram-source'] },
            children: [{ type: 'text', value: hastToString(code).trimEnd() }],
          },
        ],
      };
      parent.children[index] = figure;
      return 'skip';
    });
  };
}

/** Wide tables scroll inside a focusable region instead of the whole page. */
const rehypeWrapTables: Plugin<[], Root> = () => (tree) => {
  visit(tree, 'element', (node, index, parent) => {
    if (node.tagName !== 'table' || !parent || index === undefined) return undefined;
    parent.children[index] = {
      type: 'element',
      tagName: 'div',
      properties: { className: ['table-wrap'], tabIndex: 0 },
      children: [node],
    };
    return 'skip';
  });
};

/** Collects h2/h3 for the table of contents and adds a visible self-link to every heading. */
function rehypeHeadings(out: { headings: RenderedHeading[]; ids: Set<string> }): () => (tree: Root) => void {
  return () => (tree) => {
    visit(tree, 'element', (node) => {
      const id = node.properties.id;
      if (typeof id === 'string') out.ids.add(id);
      const depth = /^h([2-6])$/.exec(node.tagName)?.[1];
      if (!depth || typeof id !== 'string') return undefined;
      const text = hastToString(node).trim();
      if (depth === '2' || depth === '3') out.headings.push({ depth: Number(depth), id, text });
      node.children.push({
        type: 'element',
        tagName: 'a',
        properties: { className: ['heading-anchor'], href: `#${id}`, ariaLabel: `Link to “${text}”` },
        children: [{ type: 'text', value: '#' }],
      });
      return 'skip';
    });
  };
}

function rehypeRewriteLinks(
  source: SourceEntry,
  context: LinkContext,
  out: { links: InternalLink[]; problems: string[]; warnings: string[] },
): () => (tree: Root) => void {
  return () => (tree) => {
    visit(tree, 'element', (node) => {
      const attribute = node.tagName === 'a' ? 'href' : node.tagName === 'img' ? 'src' : null;
      if (!attribute) return undefined;
      const value = node.properties[attribute];
      if (typeof value !== 'string') return undefined;
      if (classList(node).includes('heading-anchor')) return undefined;

      const result = resolveLink(value, source, context, node.tagName === 'img' ? 'img' : 'a');
      switch (result.type) {
        case 'external':
          node.properties.rel = ['noopener'];
          break;
        case 'anchor':
          out.links.push({ from: source.id, href: value, route: source.route, anchor: result.anchor });
          break;
        case 'route':
          node.properties[attribute] = result.href;
          out.links.push({ from: source.id, href: value, route: result.route, anchor: result.anchor });
          break;
        case 'github':
          node.properties[attribute] = result.href;
          node.properties.rel = ['noopener'];
          if (result.warning) out.warnings.push(`${source.id}: ${result.warning}`);
          break;
        case 'error':
          out.problems.push(`${source.id} (${source.path}): ${result.message}`);
          break;
        default: {
          const unhandled: never = result;
          throw new Error(`Unhandled link resolution ${JSON.stringify(unhandled)}`);
        }
      }
      return undefined;
    });
  };
}

// ── Pipeline ────────────────────────────────────────────────────────────────

const sanitizeSchema = {
  ...defaultSchema,
  // Keep GitHub's allowlist but do not prefix ids: slugs are added after sanitizing.
  clobber: [],
};

export function sourceMeta(
  config: SourcesConfig,
  source: SourceEntry,
  synced: SyncedSource | undefined,
): RenderedSource {
  const repo = config.repos[source.repo];
  const branch = repo?.defaultBranch ?? 'main';
  const resolvedRef = synced?.resolvedRef ?? source.ref;
  return {
    repo: source.repo,
    repoLabel: repo?.label ?? source.repo,
    path: source.path,
    ref: source.ref,
    refShort: shortRef(source.ref),
    origin: synced?.origin ?? 'none',
    resolvedRef,
    pinned: resolvedRef === source.ref || synced?.origin === 'remote',
    viewUrl: `https://github.com/${source.repo}/blob/${source.ref}/${source.path}`,
    editUrl: `https://github.com/${source.repo}/edit/${branch}/${source.path}`,
  };
}

export async function renderSource(
  source: SourceEntry,
  text: string,
  context: LinkContext & { highlighter: Highlighter; synced: SyncedSource | undefined },
): Promise<RenderOutput> {
  const kind: SourceKind = source.kind ?? 'spec';
  const titleOut = { title: null as string | null };
  const descriptionOut = { description: '' };
  const diagramOut = { hasDiagrams: false };
  const headingOut = { headings: [] as RenderedHeading[], ids: new Set<string>() };
  const linkOut = { links: [] as InternalLink[], problems: [] as string[], warnings: [] as string[] };

  // `use` mutates the processor; the two parse stages differ only in their input format.
  const processor = unified();
  if (source.path.endsWith('.html')) {
    processor.use(rehypeParse, { fragment: false }).use(rehypeBodyOnly);
  } else {
    processor.use(remarkParse).use(remarkGfm).use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
  }
  processor
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeSlug)
    .use(rehypeExtractTitle(titleOut))
    .use(rehypeDescription(descriptionOut))
    .use(rehypeDiagrams(diagramOut))
    .use(rehypeWrapTables)
    .use(rehypeHeadings(headingOut))
    .use(rehypeRewriteLinks(source, context, linkOut))
    .use(() => rehypeShikiFromHighlighter(context.highlighter, SHIKI_OPTIONS))
    .use(rehypeStringify);

  const html = String(await processor.process(text));

  const page: RenderedPage = {
    id: source.id,
    route: source.route,
    kind,
    section: source.section,
    navTitle: source.title,
    title: titleOut.title ?? source.title,
    description: descriptionOut.description,
    status: kind === 'policy' ? null : (source.status ?? detectStatus(text) ?? 'draft'),
    html,
    headings: headingOut.headings,
    ids: [...headingOut.ids].sort(),
    hasDiagrams: diagramOut.hasDiagrams,
    missing: false,
    source: sourceMeta(context.config, source, context.synced),
  };
  return { page, links: linkOut.links, problems: linkOut.problems, warnings: linkOut.warnings };
}

/** Placeholder for a source whose repo is not published yet, so links to its route keep working. */
export function renderMissing(config: SourcesConfig, source: SourceEntry, synced: SyncedSource | undefined): RenderedPage {
  return {
    id: source.id,
    route: source.route,
    kind: source.kind ?? 'spec',
    section: source.section,
    navTitle: source.title,
    title: source.title,
    description: `${source.title} — not published yet.`,
    status: source.kind === 'policy' ? null : (source.status ?? 'draft'),
    html: '',
    headings: [],
    ids: [],
    hasDiagrams: false,
    missing: true,
    source: sourceMeta(config, source, synced),
  };
}

/**
 * Verifies every internal link with an anchor against the ids of the page it
 * targets. Links into placeholder pages cannot be checked and only warn.
 */
export function checkAnchors(
  pages: ReadonlyMap<string, RenderedPage>,
  links: InternalLink[],
): { problems: string[]; warnings: string[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  for (const link of links) {
    const target = pages.get(link.route);
    if (!target) {
      problems.push(`${link.from}: "${link.href}" targets ${link.route}, which is not a rendered page`);
      continue;
    }
    if (link.anchor === null) continue;
    if (target.missing) {
      warnings.push(`${link.from}: cannot check #${link.anchor} on ${link.route} (source not published yet)`);
      continue;
    }
    if (!target.ids.includes(link.anchor)) {
      problems.push(`${link.from}: "${link.href}" → ${link.route}#${link.anchor}, but that page has no such anchor`);
    }
  }
  return { problems, warnings };
}
