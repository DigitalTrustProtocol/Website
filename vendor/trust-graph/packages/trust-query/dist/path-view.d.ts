/**
 * Maps IndexResolver / PathStrategyJson Score[] onto heap-index Graph View.
 */
import type { Graph } from '@dtp/trust-graph';
import type { Node } from '@dtp/trust-graph';
import type { Score } from '@dtp/trust-graph';
import type { GraphPathView, GraphPathViewNode, TrustSubject } from './types';
export declare const EMPTY_PATH_VIEW: GraphPathView;
export declare function heapNodeSubject(node: Node): TrustSubject;
export declare function viewNodeFromHeap(node: Node, depth: number): GraphPathViewNode;
/**
 * Iterate PathStrategyJson scores (or a lone subject score) into vis nodes
 * and edges keyed by heap indexes.
 */
export declare function scoresToPathView(graph: Graph, scores: readonly Score[]): GraphPathView;
export declare function unionPathViews(views: readonly GraphPathView[]): GraphPathView;
