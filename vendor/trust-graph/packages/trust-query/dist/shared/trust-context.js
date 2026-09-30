// Ported from AttentionX src/shared/trust-context.ts (imports rewritten for @dtp/* packages).
/**
 * Attention product context (`c` tag) for kind 32009 / 32014.
 *
 * Person trust publishes `identity`. Post trust and post ratings omit `c`.
 * Trust queries always use `identity` so traversal follows person hops;
 * empty post slots still resolve through identity→general fallback.
 * Third-party events may still carry other canonical contexts; product paths
 * do not select them.
 */
export const IDENTITY_TRUST_CONTEXT = 'identity';
export function isPersonTrustSubject(subject) {
    if (subject.type === 'p')
        return true;
    return subject.type === 'i' && subject.value.startsWith('user:id:');
}
export function isPostTrustSubject(subject) {
    return subject.type === 'i' && subject.value.startsWith('post:id:');
}
/** Kind 32009 query context. Always `identity` so Trust hops walk the
 * person-trust graph; empty post slots still resolve via identity→general. */
export function trustQueryContextForSubject(_subject) {
    return IDENTITY_TRUST_CONTEXT;
}
export function trustPublishContextForSubject(subject) {
    return isPersonTrustSubject(subject) ? IDENTITY_TRUST_CONTEXT : '';
}
/** Kind 32014 query/publish context. Product ratings omit `c`. */
export function ratingQueryContextForSubject(_subject) {
    return '';
}
export function ratingPublishContextForSubject(subject) {
    return ratingQueryContextForSubject(subject);
}
/** Spread onto RPC payloads; omit the field when context is empty. */
export function contextField(context) {
    return context ? { context } : {};
}
