import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Refresh discipline (S28b): the server rotates the refresh token on every
// use and revokes everything on reuse, so the client must never fire two
// concurrent refreshes - and never fire one when no session exists.
const apiRefresh = vi.fn();
vi.mock('@/api/auth.js', () => ({
  apiLogin: vi.fn(),
  apiRegister: vi.fn(),
  apiLogout: vi.fn(),
  apiRefresh: (...args) => apiRefresh(...args),
}));

const { useAuthStore } = await import('./auth.js');
const client = await import('@/api/client.js');

describe('auth store refresh discipline', () => {
  beforeEach(() => {
    localStorage.clear();
    apiRefresh.mockReset();
    useAuthStore.setState({ user: null, status: 'unknown' });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('bootstrap without a session hint never calls refresh', async () => {
    await useAuthStore.getState().bootstrap();
    expect(apiRefresh).not.toHaveBeenCalled();
    expect(useAuthStore.getState().status).toBe('guest');
  });

  it('bootstrap with a hint restores the session', async () => {
    localStorage.setItem('freddo-session', '1');
    apiRefresh.mockResolvedValue({ user: { id: 'u1', name: 'باسم' }, accessToken: 'tok1' });
    await useAuthStore.getState().bootstrap();
    expect(apiRefresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().status).toBe('authed');
  });

  it('concurrent 401s share one refresh - the rotation race that wiped sessions', async () => {
    const spy = vi.fn();
    const handler = vi.fn();
    // Reach the wired handler through a real request: two parallel data
    // calls 401, the handler refreshes, both retry with the new token.
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        calls += 1;
        if (String(url).includes('/api/auth/refresh')) {
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  json: () => Promise.resolve({ success: true, data: { user: { id: 'u1' }, accessToken: 'tok-new' } }),
                }),
              20
            )
          );
        }
        // data endpoint: 401 until the refresh lands, then 200
        const authed = calls > 2;
        return Promise.resolve({
          ok: authed,
          status: authed ? 200 : 401,
          json: () => Promise.resolve(authed ? { success: true, data: { ok: true } } : { success: false, error: { code: 'X' } }),
        });
      })
    );
    apiRefresh.mockImplementation(async () => {
      const res = await fetch('/api/auth/refresh', { method: 'POST' });
      return (await res.json()).data;
    });
    const [a, b] = await Promise.all([client.request('/api/chat/mine'), client.request('/api/loyalty/mine')]);
    expect(a.data.ok).toBe(true);
    expect(b.data.ok).toBe(true);
    expect(apiRefresh).toHaveBeenCalledTimes(1); // one rotation, not two
    vi.unstubAllGlobals();
  });
});
