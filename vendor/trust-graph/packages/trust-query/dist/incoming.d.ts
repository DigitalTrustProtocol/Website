import type { TrustEdgeRecord as EventRecord } from '@dtp/trust-graph';
import type { ResolvedStatement, TrustSubject } from './types';
/** Cap for incoming 1-hop statements returned to Notes Trusted By. */
export declare const MAX_INCOMING_TRUST_STATEMENTS = 200;
/**
 * True when this winner targets the Notes user: `i:user:id` and/or a bound
 * npub (`p`). Graph neighborhood draws these 1-hop edges even when the
 * authors are outside the operator's last-degree WoT resolve.
 */
export declare function isIncomingUserStatement(statement: EventRecord, options: {
    twitterId?: string;
    pubkeyHexes: ReadonlySet<string>;
}): boolean;
export declare function toIncomingResolvedStatement(statement: EventRecord): ResolvedStatement;
export declare function incomingSubjectKeys(subject: TrustSubject): {
    twitterId?: string;
    pubkeyHexes: Set<string>;
};
/**
 * Map Graph.in winners to Notes rows.
 * A derived nostr key is the only issuer. An X id is a subject, not an author.
 * When that key already trusts the same person via `p` at the same value, the
 * matching `user:id` row is the same trust and is not listed again.
 * A different value stays (hop-mesh Trust plus user:id distrust).
 */
export declare function selectIncomingUserStatements(statements: readonly EventRecord[]): {
    statements: ResolvedStatement[];
    truncated: boolean;
};
