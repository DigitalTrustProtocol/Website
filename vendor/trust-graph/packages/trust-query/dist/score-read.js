// Ported from AttentionX src/graph/score-read.ts (imports rewritten for @dtp/* packages).
/**
 * Read 32009 counts from a resolver score. RatingScore has none of these.
 */
import { TrustScore } from '@dtp/trust-graph';
export function trustScoreCounts(score) {
    if (score instanceof TrustScore) {
        return {
            trust: score.trust,
            distrust: score.distrust,
            trustValue: score.trustValue,
            neutral: score.neutral,
        };
    }
    return { trust: 0, distrust: 0, trustValue: 0, neutral: 0 };
}
