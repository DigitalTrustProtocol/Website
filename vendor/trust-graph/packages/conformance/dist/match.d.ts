/**
 * Expectation matching. An expectation is a partial object: every key it
 * names must match; keys it omits are not compared. Arrays match element
 * by element and must have the same length. Numbers match within 1e-9
 * (conformance.md § Canonical comparison, `averageScore`).
 */
export declare const NUMBER_TOLERANCE = 1e-9;
export declare function matchPartial(actual: unknown, expected: unknown, path?: string): string[];
