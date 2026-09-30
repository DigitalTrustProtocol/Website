import { canonicalizeSets } from '@dtp/conformance/canonical';
import { matchPartial } from '@dtp/conformance/match';
import { buildState, runTrust } from '@dtp/conformance/model-runner';
import type { CorpusRecord, ModelCase } from '@dtp/conformance/types';
import { packages, ref } from '../../../vendor/trust-graph/VENDOR.json';
import {
  claimKey,
  ownKey,
  parseSubjectKey,
  type BindingState,
  type EvidenceItem,
  type PathViewEdge,
  type PathViewNode,
  type PlaygroundEngine,
  type PlaygroundModule,
  type PlaygroundQuery,
  type PlaygroundResult,
  type Resolution,
  type Scenario,
} from './engine';
import { loadScenarios } from './scenarios';

/** Trust query params (resolver-api.md) for the playground controls. */
export function toTrustInput(query: PlaygroundQuery): Record<string, unknown> {
  return {
    rootPubkey: query.root,
    subject: parseSubjectKey(query.subject),
    context: query.context,
    now: query.now,
    bounds: { maxDepth: query.maxDegree },
    format: 'path',
    followTrustThreshold: query.green,
    followTrustRed: query.red,
    bindingMode: query.bindingMode,
  };
}

/** The scenario with the visitor's switched-off inputs removed, as a corpus case. */
function activeCase(scenario: Scenario, disabled: readonly string[]): ModelCase {
  const off = new Set(disabled);
  return {
    id: scenario.id,
    model: 'dtp-wot/1',
    tags: scenario.tags,
    records: scenario.records.filter((record) => !off.has(record.id)) as CorpusRecord[],
    claims: scenario.claims.filter((claim) => !off.has(claimKey(claim))),
    ownEvidence: scenario.ownEvidence.filter((evidence) => !off.has(ownKey(evidence))),
    queries: [],
  };
}

/** The walk's bind for an X-account subject. A pubkey subject has none on the result. */
function bindingFromResult(subject: string, output: { binding?: { pubkey?: string } }): BindingState[] {
  if (!output.binding || !subject.startsWith('i:')) return [];
  return [{ iKey: subject.slice(2), pubkey: output.binding.pubkey ?? null }];
}

function engineLabel(): string {
  const version = (name: string) => `${name} ${(packages as Record<string, string>)[name] ?? '?'}`;
  return `${version('@dtp/trust-graph')} · ${version('@dtp/trust-query')} · TrustGraph ${ref.slice(0, 7)}`;
}

/**
 * The playground engine: builds the heap with the corpus runner's own
 * mapping (`buildState`) and asks `runTrust`, which calls
 * `executeTrustQuery` → `IndexResolver` — the walk the extension runs.
 */
export function createTrustGraphEngine(): PlaygroundEngine {
  return {
    label: engineLabel(),
    resolve(scenario, query) {
      const state = buildState(activeCase(scenario, query.disabled));
      const output = runTrust(state, toTrustInput(query));
      const pathView = output.pathView as PlaygroundResult['pathView'];
      // Binds are decided inside the walk (G8), not stored on the heap.
      // The result carries one only when the subject is an X account.
      const bindings = bindingFromResult(query.subject, output as { binding?: { pubkey?: string } });
      return {
        resolution: output.resolution as Resolution,
        connected: output.connected as boolean,
        degree: output.degree as number,
        trust: output.trust as number,
        distrust: output.distrust as number,
        neutral: output.neutral as number,
        trustValue: output.trustValue as number,
        statements: (output.statements as EvidenceItem[]).map(({ eventId, author, value, distance }) => ({
          eventId,
          author,
          value,
          distance,
        })),
        pathView: { nodes: pathView.nodes as PathViewNode[], edges: pathView.edges as PathViewEdge[] },
        bindings,
        output,
      };
    },
    compare(result, expected) {
      return matchPartial(canonicalizeSets('trust', result.output), canonicalizeSets('trust', expected));
    },
  };
}

export async function createPlayground(): Promise<PlaygroundModule> {
  return { engine: createTrustGraphEngine(), scenarios: await loadScenarios() };
}
