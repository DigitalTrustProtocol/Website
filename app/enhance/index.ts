import { renderDiagramsWhenVisible, rerenderDiagrams } from '~/components/source/diagrams';
import { effectiveTheme, THEME_CHANGE_EVENT, type Theme } from '~/lib/theme';
import { initThemeToggles } from './theme-toggle';

/**
 * The only script the production site loads up front (decision W-D6).
 * Pages are static HTML without router hydration; this adds the few
 * behaviors they need.
 */

function initDiagrams(): void {
  for (const container of document.querySelectorAll<HTMLElement>('[data-diagrams]')) {
    if (container.dataset.diagramsBound) continue;
    container.dataset.diagramsBound = 'true';
    const labels = {
      source: container.dataset.labelSource ?? 'Diagram source',
      failed: container.dataset.labelFailed ?? 'The diagram could not be drawn.',
    };
    renderDiagramsWhenVisible(container, effectiveTheme(), labels);
    window.addEventListener(THEME_CHANGE_EVENT, (event) =>
      rerenderDiagrams(container, (event as CustomEvent<Theme>).detail, labels),
    );
  }
}

export function enhance(): void {
  initThemeToggles();
  initDiagrams();
}

if (typeof document !== 'undefined' && !import.meta.env.DEV) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enhance, { once: true });
  else enhance();
}
