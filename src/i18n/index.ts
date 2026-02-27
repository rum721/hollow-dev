import { useCallback } from 'react';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import zh from './locales/zh.json';
import { useSettingsStore } from '../store/useSettingsStore';

export type Locale = 'en' | 'zh';

const translations: Record<Locale, typeof en> = { en, zh };

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path;
}

function getSystemLocale(): Locale {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return locale.startsWith('zh') ? 'zh' : 'en';
}

export function getEffectiveLocale(setting: Locale | 'auto'): Locale {
  return setting === 'auto' ? getSystemLocale() : setting;
}

export function t(key: string, locale?: Locale): string {
  const effectiveLocale = locale ?? getSystemLocale();
  return getNestedValue(translations[effectiveLocale], key);
}

export function useI18n() {
  const languageSetting = useSettingsStore((s) => s.language);
  const locale = getEffectiveLocale(languageSetting);

  const translate = useCallback(
    (key: string) => getNestedValue(translations[locale], key),
    [locale],
  );

  return { t: translate, locale };
}
