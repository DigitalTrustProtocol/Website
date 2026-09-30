import type { Theme } from '~/lib/theme';

/**
 * Mermaid diagrams in rendered specs (decision W-D4): the build keeps the
 * diagram source as text; the browser loads Mermaid only on pages that have
 * diagrams, only when one scrolls into view, and never from a CDN.
 */

export interface DiagramLabels {
  source: string;
  failed: string;
}

const SELECTOR = 'figure[data-diagram="mermaid"]';
let sequence = 0;

function sourceText(figure: HTMLElement): string {
  const cached = figure.dataset.source;
  if (cached !== undefined) return cached;
  const text = figure.querySelector('pre.diagram-source')?.textContent ?? '';
  figure.dataset.source = text;
  return text;
}

async function renderAll(root: HTMLElement, theme: Theme, labels: DiagramLabels): Promise<void> {
  const figures = [...root.querySelectorAll<HTMLElement>(SELECTOR)];
  if (figures.length === 0) return;
  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: 'system-ui, sans-serif',
  });

  for (const figure of figures) {
    const text = sourceText(figure);
    try {
      const { svg } = await mermaid.render(`dtp-diagram-${++sequence}`, text);
      const drawing = document.createElement('div');
      drawing.className = 'diagram-svg';
      drawing.innerHTML = svg;
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = labels.source;
      const pre = document.createElement('pre');
      pre.className = 'diagram-source';
      pre.textContent = text;
      details.append(summary, pre);
      figure.replaceChildren(drawing, details);
      figure.dataset.rendered = 'true';
    } catch {
      if (!figure.querySelector('.diagram-error')) {
        const note = document.createElement('figcaption');
        note.className = 'diagram-error';
        note.textContent = labels.failed;
        figure.append(note);
      }
    }
  }
}

/**
 * Renders diagrams under `root` once any of them is near the viewport.
 * Returns a cleanup function.
 */
export function renderDiagramsWhenVisible(root: HTMLElement, theme: Theme, labels: DiagramLabels): () => void {
  const figures = root.querySelectorAll<HTMLElement>(SELECTOR);
  if (figures.length === 0) return () => {};
  if (!('IntersectionObserver' in window)) {
    void renderAll(root, theme, labels);
    return () => {};
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        void renderAll(root, theme, labels);
      }
    },
    { rootMargin: '200px' },
  );
  figures.forEach((figure) => observer.observe(figure));
  return () => observer.disconnect();
}

/** Re-draws already rendered diagrams after a theme change. */
export function rerenderDiagrams(root: HTMLElement, theme: Theme, labels: DiagramLabels): void {
  if (root.querySelector(`${SELECTOR}[data-rendered]`)) void renderAll(root, theme, labels);
}
