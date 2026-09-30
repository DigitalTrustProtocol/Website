/**
 * Playground engine interface (tech.md § Playground).
 *
 * The playground is a *client* of the model: it never walks the graph
 * itself. All results come from a `PlaygroundEngine`, which will be a thin
 * adapter over `@dtp/trust-graph` / `@dtp/trust-query` once the TrustGraph
 * P0 packages exist. Until then `loadEngine()` returns `null` and the page
 * says so.
 *
 * Integration point: implement `createTrustGraphEngine()` in a new
 * `trust-graph-engine.ts` that maps `DemoGraph` records to the library's
 * edge records and claims (wot-model.md §2.1, §2.6) and maps its trust and
 * rating results back to `PlaygroundResult`, then return it from
 * `loadEngine()` via a dynamic import so it stays in the lazy playground
 * chunk (≤ 250 KB gzip).
 */

export type BindingMode = 'lenient' | 'strict';
export type TrustValue = -1 | 0 | 1;
export type Resolution = 'trusted' | 'mixed' | 'distrusted' | 'none';

/** A person in the demo graph (a Nostr pubkey). */
export interface DemoPerson {
  pubkey: string;
  label: string;
}

/** An X account in the demo graph, addressed as `user:id:<digits>`. */
export interface DemoXAccount {
  id: string;
  handle: string;
}

/** A normalized kind 32009 record, shaped like wot-model.md §2.1 edge records. */
export interface DemoStatement {
  id: string;
  pubkey: string;
  createdAt: number;
  subjectType: 'p' | 'i';
  subject: string;
  context: string;
  value: TrustValue;
  activate?: number;
  expire?: number;
  /** npub hint on a `user:id` subject (identity-binding.md §2). */
  hintPubkey?: string;
}

/** A kind 10011 claim: `pubkey` claims the X account `xId` (wot-model.md §2.6). */
export interface DemoClaim {
  pubkey: string;
  xId: string;
}

export interface DemoGraph {
  people: DemoPerson[];
  xAccounts: DemoXAccount[];
  statements: DemoStatement[];
  claims: DemoClaim[];
}

export interface PlaygroundQuery {
  root: string;
  subject: string;
  /** Green knob, 0–100 (hop threshold and trusted band). */
  green: number;
  /** Red knob, 0–100, `red ≤ green`. */
  red: number;
  /** 1–7. */
  maxDegree: number;
  bindingMode: BindingMode;
  /** Evaluation time in seconds, for `x` / `y` windows. */
  now: number;
  /** Statement ids switched off by the visitor. */
  disabledStatements: string[];
  /** Claims switched off by the visitor, as `pubkey:xId`. */
  disabledClaims: string[];
}

export interface EvidenceItem {
  eventId: string;
  author: string;
  value: TrustValue;
  distance: number;
}

export interface PathEdge {
  from: string;
  to: string;
  value: TrustValue;
}

export interface BindingState {
  xId: string;
  state: 'bound' | 'unconfirmed' | 'cut' | 'unbound';
  pubkey?: string;
  reason?: string;
}

export interface PlaygroundResult {
  resolution: Resolution;
  degree: number;
  trust: number;
  distrust: number;
  neutral: number;
  evidence: EvidenceItem[];
  path: PathEdge[];
  bindings: BindingState[];
  truncated: boolean;
}

export interface PlaygroundEngine {
  /** Package and version, shown under the results, for example `@dtp/trust-graph 0.1.0`. */
  readonly label: string;
  resolve(graph: DemoGraph, query: PlaygroundQuery): PlaygroundResult;
}

/** Returns the engine, or `null` while `@dtp/trust-graph` is not available. */
export async function loadEngine(): Promise<PlaygroundEngine | null> {
  return null;
}
