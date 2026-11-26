import { render, screen } from '@testing-library/react';
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
