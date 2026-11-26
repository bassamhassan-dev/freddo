import { request } from './client.js';

export async function apiLoyaltySettings() {
  const { data } = await request('/api/loyalty/admin/settings');
  return data;
}
export async function apiSaveLoyaltySettings(body) {
  const { data } = await request('/api/loyalty/admin/settings', { method: 'PUT', body });
  return data;
}

// Customer loyalty endpoints (doc 14). Balance + recent ledger entries.
export async function apiMyLoyalty() {
  const { data } = await request('/api/loyalty/mine');
  return data;
}
