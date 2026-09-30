/**
 * Artifact ratings (kind 32014): map IndexResolver RatingScore onto
 * Attention DTOs. Never a traversal edge.
 */
import type { Graph } from '@dtp/trust-graph';
import type { IResolveStrategy } from '@dtp/trust-graph';
import type { RatingQuery, RatingQueryResult, ResolveBounds } from '../types';
export declare function executeRatingQuery(graph: Graph, resolver: IResolveStrategy, query: RatingQuery, graphVersion: number, defaultBounds: Readonly<ResolveBounds>): RatingQueryResult;
export declare class ArtifactRatingResolver {
    readonly name = "artifact-rating";
    resolve(graph: Graph, resolver: IResolveStrategy, query: RatingQuery, graphVersion: number, defaultBounds: Readonly<ResolveBounds>): RatingQueryResult;
}
export declare const artifactRatingResolver: ArtifactRatingResolver;
