export type Locale = 'pt' | 'en' | 'es';

export const LOCALES: Locale[] = ['pt', 'en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

export const LOCALE_STORAGE_KEY = 'mm.locale';

export const DEFAULT_LOCALE: Locale = 'pt';
