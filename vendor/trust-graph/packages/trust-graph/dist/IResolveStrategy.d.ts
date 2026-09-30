/**
 * Vendored from DigitalTrustProtocol/Trust (IResolveStrategy.ts).
 * Attention: resolve returns Score[] (no server ApiEnvelope).
 */
import type { IGraph } from './Graph';
import type { Score } from './Score';
/** Output format: default (counts + degree). `path` is handled in query.ts. */
export type ResolveFormat = 'number' | 'default' | 'path';
export type ScoreKind = 32009 | 32014;
export interface IResolveStrategyOptions {
    graph?: IGraph;
    maxDepth?: number;
    stopWhenFound?: boolean;
    trustContext?: string;
    scoreContext?: string;
    followTrustThreshold?: number;
    respectDirectDistrust?: boolean;
    format?: ResolveFormat;
    /** Unix seconds for edge activate/expire checks (default: now). */
    now?: number;
    /** Evidence kind to score. Default: 32009. Hops always walk 32009 Trust(+1). */
    kind?: ScoreKind;
}
export interface IResolveStrategy {
    readonly name: string;
    resolve(authorId: string, subjectId: string, options?: IResolveStrategyOptions): Score[];
}
