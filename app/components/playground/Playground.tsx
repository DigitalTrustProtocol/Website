import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BindingMode, DemoGraph, PlaygroundEngine, PlaygroundQuery, PlaygroundResult } from './engine';
import styles from './Playground.module.css';

const VALUE_KEYS = { '1': 'playground.value.trust', '0': 'playground.value.neutral', '-1': 'playground.value.distrust' } as const;

function labelFor(graph: DemoGraph, key: string): string {
  const person = graph.people.find((p) => p.pubkey === key);
  if (person) return person.label;
  const xId = key.startsWith('user:id:') ? key.slice('user:id:'.length) : null;
  const account = xId ? graph.xAccounts.find((x) => x.id === xId) : undefined;
  return account ? `${account.handle} (X)` : key;
}

export interface PlaygroundProps {
  graph: DemoGraph;
  engine: PlaygroundEngine | null;
}

/**
 * Controls, results table, and the statement list for the demo graph. The
 * results come only from `engine`; without one, the controls still work and
 * the page explains that the engine is not connected yet.
 */
export function Playground({ graph, engine }: PlaygroundProps) {
  const { t } = useTranslation();
  const id = useId();
  const subjects = useMemo(
    () => [...graph.people.map((p) => p.pubkey), ...graph.xAccounts.map((x) => `user:id:${x.id}`)],
    [graph],
  );
  const [query, setQuery] = useState<PlaygroundQuery>({
    root: graph.people[0]?.pubkey ?? '',
    subject: subjects[subjects.length - 1] ?? '',
    green: 75,
    red: 25,
    maxDegree: 4,
    bindingMode: 'lenient',
    now: 300,
    disabledStatements: [],
    disabledClaims: [],
  });

  const result: PlaygroundResult | null = useMemo(() => (engine ? engine.resolve(graph, query) : null), [engine, graph, query]);
  const update = (patch: Partial<PlaygroundQuery>) => setQuery((current) => ({ ...current, ...patch }));

  function toggleStatement(statementId: string) {
    setQuery((current) => ({
      ...current,
      disabledStatements: current.disabledStatements.includes(statementId)
        ? current.disabledStatements.filter((s) => s !== statementId)
        : [...current.disabledStatements, statementId],
    }));
  }

  return (
    <section className={styles.playground} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className={styles.title}>
        {t('playground.title')}
      </h3>

      <form className={styles.controls} onSubmit={(event) => event.preventDefault()}>
        <label>
          {t('playground.root')}
          <select value={query.root} onChange={(e) => update({ root: e.target.value })}>
            {graph.people.map((p) => (
              <option key={p.pubkey} value={p.pubkey}>{p.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t('playground.subject')}
          <select value={query.subject} onChange={(e) => update({ subject: e.target.value })}>
            {subjects.map((key) => (
              <option key={key} value={key}>{labelFor(graph, key)}</option>
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
          <input type="range" min={1} max={7} value={query.maxDegree} onChange={(e) => update({ maxDegree: Number(e.target.value) })} />
        </label>
        <label>
          {t('playground.time', { value: query.now })}
          <input type="range" min={0} max={500} step={10} value={query.now} onChange={(e) => update({ now: Number(e.target.value) })} />
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

      <div className={styles.results} aria-live="polite">
        {result ? (
          <table>
            <caption>{t('playground.resultCaption')}</caption>
            <tbody>
              <tr><th scope="row">{t('playground.resolution')}</th><td>{t(`playground.resolutionValue.${result.resolution}`)}</td></tr>
              <tr><th scope="row">{t('playground.degree')}</th><td>{result.degree}</td></tr>
              <tr>
                <th scope="row">{t('playground.counts')}</th>
                <td>{t('playground.countsValue', { trust: result.trust, distrust: result.distrust, neutral: result.neutral })}</td>
              </tr>
              <tr>
                <th scope="row">{t('playground.evidence')}</th>
                <td>{result.evidence.map((e) => `${labelFor(graph, e.author)}: ${t(VALUE_KEYS[String(e.value) as keyof typeof VALUE_KEYS])}`).join(', ') || '—'}</td>
              </tr>
              <tr>
                <th scope="row">{t('playground.bindings')}</th>
                <td>{result.bindings.map((b) => `${labelFor(graph, `user:id:${b.xId}`)}: ${t(`playground.bindingState.${b.state}`)}`).join(', ') || '—'}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className={styles.notice}>{t('playground.engineMissing')}</p>
        )}
        {engine ? <p className={styles.engine}>{t('playground.engine', { label: engine.label })}</p> : null}
      </div>

      <details className={styles.statements}>
        <summary>{t('playground.statementsTitle', { count: graph.statements.length })}</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{t('playground.use')}</th>
              <th scope="col">{t('playground.author')}</th>
              <th scope="col">{t('playground.value.label')}</th>
              <th scope="col">{t('playground.subject')}</th>
            </tr>
          </thead>
          <tbody>
            {graph.statements.map((s) => (
              <tr key={s.id}>
                <td>
                  <input type="checkbox" checked={!query.disabledStatements.includes(s.id)} onChange={() => toggleStatement(s.id)}
                    aria-label={t('playground.useStatement', { id: s.id })} />
                </td>
                <td>{labelFor(graph, s.pubkey)}</td>
                <td>{t(VALUE_KEYS[String(s.value) as keyof typeof VALUE_KEYS])}</td>
                <td>
                  {labelFor(graph, s.subject)}
                  {s.hintPubkey ? ` → ${labelFor(graph, s.hintPubkey)}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
