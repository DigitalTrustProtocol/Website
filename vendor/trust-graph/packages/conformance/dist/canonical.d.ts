/**
 * Order-insensitive fields (conformance.md § Canonical comparison): both the
 * actual output and the expectation are sorted the same way before matching,
 * so expectations may list set-valued arrays in any order.
 */
type Json = unknown;
/** Sort the set-valued arrays of one query output (or expectation) in place. */
export declare function canonicalizeSets(type: string, value: Json): Json;
export {};
