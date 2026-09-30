/**
 * Maps IndexResolver Score[] → Attention TrustQueryResult.
 */
import type { Graph } from '@dtp/trust-graph';
import type { IResolveStrategy } from '@dtp/trust-graph';
import type { TrustQuery, TrustQueryResult } from './types';
export { DEFAULT_GRAPH_BOUNDS, DEFAULT_RESOLVE_BOUNDS, normalizeBounds, normalizeResolveBounds, } from './bounds';
/**
 * Runs the injected IResolveStrategy (default IndexResolver) and maps to TrustQueryResult.
 */
export declare function executeTrustQuery(graph: Graph, resolver: IResolveStrategy, query: TrustQuery, graphVersion: number): TrustQueryResult;
