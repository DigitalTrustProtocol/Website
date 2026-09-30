/**
 * Helpers that shape heap results for the resolver protocol
 * (resolver-api.md): canonical statement order (proposal P3), the
 * `statementLimit` / `maxPathNodes` result guardrails, and the
 * `graph.neighborhood` center forms. They wrap `executeTrustQuery`,
 * `executeRatingQuery`, and `neighborhoodFromHeap`; they never walk.
 */
import type { Graph } from '@dtp/trust-graph';
import { type NeighborhoodResult, type NeighborhoodOptions } from './graph';
import type { RatingClaimEvidence, RatingQueryResult, ResolvedStatement, TrustQueryResult, TrustSubject } from './types';
export type TruncationReason = 'timeBudget' | 'nodeBudget' | 'edgeBudget' | 'statementLimit' | 'neighborhoodLimit' | 'pathLimit';
/** Additive result fields (resolver-api.md § Additive result fields). */
export interface WireResultExtras {
    truncated?: boolean;
    truncatedReasons?: TruncationReason[];
    statementsTruncated?: true;
    coverage?: 'complete' | 'partial';
    coverageReasons?: string[];
}
export type WireTrustResult = Omit<TrustQueryResult, 'truncated'> & WireResultExtras;
export type WireRatingResult = RatingQueryResult & WireResultExtras;
export interface ResultLimits {
    statementLimit: number;
    maxPathNodes: number;
}
/** P3 order: distance asc, createdAt desc, eventId asc. */
export declare function sortStatements(statements: readonly ResolvedStatement[]): ResolvedStatement[];
export declare function sortClaims(claims: readonly RatingClaimEvidence[]): RatingClaimEvidence[];
/** Canonical order, then cut statements and path nodes; counts stay exact. */
export declare function limitTrustResult(result: TrustQueryResult, limits: ResultLimits): WireTrustResult;
export declare function limitRatingResult(result: RatingQueryResult, limits: ResultLimits): WireRatingResult;
/** A wire subject `{ type, value }`, or undefined when malformed. */
export declare function parseWireSubject(value: unknown): TrustSubject | undefined;
export interface NeighborhoodParams {
    keys?: string[];
    centerId?: number | string;
    direction?: NeighborhoodOptions['direction'];
    valueFilter?: NeighborhoodOptions['valueFilter'];
    context?: string;
    limit?: number;
    now?: number;
}
/**
 * `graph.neighborhood`: center by heap index, wire id, or the first of `keys`
 * (the rest of `keys` that are pubkeys also expand outward, like the
 * extension's `outboundPubkeys`). A bound `user:id` center also walks its
 * pubkey (AttentionX `GraphManager.neighborhood`).
 */
export declare function neighborhoodLookup(graph: Graph, graphVersion: number, params: NeighborhoodParams, maxLimit: number): NeighborhoodResult & {
    truncatedReasons?: TruncationReason[];
};
