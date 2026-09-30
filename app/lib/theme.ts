export type Theme = 'light' | 'dark';

/** localStorage key for an explicit theme choice (no cookies). */
export const THEME_STORAGE_KEY = 'dtp-theme';
export const THEME_CHANGE_EVENT = 'dtp-themechange';

/**
 * Runs in <head> before first paint so a stored choice never flashes. The
 * post-build step adds its hash to the Content Security Policy.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=window.localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

export function effectiveTheme(): Theme {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this page only.
  }
  window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: theme }));
}
