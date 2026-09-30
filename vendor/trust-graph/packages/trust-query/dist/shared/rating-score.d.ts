import { type FollowTrustBand, type FollowTrustTone } from './wot-follow-trust-threshold';
/** Mean of 0–100 claim scores. Empty → null. */
export declare function averageRatingScore(scores: readonly number[]): number | null;
export declare function roundRatingScore(score: number): number;
/** Same red / green knobs as user trust. No score stays gray. */
export declare function ratingScoreTone(score: number | null, band?: FollowTrustBand): FollowTrustTone;
