import { meetsFollowTrustGreen, trustScorePercent, trustScoredCount } from '@dtp/trust-graph';
import { type FollowTrustBand, type FollowTrustResolution } from './wot-follow-trust-threshold';
export { meetsFollowTrustGreen, trustScorePercent, trustScoredCount };
/**
 * Band resolution from hitting-degree counts.
 * Disconnected or unscored → `none`.
 */
export declare function trustScoreResolution(trust: number, distrust: number, connected: boolean, band?: FollowTrustBand): FollowTrustResolution;
