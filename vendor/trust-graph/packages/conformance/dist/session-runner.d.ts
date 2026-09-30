/**
 * Session suite (conformance.md § One API: the session suite): scripted
 * WebSocket sessions run against a started server. Each step sends one
 * frame and lists the frames it expects back, in order (or in any order with
 * `unordered`). Expectations are partial (see match.ts); numbers compare
 * within NUMBER_TOLERANCE, so `1.5e-6` and `0.0000015` are the same value.
 * Matcher objects for values a server chooses: `{ "$prefix": "invalid:" }`,
 * `{ "$type": "string" }`, `{ "$any": true }`, and `{ "$unordered": [...] }`
 * for arrays whose order is implementation-local.
 *
 * Capability gating: a session or step may list `requires` entries. An
 * operation name must appear in the server's `dtp.capabilities`; `fixed:Gn`
 * holds when `dtp.gaps` does not list `Gn`. When a requirement fails, the
 * step asserts `otherwise` if given, else it is skipped.
 */
export interface SessionStep {
    note?: string;
    send: unknown[];
    expect: unknown[][];
    /** Frames may arrive in any order. */
    unordered?: boolean;
    requires?: string[];
    /** Asserted instead of `expect` when a requirement is not met. */
    otherwise?: unknown[][];
}
export interface SessionCase {
    id: string;
    api: string;
    description?: string;
    /** Server settings the session assumes (e.g. `auth.reads: open`). */
    config: Record<string, unknown>;
    requires?: string[];
    steps: SessionStep[];
}
/** What a server says it supports: `dtp.capabilities` and `dtp.gaps`. */
export interface ServerFeatures {
    capabilities: readonly string[];
    gaps?: readonly string[];
}
export declare function loadSessions(dir?: string): Array<{
    file: string;
    session: SessionCase;
}>;
export declare function requirementMet(requirement: string, features: ServerFeatures): boolean;
/** Partial match with `$prefix` / `$type` / `$any` / `$unordered` matchers. */
export declare function matchFrame(actual: unknown, expected: unknown, path?: string): string[];
export interface SessionOutcome {
    step: number;
    note?: string;
    /** A requirement was not met and the step has no `otherwise`. */
    skipped?: boolean;
    /** A requirement was not met and the step asserted its `otherwise` frames. */
    otherwise?: true;
    errors: string[];
}
interface MinimalSocket {
    send(data: string): void;
    close(): void;
    addEventListener(type: 'message', listener: (event: {
        data: unknown;
    }) => void): void;
    addEventListener(type: 'open' | 'error' | 'close', listener: () => void): void;
}
/**
 * Run one session against `url`; the socket's AUTH challenge is ignored.
 * `DTP-PUSH` frames are matched only by steps that expect one; other pushes
 * are dropped. When the session has requirements and `features` is not
 * given, the runner first asks the server with `info`.
 */
export declare function runSession(url: string, session: SessionCase, options?: {
    WebSocket?: new (url: string) => MinimalSocket;
    timeoutMs?: number;
    features?: ServerFeatures;
}): Promise<SessionOutcome[]>;
export {};
