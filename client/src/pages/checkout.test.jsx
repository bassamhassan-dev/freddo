import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CheckoutPage from './CheckoutPage.jsx';
import { useCartStore } from '@/store/cart.js';

// The checkout sends slugs/ids/quantities ONLY (doc 8.5): no prices, no
// labels - the server re-prices from the catalog. This test pins that
// contract from the client side.
const line = {
  key: 'spanish-latte|v1|a1',
  slug: 'spanish-latte',
  name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
  variantId: 'v1',
  addOnIds: ['a1'],
  variantLabel: { ar: 'وسط', en: 'Medium' },
  addOns: [{ name: { ar: 'شوت إضافي', en: 'Extra shot' }, price: 15 }],
  notes: '',
  qty: 2,
  unitPrice: 100,
};

beforeEach(() => {
  useCartStore.setState({ lines: [line] });
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            success: true,
            data: { order: { _id: 'ord1', orderNumber: 'FR-ABC123', total: 200, items: [], status: 'pending' } },
          }),
      })
    )
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  useCartStore.getState().clear();
});

describe('CheckoutPage', () => {
  it('shows the cart summary, phone field and COD note in Arabic', () => {
    render(
      <MemoryRouter>
        <CheckoutPage lang="ar" />
      </MemoryRouter>
    );
    expect(screen.getByText('تأكيد الطلب')).toBeTruthy();
    expect(screen.getByText(/سبانيش لاتيه/)).toBeTruthy();
    expect(screen.getByText('رقم الموبايل')).toBeTruthy();
    expect(screen.getByText(/الدفع كاش عند الاستلام/)).toBeTruthy();
  });

  it('sends ids and quantities only, then clears the cart', async () => {
    render(
      <MemoryRouter>
        <CheckoutPage lang="ar" />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByText('رقم الموبايل').querySelector('input') || screen.getByRole('textbox'), {
      target: { value: '01012345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /اطلب/ }));

    // Mount also loads the loyalty balance (GET /api/loyalty/mine), so find
    // the order POST among the calls instead of counting all fetches.
    await waitFor(() =>
      expect(fetch.mock.calls.some(([u, o]) => String(u).includes('/api/orders') && o?.method === 'POST')).toBe(true)
    );
    const [url, options] = fetch.mock.calls.find(([u, o]) => String(u).includes('/api/orders') && o?.method === 'POST');
    expect(String(url)).toContain('/api/orders');
    const sent = JSON.parse(options.body);
    expect(sent.lines).toEqual([{ slug: 'spanish-latte', variantId: 'v1', addOnIds: ['a1'], qty: 2, notes: '' }]);
    // The one thing that must never be in the payload: a client price.
    expect(JSON.stringify(sent)).not.toContain('unitPrice');
    expect(sent.idempotencyKey).toBeTruthy();

    await waitFor(() => expect(useCartStore.getState().lines).toHaveLength(0));
  });
});
