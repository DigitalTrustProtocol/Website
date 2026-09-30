// Ported from AttentionX src/shared/trust-score.ts. The hop-threshold helpers
// moved into @dtp/trust-graph (the heap imports them); they are re-exported
// here so this module keeps the extension's surface.
import { meetsFollowTrustGreen, trustScorePercent, trustScoredCount, } from '@dtp/trust-graph';
import { DEFAULT_FOLLOW_TRUST_BAND, resolutionFromPercent, } from './wot-follow-trust-threshold';
export { meetsFollowTrustGreen, trustScorePercent, trustScoredCount };
/**
 * Band resolution from hitting-degree counts.
 * Disconnected or unscored → `none`.
 */
export function trustScoreResolution(trust, distrust, connected, band = DEFAULT_FOLLOW_TRUST_BAND) {
    if (!connected)
        return 'none';
    return resolutionFromPercent(trustScorePercent(trust, distrust), band);
}
