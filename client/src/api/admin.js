import { request } from './client.js';

// Admin endpoints - every one requires the admin role server-side.
export async function apiAdminOrders(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const { data } = await request(`/api/admin/orders${query}`);
  return data;
}

export async function apiSetOrderStatus(id, to) {
  const { data } = await request(`/api/admin/orders/${id}/status`, { method: 'POST', body: { to } });
  return data;
}

export async function apiAdminMenu() {
  const { data } = await request('/api/admin/menu');
  return data;
}

export async function apiSetAvailability(id, isAvailable) {
  const { data } = await request(`/api/admin/menu/${id}/availability`, {
    method: 'PATCH',
    body: { isAvailable },
  });
  return data;
}
