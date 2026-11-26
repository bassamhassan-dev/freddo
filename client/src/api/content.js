import { request } from './client.js';

// Public content overrides (CMS). Absent keys mean "use the built-in copy".
export async function apiContent() {
  const { data } = await request('/api/content');
  return data;
}

export async function apiAdminContent() {
  const { data } = await request('/api/admin/content');
  return data;
}

export async function apiPutContent(key, body) {
  const { data } = await request(`/api/admin/content/${key}`, { method: 'PUT', body });
  return data;
}
