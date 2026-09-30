/**
 * Scope profiles (wot-model.md §2.3). v1 has one profile, `x.com`, identical
 * to Attention's `isEligibleXTrustScope` / `isEligibleXRatingScope` /
 * `xTrustScopeRank`.
 */
export type ScopeProfileName = 'x.com';
export declare const DEFAULT_SCOPE_PROFILE: ScopeProfileName;
export interface ScopeVerdict {
    eligible: boolean;
    /** 0 when ineligible. */
    scopeRank: number;
}
/** Eligibility and rank for one statement's canonical scope set. */
export declare function scopeVerdict(kind: number, scopes: readonly string[], profile?: ScopeProfileName): ScopeVerdict;
/** True when the scope set lets an npub hint act as an X identity witness. */
export declare function scopesCarryXHints(scopes: readonly string[]): boolean;
