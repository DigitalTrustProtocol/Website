import { type Event, type EventTemplate } from 'nostr-tools';
export declare const TRUST_STATEMENT_KIND = 32009;
export declare const TRUST_STATEMENT_CONTENT_LIMIT = 1024;
export declare const TRUST_CONTEXT_BYTE_LIMIT = 128;
export declare const TRUST_SCOPE_BYTE_LIMIT = 128;
export declare const TRUST_LABEL_BYTE_LIMIT = 128;
export type TrustValue = '1' | '0' | '-1' | '';
/** Structured subject hint: class:property:value */
export interface StructuredTrustHint {
    class: string;
    property: string;
    value: string;
}
/**
 * Subject-tag hint: structured class:property:value, or bare canonical npub1…
 * (NIP-19). Hints never enter `d` material.
 */
export type SubjectHint = {
    kind: 'structured';
    class: string;
    property: string;
    value: string;
} | {
    kind: 'npub';
    npub: string;
};
export type TrustSubject = {
    type: 'p';
    value: string;
} | {
    type: 'e';
    value: string;
} | {
    type: 'i';
    value: string;
};
export type TrustStatementActiveStatus = 'active' | 'cancelled' | 'not_yet_active' | 'expired';
export interface BuildKind32009Input {
    subject: TrustSubject;
    value: TrustValue;
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
export interface ParsedKind32009 {
    event: Event;
    d: string;
    subject: TrustSubject;
    value: TrustValue;
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
export interface Kind32009ValidationOptions {
    verifyEvent?: boolean;
}
export type Kind32009ValidationResult = {
    valid: true;
    statement: ParsedKind32009;
} | {
    valid: false;
    errors: string[];
};
export interface ReducedKind32009 {
    statements: ParsedKind32009[];
    rejected: Array<{
        event: Event;
        errors: string[];
    }>;
}
export declare class Kind32009ValidationError extends Error {
    readonly errors: string[];
    constructor(errors: string[]);
}
export declare function sha256Hex(value: string): Promise<string>;
export declare function isCanonicalTrustContext(context: string): boolean;
export declare function isCanonicalTrustScope(scope: string): boolean;
export declare function isCanonicalTrustLabel(label: string): boolean;
export declare function canonicalTrustLabels(labels: readonly string[]): string[];
export declare function cloneLabelHints(hints: Record<string, string> | undefined): Record<string, string> | undefined;
export declare function parseHumanLabelTags(labelTags: string[][], errors: string[], isCanonicalLabel: (label: string) => boolean): {
    labels: string[];
    labelHints?: Record<string, string>;
};
export declare function canonicalScopeString(scopes: readonly string[]): string;
export declare function getStructuredTrustHintValidationError(hint: StructuredTrustHint): string | undefined;
export declare function serializeStructuredTrustHint(hint: StructuredTrustHint): string;
export declare function parseStructuredTrustHint(value: string): StructuredTrustHint | undefined;
/** Canonical lowercase npub1…, or undefined if not a valid NIP-19 npub. */
export declare function canonicalizeNpubHint(value: string): string | undefined;
export declare function serializeSubjectHint(hint: SubjectHint): string;
export declare function parseSubjectHint(value: string): SubjectHint | undefined;
/** First bare npub hint on a subject tag, if any. */
export declare function subjectNpubFromHints(hints: readonly SubjectHint[]): string | undefined;
export declare function contextFallbackChain(context: string): string[];
export declare function canonicalizeWebUrl(value: string): string;
export declare function getTrustSubjectValidationError(subject: TrustSubject): string | undefined;
export declare function buildKind32009Material(subject: TrustSubject, scopes?: readonly string[], context?: string): string;
export declare function buildKind32009D(subject: TrustSubject, scopes?: readonly string[], context?: string): Promise<string>;
export declare function buildKind32009Event(input: BuildKind32009Input): Promise<EventTemplate>;
export declare function validateKind32009Event(event: unknown, options?: Kind32009ValidationOptions): Promise<Kind32009ValidationResult>;
export declare function parseKind32009Event(event: Event, options?: Kind32009ValidationOptions): Promise<ParsedKind32009>;
export declare function isNewerKind32009Replacement(candidate: ParsedKind32009, current: ParsedKind32009): boolean;
export declare function reduceKind32009Events(events: readonly Event[], options?: Kind32009ValidationOptions): Promise<ReducedKind32009>;
export declare function getTrustStatementActiveStatus(statement: ParsedKind32009, now: number): TrustStatementActiveStatus;
export declare function isTrustStatementActive(statement: ParsedKind32009, now: number): boolean;
export declare function resolveTrustStatementContext(statements: readonly ParsedKind32009[], requestedContext: string): ParsedKind32009 | undefined;
export declare const buildTrustStatementEvent: typeof buildKind32009Event;
export declare const parseTrustStatementEvent: typeof parseKind32009Event;
export declare const validateTrustStatementEvent: typeof validateKind32009Event;
export declare const reduceTrustStatementEvents: typeof reduceKind32009Events;
