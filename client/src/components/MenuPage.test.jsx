import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const cat = { slug: 'mojito', name: { ar: 'موهيتو', en: 'Mojito' } };
const mk = (slug, ar, en) => ({ slug, name: { ar, en }, description: { ar: 'و', en: 'd' }, category: cat, images: [], basePrice: 50, variants: [], addOns: [], isAvailable: true, rating: { average: 0, count: 0 } });
vi.mock('@/api/menu.js', () => ({
  getMenu: () => Promise.resolve({ items: [mk('a', 'موهيتو مانجو', 'Mango Mojito'), mk('b', 'موهيتو كيوي', 'Kiwi Mojito')] }),
}));
import MenuPage from './MenuPage.jsx';

describe('MenuPage search', () => {
  it('filters by Arabic or English name and explains an empty result', async () => {
    render(<MemoryRouter><MenuPage lang="en" /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Mango Mojito')).toBeTruthy());
    const box = screen.getByPlaceholderText(/Search/);
    fireEvent.change(box, { target: { value: 'kiwi' } });
    expect(screen.queryByText('Mango Mojito')).toBeNull();
    expect(screen.getByText('Kiwi Mojito')).toBeTruthy();
    fireEvent.change(box, { target: { value: 'مانجو' } });
    expect(screen.getByText('Mango Mojito')).toBeTruthy();
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText(/Nothing matches/)).toBeTruthy();
  });
});
