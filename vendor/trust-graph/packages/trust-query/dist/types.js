// Ported from AttentionX src/graph/types.ts (imports rewritten for @dtp/* packages).
import { trustScoreResolution } from './shared/trust-score';
import { DEFAULT_FOLLOW_TRUST_BAND, } from './shared/wot-follow-trust-threshold';
/** Share percent vs the follow-trust band (defaults 25 / 75). */
export function resolutionFromCounts(trust, distrust, connected, band = DEFAULT_FOLLOW_TRUST_BAND) {
    return trustScoreResolution(trust, distrust, connected, band);
}
