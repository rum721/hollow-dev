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

function interpolate(str: string, params?: Record<string, string>): string {
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? `{{${key}}}`);
}

function getSystemLocale(): Locale {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  return locale.startsWith('zh') ? 'zh' : 'en';
}

export function getEffectiveLocale(setting: Locale | 'auto'): Locale {
  return setting === 'auto' ? getSystemLocale() : setting;
}

export function t(key: string, localeOrParams?: Locale | Record<string, string>, params?: Record<string, string>): string {
  let effectiveLocale: Locale;
  let effectiveParams: Record<string, string> | undefined;

  if (typeof localeOrParams === 'string' && (localeOrParams === 'en' || localeOrParams === 'zh')) {
    effectiveLocale = localeOrParams;
    effectiveParams = params;
  } else {
    effectiveLocale = getSystemLocale();
    effectiveParams = localeOrParams as Record<string, string> | undefined;
  }

  return interpolate(getNestedValue(translations[effectiveLocale], key), effectiveParams);
}

export function useI18n() {
  const languageSetting = useSettingsStore((s) => s.language);
  const locale = getEffectiveLocale(languageSetting);

  const translate = useCallback(
    (key: string, params?: Record<string, string>) =>
      interpolate(getNestedValue(translations[locale], key), params),
    [locale],
  );

  return { t: translate, locale };
}
