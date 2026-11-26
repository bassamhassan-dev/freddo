import { request } from './client.js';

// Validate against the live cart subtotal; checkout re-validates anyway.
export async function apiValidateCoupon(code, subtotal) {
  const { data } = await request('/api/coupons/validate', { method: 'POST', body: { code, subtotal } });
  return data;
}

export async function apiAdminCoupons({ search, active } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (active !== undefined) params.set('active', active);
  const query = params.toString() ? `?${params}` : '';
  const { data } = await request(`/api/admin/coupons${query}`);
  return data;
}

export async function apiCreateCoupon(body) {
  const { data } = await request('/api/admin/coupons', { method: 'POST', body });
  return data;
}

export async function apiUpdateCoupon(id, body) {
  const { data } = await request(`/api/admin/coupons/${id}`, { method: 'PATCH', body });
  return data;
}
