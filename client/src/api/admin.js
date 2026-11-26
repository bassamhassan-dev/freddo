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

// Swap a menu item's image (doc 19): a Cloudinary URL from the uploads
// endpoint or any https/site-relative URL typed by hand.
export async function apiSetMenuImage(id, url) {
  const { data } = await request(`/api/admin/menu/${id}/image`, {
    method: 'PATCH',
    body: { url },
  });
  return data;
}

export async function apiSetAvailability(id, isAvailable) {
  const { data } = await request(`/api/admin/menu/${id}/availability`, {
    method: 'PATCH',
    body: { isAvailable },
  });
  return data;
}

export async function apiAdminAccounts({ role, status, search } = {}) {
  const params = new URLSearchParams();
  if (role) params.set('role', role);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const query = params.toString() ? `?${params}` : '';
  const { data } = await request(`/api/admin/accounts${query}`);
  return data;
}

export async function apiCreateAccount(body) {
  const { data } = await request('/api/admin/accounts', { method: 'POST', body });
  return data;
}

export async function apiSetAccountStatus(id, isActive) {
  const { data } = await request(`/api/admin/accounts/${id}/status`, { method: 'PATCH', body: { isActive } });
  return data;
}

export async function apiSetAccountRole(id, role) {
  const { data } = await request(`/api/admin/accounts/${id}/role`, { method: 'PATCH', body: { role } });
  return data;
}
