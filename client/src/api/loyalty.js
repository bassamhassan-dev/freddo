import { request } from './client.js';

// Customer loyalty endpoints (doc 14). Balance + recent ledger entries.
export async function apiMyLoyalty() {
  const { data } = await request('/api/loyalty/mine');
  return data;
}
