import { create } from 'zustand';
import { apiContent } from '@/api/content.js';

// CMS overrides for hardcoded site copy. The map is empty until the admin
// edits something; ct() falls back to the built-in i18n string per key, so
// the site is unchanged when no override exists.
export const useContentStore = create((set) => ({
  overrides: {},
  sections: {},
  loaded: false,
  load: async () => {
    try {
      const data = await apiContent();
      set({ overrides: data.contents || {}, sections: data.sections || {}, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
  setSection: (key, enabled) => set((s) => ({ sections: { ...s.sections, [key]: enabled } })),
  setOverride: (key, value) =>
    set((s) => {
      const overrides = { ...s.overrides };
      if (value) overrides[key] = value;
      else delete overrides[key];
      return { overrides };
    }),
}));

// The one helper components use: override first, built-in i18n otherwise.
export function ct(overrides, lang, key, t) {
  return overrides[key]?.[lang] || t(lang, key);
}

// A homepage section renders unless the admin hid it (default: visible).
export function sectionOn(sections, key) {
  return sections[key] !== false;
}
