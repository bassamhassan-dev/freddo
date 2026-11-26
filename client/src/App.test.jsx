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

function mockMenuFetch(body, ok = true) {
  return vi.fn(() =>
    Promise.resolve({ ok, json: () => Promise.resolve(ok ? body : { error: { code: 'X' } }) })
  );
}

beforeEach(() => {
  vi.stubGlobal('fetch', mockMenuFetch({ items: sampleItems }));
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
