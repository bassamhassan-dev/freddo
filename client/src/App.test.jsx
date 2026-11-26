import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App.jsx';

describe('App smoke test', () => {
  it('renders in Arabic with rtl direction by default', () => {
    render(<App />);
    const main = screen.getByRole('main');
    expect(main.getAttribute('dir')).toBe('rtl');
    expect(screen.getByText('أهلاً بيك في فريدو')).toBeTruthy();
  });
});
