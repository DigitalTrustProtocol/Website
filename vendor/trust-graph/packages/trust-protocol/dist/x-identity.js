// Ported from AttentionX src/shared/x-identity.ts (imports rewritten for @dtp/* packages).
export const NIP39_EVENT_KIND = 10011;
export const X_TRUST_SCOPE = 'x.com';
/**
 * Scopes that apply on x.com: empty (global / all sites) and explicit `x.com`.
 * See docs/architecture.md § Scope policy.
 */
export function isEligibleXTrustScope(scopes) {
    if (scopes.length === 0)
        return true;
    return scopes.includes(X_TRUST_SCOPE);
}
/** Kind 32014 on X requires explicit s=x.com (empty or other domains are ineligible). */
export function isEligibleXRatingScope(scopes) {
    return scopes.includes(X_TRUST_SCOPE);
}
/** Higher rank wins when both empty and `x.com` exist for the same slot. */
export function xTrustScopeRank(scopes) {
    if (scopes.includes(X_TRUST_SCOPE))
        return 2;
    if (scopes.length === 0)
        return 1;
    return 0;
}
export function scopesFromEventTags(tags) {
    const scopes = new Set();
    for (const tag of tags) {
        if (tag[0] !== 's')
            continue;
        const value = tag[1];
        if (typeof value !== 'string' || value.length === 0)
            continue;
        scopes.add(value.toLowerCase());
    }
    return [...scopes].sort();
}
export function normalizeTwitterHandle(handle) {
    return handle.replace(/^@/, '').toLowerCase();
}
export function isCanonicalTwitterHandle(value) {
    return /^[a-z0-9_]{1,15}$/.test(value);
}
export function isTwitterNumericId(value) {
    return /^\d+$/.test(value);
}
function requireTwitterNumericId(value, name) {
    if (!isTwitterNumericId(value)) {
        throw new Error(`${name} must contain only decimal digits`);
    }
    return value;
}
function requireTwitterHandle(handle) {
    const normalized = normalizeTwitterHandle(handle);
    if (!isCanonicalTwitterHandle(normalized)) {
        throw new Error('Twitter handle must be 1-15 letters, digits, or underscores');
    }
    return normalized;
}
export function parseTwitterIdFromAuthorMeta(authorIdentifier) {
    if (!authorIdentifier || !isTwitterNumericId(authorIdentifier)) {
        return undefined;
    }
    return authorIdentifier;
}
export function canonicalTwitterProfileUrl(options) {
    if (options.twitterId !== undefined) {
        return `https://x.com/i/user/${requireTwitterNumericId(options.twitterId, 'twitterId')}`;
    }
    if (options.handle) {
        return `https://x.com/${requireTwitterHandle(options.handle)}`;
    }
    throw new Error('Twitter profile requires handle or twitterId');
}
export function canonicalTwitterProfileId(options) {
    if (options.twitterId !== undefined) {
        return requireTwitterNumericId(options.twitterId, 'twitterId');
    }
    if (options.handle) {
        return requireTwitterHandle(options.handle);
    }
    throw new Error('Twitter profile requires handle or twitterId');
}
export function canonicalTwitterAccountSubject(twitterId) {
    return `user:id:${requireTwitterNumericId(twitterId, 'twitterId')}`;
}
/** `user:id` trust subject when `twitterId` is decimal digits; otherwise omit. */
export function xAccountTrustSubject(twitterId) {
    if (typeof twitterId !== 'string' || !isTwitterNumericId(twitterId)) {
        return undefined;
    }
    return { type: 'i', value: canonicalTwitterAccountSubject(twitterId) };
}
export function canonicalTwitterPostSubject(postId) {
    return `post:id:${requireTwitterNumericId(postId, 'postId')}`;
}
export function canonicalTwitterAccountClass() {
    return 'user:id';
}
export function canonicalTwitterPostClass() {
    return 'post:id';
}
export function canonicalTwitterPostUrl(postId) {
    return `https://x.com/i/web/status/${requireTwitterNumericId(postId, 'postId')}`;
}
export function canonicalNip39TwitterProofHint(proofPostId) {
    return `post:id:${requireTwitterNumericId(proofPostId, 'proofPostId')}`;
}
export function isCanonicalNip39TwitterProofHint(hint, proofPostId) {
    return isTwitterNumericId(proofPostId) && hint === `post:id:${proofPostId}`;
}
export function parseCanonicalTwitterSubject(subject) {
    const account = /^user:id:(\d+)$/.exec(subject);
    if (account) {
        return { type: 'account', twitterId: account[1] };
    }
    const post = /^post:id:(\d+)$/.exec(subject);
    if (post) {
        return { type: 'post', postId: post[1] };
    }
    return undefined;
}
export function buildNip39TwitterLinkTags(handle, twitterId, proofTweetId) {
    const normalizedHandle = requireTwitterHandle(handle);
    requireTwitterNumericId(twitterId, 'twitterId');
    if (proofTweetId === undefined) {
        return [
            ['i', `twitter:${normalizedHandle}`],
            ['i', `twitter_id:${twitterId}`],
        ];
    }
    requireTwitterNumericId(proofTweetId, 'proofTweetId');
    return [
        [
            'i',
            `twitter:${normalizedHandle}`,
            proofTweetId,
            canonicalNip39TwitterProofHint(proofTweetId),
        ],
        [
            'i',
            `twitter_id:${twitterId}`,
            proofTweetId,
            canonicalNip39TwitterProofHint(proofTweetId),
        ],
    ];
}
