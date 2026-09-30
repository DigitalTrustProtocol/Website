import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../public/locales/en.json';

/**
 * UI strings use i18next with one JSON catalog per locale in
 * `public/locales/<lng>.json`, the same layout as the extension. English is
 * bundled so every prerendered page has its strings synchronously. The other
 * extension locales are listed for increment W5; until their catalogs exist,
 * i18next falls back to English.
 */
export const DEFAULT_LOCALE = 'en';
export const SUPPORTED_LOCALES = ['en', 'da', 'de', 'es', 'fr', 'it', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type Catalog = typeof en;

void i18next.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: [...SUPPORTED_LOCALES],
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18next;
