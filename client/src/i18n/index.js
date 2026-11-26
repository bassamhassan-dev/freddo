import en from './en.json';
import ar from './ar.json';

export const messages = { en, ar };

// Arabic is the default: Freddo's audience is Arabic-first.
export const DEFAULT_LANG = 'ar';

// Arabic reads right-to-left, English left-to-right. Every page direction
// decision goes through this one function.
export function getDirection(lang) {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

// Falls back to English if a key is missing in the active language,
// and to the key itself if it is missing everywhere (easy to spot in dev).
export function t(lang, key) {
  return messages[lang]?.[key] ?? messages.en[key] ?? key;
}
