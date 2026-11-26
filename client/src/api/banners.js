import { request } from './client.js';

// Public: active banners for one placement, already window-filtered and
// ordered server-side (doc 5.3).
export async function apiBanners(placement) {
  const { data } = await request(`/api/banners?placement=${placement}`);
  return data;
}

export async function apiAdminBanners() {
  const { data } = await request('/api/admin/banners');
  return data;
}

export async function apiCreateBanner(body) {
  const { data } = await request('/api/admin/banners', { method: 'POST', body });
  return data;
}

export async function apiUpdateBanner(id, body) {
  const { data } = await request(`/api/admin/banners/${id}`, { method: 'PATCH', body });
  return data;
}

export async function apiDeleteBanner(id) {
  const { data } = await request(`/api/admin/banners/${id}`, { method: 'DELETE' });
  return data;
}
