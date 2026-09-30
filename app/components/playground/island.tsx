import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '~/i18n';
import PlaygroundLoader from './PlaygroundLoader';

/** Mounts the playground as a client-only React island (lazy chunk, tech.md § Playground). */
export function mountPlayground(container: HTMLElement): void {
  container.parentElement?.querySelector('[data-island-fallback]')?.setAttribute('hidden', '');
  createRoot(container).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <PlaygroundLoader />
      </I18nextProvider>
    </StrictMode>,
  );
}
