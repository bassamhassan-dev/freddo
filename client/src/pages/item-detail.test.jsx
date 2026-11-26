import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useCartStore } from '@/store/cart.js';

// Regression (Bassam's checkout bug): an item WITH sizes used to allow
// adding with no size chosen (variantIdx null), which the server rejects
// at checkout with "choose a size" - with nowhere in the cart to pick one.
// The page now always has a size selected (default: first) when variants
// exist, so the cart line always carries a variantId.
const item = {
  slug: 'iced-latte',
  name: { ar: 'آيس لاتيه', en: 'Iced Latte' },
  description: { ar: 'وصف', en: 'desc' },
  category: { slug: 'cold', name: { ar: 'مثلجة', en: 'Cold' } },
  images: [],
  basePrice: 75,
  variants: [
    { _id: 'v-medium', label: { ar: 'وسط', en: 'Medium' }, price: 75, isAvailable: true },
    { _id: 'v-large', label: { ar: 'كبير', en: 'Large' }, price: 90, isAvailable: true },
  ],
  addOns: [],
  isAvailable: true,
};
vi.mock('@/api/menu.js', () => ({
  getMenuItem: async () => ({ item }),
}));
vi.mock('@/components/ReviewsSection.jsx', () => ({ default: () => null }));

const { default: ItemDetailPage } = await import('./ItemDetailPage.jsx');

describe('ItemDetailPage variant default (checkout bug fix)', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = () => {};
    useCartStore.setState({ lines: [] });
  });

  it('pre-selects the first size and the cart line carries its variantId', async () => {
    render(
      <MemoryRouter initialEntries={['/item/iced-latte']}>
        <Routes>
          <Route path="/item/:slug" element={<ItemDetailPage lang="ar" />} />
          <Route path="/cart" element={<div>cart</div>} />
        </Routes>
      </MemoryRouter>
    );
    const btn = (await screen.findAllByRole('button')).find((b) => b.textContent.includes('ضيف للسلة'));
    fireEvent.click(btn);
    await waitFor(() => {
      const lines = useCartStore.getState().lines;
      expect(lines.length).toBe(1);
      expect(lines[0].variantId).toBe('v-medium');
    });
  });
});
