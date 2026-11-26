import { describe, it, expect } from 'vitest';
import { formatPrice } from './MenuItemCard.jsx';

describe('formatPrice', () => {
  it('formats Egyptian pounds for Arabic and English', () => {
    const ar = formatPrice('ar', 75);
    const en = formatPrice('en', 75);
    expect(en).toContain('75');
    expect(en).toMatch(/EGP|ج\.م\./);
    expect(ar).toMatch(/٧٥|75/);
  });
});
