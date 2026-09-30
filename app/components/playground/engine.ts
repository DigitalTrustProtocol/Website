/**
 * Playground engine interface (tech.md § Playground).
 *
 * The playground is a *client* of the model: it never walks the graph
 * itself. Scenarios are TrustGraph corpus model cases, and every result
 * comes from `@dtp/trust-graph` / `@dtp/trust-query` through the corpus
 * runner's own record mapping (`trust-graph-engine.ts`), vendored at one
 * TrustGraph commit (PLAN.md decision W-D9). `loadPlayground()` imports it
 * on demand, so it stays in the lazy playground chunk (≤ 250 KB gzip).
 */

export type BindingMode = 'lenient' | 'strict';
export type TrustValue = -1 | 0 | 1;
export type Resolution = 'trusted' | 'mixed' | 'distrusted' | 'none';
export type SubjectType = 'p' | 'e' | 'i';

/** A graph subject as `"<type>:<value>"`, for example `p:<hex>` or `i:user:id:1001`. */
export type SubjectKey = string;

/** A kind 32009 record of the scenario, in wot-model.md §2.1 field names. */
export interface ScenarioRecord {
  id: string;
  pubkey: string;
  kind: number;
  created_at: number;
  subjectType: SubjectType;
  subject: string;
  context?: string;
  value?: number;
  activate?: number;
  expire?: number;
  hintPubkey?: string;
}

/** A winning kind 10011 claim: `pubkey` claims the X account `twitterId`. */
export interface ScenarioClaim {
  pubkey: string;
  twitterId: string;
}

/** The root's own evidence (Bio or post) that the X account `iKey` is `pubkey`. */
export interface ScenarioOwnEvidence {
  root: string;
  iKey: string;
  pubkey: string;
  source: 'bio' | 'post';
}

/** One corpus query of the scenario, as playground controls plus what the corpus expects. */
export interface ScenarioPreset {
  /** Position of the query in the corpus case (0-based). */
  queryIndex: number;
  note?: string;
  mode?: BindingMode;
  query: PlaygroundQuery;
  /** What today's TypeScript heap must return: `expect`, or `expectCurrent` for gap cases. */
  expected: unknown;
  /** Gap cases: the proposed model rule (`expectModel`), not yet what the heap does. */
  modelRule?: unknown;
}

/** A TrustGraph corpus model case with its placeholders expanded. */
export interface Scenario {
  id: string;
  description?: string;
  tags: string[];
  /** Expanded hex → the corpus placeholder name (`@alice` → `alice`). */
  names: Record<string, string>;
  records: ScenarioRecord[];
  claims: ScenarioClaim[];
  ownEvidence: ScenarioOwnEvidence[];
  presets: ScenarioPreset[];
  /** Range for the time slider, in the case's seconds. */
  timeRange: [number, number];
}

export interface PlaygroundQuery {
  root: string;
  subject: SubjectKey;
  context: string;
  /** Green knob, 0–100 (hop threshold and trusted band). */
  green: number;
  /** Red knob, 0–100, `red ≤ green`. */
  red: number;
  /** 1–7. */
  maxDegree: number;
  bindingMode: BindingMode;
  /** Evaluation time in seconds, for `activate` / `expire` windows. */
  now: number;
  /** Inputs switched off by the visitor: record ids, `claimKey()`, and `ownKey()` values. */
  disabled: string[];
}

export interface EvidenceItem {
  eventId: string;
  author: string;
  value: TrustValue;
  distance: number;
}

export interface PathViewNode {
  subject: SubjectKey;
  depth: number;
}

export interface PathViewEdge {
  eventId: string;
  from: SubjectKey;
  to: SubjectKey;
  value: TrustValue;
}

export interface BindingState {
  /** `user:id:<digits>`. */
  iKey: string;
  /** The pubkey the heap binds it to, or `null`. */
  pubkey: string | null;
}

export interface PlaygroundResult {
  resolution: Resolution;
  connected: boolean;
  degree: number;
  trust: number;
  distrust: number;
  neutral: number;
  trustValue: number;
  /** Evidence at the hitting degree, in P3 order. */
  statements: EvidenceItem[];
  pathView: { nodes: PathViewNode[]; edges: PathViewEdge[] };
  bindings: BindingState[];
  /** The corpus runner's canonical output, compared with the corpus expectations. */
  output: Record<string, unknown>;
}

export interface PlaygroundEngine {
  /** Packages and TrustGraph commit, shown under the results. */
  readonly label: string;
  resolve(scenario: Scenario, query: PlaygroundQuery): PlaygroundResult;
  /** Differences between a result and a corpus expectation (empty = match). */
  compare(result: PlaygroundResult, expected: unknown): string[];
}

export interface PlaygroundModule {
  engine: PlaygroundEngine;
  scenarios: Scenario[];
}

export function claimKey(claim: ScenarioClaim): string {
  return `claim:${claim.pubkey}:${claim.twitterId}`;
}

export function ownKey(evidence: ScenarioOwnEvidence): string {
  return `own:${evidence.root}:${evidence.iKey}:${evidence.pubkey}`;
}

export function subjectKey(type: string, value: string): SubjectKey {
  return `${type}:${value}`;
}

export function parseSubjectKey(key: SubjectKey): { type: SubjectType; value: string } {
  const type = key.slice(0, 1) as SubjectType;
  return { type, value: key.slice(2) };
}

/** Loads the engine and the corpus scenarios (a separate lazy chunk). */
export async function loadPlayground(): Promise<PlaygroundModule> {
  const { createPlayground } = await import('./trust-graph-engine');
  return createPlayground();
}
