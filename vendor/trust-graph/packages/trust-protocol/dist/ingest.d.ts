/**
 * One entry point for servers: validate an incoming event fully, apply the
 * scope profile, and produce the normalized record (wot-model.md §2.1–2.3,
 * resolver-api.md § Ingest). Rejections carry the NIP-01 `OK` prefix.
 */
import { type IdentityClaim } from './claims';
import { type ParsedDeletion } from './kind-5';
import { type ScopeProfileName } from './scope-profile';
import type { EventRecord } from './types';
export type RejectPrefix = 'invalid' | 'blocked';
export type IngestClassification = {
    type: 'statement';
    record: EventRecord;
} | {
    type: 'identity';
    record: EventRecord;
    claim?: IdentityClaim;
} | {
    type: 'deletion';
    deletion: ParsedDeletion;
} | {
    type: 'rejected';
    prefix: RejectPrefix;
    message: string;
};
export interface ClassifyOptions {
    profile?: ScopeProfileName;
    /** Default true. Only disable for rows that were verified on an earlier write. */
    verifyEvent?: boolean;
    /** Stamped as `firstSeenAt` (Unix seconds). */
    now?: number;
}
/** `kind:pubkey:d` slot key; kind 10011 uses an empty `d`. */
export declare function eventAddressKey(kind: number, pubkey: string, d: string): string;
export declare function classifyEvent(input: unknown, options?: ClassifyOptions): Promise<IngestClassification>;
