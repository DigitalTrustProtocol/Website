import type { CorpusQuery, ModelCase } from '@dtp/conformance/types';
import bindFile from '@dtp/corpus/model/bind.json';
import pathFile from '@dtp/corpus/model/path.json';
import thresholdFile from '@dtp/corpus/model/threshold.json';
import walkFile from '@dtp/corpus/model/walk.json';
import { DEFAULT_RESOLVE_BOUNDS, FOLLOW_TRUST_GREEN_DEFAULT, FOLLOW_TRUST_RED_DEFAULT } from '@dtp/trust-query';
import { subjectKey, type BindingMode, type PlaygroundQuery, type Scenario, type ScenarioPreset } from './engine';

/**
 * The playground's scenarios: TrustGraph corpus model cases, in the order the
 * scenario picker shows them. Each one only uses records, claims, and own
 * evidence (no op sequence) and only asks trust questions, so the playground
 * controls can express every corpus query. Tests run every preset through the
 * engine and compare it with the corpus (the CI guard, tech.md § Playground).
 */
export const SCENARIO_IDS = [
  'walk-aggregates-hitting-degree',
  'walk-two-hops',
  'walk-nearest-degree-wins',
  'walk-only-positive-pubkey-hops',
  'walk-neutral-is-evidence-not-hop',
  'walk-activity-window',
  'walk-max-depth-cap',
  'threshold-mixed-hop',
  'threshold-distrusted-hop-blocked',
  'path-parallel-shortest-routes',
  'path-mixed-evidence-backward-union',
  'bind-03-own-bio-beats-friend-hint',
  'bind-07-strict-skips-false-nearer-hint',
  'bind-13-unwitnessed-claimant-never-candidate',
  'bind-bound-trust-walks-as-pubkey-hop',
] as const;

const CORPUS_FILES: unknown[] = [walkFile, thresholdFile, pathFile, bindFile];

const PLACEHOLDER = /@([A-Za-z0-9_.-]+)/g;

function casesOf(file: unknown): ModelCase[] {
  const value = file as ModelCase | { cases: ModelCase[] };
  return 'cases' in value ? value.cases : [value];
}

/** The raw (unexpanded) corpus cases, in SCENARIO_IDS order. */
export function rawScenarioCases(): ModelCase[] {
  const byId = new Map(CORPUS_FILES.flatMap(casesOf).map((testCase) => [testCase.id, testCase]));
  return SCENARIO_IDS.map((id) => {
    const testCase = byId.get(id);
    if (!testCase) throw new Error(`corpus case ${id} not found in the vendored corpus`);
    return testCase;
  });
}

function collectNames(value: unknown, names: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(PLACEHOLDER)) if (match[1]) names.add(match[1]);
  } else if (Array.isArray(value)) {
    for (const item of value) collectNames(item, names);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      collectNames(key, names);
      collectNames(item, names);
    }
  }
}

function replaceNames<T>(value: T, hex: ReadonlyMap<string, string>): T {
  if (typeof value === 'string') return value.replace(PLACEHOLDER, (_m, name: string) => hex.get(name) ?? _m) as T;
  if (Array.isArray(value)) return value.map((item) => replaceNames(item, hex)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [replaceNames(key, hex), replaceNames(item, hex)])) as T;
  }
  return value;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Expands `@name` placeholders to `sha256(name)` hex (corpus/README.md
 * § Placeholders) and returns the hex → name map for labels.
 */
export async function expandCase(testCase: ModelCase): Promise<{ expanded: ModelCase; names: Record<string, string> }> {
  const found = new Set<string>();
  collectNames(testCase, found);
  const hex = new Map<string, string>();
  for (const name of found) hex.set(name, await sha256Hex(name));
  const names = Object.fromEntries([...hex].map(([name, value]) => [value, name]));
  return { expanded: replaceNames(testCase, hex), names };
}

function isPerMode(value: unknown): value is Partial<Record<BindingMode, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => key === 'lenient' || key === 'strict');
}

function forMode(value: unknown, mode: BindingMode | undefined): unknown {
  return mode && isPerMode(value) ? value[mode] : value;
}

/** Same choice as the corpus TypeScript runner: `expectCurrent` for gap cases, else `expect`. */
export function expectationFor(query: CorpusQuery, mode: BindingMode | undefined): unknown {
  return forMode(query.expectCurrent !== undefined ? query.expectCurrent : query.expect, mode);
}

interface TrustInput {
  rootPubkey: string;
  subject: { type: string; value: string };
  context?: string;
  now?: number;
  bounds?: { maxDepth?: number };
  followTrustThreshold?: number;
  followTrustRed?: number;
}

/** Playground controls equal to a corpus trust query (unset fields take the library defaults). */
export function queryFromInput(input: TrustInput, mode: BindingMode | undefined): PlaygroundQuery {
  return {
    root: input.rootPubkey,
    subject: subjectKey(input.subject.type, input.subject.value),
    context: input.context ?? '',
    green: input.followTrustThreshold ?? FOLLOW_TRUST_GREEN_DEFAULT,
    red: input.followTrustRed ?? FOLLOW_TRUST_RED_DEFAULT,
    maxDegree: input.bounds?.maxDepth ?? DEFAULT_RESOLVE_BOUNDS.maxDepth,
    bindingMode: mode ?? 'lenient',
    now: input.now ?? 0,
    disabled: [],
  };
}

function timeRange(testCase: ModelCase, presets: ScenarioPreset[]): [number, number] {
  const times = [
    ...presets.map((preset) => preset.query.now),
    ...(testCase.records ?? []).flatMap((record) => [record.created_at, record.activate ?? 0, record.expire ?? 0]),
  ];
  const max = Math.max(10, ...times);
  return [0, Math.ceil((max * 1.25) / 10) * 10];
}

/** Builds a scenario from an expanded corpus case. */
export function scenarioFromCase(testCase: ModelCase, names: Record<string, string>): Scenario {
  const presets: ScenarioPreset[] = testCase.queries.flatMap((query, queryIndex) => {
    if (query.type !== 'trust') throw new Error(`${testCase.id}: only trust queries can be scenarios`);
    const modes: Array<BindingMode | undefined> = query.modes ?? [undefined];
    return modes.map((mode) => ({
      queryIndex,
      ...(query.note !== undefined ? { note: query.note } : {}),
      ...(mode !== undefined ? { mode } : {}),
      query: queryFromInput(query.input as unknown as TrustInput, mode),
      expected: expectationFor(query, mode),
      ...(query.expectModel !== undefined ? { modelRule: forMode(query.expectModel, mode) } : {}),
    }));
  });
  if (testCase.ops) throw new Error(`${testCase.id}: op sequences are not playground scenarios`);
  return {
    id: testCase.id,
    ...(testCase.description !== undefined ? { description: testCase.description } : {}),
    tags: testCase.tags,
    names,
    records: (testCase.records ?? []).map((record) => ({ ...record })),
    claims: (testCase.claims ?? []).map(({ pubkey, twitterId }) => ({ pubkey, twitterId })),
    ownEvidence: (testCase.ownEvidence ?? []).map((evidence) => ({ ...evidence })),
    presets,
    timeRange: timeRange(testCase, presets),
  };
}

export async function loadScenarios(): Promise<Scenario[]> {
  const scenarios: Scenario[] = [];
  for (const raw of rawScenarioCases()) {
    const { expanded, names } = await expandCase(raw);
    scenarios.push(scenarioFromCase(expanded, names));
  }
  return scenarios;
}
