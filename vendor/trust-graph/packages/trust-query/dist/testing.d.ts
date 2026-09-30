import type { EventRecord } from '@dtp/trust-protocol';
import { Graph } from '@dtp/trust-graph';
import type { IResolveStrategy } from '@dtp/trust-graph';
import type { RatingQuery, RatingQueryResult, ResolveBounds, TrustQuery, TrustQueryResult, TrustSubject, TrustValue } from './types';
import type { NeighborhoodOptions, NeighborhoodResult } from './graph';
export declare function trustRecord(eventId: string, author: string, subject: TrustSubject, value: TrustValue, options?: {
    context?: string;
    createdAt?: number;
    activeFrom?: number;
    activeUntil?: number;
    content?: string;
    labels?: string[];
    labelHints?: Record<string, string>;
}): EventRecord;
export declare function ratingRecord(eventId: string, author: string, subject: TrustSubject, score: number, options?: {
    context?: string;
    labels?: string[];
    labelHints?: Record<string, string>;
    content?: string;
    createdAt?: number;
    activeFrom?: number;
    activeUntil?: number;
}): EventRecord;
export declare class HeapTrustHarness {
    #private;
    readonly graph: Graph;
    graphVersion: number;
    readonly defaultBounds: Readonly<ResolveBounds>;
    constructor(statements?: Iterable<EventRecord>, defaultBounds?: Partial<ResolveBounds>, resolver?: IResolveStrategy);
    upsert(statement: EventRecord): boolean;
    rebuild(statements: Iterable<EventRecord>): {
        accepted: number;
        graphVersion: number;
    };
    get trustGraph(): Graph;
    bindIdentity(iSubject: string, pubkey: string): void;
    query(query: TrustQuery): TrustQueryResult;
    rebuildClaims(claims: Iterable<EventRecord>): void;
    queryRating(query: RatingQuery): RatingQueryResult;
    neighborhood(centerId: NeighborhoodResult['centerId'], options?: NeighborhoodOptions): NeighborhoodResult;
}
