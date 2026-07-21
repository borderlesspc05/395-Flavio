export type Locale = 'pt' | 'en' | 'es';

export const LOCALES: Locale[] = ['pt', 'en', 'es'];

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: 'Português',
  en: 'English',
  es: 'Español',
};

export const LOCALE_STORAGE_KEY = 'mm.locale';

export const DEFAULT_LOCALE: Locale = 'pt';

function normalizeLanguageTag(tag: string): Locale | null {
  const primary = tag.trim().toLowerCase().split(/[-_]/)[0];
  if (primary === 'en' || primary === 'es' || primary === 'pt') return primary;
  return null;
}

/** Resolves locale from browser language preferences (navigator.languages). */
export function detectBrowserLocale(
  languages: readonly string[] | undefined = typeof navigator !== 'undefined'
    ? navigator.languages?.length
      ? navigator.languages
      : navigator.language
        ? [navigator.language]
        : undefined
    : undefined,
): Locale {
  if (!languages?.length) return DEFAULT_LOCALE;
  for (const tag of languages) {
    const match = normalizeLanguageTag(tag);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'pt' || value === 'en' || value === 'es';
}
