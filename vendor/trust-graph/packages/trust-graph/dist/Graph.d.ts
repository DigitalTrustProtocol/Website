/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Graph.ts).
 * Attention: edges are EventRecord; i↔p identity map converts i-nodes in place.
 */
import { type IEdge } from './Edge';
import { Node } from './Node';
import type { ITrustEvent, SubjectType } from './types';
import { ScoreKind } from './IResolveStrategy';
export type { GraphTrustValue } from './types';
export interface GraphTrustEdgePayload {
    /** `events.addressKey` (`kind:pubkey:d`). Heap `edgesIndex` key. */
    addressKey: string;
    dTag: string;
    author: string;
    kind: number;
    value: -1 | 0 | 1;
    /** Kind 32014 numeric score. Trust polarity stays in `value`. */
    nValue?: number;
    context: string;
    createdAt: number;
    eventId?: string;
    activate?: number;
    expire?: number;
    content?: string;
}
export interface GraphTrustConnectionPayload {
    author: string;
    subject: string;
    subjectType: SubjectType;
    edge: GraphTrustEdgePayload;
}
export interface GraphTrustConnectionOptions {
    context?: string;
    value?: -1 | 0 | 1;
    /** Edge kind filter. Default 32009. Context buckets are keyed by kind. */
    kind?: number;
    /** Peer-node type filter. Not a context-bucket key. */
    subjectType?: SubjectType;
    includeInactive?: boolean;
    now?: number;
}
export interface IGraph {
    applyTrustEvent(trust: ITrustEvent): boolean;
    removeTrustEvent(trust: ITrustEvent): boolean;
    getContextIndexes(context: string, kind: number): number[];
    getAllContextIndexes(context: string, kinds: number[]): number[];
    out(authorId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    in(subjectId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    addNode(id: string, type: SubjectType): Node;
    getNode(id: string): Node | null;
    createNode(id: string, type: SubjectType): Node;
    readonly nodesIndex: Map<string, number>;
    readonly nodesList: Array<Node | null>;
    readonly edgesList: Array<IEdge | null>;
}
export declare class Graph implements IGraph {
    nodesIndex: Map<string, number>;
    nodesList: Array<Node | null>;
    contextIndex: Map<string, number>;
    contextList: Array<string | null>;
    edgesIndex: Map<string, number>;
    edgesList: Array<IEdge | null>;
    /** Canonical i-subject (`user:id:<digits>`) → pubkey. */
    iToP: Map<string, string>;
    /** Pubkey → i-subjects. 1 Nostr → N X. */
    pToI: Map<string, Set<string>>;
    eventAddedSinceLastSave: number;
    eventRemovedSinceLastSave: number;
    clear(): void;
    bindIdentity(iSubject: string, pubkey: string): void;
    applyTrustEvent(trust: ITrustEvent): boolean;
    removeTrustEvent(trust: ITrustEvent): boolean;
    getAllContextIndexes(context: string, kinds: number[]): number[];
    getContextIndexes(context: string, kind: number): number[];
    private edgePayload;
    private connections;
    out(authorId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    in(subjectId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    addNode(id: string, type: SubjectType): Node;
    getNode(id: string): Node | null;
    createNode(id: string, type: SubjectType): Node;
    addEdge(trust: ITrustEvent): number | null;
    removeEdge(addressKey: string): IEdge | null;
    applyContext(context: string, kind: ScoreKind): number;
    getContextIndex(context: string, kind: ScoreKind): number | undefined;
    addContext(context: string): number;
    /** Move edges whose subject is this X id from the previous pubkey onto the new one. */
    private rebindSubjectEdges;
    private moveReboundEdge;
    private convertIToP;
    private absorbINodeIntoP;
    private retargetPeerIndexes;
    private resolvedSubjectId;
    private unlinkEdge;
}
