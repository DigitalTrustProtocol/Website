/**
 * Vendored from DigitalTrustProtocol/Trust (IndexResolver.ts).
 * Attention: returns Score[] (no ApiEnvelope); default followTrustThreshold = 75.
 *
 * @dtp/trust-graph (decision D3): the walk follows wot-model.md §6 exactly.
 * One selected statement per author and node, first bucket of the chain,
 * then P2 inside the bucket (G2); ratings read their exact context only
 * (G1); disconnected results carry no evidence (G4, D4 option A); the
 * subject's hit counters are separate from its peer counters (G7); binds
 * are decided per root, level, and mode inside the walk (G8,
 * identity-binding.md §4); node / record / time budgets stop the walk at a
 * level boundary (G10, §6.2); `walk()` and `field()` expose the level
 * structure and the binds (G12). See DIVERGENCE.json.
 */
import type { FieldResult, IResolveStrategy, IResolveStrategyOptions, WalkResult } from './IResolveStrategy';
import { type Score } from './Score';
/** Walk budget defaults (resolver-api.md § Guardrails). */
export declare const DEFAULT_MAX_REACHED_NODES = 5000000;
export declare const DEFAULT_MAX_WALK_RECORDS = 50000000;
export declare class IndexResolver implements IResolveStrategy {
    readonly name = "graph";
    resolve(observerId: string, subjectId: string, options?: IResolveStrategyOptions): Score[];
    walk(observerId: string, subjectId: string, options?: IResolveStrategyOptions): WalkResult;
    /**
     * The walk's level structure from the root with no subject (gap G12):
     * levels `0 ..= D − 1`, qualifying nodes only, and the binds decided
     * while building them.
     */
    field(observerId: string, options?: IResolveStrategyOptions): FieldResult;
    private walker;
    /** Path format (wot-model.md §7.2): backward union of the statements that reached each evidence author. */
    private pathScores;
}
declare const indexResolver: IndexResolver;
export default indexResolver;
