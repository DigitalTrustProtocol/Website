import { type Event, type EventTemplate } from 'nostr-tools';
export declare const NIP39_IDENTITY_KIND = 10011;
export interface TwitterIdentityLink {
    handle: string;
    twitterId: string;
    /** Optional legacy proof-post reference. Proofless claims omit it. */
    proofPostId?: string;
}
export interface ParsedKind10011TwitterIdentity extends TwitterIdentityLink {
    event: Event;
}
export interface Kind10011ValidationOptions {
    verifyEvent?: boolean;
}
export type Kind10011ValidationResult = {
    valid: true;
    identity: ParsedKind10011TwitterIdentity;
} | {
    valid: false;
    errors: string[];
};
export type SignedKind10011ValidationResult = {
    valid: true;
    event: Event;
} | {
    valid: false;
    errors: string[];
};
export interface BuildKind10011Input extends TwitterIdentityLink {
    createdAt: number;
    existingEvent?: Pick<Event, 'tags' | 'content'>;
}
export declare class Kind10011ValidationError extends Error {
    readonly errors: string[];
    constructor(errors: string[]);
}
export declare function mergeKind10011TwitterTags(existingTags: readonly string[][], link: TwitterIdentityLink): string[][];
/** Count of non-Twitter tags preserved when merging a replacement. */
export declare function countPreservedKind10011Tags(existingTags: readonly string[][]): number;
/**
 * Inspect existing Twitter provider tags for publish-preview classification.
 * Returns a valid claim when exactly one well-formed pair is present; otherwise
 * returns raw tag values for a replacement warning.
 */
export declare function inspectExistingTwitterTags(existingTags: readonly string[][]): {
    claim?: TwitterIdentityLink;
    rawTwitterTags: string[];
    hasTwitterTags: boolean;
};
export type Kind10011PublishChange = 'add' | 'refresh' | 'replace' | 'clear';
export declare function classifyKind10011PublishChange(existing: {
    claim?: TwitterIdentityLink;
    hasTwitterTags: boolean;
} | undefined, target: TwitterIdentityLink): Kind10011PublishChange;
/** Classify a clear (revocation) publish against the current slot event. */
export declare function classifyKind10011ClearChange(existing: {
    claim?: TwitterIdentityLink;
    hasTwitterTags: boolean;
} | undefined): 'clear' | 'add';
export declare function buildKind10011Event(input: BuildKind10011Input): EventTemplate;
/**
 * Build a replaceable kind 10011 that removes all Twitter provider tags
 * (revocation). Preserves unrelated provider tags and content. Claims still
 * require twitter/twitter_id tags — this event is "valid signed 10011, no claim".
 */
export declare function buildKind10011ClearEvent(input: {
    createdAt: number;
    existingEvent?: Pick<Event, 'tags' | 'content'>;
}): EventTemplate;
export declare function validateKind10011TwitterIdentity(event: unknown, options?: Kind10011ValidationOptions): Kind10011ValidationResult;
export declare function validateSignedKind10011Event(event: unknown, options?: Kind10011ValidationOptions): SignedKind10011ValidationResult;
export declare function parseKind10011TwitterIdentity(event: Event, options?: Kind10011ValidationOptions): ParsedKind10011TwitterIdentity;
export declare const mergeTwitterIdentityTags: typeof mergeKind10011TwitterTags;
export declare const buildTwitterIdentityEvent: typeof buildKind10011Event;
export declare const parseTwitterIdentityEvent: typeof parseKind10011TwitterIdentity;
export declare const validateTwitterIdentityEvent: typeof validateKind10011TwitterIdentity;
