/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/graph/Edge.ts).
 * Attention: the heap edge is the EventRecord. Validity is a module function.
 */
import type { ITrustEvent } from './types';
export type IEdge = ITrustEvent;
export declare function isValidAt(edge: IEdge, now?: number): boolean;
export declare function trustEdgeValue(edge: IEdge): -1 | 0 | 1 | undefined;
