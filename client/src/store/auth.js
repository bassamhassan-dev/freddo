import { create } from 'zustand';
import { apiLogin, apiLogout, apiRefresh, apiRegister } from '@/api/auth.js';
import { setAccessToken, setUnauthorizedHandler } from '@/api/client.js';

// Frontend auth state (doc 3.6): user, token, and where we are in figuring
// it out. status: 'unknown' (still checking the cookie) -> 'authed' | 'guest'.
// The backend is always the real access control; this store is UX state.
export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'unknown',

  async login(credentials) {
    const { user, accessToken } = await apiLogin(credentials);
    setAccessToken(accessToken);
    set({ user, status: 'authed' });
    return user;
  },

  async register(details) {
    const { user, accessToken } = await apiRegister(details);
    setAccessToken(accessToken);
    set({ user, status: 'authed' });
    return user;
  },

  // Called once on app start: if a refresh cookie exists, the session is
  // restored without the user seeing a login page.
  async bootstrap() {
    try {
      const { user, accessToken } = await apiRefresh();
      setAccessToken(accessToken);
      set({ user, status: 'authed' });
    } catch {
      set({ user: null, status: 'guest' });
    }
  },

  async logout() {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      set({ user: null, status: 'guest' });
    }
  },
}));

// One silent refresh per 401, wired into the HTTP client.
setUnauthorizedHandler(async () => {
  try {
    const { accessToken } = await apiRefresh();
    setAccessToken(accessToken);
    return true;
  } catch {
    useAuthStore.setState({ user: null, status: 'guest' });
    return false;
  }
});
