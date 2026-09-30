/**
 * Sync frontier (wot-model.md §8): whose events to fetch. Ported from
 * AttentionX `GraphManager.positiveChildren` / `positiveAuthorFrontier`;
 * adds each author's depth and one `via` parent to the result.
 * Not a trust result: it ignores the hop threshold.
 */
import type { Graph } from '@dtp/trust-graph';
export interface FrontierLimits {
    maxDepth: number;
    maxAuthorsPerLevel: number;
    maxTotalAuthors: number;
}
export type FrontierReason = 'maxDepth' | 'maxAuthorsPerLevel' | 'maxTotalAuthors';
export interface FrontierAuthor {
    pubkey: string;
    depth: number;
    /** Lowest-sorted author at `depth - 1` with an active positive statement for this pubkey. */
    via?: string;
}
export interface FrontierResult {
    authors: FrontierAuthor[];
    reasons: FrontierReason[];
}
/**
 * Positive, active, heap-resolved pubkey hops from these authors, including
 * `user:id` aliases bound onto a pubkey node. Returns child → first parent.
 */
export declare function positiveChildren(graph: Graph, authors: readonly string[], nowSeconds: number): Map<string, string>;
export declare function positiveAuthorFrontier(graph: Graph, roots: readonly string[], limits: FrontierLimits, nowSeconds?: number): FrontierResult;
