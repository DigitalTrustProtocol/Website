import { useId, useMemo, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  claimKey,
  ownKey,
  type BindingMode,
  type PlaygroundEngine,
  type PlaygroundQuery,
  type Scenario,
  type ScenarioPreset,
} from './engine';
import type { GraphViewProps } from './GraphView';
import { labelFor, scenarioPubkeys, scenarioSubjects } from './labels';
import styles from './Playground.module.css';

const VALUE_KEYS = { '1': 'playground.value.trust', '0': 'playground.value.neutral', '-1': 'playground.value.distrust' } as const;

function valueKey(value: number | undefined): string {
  return value === undefined ? 'playground.value.delete' : (VALUE_KEYS[String(value) as keyof typeof VALUE_KEYS] ?? 'playground.value.label');
}

function sameQuery(a: PlaygroundQuery, b: PlaygroundQuery): boolean {
  return (
    a.root === b.root &&
    a.subject === b.subject &&
    a.context === b.context &&
    a.green === b.green &&
    a.red === b.red &&
    a.maxDegree === b.maxDegree &&
    a.bindingMode === b.bindingMode &&
    a.now === b.now &&
    a.disabled.length === 0 &&
    b.disabled.length === 0
  );
}

/** `{ connected: false, degree: 2 }` → `connected: false · degree: 2`. */
function describeExpectation(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${typeof item === 'object' ? JSON.stringify(item) : String(item)}`)
    .join(' · ');
}

export interface PlaygroundProps {
  scenarios: Scenario[];
  engine: PlaygroundEngine;
  /** The canvas drawing; `null` while it loads (the results table is the text alternative). */
  GraphView?: ComponentType<GraphViewProps> | null;
}

/**
 * Scenario picker, controls, drawing, results table, and input toggles.
 * Every answer comes from `engine`; the corpus row says whether the answer
 * equals what the TrustGraph corpus expects for the chosen query.
 */
export function Playground({ scenarios, engine, GraphView = null }: PlaygroundProps) {
  const { t } = useTranslation();
  const id = useId();
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? '');
  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const [query, setQuery] = useState<PlaygroundQuery | null>(scenario?.presets[0]?.query ?? null);

  const result = useMemo(() => (scenario && query ? engine.resolve(scenario, query) : null), [engine, scenario, query]);
  if (!scenario || !query || !result) return null;

  const xAccount = (xid: string) => t('playground.xAccount', { id: xid });
  const label = (key: string) => labelFor(scenario, key, xAccount);
  const activePreset: ScenarioPreset | undefined = scenario.presets.find((preset) => sameQuery(preset.query, query));
  const differences = activePreset ? engine.compare(result, activePreset.expected) : [];
  const update = (patch: Partial<PlaygroundQuery>) => setQuery((current) => (current ? { ...current, ...patch } : current));

  function selectScenario(next: string) {
    const found = scenarios.find((item) => item.id === next);
    setScenarioId(next);
    setQuery(found?.presets[0]?.query ?? null);
  }

  function toggle(key: string) {
    setQuery((current) =>
      current
        ? {
            ...current,
            disabled: current.disabled.includes(key) ? current.disabled.filter((item) => item !== key) : [...current.disabled, key],
          }
        : current,
    );
  }

  const inputs: Array<{ key: string; author: string; what: string; about: string }> = [
    ...scenario.records.map((record) => ({
      key: record.id,
      author: label(record.pubkey),
      what: t(valueKey(record.value)),
      about: [
        label(`${record.subjectType}:${record.subject}`),
        record.hintPubkey ? t('playground.hint', { pubkey: label(record.hintPubkey) }) : '',
        record.activate !== undefined || record.expire !== undefined
          ? t('playground.window', { from: record.activate ?? '–', until: record.expire ?? '–' })
          : '',
      ]
        .filter(Boolean)
        .join(' · '),
    })),
    ...scenario.claims.map((claim) => ({
      key: claimKey(claim),
      author: label(claim.pubkey),
      what: t('playground.claim'),
      about: xAccount(claim.twitterId),
    })),
    ...scenario.ownEvidence.map((evidence) => ({
      key: ownKey(evidence),
      author: label(evidence.root),
      what: t(`playground.own.${evidence.source}`),
      about: t('playground.ownIs', { account: label(`i:${evidence.iKey}`), pubkey: label(evidence.pubkey) }),
    })),
  ];

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.title}>
        {t('playground.title')}
      </h3>

      <div className={styles.scenario}>
        <label>
          {t('playground.scenario')}
          <select value={scenario.id} onChange={(e) => selectScenario(e.target.value)}>
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>{item.id}</option>
            ))}
          </select>
        </label>
        {scenario.description ? <p className={styles.description}>{scenario.description}</p> : null}
        <fieldset className={styles.presets}>
          <legend>{t('playground.presets')}</legend>
          {scenario.presets.map((preset) => (
            <button
              key={`${preset.queryIndex}-${preset.mode ?? ''}`}
              type="button"
              aria-pressed={preset === activePreset}
              onClick={() => setQuery(preset.query)}
            >
              {t('playground.preset', { n: preset.queryIndex + 1 })}
              {preset.mode ? ` · ${t(`playground.mode.${preset.mode}`)}` : ''}
            </button>
          ))}
        </fieldset>
        {activePreset?.note ? <p className={styles.presetNote}>{activePreset.note}</p> : null}
      </div>

      <form className={styles.controls} onSubmit={(event) => event.preventDefault()}>
        <label>
          {t('playground.root')}
          <select value={query.root} onChange={(e) => update({ root: e.target.value })}>
            {scenarioPubkeys(scenario).map((pubkey) => (
              <option key={pubkey} value={pubkey}>{label(pubkey)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('playground.subject')}
          <select value={query.subject} onChange={(e) => update({ subject: e.target.value })}>
            {scenarioSubjects(scenario).map((key) => (
              <option key={key} value={key}>{label(key)}</option>
            ))}
          </select>
        </label>
        <label>
          {t('playground.green', { value: query.green })}
          <input type="range" min={0} max={100} value={query.green}
            onChange={(e) => { const green = Number(e.target.value); update({ green, red: Math.min(query.red, green) }); }} />
        </label>
        <label>
          {t('playground.red', { value: query.red })}
          <input type="range" min={0} max={query.green} value={query.red} onChange={(e) => update({ red: Number(e.target.value) })} />
        </label>
        <label>
          {t('playground.maxDegree', { value: query.maxDegree })}
          <input type="range" min={1} max={7} value={Math.min(query.maxDegree, 7)} onChange={(e) => update({ maxDegree: Number(e.target.value) })} />
        </label>
        <label>
          {t('playground.time', { value: query.now })}
          <input type="range" min={scenario.timeRange[0]} max={scenario.timeRange[1]} value={query.now}
            onChange={(e) => update({ now: Number(e.target.value) })} />
        </label>
        <fieldset className={styles.modes}>
          <legend>{t('playground.bindingMode')}</legend>
          {(['lenient', 'strict'] as BindingMode[]).map((mode) => (
            <label key={mode}>
              <input type="radio" name={`${id}-mode`} value={mode} checked={query.bindingMode === mode}
                onChange={() => update({ bindingMode: mode })} />
              {t(`playground.mode.${mode}`)}
            </label>
          ))}
        </fieldset>
      </form>

      {GraphView ? (
        <GraphView scenario={scenario} query={query} result={result} onSelectSubject={(subject) => update({ subject })} />
      ) : null}

      <div className={styles.results} aria-live="polite">
        <table>
          <caption>{t('playground.resultCaption', { root: label(query.root), subject: label(query.subject) })}</caption>
          <tbody>
            <tr><th scope="row">{t('playground.resolution')}</th><td>{t(`playground.resolutionValue.${result.resolution}`)}</td></tr>
            <tr>
              <th scope="row">{t('playground.degree')}</th>
              <td>{result.connected ? result.degree : t('playground.notReached')}</td>
            </tr>
            <tr>
              <th scope="row">{t('playground.counts')}</th>
              <td>{t('playground.countsValue', { trust: result.trust, distrust: result.distrust, neutral: result.neutral })}</td>
            </tr>
            <tr>
              <th scope="row">{t('playground.evidence')}</th>
              <td>
                {result.statements
                  .map((s) => t('playground.evidenceItem', { author: label(s.author), value: t(valueKey(s.value)), distance: s.distance }))
                  .join(', ') || '—'}
              </td>
            </tr>
            <tr>
              <th scope="row">{t('playground.bindings')}</th>
              <td>
                {result.bindings
                  .map((b) =>
                    b.pubkey
                      ? t('playground.boundTo', { account: label(`i:${b.iKey}`), pubkey: label(b.pubkey) })
                      : t('playground.unbound', { account: label(`i:${b.iKey}`) }),
                  )
                  .join(', ') || '—'}
              </td>
            </tr>
            <tr>
              <th scope="row">{t('playground.corpus')}</th>
              <td data-corpus-check={activePreset ? (differences.length === 0 ? 'match' : 'differs') : 'none'}>
                {activePreset
                  ? differences.length === 0
                    ? t('playground.corpusMatch', { id: scenario.id, n: activePreset.queryIndex + 1 })
                    : t('playground.corpusDiffers', { id: scenario.id, n: activePreset.queryIndex + 1, details: differences.join('; ') })
                  : t('playground.corpusNone')}
                {activePreset?.modelRule !== undefined ? (
                  <p className={styles.gap}>{t('playground.modelRule', { rule: describeExpectation(activePreset.modelRule) })}</p>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
        <p className={styles.engine}>{t('playground.engine', { label: engine.label })}</p>
      </div>

      <details className={styles.statements}>
        <summary>{t('playground.inputsTitle', { count: inputs.length })}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t('playground.use')}</th>
              <th scope="col">{t('playground.author')}</th>
              <th scope="col">{t('playground.value.label')}</th>
              <th scope="col">{t('playground.about')}</th>
            </tr>
          </thead>
          <tbody>
            {inputs.map((input) => (
              <tr key={input.key}>
                <td>
                  <input type="checkbox" checked={!query.disabled.includes(input.key)} onChange={() => toggle(input.key)}
                    aria-label={t('playground.useInput', { author: input.author, what: input.what, about: input.about })} />
                </td>
                <td>{input.author}</td>
                <td>{input.what}</td>
                <td>{input.about}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
