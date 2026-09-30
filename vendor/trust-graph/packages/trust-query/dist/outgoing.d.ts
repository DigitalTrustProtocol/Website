import type { TrustEdgeRecord as EventRecord } from '@dtp/trust-graph';
import type { ResolvedStatement } from './types';
/** Cap for outgoing user:id statements returned to Notes. */
export declare const MAX_OUTGOING_TRUST_STATEMENTS = 200;
/** True when this winner is an active user:id statement by one of `authorPubkeys`. */
export declare function isOutgoingUserStatement(statement: EventRecord, authorPubkeys: ReadonlySet<string>): boolean;
export declare function toOutgoingResolvedStatement(statement: EventRecord): ResolvedStatement;
export declare function selectOutgoingUserStatements(statements: readonly EventRecord[], authorPubkeys: ReadonlySet<string>): {
    statements: ResolvedStatement[];
    truncated: boolean;
};
export declare function outgoingTargetTwitterId(statement: Pick<ResolvedStatement, 'subject'>): string | undefined;
