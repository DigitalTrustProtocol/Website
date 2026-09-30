/**
 * Lookups (wot-model.md §8.1): one degree of stored winners, independent of
 * the observer. Grown from AttentionX `graph/incoming.ts`, `graph/outgoing.ts`
 * and `GraphManager.incomingRecords` / `outgoingUserRecords`: the same
 * `Graph` adjacency reads, plus filters, `selected` / `raw`, `mergeKeys`,
 * total order, keyset pages, and counts. Never walks more than one degree.
 */
import { RATING_STATEMENT_KIND, TRUST_STATEMENT_KIND, type Graph } from '@dtp/trust-graph';
import type { TrustSubject } from './types';
export type LookupKind = typeof TRUST_STATEMENT_KIND | typeof RATING_STATEMENT_KIND;
export type LookupDirection = 'incoming' | 'outgoing';
export type ContextMatchMode = 'chain' | 'exact' | 'any';
export type LookupSubjectType = 'p' | 'user:id' | 'post:id' | 'e' | 'other';
export type LookupMode = 'selected' | 'raw';
export type LookupOrder = 'recent' | 'author';
export interface LookupFilters {
    kinds?: LookupKind[];
    context?: string;
    contextMatch?: ContextMatchMode;
    values?: Array<1 | 0 | -1>;
    subjectTypes?: LookupSubjectType[];
    labels?: string[];
    includeInactive?: boolean;
    now?: number;
    since?: number;
    until?: number;
    mode?: LookupMode;
    mergeKeys?: boolean;
}
export interface LookupParams extends LookupFilters {
    /** Wire node ids (`p:<hex>`, `i:user:id:<n>`, `i:post:id:<n>`, `e:<hex>`). */
    keys: string[];
    order?: LookupOrder;
    limit?: number;
    cursor?: string;
    withTotals?: boolean;
}
export interface LookupItem {
    eventId: string;
    connectionKey: string;
    kind: LookupKind;
    author: string;
    subject: TrustSubject;
    context: string;
    /** Kind 32009 only. */
    value?: 1 | 0 | -1;
    /** Kind 32014 only. */
    score?: number;
    createdAt: number;
    activeFrom?: number;
    activeUntil?: number;
    labels?: string[];
    labelHints?: Record<string, string>;
    content?: string;
}
export interface LookupTotals {
    trust: number;
    neutral: number;
    distrust: number;
    ratings: number;
}
export interface LookupPage {
    graphVersion: number;
    items: LookupItem[];
    nextCursor?: string;
    totals?: LookupTotals;
    truncated?: true;
    truncatedReasons?: string[];
}
export interface LookupCountsParams extends LookupFilters {
    keys: string[];
    direction: LookupDirection;
}
export interface LookupCountsResult {
    graphVersion: number;
    counts: Record<string, LookupTotals>;
    truncated?: true;
    truncatedReasons?: string[];
}
export interface LookupLimits {
    /** `maxLookupKeys`. */
    maxKeys: number;
    /** `maxLookupPage` (clamps `limit`). */
    maxPage: number;
    /** `maxLookupRecords` scanned per page. */
    maxRecords: number;
}
export declare const DEFAULT_LOOKUP_LIMITS: Readonly<LookupLimits>;
export declare const DEFAULT_LOOKUP_PAGE_SIZE = 100;
/** Request errors map to `DTP-ERR invalid`. */
export declare class LookupError extends Error {
    readonly code = "invalid";
    constructor(message: string);
}
/** `lookup.incoming` / `lookup.outgoing`: one page of stored winners. */
export declare function lookupPage(graph: Graph, graphVersion: number, direction: LookupDirection, params: LookupParams, limits?: LookupLimits): LookupPage;
/** `lookup.counts`: exact tallies per key, or for the merged alias set. */
export declare function lookupCounts(graph: Graph, graphVersion: number, params: LookupCountsParams, limits?: LookupLimits): LookupCountsResult;
