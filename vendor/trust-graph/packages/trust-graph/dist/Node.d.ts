/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Node.ts).
 * Attention: `out`/`in` renamed to outbound/inbound (reserved-word safe for Oxc).
 * Context buckets are kind-prefixed; 32009 and 32014 do not share an index.
 * A peer may still hold multiple same-kind edge indexes in one bucket.
 */
import type { Identity, SubjectType } from './types';
/** contextIndex → peerNodeIndex → edge indexes (same kind). */
export type PeerEdgeMap = Map<number, number[]>;
export declare function removePeerEdge(map: PeerEdgeMap, peerIndex: number, edgeIndex: number): void;
export declare function eachPeerEdge(map: PeerEdgeMap): IterableIterator<[number, number]>;
export declare class Node {
    index: number;
    id: string;
    type: SubjectType;
    identity?: Identity;
    outbound: Map<number, PeerEdgeMap>;
    inbound: Map<number, PeerEdgeMap>;
    edges: Set<number>;
    constructor(id: string, type: SubjectType);
    get out(): Map<number, PeerEdgeMap>;
    get in(): Map<number, PeerEdgeMap>;
    getOut(contextIndexes: number[]): IterableIterator<[number, number]>;
    addOut(contextIndex: number, subjectIndex: number, edgeIndex: number): void;
    addIn(contextIndex: number, subjectIndex: number, edgeIndex: number): void;
}
