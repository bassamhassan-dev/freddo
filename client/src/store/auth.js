import { create } from 'zustand';
import { apiLogin, apiLogout, apiRefresh, apiRegister } from '@/api/auth.js';
import { setAccessToken, setUnauthorizedHandler } from '@/api/client.js';

// Frontend auth state (doc 3.6): user, token, and where we are in figuring
// it out. status: 'unknown' (still checking the cookie) -> 'authed' | 'guest'.
// The backend is always the real access control; this store is UX state.

// The refresh cookie is HttpOnly, so JS cannot check for it. This hint
// flag is how bootstrap knows a login happened on this browser before -
// without it there is no session to restore and the refresh call (and its
// 401 in the console) is skipped entirely.
const SESSION_HINT = 'freddo-session';
const hasSessionHint = () => {
  try {
    return localStorage.getItem(SESSION_HINT) === '1';
  } catch {
    return false;
  }
};
const setSessionHint = (on) => {
  try {
    if (on) localStorage.setItem(SESSION_HINT, '1');
    else localStorage.removeItem(SESSION_HINT);
  } catch {
    // private mode: the app still works, bootstrap just cannot skip
  }
};

// One refresh in flight, shared. The server rotates the refresh token on
// every use and treats a second use as theft (revoking all sessions), so
// two concurrent 401s racing into two refreshes used to nuke the whole
// session. Every concurrent caller now awaits the same single refresh.
let refreshPromise = null;
function refreshOnce() {
  if (!refreshPromise) {
    refreshPromise = apiRefresh()
      .then(({ user, accessToken }) => {
        setAccessToken(accessToken);
        setSessionHint(true);
        useAuthStore.setState({ user, status: 'authed' });
        return true;
      })
      .catch(() => {
        setAccessToken(null);
        setSessionHint(false);
        useAuthStore.setState({ user: null, status: 'guest' });
        return false;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  status: 'unknown',

  async login(credentials) {
    const { user, accessToken } = await apiLogin(credentials);
    setAccessToken(accessToken);
    setSessionHint(true);
    set({ user, status: 'authed' });
    return user;
  },

  async register(details) {
    const { user, accessToken } = await apiRegister(details);
    setAccessToken(accessToken);
    setSessionHint(true);
    set({ user, status: 'authed' });
    return user;
  },

  // Called once on app start: with a session hint, restore silently; with
  // none, go straight to guest - no refresh request, no 401 console noise.
  async bootstrap() {
    if (!hasSessionHint()) {
      set({ user: null, status: 'guest' });
      return;
    }
    await refreshOnce();
  },

  async logout() {
    try {
      await apiLogout();
    } finally {
      setAccessToken(null);
      setSessionHint(false);
      set({ user: null, status: 'guest' });
    }
  },
}));

// One silent refresh per 401, wired into the HTTP client - shared, so a
// burst of 401s (page widgets loading together after the access token
// expired) costs exactly one rotation.
setUnauthorizedHandler(refreshOnce);
