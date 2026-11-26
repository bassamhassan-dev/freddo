import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';
import { homeForRole } from '@/auth/roleRedirect.js';

// No network in these tests: any call fails fast and loudly.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))));
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage', () => {
  it('renders the unified login form in Arabic with email and password', () => {
    render(
      <MemoryRouter>
        <LoginPage lang="ar" />
      </MemoryRouter>
    );
    expect(screen.getByText('أهلاً برجوعك')).toBeTruthy();
    expect(screen.getByText('الإيميل')).toBeTruthy();
    expect(screen.getByText('الباسورد')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ادخل' })).toBeTruthy();
    // The page never asks for a role (doc 3.1): no select/radio for roles.
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('links to registration', () => {
    render(
      <MemoryRouter>
        <LoginPage lang="en" />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Create account' }).getAttribute('href')).toBe('/register');
  });
});

describe('RegisterPage', () => {
  it('renders name, email and password fields in English', () => {
    render(
      <MemoryRouter>
        <RegisterPage lang="en" />
      </MemoryRouter>
    );
    expect(screen.getByText('Full name')).toBeTruthy();
    expect(screen.getByText('Email')).toBeTruthy();
    expect(screen.getByText('Password')).toBeTruthy();
  });
});

describe('role redirect map (doc 3.1)', () => {
  it('routes each role to its home and falls back safely', () => {
    expect(homeForRole('admin')).toBe('/admin');
    expect(homeForRole('barista')).toBe('/barista');
    expect(homeForRole('customer')).toBe('/');
    expect(homeForRole('whatever')).toBe('/');
  });
});

describe('RegisterPage confirm password (Sprint 18)', () => {
  it('blocks submit with a bilingual mismatch message and never calls the API', async () => {
    render(
      <MemoryRouter>
        <RegisterPage lang="ar" />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('الاسم بالكامل'), { target: { value: 'باسم' } });
    fireEvent.change(screen.getByLabelText('الإيميل'), { target: { value: 'b@freddo.com' } });
    // the password label also contains the hint text, so match by prefix
    fireEvent.change(screen.getAllByLabelText(/الباسورد/)[0], { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('تأكيد الباسورد'), { target: { value: 'different1' } });
    fireEvent.click(screen.getByRole('button', { name: 'سجّل' }));
    expect(await screen.findByText('الباسوردين مش متطابقين')).toBeTruthy();
    // the OAuth buttons probe /api/auth/oauth/providers on mount; the
    // register call itself must never fire
    const urls = fetch.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('/api/auth/register'))).toBe(false);
  });
});
