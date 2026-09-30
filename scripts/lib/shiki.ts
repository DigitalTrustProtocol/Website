import type { BundledLanguage } from 'shiki';

/** Languages highlighted at build time. Anything else renders as plain text. */
export const SHIKI_LANGS: BundledLanguage[] = [
  'json',
  'jsonc',
  'ts',
  'tsx',
  'js',
  'yaml',
  'toml',
  'rust',
  'bash',
  'powershell',
  'sql',
  'html',
  'css',
];

/** Light and dark palettes, emitted as CSS variables and picked by `data-theme`. */
export const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

export const SHIKI_OPTIONS = {
  themes: SHIKI_THEMES,
  defaultColor: false,
  defaultLanguage: 'text',
  fallbackLanguage: 'text',
} as const;
