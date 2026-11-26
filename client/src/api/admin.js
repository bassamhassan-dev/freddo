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

export async function apiSaveRecipe(id, recipe) {
  const { data } = await request(`/api/admin/menu/${id}/recipe`, { method: 'PUT', body: recipe });
  return data;
}

export async function apiSetAvailability(id, isAvailable) {
  const { data } = await request(`/api/admin/menu/${id}/availability`, {
    method: 'PATCH',
    body: { isAvailable },
  });
  return data;
}

export async function apiSetDrinkFlag(id, isDrink) {
  const { data } = await request(`/api/admin/menu/${id}/drink-flag`, {
    method: 'PATCH',
    body: { isDrink },
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

// Manual loyalty points adjustment (doc 14): the ledger requires a reason.
export async function apiAdminAdjustPoints(userId, points, description) {
  const { data } = await request('/api/loyalty/admin/adjust', {
    method: 'POST',
    body: { userId, points, description },
  });
  return data;
}

// Sprint 35: menu item + category management.
export async function apiAdminCategories() {
  const { data } = await request('/api/admin/categories');
  return data;
}
export async function apiCreateCategory(name) {
  const { data } = await request('/api/admin/categories', { method: 'POST', body: { name } });
  return data;
}
export async function apiUpdateCategory(id, name) {
  const { data } = await request(`/api/admin/categories/${id}`, { method: 'PUT', body: { name } });
  return data;
}
export async function apiReorderCategories(ids) {
  const { data } = await request('/api/admin/categories/reorder', { method: 'PATCH', body: { ids } });
  return data;
}
export async function apiDeleteCategory(id) {
  const { data } = await request(`/api/admin/categories/${id}`, { method: 'DELETE' });
  return data;
}
export async function apiCreateMenuItem(body) {
  const { data } = await request('/api/admin/menu', { method: 'POST', body });
  return data;
}
export async function apiUpdateMenuItem(id, body) {
  const { data } = await request(`/api/admin/menu/${id}`, { method: 'PUT', body });
  return data;
}
export async function apiDeleteMenuItem(id) {
  const { data } = await request(`/api/admin/menu/${id}`, { method: 'DELETE' });
  return data;
}
