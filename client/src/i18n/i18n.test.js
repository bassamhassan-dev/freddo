import { describe, it, expect } from 'vitest';
import { getDirection, t } from './index.js';
import en from './en.json';
import ar from './ar.json';

describe('i18n direction', () => {
  it('uses rtl for Arabic', () => {
    expect(getDirection('ar')).toBe('rtl');
  });

  it('uses ltr for English', () => {
    expect(getDirection('en')).toBe('ltr');
  });
});

describe('i18n messages', () => {
  it('has exactly the same keys in Arabic and English', () => {
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
  });

  it('translates a known key in both languages', () => {
    expect(t('ar', 'welcome')).toBe(ar.welcome);
    expect(t('en', 'welcome')).toBe(en.welcome);
  });
});
