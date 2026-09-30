/**
 * Maps IndexResolver Score[] → Attention TrustQueryResult.
 */
import type { Graph } from '@dtp/trust-graph';
import type { BindingMode, BindOutcome, IResolveStrategy, IResolveStrategyOptions, WalkResult } from '@dtp/trust-graph';
import type { BindingProvenance, TrustQuery, TrustQueryResult, TrustSubject, WalkQueryOptions } from './types';
export { DEFAULT_GRAPH_BOUNDS, DEFAULT_RESOLVE_BOUNDS, normalizeBounds, normalizeResolveBounds, } from './bounds';
/**
 * Runs the injected IResolveStrategy (default IndexResolver) and maps to TrustQueryResult.
 */
export declare function executeTrustQuery(graph: Graph, resolver: IResolveStrategy, query: TrustQuery, graphVersion: number): TrustQueryResult;
/** The query's binding mode and walk budgets as walk options. */
export declare function walkOptions(query: WalkQueryOptions): Pick<IResolveStrategyOptions, 'bindingMode' | 'budgets'>;
/** identity-binding.md §8 provenance for a `user:id` subject. */
export declare function bindingProvenance(mode: BindingMode, outcome: BindOutcome | undefined): BindingProvenance;
/**
 * Result fields the walk adds: `truncated` / `truncatedReasons` /
 * `completeDepth` only when a walk budget stopped it (§6.2), and `binding`
 * for `user:id` subjects.
 */
export declare function walkExtras(walk: WalkResult, subject: TrustSubject): Pick<TrustQueryResult, 'truncatedReasons' | 'completeDepth' | 'binding'> & {
    truncated?: true;
};
