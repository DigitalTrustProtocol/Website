import type { SourceKind, SourceSection } from './sources';

export interface RenderedHeading {
  depth: number;
  id: string;
  text: string;
}

export interface RenderedSource {
  repo: string;
  repoLabel: string;
  path: string;
  /** Pinned ref from content.sources.json. */
  ref: string;
  refShort: string;
  origin: 'git' | 'working-tree' | 'remote' | 'none';
  /** Ref the content was actually read at. */
  resolvedRef: string;
  /** False when a local build read an unpinned working tree. */
  pinned: boolean;
  viewUrl: string;
  editUrl: string;
}

/** One page rendered from a source file by `npm run content:build`. */
export interface RenderedPage {
  id: string;
  route: string;
  kind: SourceKind;
  section: SourceSection;
  navTitle: string;
  title: string;
  description: string;
  /** Status badge (`draft`, …); `null` for policies. */
  status: string | null;
  /** Sanitized HTML with site-absolute internal links (no base path). */
  html: string;
  headings: RenderedHeading[];
  ids: string[];
  hasDiagrams: boolean;
  /** True when the owner repo is not published yet (remote sync skipped it). */
  missing: boolean;
  source: RenderedSource;
}

/** What a rendered-source route sends to the page (anchor ids stay at build time). */
export type RenderedPageData = Omit<RenderedPage, 'ids'>;

export interface RenderedIndex {
  generatedAt: string;
  syncMode: 'local' | 'remote';
  /** Model version declared by the pinned `wot-model.md`, or `null` when it was not synced. */
  modelVersion: string | null;
  pages: Record<string, string>;
}
