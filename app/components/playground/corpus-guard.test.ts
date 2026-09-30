import { expandPlaceholders } from '@dtp/conformance/corpus';
import { tsExpectation } from '@dtp/conformance/suite';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { VENDOR_DIR, verifyVendor } from '../../../scripts/lib/engine-vendor';
import { claimKey, ownKey } from './engine';
import { expandCase, loadScenarios, rawScenarioCases, SCENARIO_IDS } from './scenarios';
import { createTrustGraphEngine, toTrustInput } from './trust-graph-engine';

/**
 * CI guard (tech.md § Playground): every playground preset, run through the
 * same engine and controls the page uses, must give the answer its
 * TrustGraph corpus case expects.
 */
const scenarios = await loadScenarios();
const engine = createTrustGraphEngine();

describe('vendored TrustGraph engine', () => {
  it('matches VENDOR.json byte for byte', async () => {
    expect(await verifyVendor(resolve(import.meta.dirname, '../../..', VENDOR_DIR))).toEqual([]);
  });

  it('labels results with the package versions and the TrustGraph commit', () => {
    expect(engine.label).toMatch(/^@dtp\/trust-graph \d+\.\d+\.\d+ · @dtp\/trust-query \d+\.\d+\.\d+ · TrustGraph [0-9a-f]{7}$/);
  });
});

describe('playground scenarios', () => {
  it('expands placeholders exactly like the corpus loader', async () => {
    for (const raw of rawScenarioCases()) {
      const { expanded } = await expandCase(raw);
      expect(expanded).toEqual(expandPlaceholders(raw));
    }
  });

  it('includes one X account with two competing npub hints', () => {
    const bind = scenarios.find((scenario) => scenario.id === 'bind-03-own-bio-beats-friend-hint');
    const hinted = new Set([
      ...(bind?.ownEvidence.map((evidence) => evidence.pubkey) ?? []),
      ...(bind?.records.flatMap((record) => (record.hintPubkey ? [record.hintPubkey] : [])) ?? []),
    ]);
    expect(hinted.size).toBe(2);
  });

  it('reports a difference when a control moves away from the corpus query', () => {
    const scenario = scenarios.find((item) => item.id === 'walk-aggregates-hitting-degree')!;
    const preset = scenario.presets[0]!;
    const result = engine.resolve(scenario, { ...preset.query, green: 60 });
    expect(result.resolution).toBe('trusted');
    expect(engine.compare(result, preset.expected)).toEqual(['$.resolution: expected "mixed", got "trusted"']);
  });

  it('takes presets and expectations from the corpus', () => {
    const raws = rawScenarioCases();
    for (const [index, scenario] of scenarios.entries()) {
      const raw = expandPlaceholders(raws[index]!);
      expect(scenario.id).toBe(SCENARIO_IDS[index]);
      for (const preset of scenario.presets) {
        const query = raw.queries[preset.queryIndex]!;
        expect(preset.expected).toEqual(tsExpectation(query, preset.mode));
        expect(toTrustInput(preset.query)).toMatchObject({ ...query.input, bindingMode: preset.mode ?? 'lenient' });
      }
    }
  });
});

describe.each(scenarios.map((scenario) => [scenario.id, scenario] as const))('%s', (_id, scenario) => {
  it.each(scenario.presets.map((preset, index) => [index, preset] as const))('preset %i matches the corpus', (_index, preset) => {
    const result = engine.resolve(scenario, preset.query);
    expect(engine.compare(result, preset.expected)).toEqual([]);
  });

  it('answers after every single input is switched off', () => {
    const preset = scenario.presets[0]!;
    const keys = [
      ...scenario.records.map((record) => record.id),
      ...scenario.claims.map(claimKey),
      ...scenario.ownEvidence.map(ownKey),
    ];
    for (const key of keys) {
      const result = engine.resolve(scenario, { ...preset.query, disabled: [key] });
      expect(['trusted', 'mixed', 'distrusted', 'none']).toContain(result.resolution);
      expect(result.statements.every((statement) => statement.eventId !== key)).toBe(true);
    }
  });
});
