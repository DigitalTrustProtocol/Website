/**
 * `graph.field` (resolver-api.md): the walk's level structure from one root
 * with no subject, shaped `{ graphVersion, completeDepth, levels, binds }`.
 * Levels come from `IndexResolver.field`, the same walk as trust queries.
 */
import type { FieldBind, Graph, IResolveStrategy, WalkTruncation } from '@dtp/trust-graph';
import type { WalkQueryOptions } from './types';
export interface FieldQuery extends WalkQueryOptions {
    rootPubkey: string;
    /** Hop threshold percent; default as for trust queries. */
    followTrustThreshold?: number;
    maxDepth?: number;
    now?: number;
}
export interface FieldQueryResult {
    graphVersion: number;
    completeDepth: number;
    levels: string[][];
    binds: FieldBind[];
    truncated?: true;
    truncatedReasons?: WalkTruncation[];
}
export declare function executeFieldQuery(graph: Graph, resolver: IResolveStrategy, query: FieldQuery, graphVersion: number): FieldQueryResult;
