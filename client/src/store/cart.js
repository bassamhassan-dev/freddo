import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// The guest cart (doc 8.1): lives in the browser (localStorage via zustand
// persist), lets guests browse and fill a cart before ever logging in.
// It is NEVER authoritative for price or availability - the server
// re-prices everything at checkout (doc 8.5). What we store per line is
// display data plus the identifiers the server needs to re-price.
//
// Line identity (doc 8.3): same product + same variant + same add-ons =
// same line, and adding again just increments the quantity. Different
// variant or add-on combination = a separate line.
export function lineKey({ slug, variantId, addOnIds }) {
  const addOns = [...(addOnIds || [])].sort().join(',');
  return `${slug}|${variantId || 'base'}|${addOns}`;
}

export const useCartStore = create(
  persist(
    (set) => ({
      lines: [],

      addLine(line) {
        set((state) => {
          const existing = state.lines.find((l) => l.key === line.key);
          if (existing) {
            return {
              lines: state.lines.map((l) => (l.key === line.key ? { ...l, qty: l.qty + line.qty } : l)),
            };
          }
          return { lines: [...state.lines, line] };
        });
      },

      setQty(key, qty) {
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, qty } : l)),
        }));
      },

      removeLine(key) {
        set((state) => ({ lines: state.lines.filter((l) => l.key !== key) }));
      },

      clear() {
        set({ lines: [] });
      },
    }),
    { name: 'freddo-cart' }
  )
);

export const cartCount = (state) => state.lines.reduce((sum, l) => sum + l.qty, 0);
export const cartSubtotal = (state) => state.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
