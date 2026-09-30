import { useEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPlayground, type PlaygroundModule } from './engine';
import type { GraphViewProps } from './GraphView';
import { Playground } from './Playground';
import styles from './Playground.module.css';

type State = { status: 'loading' } | { status: 'failed' } | { status: 'ready'; module: PlaygroundModule };

/**
 * Default export for the lazy island chunk: loads the engine with its corpus
 * scenarios and the drawing (two more lazy chunks, in parallel), then shows
 * the playground. The drawing may arrive later; the table works without it.
 */
export default function PlaygroundLoader() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [graphView, setGraphView] = useState<ComponentType<GraphViewProps> | null>(null);

  useEffect(() => {
    let active = true;
    loadPlayground().then(
      (module) => active && setState({ status: 'ready', module }),
      (error: unknown) => {
        console.error(error);
        if (active) setState({ status: 'failed' });
      },
    );
    import('./GraphView').then(
      (loaded) => active && setGraphView(() => loaded.default),
      (error: unknown) => console.error(error),
    );
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') return <p className={styles.notice}>{t('playground.loading')}</p>;
  if (state.status === 'failed') return <p className={styles.notice}>{t('playground.failed')}</p>;
  return <Playground scenarios={state.module.scenarios} engine={state.module.engine} GraphView={graphView} />;
}
