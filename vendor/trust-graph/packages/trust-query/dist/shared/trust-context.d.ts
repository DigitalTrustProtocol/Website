/**
 * Attention product context (`c` tag) for kind 32009 / 32014.
 *
 * Person trust publishes `identity`. Post trust and post ratings omit `c`.
 * Trust queries always use `identity` so traversal follows person hops;
 * empty post slots still resolve through identity→general fallback.
 * Third-party events may still carry other canonical contexts; product paths
 * do not select them.
 */
export declare const IDENTITY_TRUST_CONTEXT = "identity";
export type TrustContextSubject = {
    type: 'p' | 'e' | 'i';
    value: string;
};
export declare function isPersonTrustSubject(subject: TrustContextSubject): boolean;
export declare function isPostTrustSubject(subject: TrustContextSubject): boolean;
/** Kind 32009 query context. Always `identity` so Trust hops walk the
 * person-trust graph; empty post slots still resolve via identity→general. */
export declare function trustQueryContextForSubject(_subject: TrustContextSubject): string;
export declare function trustPublishContextForSubject(subject: TrustContextSubject): string;
/** Kind 32014 query/publish context. Product ratings omit `c`. */
export declare function ratingQueryContextForSubject(_subject: TrustContextSubject): string;
export declare function ratingPublishContextForSubject(subject: TrustContextSubject): string;
/** Spread onto RPC payloads; omit the field when context is empty. */
export declare function contextField(context: string | undefined): {
    context?: string;
};
