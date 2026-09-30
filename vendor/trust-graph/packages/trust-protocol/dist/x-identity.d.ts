export declare const NIP39_EVENT_KIND = 10011;
export declare const X_TRUST_SCOPE = "x.com";
/**
 * Scopes that apply on x.com: empty (global / all sites) and explicit `x.com`.
 * See docs/architecture.md § Scope policy.
 */
export declare function isEligibleXTrustScope(scopes: readonly string[]): boolean;
/** Kind 32014 on X requires explicit s=x.com (empty or other domains are ineligible). */
export declare function isEligibleXRatingScope(scopes: readonly string[]): boolean;
/** Higher rank wins when both empty and `x.com` exist for the same slot. */
export declare function xTrustScopeRank(scopes: readonly string[]): number;
export declare function scopesFromEventTags(tags: readonly (readonly string[])[]): string[];
export declare function normalizeTwitterHandle(handle: string): string;
export declare function isCanonicalTwitterHandle(value: string): boolean;
export declare function isTwitterNumericId(value: string): boolean;
export declare function parseTwitterIdFromAuthorMeta(authorIdentifier?: string): string | undefined;
export declare function canonicalTwitterProfileUrl(options: {
    handle?: string;
    twitterId?: string;
}): string;
export declare function canonicalTwitterProfileId(options: {
    handle?: string;
    twitterId?: string;
}): string;
export declare function canonicalTwitterAccountSubject(twitterId: string): string;
/** `user:id` trust subject when `twitterId` is decimal digits; otherwise omit. */
export declare function xAccountTrustSubject(twitterId: string | undefined): {
    type: 'i';
    value: string;
} | undefined;
export declare function canonicalTwitterPostSubject(postId: string): string;
export declare function canonicalTwitterAccountClass(): 'user:id';
export declare function canonicalTwitterPostClass(): 'post:id';
export declare function canonicalTwitterPostUrl(postId: string): string;
export declare function canonicalNip39TwitterProofHint(proofPostId: string): string;
export declare function isCanonicalNip39TwitterProofHint(hint: string | undefined, proofPostId: string): boolean;
export declare function parseCanonicalTwitterSubject(subject: string): {
    type: 'account';
    twitterId: string;
} | {
    type: 'post';
    postId: string;
} | undefined;
export declare function buildNip39TwitterLinkTags(handle: string, twitterId: string, proofTweetId?: string): string[][];
