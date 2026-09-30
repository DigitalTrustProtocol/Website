/**
 * Heap neighborhood (Graph.out / Graph.in) for Graph View expand.
 */
import type { Graph } from '@dtp/trust-graph';
import type { GraphPathViewEdge, GraphPathViewNode, GraphVisId } from './types';
export type { GraphNodeKind } from './types';
export type GraphViewNode = GraphPathViewNode;
export type GraphViewEdge = GraphPathViewEdge;
export type NeighborhoodDirection = 'out' | 'in' | 'both';
export type NeighborhoodValueFilter = 'trust' | 'distrust' | 'both';
export type NeighborhoodOptions = {
    direction?: NeighborhoodDirection;
    valueFilter?: NeighborhoodValueFilter;
    context?: string;
    now?: number;
    limit?: number;
    outboundPubkeys?: readonly string[];
    ratingContext?: string;
};
export type NeighborhoodResult = {
    graphVersion: number;
    centerId: GraphVisId;
    truncated: boolean;
    nodes: GraphViewNode[];
    edges: GraphViewEdge[];
};
/** One-hop neighborhood via Graph.out / Graph.in (Trust viz expand model). */
export declare function neighborhoodFromHeap(graph: Graph, graphVersion: number, centerId: GraphVisId, options?: NeighborhoodOptions): NeighborhoodResult;
