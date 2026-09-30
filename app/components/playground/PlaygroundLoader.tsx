import { useEffect, useState } from 'react';
import { DEMO_GRAPH } from './demo-graph';
import { loadEngine, type PlaygroundEngine } from './engine';
import { Playground } from './Playground';

/** Default export for the lazy chunk: loads the engine, then shows the playground. */
export default function PlaygroundLoader() {
  const [engine, setEngine] = useState<PlaygroundEngine | null>(null);
  useEffect(() => {
    let active = true;
    void loadEngine().then((loaded) => {
      if (active) setEngine(loaded);
    });
    return () => {
      active = false;
    };
  }, []);
  return <Playground graph={DEMO_GRAPH} engine={engine} />;
}
