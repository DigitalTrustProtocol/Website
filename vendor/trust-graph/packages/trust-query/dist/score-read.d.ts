/**
 * Read 32009 counts from a resolver score. RatingScore has none of these.
 */
import { type Score } from '@dtp/trust-graph';
export declare function trustScoreCounts(score: Score): {
    trust: number;
    distrust: number;
    trustValue: number;
    /** Hitting-degree Neutral edges. Not in `count` / percent. */
    neutral: number;
};
