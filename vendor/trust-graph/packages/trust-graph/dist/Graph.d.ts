/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Graph.ts).
 * Attention: edges are EventRecord.
 * @dtp/trust-graph (decision D3): X accounts and pubkeys stay separate nodes;
 * own evidence, claims, and witness statements are indexed here and the
 * walk decides binds per root, level, and mode (G8). A Delete unlinks only
 * its own slot (G3). See DIVERGENCE.json.
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
export type OwnEvidenceSource = 'bio' | 'post';
/** Own evidence that `iKey` is controlled by `pubkey` (identity-binding.md §4 step 1). */
export interface OwnEvidenceEntry {
    iKey: string;
    pubkey: string;
    source: OwnEvidenceSource;
    /** The root it applies to; absent = every root. */
    root?: string;
}
/** The X ids a pubkey's winning kind 10011 names (identity-binding.md §2.6). */
export interface IdentityClaim {
    twitterIds: Set<string>;
    eventId?: string;
}
export declare const USER_ID_PREFIX = "user:id:";
export declare class Graph implements IGraph {
    nodesIndex: Map<string, number>;
    nodesList: Array<Node | null>;
    contextIndex: Map<string, number>;
    contextList: Array<string | null>;
    edgesIndex: Map<string, number>;
    edgesList: Array<IEdge | null>;
    /**
     * Root-less own evidence: canonical i-subject (`user:id:<digits>`) → pubkey.
     * A view of `ownEvidence` for callers outside the walk (sync frontier,
     * neighborhood). The walk decides binds itself (gap G8).
     */
    iToP: Map<string, string>;
    /** Pubkey → i-subjects of root-less own evidence. 1 Nostr → N X. */
    pToI: Map<string, Set<string>>;
    /**
     * The observer's own evidence (Bio / linking post), keyed by
     * `root \n iKey \n source`. Input to `bind(R, X, ℓ)` step 1; never a
     * global bind (identity-binding.md §4).
     */
    ownEvidence: Map<string, OwnEvidenceEntry>;
    /** Identity claims: pubkey → the X ids its winning kind 10011 names. */
    identityClaims: Map<string, IdentityClaim>;
    /** X node index → witness edge indexes (32009, v=1, npub hint, hint ≠ author). */
    witnessIn: Map<number, Set<number>>;
    /** Hinted pubkey node index → X node index → witness edge count. */
    hintedAs: Map<number, Map<number, number>>;
    eventAddedSinceLastSave: number;
    eventRemovedSinceLastSave: number;
    clear(): void;
    /**
     * Records own evidence that `iSubject` is controlled by `pubkey`, for
     * `options.root` only, or for every root when `root` is omitted (the
     * extension's single operator). The walk turns it into a bind per root,
     * level, and binding mode (gap G8); nodes are never merged.
     */
    bindIdentity(iSubject: string, pubkey: string, options?: {
        root?: string;
        source?: OwnEvidenceSource;
    }): void;
    /**
     * Removes own evidence for `iSubject` (gap G6): for `options.root` (or the
     * root-less entry when omitted), for one `source` or all of them. Returns
     * whether anything was removed.
     */
    unbindIdentity(iSubject: string, options?: {
        root?: string;
        source?: OwnEvidenceSource;
    }): boolean;
    /** Own evidence that applies to `root`: its own entries plus root-less ones. */
    ownEvidenceFor(root: string): OwnEvidenceEntry[];
    /** Replaces the X ids claimed by `pubkey` (its winning kind 10011). */
    setIdentityClaims(pubkey: string, twitterIds: Iterable<string>, eventId?: string): void;
    /** Adds one claimed X id for `pubkey`. */
    addIdentityClaim(pubkey: string, twitterId: string, eventId?: string): void;
    removeIdentityClaims(pubkey: string): boolean;
    /** P's claim of X, or undefined when P's kind 10011 does not name X. */
    identityClaim(pubkey: string, twitterId: string): IdentityClaim | undefined;
    private refreshRootlessBind;
    private indexWitness;
    private unindexWitness;
    applyTrustEvent(trust: ITrustEvent): boolean;
    removeTrustEvent(trust: ITrustEvent): boolean;
    getAllContextIndexes(context: string, kinds: number[]): number[];
    getContextIndexes(context: string, kind: number): number[];
    private edgePayload;
    private connections;
    out(authorId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    in(subjectId: string, options?: GraphTrustConnectionOptions): GraphTrustConnectionPayload[];
    /** Nodes are never merged: an X account and a pubkey stay two nodes; the walk binds them (gap G8). */
    addNode(id: string, type: SubjectType): Node;
    getNode(id: string): Node | null;
    createNode(id: string, type: SubjectType): Node;
    addEdge(trust: ITrustEvent): number | null;
    removeEdge(addressKey: string): IEdge | null;
    applyContext(context: string, kind: ScoreKind): number;
    getContextIndex(context: string, kind: ScoreKind): number | undefined;
    addContext(context: string): number;
    private unlinkEdge;
}
