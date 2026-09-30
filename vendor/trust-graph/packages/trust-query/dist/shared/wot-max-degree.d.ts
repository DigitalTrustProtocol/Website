/** Default Sync and Resolve max degree (slider default). */
export declare const WOT_MAX_DEGREE_DEFAULT = 4;
/** Hard upper bound for Sync and Resolve degree (slider max). */
export declare const WOT_MAX_DEGREE_HARD_CAP = 7;
/** Minimum Sync and Resolve degree (slider min). */
export declare const WOT_MAX_DEGREE_MIN = 1;
/** Inclusive slider degrees. Must stay contiguous from min through the hard cap. */
export declare const WOT_DEGREES: readonly [1, 2, 3, 4, 5, 6, 7];
export type WotDegree = (typeof WOT_DEGREES)[number];
/** Soft hint threshold (ms) for popup guidance — not auto-lower. */
export declare const WOT_RESOLVE_SOFT_HINT_MS = 25;
/** Auto-lower slider by one when a single cold resolve exceeds this (ms). */
export declare const WOT_RESOLVE_AUTO_LOWER_MS = 2000;
export declare const WOT_MAX_DEGREE_CHANGED_MESSAGE: "WOT_MAX_DEGREE_CHANGED";
export declare const RESOLVE_TIMING_STORAGE_KEY = "attentionxResolveTimingV1";
export declare function clampWotMaxDegree(value: unknown): number;
