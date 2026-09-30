/**
 * Vendored from DigitalTrustProtocol/Trust (IndexResolver.ts).
 * Attention: returns Score[] (no ApiEnvelope); default followTrustThreshold = 75.
 */
import type { IResolveStrategy, IResolveStrategyOptions } from './IResolveStrategy';
import { type Score } from './Score';
export declare class IndexResolver implements IResolveStrategy {
    readonly name = "graph";
    resolve(observerId: string, subjectId: string, options?: IResolveStrategyOptions): Score[];
    private meetsThreshold;
    private buildIncomingEdges;
}
declare const indexResolver: IndexResolver;
export default indexResolver;
