import { request } from './client.js';

// Admin dashboard endpoint (doc 15). All aggregation is server-side.
export async function apiAdminAnalytics({ from, to } = {}) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const { data } = await request(`/api/admin/analytics?${params}`);
  return data;
}
