import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import { useTranslation } from 'react-i18next';
import { claimKey, ownKey, type PlaygroundQuery, type PlaygroundResult, type Scenario, type SubjectKey } from './engine';
import { labelFor, scenarioSubjects } from './labels';
import styles from './Playground.module.css';

export interface GraphViewProps {
  scenario: Scenario;
  query: PlaygroundQuery;
  result: PlaygroundResult;
  onSelectSubject: (subject: SubjectKey) => void;
}

type LinkKind = 'statement' | 'hint' | 'claim' | 'own';

interface ViewNode {
  id: SubjectKey;
  label: string;
}

interface ViewLink {
  key: string;
  kind: LinkKind;
  value?: number;
  source: SubjectKey;
  target: SubjectKey;
}

type Palette = Record<'text' | 'muted' | 'border' | 'surface' | 'focus' | 'trusted' | 'distrusted' | 'none', string>;

const HEIGHT = 340;
const NODE_RADIUS = 6;

function readPalette(element: HTMLElement): Palette {
  const style = getComputedStyle(element);
  const v = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    text: v('--color-text', '#10201e'),
    muted: v('--color-muted', '#4a5a58'),
    border: v('--color-border', '#d5e0de'),
    surface: v('--color-surface', '#f4f8f7'),
    focus: v('--color-focus', '#0f766e'),
    trusted: v('--color-trusted', '#15803d'),
    distrusted: v('--color-distrusted', '#b91c1c'),
    none: v('--color-none', '#52525b'),
  };
}

