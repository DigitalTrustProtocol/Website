// Ported from AttentionX src/shared/wot-follow-trust-threshold.ts (imports rewritten for @dtp/* packages).
/** Red/yellow boundary default (percent). Yellow is the open interval. */
export const FOLLOW_TRUST_RED_DEFAULT = 25;
/** Green/hop boundary default (percent). Peers at or above this are hops. */
export const FOLLOW_TRUST_GREEN_DEFAULT = 75;
/** @deprecated Use FOLLOW_TRUST_GREEN_DEFAULT. Hop default equals the green knob. */
export const FOLLOW_TRUST_THRESHOLD_DEFAULT = FOLLOW_TRUST_GREEN_DEFAULT;
/** Slider / clamp minimum percent. */
export const FOLLOW_TRUST_THRESHOLD_MIN = 0;
/** Slider / clamp maximum percent. */
export const FOLLOW_TRUST_THRESHOLD_MAX = 100;
/** Graph settings slider step. */
export const FOLLOW_TRUST_THRESHOLD_STEP = 1;
export const WOT_FOLLOW_TRUST_THRESHOLD_CHANGED_MESSAGE = 'WOT_FOLLOW_TRUST_THRESHOLD_CHANGED';
export const DEFAULT_FOLLOW_TRUST_BAND = {
    red: FOLLOW_TRUST_RED_DEFAULT,
    green: FOLLOW_TRUST_GREEN_DEFAULT,
};
function clampIntegerPercent(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        const rounded = Math.round(value);
        if (Number.isSafeInteger(rounded)) {
            return Math.min(FOLLOW_TRUST_THRESHOLD_MAX, Math.max(FOLLOW_TRUST_THRESHOLD_MIN, rounded));
        }
    }
    return fallback;
}
function snapFollowTrustPercent(value, fallback) {
    const clamped = clampIntegerPercent(value, fallback);
    if (typeof value !== 'number' || !Number.isFinite(value))
        return fallback;
    const snapped = Math.round(clamped / FOLLOW_TRUST_THRESHOLD_STEP) *
        FOLLOW_TRUST_THRESHOLD_STEP;
    return Math.min(FOLLOW_TRUST_THRESHOLD_MAX, Math.max(FOLLOW_TRUST_THRESHOLD_MIN, snapped));
}
/** Hop green percent: integer 0–100, default 75. */
export function clampFollowTrustThreshold(value) {
    return clampIntegerPercent(value, FOLLOW_TRUST_GREEN_DEFAULT);
}
/** Red knob relative to a hop green: integer 0–100, may equal green (no yellow). */
export function clampFollowTrustRed(value, green) {
    const hop = clampFollowTrustThreshold(green);
    const red = clampIntegerPercent(value, FOLLOW_TRUST_RED_DEFAULT);
    return Math.min(red, hop);
}
/**
 * Settings pair: integer 0–100, `red <= green`.
 * When the pair would cross, squeeze red down so they meet (no yellow).
 */
export function clampFollowTrustBand(red, green) {
    const nextGreen = snapFollowTrustPercent(green, FOLLOW_TRUST_GREEN_DEFAULT);
    let nextRed = snapFollowTrustPercent(red, FOLLOW_TRUST_RED_DEFAULT);
    if (nextRed > nextGreen)
        nextRed = nextGreen;
    return { red: nextRed, green: nextGreen };
}
/**
 * Drag one knob; it pushes the other when they meet and never crosses.
 * Green pulled below red drags red down; red pushed above green drags green up.
 */
export function moveFollowTrustKnob(current, knob, value) {
    if (knob === 'green') {
        const green = snapFollowTrustPercent(value, current.green);
        return clampFollowTrustBand(Math.min(current.red, green), green);
    }
    const red = snapFollowTrustPercent(value, current.red);
    return clampFollowTrustBand(red, Math.max(current.green, red));
}
/** Migrate stored settings: legacy `followTrustThreshold` is green. */
export function followTrustBandFromStored(stored) {
    const green = stored.followTrustGreen ?? stored.followTrustThreshold;
    return clampFollowTrustBand(stored.followTrustRed, green);
}
export function sameFollowTrustBand(left, right) {
    return left.red === right.red && left.green === right.green;
}
/**
 * Share percent vs the follow-trust band (defaults 25 / 75).
 * Null percent (unscored) is `none`.
 */
export function resolutionFromPercent(percent, band = DEFAULT_FOLLOW_TRUST_BAND) {
    if (percent === null)
        return 'none';
    if (percent >= band.green)
        return 'trusted';
    if (percent < band.red)
        return 'distrusted';
    return 'mixed';
}
export function toneFromPercent(percent, band = DEFAULT_FOLLOW_TRUST_BAND) {
    const resolution = resolutionFromPercent(percent, band);
    switch (resolution) {
        case 'trusted':
            return 'trust';
        case 'mixed':
            return 'question';
        case 'distrusted':
            return 'misleading';
        case 'none':
            return 'neutral';
        default: {
            const _exhaustive = resolution;
            return _exhaustive;
        }
    }
}
