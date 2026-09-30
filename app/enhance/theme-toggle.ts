import { applyTheme, effectiveTheme, type Theme } from '~/lib/theme';

const BOUND = 'dtpBound';
let watchingSystem = false;

function syncLabel(button: HTMLButtonElement, theme: Theme): void {
  const label = theme === 'dark' ? button.dataset.labelToLight : button.dataset.labelToDark;
  if (label) {
    button.setAttribute('aria-label', label);
    button.title = label;
  }
}

/** Wires every `[data-theme-toggle]` button. Idempotent. */
export function initThemeToggles(root: ParentNode = document): void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[data-theme-toggle]')];
  const syncAll = () => buttons.forEach((button) => syncLabel(button, effectiveTheme()));
  for (const button of buttons) {
    if (button.dataset[BOUND]) continue;
    button.dataset[BOUND] = 'true';
    button.addEventListener('click', () => {
      applyTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
      syncAll();
    });
  }
  syncAll();
  if (!watchingSystem) {
    watchingSystem = true;
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => initThemeToggles(root));
  }
}
