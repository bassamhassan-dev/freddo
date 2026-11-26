import { request } from './client.js';

export async function apiSendContact(body) {
  const { data } = await request('/api/contact', { method: 'POST', body });
  return data;
}

export async function apiAdminContact({ status, search } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';
  const { data } = await request(`/api/admin/contact${query}`);
  return data;
}

export async function apiUpdateContact(id, body) {
  const { data } = await request(`/api/admin/contact/${id}`, { method: 'PATCH', body });
  return data;
}