/** Re-reads the palette when the theme changes (toggle or system setting). */
function usePalette(ref: RefObject<HTMLElement | null>): Palette | null {
  const [palette, setPalette] = useState<Palette | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setPalette(readPalette(element));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, [ref]);
  return palette;
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry?.contentRect.width ?? 0)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * The scenario drawn with react-force-graph-2d (the library of the
 * extension's Graph View): statements as arrows coloured by value, hints,
 * claims, and own evidence dashed, the path of the current answer bold.
 * The results table next to it is the text alternative.
 */
export default function GraphView({ scenario, query, result, onSelectSubject }: GraphViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLElement>(null);
  const graphRef = useRef<ForceGraphMethods<NodeObject<ViewNode>, LinkObject<ViewNode, ViewLink>> | undefined>(undefined);
  const width = useWidth(containerRef);
  const palette = usePalette(containerRef);

  // One object per scenario, so switching inputs or knobs never re-runs the layout.
  const data = useMemo(() => {
    const nodes = new Map<SubjectKey, NodeObject<ViewNode>>();
    const node = (id: SubjectKey) => {
      if (!nodes.has(id)) nodes.set(id, { id, label: labelFor(scenario, id, (xid) => t('playground.xAccount', { id: xid })) });
      return id;
    };
    for (const subject of scenarioSubjects(scenario)) node(subject);
    const links: Array<LinkObject<ViewNode, ViewLink>> = [];
    for (const record of scenario.records) {
      const target = node(`${record.subjectType}:${record.subject}`);
      links.push({ key: record.id, kind: 'statement', value: record.value, source: node(`p:${record.pubkey}`), target });
      if (record.hintPubkey) links.push({ key: `hint:${record.id}`, kind: 'hint', source: target, target: node(`p:${record.hintPubkey}`) });
    }
    for (const claim of scenario.claims) {
      links.push({ key: claimKey(claim), kind: 'claim', source: node(`p:${claim.pubkey}`), target: node(`i:user:id:${claim.twitterId}`) });
    }
    for (const evidence of scenario.ownEvidence) {
      links.push({ key: ownKey(evidence), kind: 'own', source: node(`i:${evidence.iKey}`), target: node(`p:${evidence.pubkey}`) });
    }
    return { nodes: [...nodes.values()], links };
  }, [scenario, t]);

  const pathEdges = useMemo(() => new Set(result.pathView.edges.map((edge) => edge.eventId)), [result]);
  const pathNodes = useMemo(() => new Set(result.pathView.nodes.map((node) => node.subject)), [result]);
  const disabled = useMemo(() => new Set(query.disabled), [query.disabled]);
  const rootKey = `p:${query.root}`;

  const isOff = (link: LinkObject<ViewNode, ViewLink>) =>
    disabled.has(link.kind === 'hint' ? link.key.slice('hint:'.length) : link.key);

  const linkColor = (link: LinkObject<ViewNode, ViewLink>): string => {
    if (!palette) return '#888';
    if (isOff(link)) return palette.border;
    if (link.kind !== 'statement') return palette.muted;
    return link.value === 1 ? palette.trusted : link.value === -1 ? palette.distrusted : palette.none;
  };

  const summary = t('playground.graphSummary', {
    nodes: data.nodes.length,
    links: data.links.length,
    path: result.pathView.edges.length,
  });

  return (
    <figure className={styles.graph} ref={containerRef}>
      <div aria-hidden="true">
        {width > 0 && palette ? (
          <ForceGraph2D<ViewNode, ViewLink>
            ref={graphRef}
            graphData={data}
            width={width}
            height={HEIGHT}
            backgroundColor={palette.surface}
            nodeLabel={() => ''}
            linkLabel={() => ''}
            cooldownTicks={120}
            maxZoom={2.5}
            onEngineStop={() => graphRef.current?.zoomToFit(300, 40)}
            linkColor={linkColor}
            linkWidth={(link) => (link.kind === 'statement' && pathEdges.has(link.key) ? 3 : 1)}
            linkLineDash={(link) => (link.kind === 'statement' ? null : link.kind === 'claim' ? [1, 3] : [4, 3])}
            linkDirectionalArrowLength={(link) => (link.kind === 'statement' ? 5 : 0)}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={linkColor}
            linkCurvature={(link) => (link.kind === 'statement' ? 0 : 0.25)}
            onNodeClick={(node) => onSelectSubject(String(node.id))}
            nodeCanvasObject={(node, ctx, scale) => {
              const id = String(node.id);
              const x = node.x ?? 0;
              const y = node.y ?? 0;
              const onPath = pathNodes.has(id);
              ctx.beginPath();
              if (id.startsWith('p:')) ctx.arc(x, y, NODE_RADIUS, 0, 2 * Math.PI);
              else ctx.rect(x - NODE_RADIUS, y - NODE_RADIUS, NODE_RADIUS * 2, NODE_RADIUS * 2);
              ctx.fillStyle = onPath ? palette.focus : palette.muted;
              ctx.fill();
              if (id === rootKey || id === query.subject) {
                ctx.lineWidth = 2 / scale;
                ctx.strokeStyle = palette.text;
                ctx.beginPath();
                ctx.arc(x, y, NODE_RADIUS + 3, 0, 2 * Math.PI);
                ctx.stroke();
              }
              const fontSize = 12 / scale;
              ctx.font = `${id === rootKey || id === query.subject ? 'bold ' : ''}${fontSize}px system-ui, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'top';
              ctx.fillStyle = palette.text;
              ctx.fillText(node.label, x, y + NODE_RADIUS + 4 / scale);
            }}
            nodePointerAreaPaint={(node, color, ctx) => {
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(node.x ?? 0, node.y ?? 0, NODE_RADIUS + 4, 0, 2 * Math.PI);
              ctx.fill();
            }}
          />
        ) : (
          <div style={{ height: HEIGHT }} />
        )}
      </div>
      <figcaption className={styles.legend}>
        <span className={styles.graphSummary}>{summary}</span>
        <ul>
          <li><span className={styles.swatchTrust} />{t('playground.legend.trust')}</li>
          <li><span className={styles.swatchDistrust} />{t('playground.legend.distrust')}</li>
          <li><span className={styles.swatchNeutral} />{t('playground.legend.neutral')}</li>
          <li><span className={styles.swatchDashed} />{t('playground.legend.binding')}</li>
          <li><span className={styles.swatchPath} />{t('playground.legend.path')}</li>
          <li>{t('playground.legend.shapes')}</li>
          <li>{t('playground.legend.click')}</li>
        </ul>
      </figcaption>
    </figure>
  );
}
