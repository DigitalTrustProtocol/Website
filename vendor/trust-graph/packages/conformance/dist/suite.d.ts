/**
 * Runs the corpus against the TypeScript packages. Used by the Vitest
 * wrapper in this package and by other TypeScript runtimes (Personal Server)
 * that want the same gate.
 */
import { type BindingMode, type ModelState } from './model-runner';
import type { AnyCase, CorpusQuery, ModelCase, ProtocolCase } from './types';
export interface CaseEntry {
    file: string;
    testCase: AnyCase;
}
export declare function loadCorpus(dir?: string): CaseEntry[];
export declare function gapTags(testCase: AnyCase): string[];
declare const MODES: readonly BindingMode[];
/** The TypeScript runner asserts `expectCurrent` for gap cases, else `expect`. */
export declare function tsExpectation(query: CorpusQuery, mode: BindingMode | undefined): unknown;
export interface QueryOutcome {
    label: string;
    errors: string[];
}
export declare function runModelQuery(state: ModelState, query: CorpusQuery, index: number): QueryOutcome[];
export declare function runModelCase(testCase: ModelCase): QueryOutcome[];
export declare function runProtocolEntry(testCase: ProtocolCase): Promise<string[]>;
/** Structural checks every case must pass, independent of the runtime. */
export declare function lintCase(testCase: AnyCase): string[];
export { MODES };
