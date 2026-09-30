/** Red/yellow boundary default (percent). Yellow is the open interval. */
export declare const FOLLOW_TRUST_RED_DEFAULT = 25;
/** Green/hop boundary default (percent). Peers at or above this are hops. */
export declare const FOLLOW_TRUST_GREEN_DEFAULT = 75;
/** @deprecated Use FOLLOW_TRUST_GREEN_DEFAULT. Hop default equals the green knob. */
export declare const FOLLOW_TRUST_THRESHOLD_DEFAULT = 75;
/** Slider / clamp minimum percent. */
export declare const FOLLOW_TRUST_THRESHOLD_MIN = 0;
/** Slider / clamp maximum percent. */
export declare const FOLLOW_TRUST_THRESHOLD_MAX = 100;
/** Graph settings slider step. */
export declare const FOLLOW_TRUST_THRESHOLD_STEP = 1;
export declare const WOT_FOLLOW_TRUST_THRESHOLD_CHANGED_MESSAGE: "WOT_FOLLOW_TRUST_THRESHOLD_CHANGED";
export interface FollowTrustBand {
    red: number;
    green: number;
}
export declare const DEFAULT_FOLLOW_TRUST_BAND: FollowTrustBand;
export type FollowTrustResolution = 'trusted' | 'distrusted' | 'mixed' | 'none';
export type FollowTrustTone = 'trust' | 'question' | 'misleading' | 'neutral';
/** Hop green percent: integer 0–100, default 75. */
export declare function clampFollowTrustThreshold(value: unknown): number;
/** Red knob relative to a hop green: integer 0–100, may equal green (no yellow). */
export declare function clampFollowTrustRed(value: unknown, green: number): number;
/**
 * Settings pair: integer 0–100, `red <= green`.
 * When the pair would cross, squeeze red down so they meet (no yellow).
 */
export declare function clampFollowTrustBand(red: unknown, green: unknown): FollowTrustBand;
/**
 * Drag one knob; it pushes the other when they meet and never crosses.
 * Green pulled below red drags red down; red pushed above green drags green up.
 */
export declare function moveFollowTrustKnob(current: FollowTrustBand, knob: 'red' | 'green', value: unknown): FollowTrustBand;
/** Migrate stored settings: legacy `followTrustThreshold` is green. */
export declare function followTrustBandFromStored(stored: {
    followTrustRed?: unknown;
    followTrustGreen?: unknown;
    followTrustThreshold?: unknown;
}): FollowTrustBand;
export declare function sameFollowTrustBand(left: FollowTrustBand, right: FollowTrustBand): boolean;
/**
 * Share percent vs the follow-trust band (defaults 25 / 75).
 * Null percent (unscored) is `none`.
 */
export declare function resolutionFromPercent(percent: number | null, band?: FollowTrustBand): FollowTrustResolution;
export declare function toneFromPercent(percent: number | null, band?: FollowTrustBand): FollowTrustTone;
