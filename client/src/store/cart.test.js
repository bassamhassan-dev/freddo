import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, lineKey, cartSubtotal, cartCount } from './cart.js';

// The cart's merge rules (doc 8.3/8.4): identical configurations share one
// line, any difference splits. Tested against the real store.
const latte = (over = {}) => ({
  slug: 'spanish-latte',
  name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
  variantLabel: { ar: 'وسط', en: 'Medium' },
  addOns: [],
  notes: '',
  qty: 1,
  unitPrice: 85,
  ...over,
});

beforeEach(() => {
  useCartStore.getState().clear();
});

function add(config) {
  const line = latte(config);
  useCartStore.getState().addLine({ ...line, key: lineKey(config) });
}

describe('cart line identity (doc 8.3)', () => {
  it('same product + variant + add-ons increments the same line', () => {
    const config = { slug: 'spanish-latte', variantId: 'v1', addOnIds: ['a1'] };
    add({ ...config, qty: 1 });
    add({ ...config, qty: 2 });
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(3);
  });

  it('a different variant stays a separate line', () => {
    add({ slug: 'spanish-latte', variantId: 'v1' });
    add({ slug: 'spanish-latte', variantId: 'v2', variantLabel: { ar: 'كبير', en: 'Large' } });
    expect(useCartStore.getState().lines).toHaveLength(2);
  });

  it('a different add-on set stays a separate line, order-independent', () => {
    add({ slug: 'spanish-latte', variantId: 'v1', addOnIds: ['a1', 'a2'] });
    add({ slug: 'spanish-latte', variantId: 'v1', addOnIds: ['a2', 'a1'] }); // same set
    add({ slug: 'spanish-latte', variantId: 'v1', addOnIds: ['a3'] }); // different
    const { lines } = useCartStore.getState();
    expect(lines).toHaveLength(2);
    expect(lines[0].qty).toBe(2);
  });
});

describe('cart quantities', () => {
  it('setQty to zero removes the line', () => {
    add({ slug: 'espresso', variantId: null });
    const { lines } = useCartStore.getState();
    useCartStore.getState().setQty(lines[0].key, 0);
    expect(useCartStore.getState().lines).toHaveLength(0);
  });

  it('subtotal and count add up across lines', () => {
    add({ slug: 'espresso', qty: 2, unitPrice: 45 });
    add({ slug: 'cheesecake', qty: 1, unitPrice: 90 });
    expect(cartSubtotal(useCartStore.getState())).toBe(180);
    expect(cartCount(useCartStore.getState())).toBe(3);
  });
});
