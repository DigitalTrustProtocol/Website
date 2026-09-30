// Ported from AttentionX src/shared/rating-score.ts (imports rewritten for @dtp/* packages).
import { DEFAULT_FOLLOW_TRUST_BAND, toneFromPercent, } from './wot-follow-trust-threshold';
/** Mean of 0–100 claim scores. Empty → null. */
export function averageRatingScore(scores) {
    if (scores.length === 0)
        return null;
    const sum = scores.reduce((total, score) => total + score, 0);
    return sum / scores.length;
}
export function roundRatingScore(score) {
    return Math.round(score);
}
/** Same red / green knobs as user trust. No score stays gray. */
export function ratingScoreTone(score, band = DEFAULT_FOLLOW_TRUST_BAND) {
    if (score === null)
        return 'neutral';
    return toneFromPercent(score, band);
}
