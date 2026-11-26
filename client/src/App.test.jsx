import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App.jsx';

const sampleItems = [
  {
    slug: 'spanish-latte',
    name: { ar: 'سبانيش لاتيه', en: 'Spanish Latte' },
    description: { ar: 'وصف عربي', en: 'English description' },
    category: { slug: 'hot-coffee', name: { ar: 'قهوة ساخنة', en: 'Hot Coffee' } },
    images: [],
    basePrice: 75,
    variants: [],
    addOns: [],
    isFeatured: true,
    isBestSeller: true,
    rating: { average: 4.9, count: 318 },
  },
];

// Route-aware mock: the menu answers with items, auth refresh answers 401
// (no session), everything else keeps the old canned body.
function mockMenuFetch(body, ok = true) {
  return vi.fn((url) => {
    if (String(url).includes('/api/auth/')) {
      return Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ success: false, error: { code: 'AUTH_INVALID_TOKEN' } }),
      });
    }
    return Promise.resolve({
      ok,
      status: ok ? 200 : 500,
      json: () => Promise.resolve(ok ? { success: true, data: body } : { success: false, error: { code: 'X' } }),
    });
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockMenuFetch({ items: sampleItems })); // mock returns data, as the API wrapper unwraps it
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App smoke test', () => {
  it('renders in Arabic with rtl direction by default', async () => {
    render(<App />);
    const header = screen.getByRole('banner');
    expect(header.parentElement.getAttribute('dir')).toBe('rtl');
    expect(screen.getByText('FREDDO')).toBeTruthy();
    // The menu loads from the (mocked) API and shows Arabic names.
    await waitFor(() => expect(screen.getByText('سبانيش لاتيه')).toBeTruthy());
    expect(screen.getByText('قهوة ساخنة')).toBeTruthy();
    expect(screen.getByText('الأكثر مبيعًا')).toBeTruthy();
  });
});

describe('App error state', () => {
  it('shows a retry message when the API fails', async () => {
    vi.stubGlobal('fetch', mockMenuFetch(null, false));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/المنيو ماتحمّلش/)).toBeTruthy());
    expect(screen.getByText('حاول تاني')).toBeTruthy();
  });
});
