// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from '~/lib/theme';
import { initThemeToggles } from './theme-toggle';

// Node 26 defines an empty global `localStorage` that shadows happy-dom's; use an in-memory one.
beforeAll(() => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
});

function mount(): HTMLButtonElement {
  document.body.innerHTML =
    '<button type="button" data-theme-toggle data-label-to-dark="To dark" data-label-to-light="To light" aria-label="To dark"></button>';
  return document.querySelector('button')!;
}

describe('theme toggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('switches theme, stores the choice, and updates its label', () => {
    const button = mount();
    initThemeToggles();
    expect(button.getAttribute('aria-label')).toBe('To dark');
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('To light');
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('binds each button once', () => {
    const button = mount();
    initThemeToggles();
    initThemeToggles();
    button.click();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('applies a stored choice before first paint', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('ignores unexpected stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'purple');
    new Function(THEME_INIT_SCRIPT)();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
