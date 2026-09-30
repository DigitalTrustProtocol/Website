/**
 * Session suite (conformance.md § One API: the session suite): scripted
 * WebSocket sessions run against a started server. Each step sends one
 * frame and lists the frames it expects back, in order. Expectations are
 * partial (see match.ts) with three matcher objects for values a server
 * chooses: `{ "$prefix": "invalid:" }`, `{ "$type": "string" }`,
 * `{ "$any": true }`.
 */
export interface SessionStep {
    note?: string;
    send: unknown[];
    expect: unknown[][];
}
export interface SessionCase {
    id: string;
    api: string;
    description?: string;
    /** Server settings the session assumes (e.g. `auth.reads: open`). */
    config: Record<string, unknown>;
    steps: SessionStep[];
}
export declare function loadSessions(dir?: string): Array<{
    file: string;
    session: SessionCase;
}>;
/** Partial match with `$prefix` / `$type` / `$any` matchers. */
export declare function matchFrame(actual: unknown, expected: unknown, path?: string): string[];
export interface SessionOutcome {
    step: number;
    note?: string;
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
/** Run one session against `url`; the socket's AUTH challenge is ignored. */
export declare function runSession(url: string, session: SessionCase, options?: {
    WebSocket?: new (url: string) => MinimalSocket;
    timeoutMs?: number;
}): Promise<SessionOutcome[]>;
export {};
