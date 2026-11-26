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

export async function apiVerifyEmail(token) {
  const { data } = await request('/api/auth/verify-email', { method: 'POST', body: { token } });
  return data;
}

export async function apiResendVerification() {
  const { data } = await request('/api/auth/resend-verification', { method: 'POST' });
  return data;
}

export async function apiUpdateProfile({ name, phone }) {
  const { data } = await request('/api/auth/me', { method: 'PATCH', body: { name, phone } });
  return data;
}

export async function apiUploadAvatar(file) {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await request('/api/auth/me/avatar', { method: 'POST', body: fd });
  return data;
}

export async function apiLogout() {
  await request('/api/auth/logout', { method: 'POST' });
}
