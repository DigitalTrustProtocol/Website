/**
 * NIP-09 deletion requests (kind 5) that target the held kinds
 * (resolver-api.md § Ingest, wot-model.md §2.4). Validation only; the store
 * applies them (author match, slot floor).
 */
import { type Event } from 'nostr-tools';
export declare const DELETION_KIND = 5;
/** Kinds whose events a deletion may target on a DTP server. */
export declare const DELETABLE_KINDS: ReadonlySet<number>;
export interface DeletionAddress {
    kind: number;
    pubkey: string;
    d: string;
    /** `kind:pubkey:d`, the store's slot key. */
    addressKey: string;
}
export interface ParsedDeletion {
    event: Event;
    /** `e` targets (event ids). The store checks that the target's author matches. */
    eventIds: string[];
    /**
     * `a` targets by the deletion's own author for a held kind. Coordinates by
     * other authors or for other kinds are dropped; both lists may be empty.
     */
    addresses: DeletionAddress[];
}
export type DeletionValidationResult = {
    valid: true;
    deletion: ParsedDeletion;
} | {
    valid: false;
    errors: string[];
};
export declare function validateDeletionEvent(event: unknown, options?: {
    verifyEvent?: boolean;
}): DeletionValidationResult;
