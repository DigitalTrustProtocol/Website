import type { GraphBounds, ResolveBounds } from './types';
/** Defaults for IndexResolver / QUERY_TRUST (fan-out caps do not apply). */
export declare const DEFAULT_RESOLVE_BOUNDS: Readonly<ResolveBounds>;
/** Hard upper bound for resolve maxDepth (Sync and Resolve slider max). */
export declare const RESOLVE_MAX_DEPTH_HARD_CAP = 7;
/**
 * Defaults for WoT sync expansion when callers pass GraphBounds-shaped limits.
 * Relay synchronizer also has its own DEFAULT_GRAPH_SYNC_LIMITS.
 */
export declare const DEFAULT_GRAPH_BOUNDS: Readonly<GraphBounds>;
export declare function normalizeResolveBounds(bounds?: Partial<ResolveBounds>): ResolveBounds;
export declare function normalizeBounds(bounds?: Partial<GraphBounds>): GraphBounds;
