import type { TrustSubject } from '../types';
/** Stable node id for a trust subject (matches heap Graph View ids). */
export declare function subjectNodeId(subject: TrustSubject): string;
/** Parse a graph node id back into a TrustSubject when possible. */
export declare function parseNodeId(nodeId: string): TrustSubject | undefined;
