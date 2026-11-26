import { request } from './client.js';

// Auth endpoints. Login/register/refresh return { user, accessToken } and
// set the HttpOnly refresh cookie server-side; logout returns 204.
export async function apiRegister({ name, email, password }) {
  const { data } = await request('/api/auth/register', { method: 'POST', body: { name, email, password } });
  return data;
}

export async function apiLogin({ email, password }) {
  const { data } = await request('/api/auth/login', { method: 'POST', body: { email, password } });
  return data;
}

export async function apiRefresh() {
  const { data } = await request('/api/auth/refresh', { method: 'POST' });
  return data;
}

export async function apiLogout() {
  await request('/api/auth/logout', { method: 'POST' });
}
