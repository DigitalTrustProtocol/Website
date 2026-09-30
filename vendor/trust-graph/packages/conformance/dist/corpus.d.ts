/**
 * Corpus loading (conformance.md § Corpus layout). `@name` placeholders in
 * any string expand to `sha256(name)` as lowercase hex, so cases stay
 * readable and every runner derives identical ids and pubkeys.
 */
export declare const CORPUS_FORMAT = "dtp-wot-corpus/1";
export declare const MODEL_VERSION = "dtp-wot/1";
/** `TrustGraph/corpus`, resolved from this module (works from src and dist). */
export declare const corpusDir: string;
export interface CorpusManifest {
    corpus: string;
    model: string;
    cases: string[];
    /** Session-suite files (conformance.md § One API). */
    sessions?: string[];
}
export declare function placeholderHex(name: string): string;
/** Deep copy with every `@name` inside strings replaced by its hex. */
export declare function expandPlaceholders<T>(value: T): T;
export declare function loadManifest(dir?: string): CorpusManifest;
export interface LoadedCase<T> {
    file: string;
    raw: T;
    expanded: T;
}
export declare function loadCase<T>(file: string, dir?: string): LoadedCase<T>;
