/**
 * Hop threshold used by the vendored `IndexResolver`. Moved unchanged from
 * AttentionX `shared/trust-score.ts` (library.md § Extraction plan).
 */
/** Trust + distrust. Neutrals are not scored. */
export declare function trustScoredCount(trust: number, distrust: number): number;
/**
 * Share percent: `Math.round((trust * 100) / scored)`.
 * Null when there are no Trust or Distrust edges.
 */
export declare function trustScorePercent(trust: number, distrust: number): number | null;
/** Green hop / Trusted cut: rounded share percent at or above green. */
export declare function meetsFollowTrustGreen(trust: number, distrust: number, green: number): boolean;
