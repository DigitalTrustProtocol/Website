import { type Event, type EventTemplate } from 'nostr-tools';
import { type SubjectHint, type TrustSubject } from './kind-32009';
export declare const RATING_STATEMENT_KIND = 32014;
export declare const RATING_STATEMENT_CONTENT_LIMIT = 1024;
export declare const RATING_LABEL_BYTE_LIMIT = 128;
export declare const RATING_SCORE_MAX_FRACTION_DIGITS = 6;
export type RatingSubject = TrustSubject;
export type RatingStatementActiveStatus = 'active' | 'cancelled' | 'not_yet_active' | 'expired';
export interface BuildKind32014Input {
    subject: RatingSubject;
    /** Empty string = cancel. Canonical number in [0, 100] otherwise. */
    score: string;
    context?: string;
    scopes?: string[];
    k?: string;
    labels?: string[];
    activationTime?: number;
    expirationTime?: number;
    content?: string;
    createdAt: number;
    subjectHints?: SubjectHint[];
    extraTags?: string[][];
}
export interface ParsedKind32014 {
    event: Event;
    d: string;
    subject: RatingSubject;
    /** Empty string when cancelled; otherwise a canonical score in [0, 100]. */
    score: string;
    /** Numeric score when active; undefined when cancelled. */
    scoreValue?: number;
    context: string;
    scopes: string[];
    labels: string[];
    /** Sanitized descriptions keyed by label token. Display only; not in `d`. */
    labelHints?: Record<string, string>;
    k?: string;
    activationTime?: number;
    expirationTime?: number;
    subjectHints: SubjectHint[];
    /** Sanitized reason text. Signed `event.content` is left unchanged. */
    content: string;
}
export interface Kind32014ValidationOptions {
    verifyEvent?: boolean;
}
export type Kind32014ValidationResult = {
    valid: true;
    statement: ParsedKind32014;
} | {
    valid: false;
    errors: string[];
};
export interface ReducedKind32014 {
    statements: ParsedKind32014[];
    rejected: Array<{
        event: Event;
        errors: string[];
    }>;
}
export declare class Kind32014ValidationError extends Error {
    readonly errors: string[];
    constructor(errors: string[]);
}
export declare function isCanonicalRatingLabel(label: string): boolean;
export declare function canonicalRatingLabels(labels: readonly string[]): string[];
/**
 * Canonical score wire form, or undefined if invalid.
 * Empty string is cancel (not a number). `"0"` is an active rating.
 */
export declare function canonicalizeRatingScore(value: string): string | undefined;
export declare function parseRatingScoreValue(score: string): number | undefined;
export declare function buildKind32014Event(input: BuildKind32014Input): Promise<EventTemplate>;
export declare function validateKind32014Event(event: unknown, options?: Kind32014ValidationOptions): Promise<Kind32014ValidationResult>;
export declare function parseKind32014Event(event: Event, options?: Kind32014ValidationOptions): Promise<ParsedKind32014>;
export declare function isNewerKind32014Replacement(candidate: ParsedKind32014, current: ParsedKind32014): boolean;
export declare function reduceKind32014Events(events: readonly Event[], options?: Kind32014ValidationOptions): Promise<ReducedKind32014>;
export declare function getRatingStatementActiveStatus(statement: ParsedKind32014, now: number): RatingStatementActiveStatus;
export declare function isRatingStatementActive(statement: ParsedKind32014, now: number): boolean;
export declare const buildRatingStatementEvent: typeof buildKind32014Event;
export declare const parseRatingStatementEvent: typeof parseKind32014Event;
export declare const validateRatingStatementEvent: typeof validateKind32014Event;
export declare const reduceRatingStatementEvents: typeof reduceKind32014Events;
