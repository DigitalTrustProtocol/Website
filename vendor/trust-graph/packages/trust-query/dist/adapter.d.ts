/**
 * Maps Attention vis ids and X subject classification. Write-time
 * EventRecord columns live in `src/lib/nostr/nip32009.ts`.
 */
import type { GraphVisId, TrustSubject } from './types';
/** Heap Graph node id = subject value (lowercased). Not the wire `type:value` id. */
export declare function graphSubjectId(subject: TrustSubject): string;
/** Graph View id for a heap node or edge index (numeric, not stringified). */
export declare function heapIndexId(index: number): number;
/** Parse a Graph View heap-index id (`12` or legacy `"12"`). */
export declare function parseHeapIndexId(id: GraphVisId): number | undefined;
/** JSON / `Record` key. Heap indexes stringify only at this boundary. */
export declare function visIdRecordKey(id: GraphVisId): string;
/** Wire / cockpit node id (`p:…`, `i:user:id:…`). Same as deeplink `subjectNodeId`. */
export declare function wireNodeId(subject: TrustSubject): string;
export declare function parseWireCenterId(centerId: string): {
    graphId: string;
    authorPubkey?: string;
    subject?: TrustSubject;
    wireId: string;
    kind: 'pubkey' | 'twitter_id' | 'post' | 'other';
    label: string;
} | undefined;
export declare function isArtifactSubject(subject: TrustSubject): boolean;
export declare function isIdentitySubject(subject: TrustSubject): boolean;
/**
 * Map a 0–100 rating onto a Graph edge polarity for viz only.
 * Ratings are never hops; this is display (incoming arrows / Path strokes).
 */
export declare function ratingScoreToEdgeValue(score: number): 1 | -1;
export declare function ratingClaimSlotId(claim: {
    author: string;
    subject: TrustSubject;
    context: string;
}): string;
export declare function ratingSubjectKey(subject: TrustSubject, context: string): string;
export declare function classifyTrustSubject(subject: TrustSubject): {
    id: string;
    kind: 'pubkey' | 'twitter_id' | 'post' | 'other';
    label: string;
};
