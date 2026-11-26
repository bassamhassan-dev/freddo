import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Hero slider: slides come from the 'main' banners API; dots switch
// slides; no banners means the classic hero fallback shows.
vi.mock('@/api/banners.js', () => ({ apiBanners: vi.fn() }));
vi.mock('@/store/content.js', () => ({
  useContentStore: (sel) => sel({ overrides: {} }),
  ct: (o, lang, key, t) => t(lang, key),
}));
import { apiBanners } from '@/api/banners.js';
import HeroSlider from '@/components/HeroSlider.jsx';

const slides = [1, 2, 3].map((n) => ({
  _id: `b${n}`,
  placement: 'main',
  title: { ar: `عرض ${n}`, en: `Deal ${n}` },
  description: { ar: 'وصف', en: 'desc' },
  imageUrl: `/banners/x${n}.svg`,
  ctaText: { ar: 'اطلب', en: 'Order' },
  ctaLink: '/item/x',
  sortOrder: n,
}));

describe('HeroSlider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the first slide and switches on dot click', async () => {
    apiBanners.mockResolvedValue({ banners: slides });
    render(<MemoryRouter><HeroSlider lang="ar" /></MemoryRouter>);
    expect(await screen.findByText('عرض 1')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('slide 3'));
    expect(screen.getByText('عرض 3')).toBeTruthy();
    expect(screen.getAllByRole('link')[0].getAttribute('href')).toBe('/item/x');
  });

  it('falls back to the classic hero when no main banners exist', async () => {
    apiBanners.mockResolvedValue({ banners: [] });
    render(<MemoryRouter><HeroSlider lang="ar" /></MemoryRouter>);
    expect(await screen.findAllByText('FREDDO')).toBeTruthy();
  });
});
