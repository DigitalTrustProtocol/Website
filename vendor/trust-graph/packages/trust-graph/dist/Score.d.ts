/**
 * Vendored from DigitalTrustProtocol/Trust (src/lib/trust/resolvers/Score.ts).
 */
import { type IEdge } from './Edge';
import type { ScoreKind } from './IResolveStrategy';
export interface IScore {
    subjectIndex?: number;
    subject?: string;
    count: number;
    degree: number;
    connected: boolean;
    visited: boolean;
    authorIndex?: number;
    edges?: number[];
    kind?: number;
    add(edge: IEdge): boolean;
    reset(): void;
}
export interface ITrustScore extends IScore {
    trustValue: number;
    trust: number;
    neutral: number;
    distrust: number;
}
export interface IRatingScore extends IScore {
    ratingValue: number;
}
export declare class Score implements IScore {
    subject?: string;
    subjectIndex?: number;
    count: number;
    degree: number;
    connected: boolean;
    visited: boolean;
    authorIndex?: number;
    kind?: number;
    context?: string;
    edges?: number[];
    constructor(subjectIndex: number, degree?: number, kind?: number);
    add(edge: IEdge): boolean;
    reset(): void;
}
export declare function ScoreFactory(subjectIndex: number, degree: number, kind?: number): IScore;
export declare class TrustScore extends Score implements ITrustScore {
    private _nDegree;
    _trustValue: number;
    trust: number;
    neutral: number;
    distrust: number;
    get trustValue(): number;
    set trustValue(value: number);
    add(edge: IEdge): boolean;
    reset(): void;
}
export declare class RatingScore extends Score implements IRatingScore {
    ratingValue: number;
    add(edge: IEdge): boolean;
    reset(): void;
}
export declare class IndexScoreMap extends Map<number, IScore> {
    getScoreIndex(subjectIndex: number, kind: number): number;
    peek(nodeIndex: number, kind?: number): IScore | undefined;
    ensure(nodeIndex: number, degree: number, kind?: ScoreKind): IScore;
    getTrust(nodeIndex: number): ITrustScore | undefined;
}
