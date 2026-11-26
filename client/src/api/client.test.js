import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { request, setUnauthorizedHandler } from './client.js';

// Regression: a 401 from an auth endpoint must be final. An earlier
// version routed refresh's own 401 back into the refresh handler and
// recursed until the process died.
describe('api client 401 handling', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: { code: 'AUTH_INVALID_TOKEN' } }),
        })
      )
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('does not call the refresh handler for auth endpoint 401s', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    await expect(request('/api/auth/refresh', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives the refresh handler exactly one chance on a data endpoint 401', async () => {
    const handler = vi.fn(() => Promise.resolve(false));
    setUnauthorizedHandler(handler);
    await expect(request('/api/orders')).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(1); // handler said no -> no replay
  });
});
