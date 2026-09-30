/**
 * TypeScript model runner: builds a heap from a case's records / ops and
 * runs its queries through `@dtp/trust-query` (which calls the one walk,
 * `IndexResolver`). Output is canonicalized per conformance.md.
 */
import { Graph, type ITrustEvent } from '@dtp/trust-graph';
import { SlotFloors, type GraphPathView } from '@dtp/trust-query';
import type { CorpusOp, CorpusOwnEvidence, CorpusQuery, CorpusRecord, ModelCase } from './types';
export type BindingMode = 'lenient' | 'strict';
export interface ModelState {
    graph: Graph;
    floors: SlotFloors;
    /** Claims are recorded but unused by today's heap (gap G8). */
    claims: Map<string, Set<string>>;
    own: CorpusOwnEvidence[];
    graphVersion: number;
}
export declare function defaultAddressKey(record: CorpusRecord): string;
/** Corpus record (model field names) → heap edge record (extension column names). */
export declare function toEdgeRecord(record: CorpusRecord): ITrustEvent;
export declare function defaultOps(testCase: ModelCase): CorpusOp[];
export declare function applyOp(state: ModelState, op: CorpusOp): void;
export declare function buildState(testCase: ModelCase, ops?: CorpusOp[]): ModelState;
export declare function canonicalPathView(view: GraphPathView | undefined): unknown;
export declare function runTrust(state: ModelState, input: Record<string, unknown>): Record<string, unknown>;
export declare function runRating(state: ModelState, input: Record<string, unknown>): Record<string, unknown>;
export declare function runLookup(state: ModelState, direction: 'incoming' | 'outgoing', input: Record<string, unknown>): Record<string, unknown>;
/** Every page at `limit`, following cursors. */
export declare function runLookupPages(state: ModelState, direction: 'incoming' | 'outgoing', input: Record<string, unknown>, limit: number, maxPages?: number): Array<{
    items: unknown[];
    nextCursor: boolean;
}>;
export declare function runCounts(state: ModelState, input: Record<string, unknown>): Record<string, unknown>;
export declare function runNeighborhood(state: ModelState, input: Record<string, unknown>): Record<string, unknown>;
export declare function runFrontier(state: ModelState, input: Record<string, unknown>): Record<string, unknown>;
/** Run one query (single mode) and return its canonical output. */
export declare function runQuery(state: ModelState, query: CorpusQuery, input?: Record<string, unknown>): unknown;
