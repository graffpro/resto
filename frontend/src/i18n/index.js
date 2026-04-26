import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import az from './locales/az.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';
import en from './locales/en.json';

// Map navigator.language → supported locale
// Fallback chain: explicit choice (localStorage) → browser → 'az'
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      az: { translation: az },
      ru: { translation: ru },
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: 'az',
    supportedLngs: ['az', 'ru', 'tr', 'en'],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'qr_lang',
      caches: ['localStorage'],
    },
  });

export const LANGUAGES = [
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'tr', label: 'Türkiye', flag: '🇹🇷' },
  { code: 'ru', label: 'Россия', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default i18n;
