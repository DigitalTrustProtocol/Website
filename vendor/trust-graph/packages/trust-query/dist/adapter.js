// Ported from AttentionX src/graph/adapter.ts (imports rewritten for @dtp/* packages).
/**
 * Maps Attention vis ids and X subject classification. Write-time
 * EventRecord columns live in `src/lib/nostr/nip32009.ts`.
 */
import { parseNodeId, subjectNodeId } from './shared/graph-deeplink';
/** Heap Graph node id = subject value (lowercased). Not the wire `type:value` id. */
export function graphSubjectId(subject) {
    return subject.value.toLowerCase();
}
/** Graph View id for a heap node or edge index (numeric, not stringified). */
export function heapIndexId(index) {
    return index;
}
/** Parse a Graph View heap-index id (`12` or legacy `"12"`). */
export function parseHeapIndexId(id) {
    if (typeof id === 'number') {
        if (!Number.isInteger(id) || id < 0)
            return undefined;
        return id;
    }
    if (!/^\d+$/.test(id))
        return undefined;
    const index = Number(id);
    if (!Number.isInteger(index) || index < 0)
        return undefined;
    return index;
}
/** JSON / `Record` key. Heap indexes stringify only at this boundary. */
export function visIdRecordKey(id) {
    return String(id);
}
/** Wire / cockpit node id (`p:…`, `i:user:id:…`). Same as deeplink `subjectNodeId`. */
export function wireNodeId(subject) {
    return subjectNodeId(subject);
}
export function parseWireCenterId(centerId) {
    const subject = parseNodeId(centerId);
    if (!subject)
        return undefined;
    const graphId = subject.value.toLowerCase();
    const meta = classifyTrustSubject(subject);
    if (subject.type === 'p') {
        return {
            graphId,
            authorPubkey: graphId,
            subject,
            wireId: centerId,
            kind: 'pubkey',
            label: meta.label,
        };
    }
    return {
        graphId,
        subject,
        wireId: centerId,
        kind: meta.kind,
        label: meta.label,
    };
}
export function isArtifactSubject(subject) {
    if (subject.type === 'e')
        return true;
    return subject.type === 'i' && subject.value.startsWith('post:id:');
}
export function isIdentitySubject(subject) {
    return !isArtifactSubject(subject);
}
/**
 * Map a 0–100 rating onto a Graph edge polarity for viz only.
 * Ratings are never hops; this is display (incoming arrows / Path strokes).
 */
export function ratingScoreToEdgeValue(score) {
    return score >= 50 ? 1 : -1;
}
export function ratingClaimSlotId(claim) {
    const subject = claim.subject;
    return [
        `${claim.author.length}:${claim.author}`,
        `${subject.type}:${subject.value.length}:${subject.value}`,
        `${claim.context.length}:${claim.context}`,
    ].join('|');
}
export function ratingSubjectKey(subject, context) {
    return `${subject.type}:${subject.value.toLowerCase()}|${context}`;
}
export function classifyTrustSubject(subject) {
    if (subject.type === 'p') {
        return {
            id: wireNodeId(subject),
            kind: 'pubkey',
            label: `${subject.value.slice(0, 12)}…`,
        };
    }
    if (subject.type === 'i' && subject.value.startsWith('user:id:')) {
        return {
            id: wireNodeId(subject),
            kind: 'twitter_id',
            label: `X · ${subject.value.slice('user:id:'.length)}`,
        };
    }
    if (subject.type === 'i' && subject.value.startsWith('post:id:')) {
        return {
            id: wireNodeId(subject),
            kind: 'post',
            label: `Post · ${subject.value.slice('post:id:'.length)}`,
        };
    }
    if (subject.type === 'e') {
        return {
            id: wireNodeId(subject),
            kind: 'post',
            label: `Event · ${subject.value.slice(0, 12)}…`,
        };
    }
    return {
        id: wireNodeId(subject),
        kind: 'other',
        label: `${subject.type}:${subject.value.slice(0, 24)}`,
    };
}
