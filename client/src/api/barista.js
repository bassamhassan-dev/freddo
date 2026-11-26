import { request } from './client.js';

// Barista workspace endpoints (staff-only server-side).
export async function apiBaristaItems() {
  const { data } = await request('/api/barista/items');
  return data;
}

export async function apiBaristaRecipe(slug) {
  const { data } = await request(`/api/barista/items/${encodeURIComponent(slug)}/recipe`);
  return data;
}
