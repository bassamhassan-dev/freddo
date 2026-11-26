// Public menu endpoints. The HTTP details live in client.js.
import { request } from './client.js';

export async function getMenu(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const { data } = await request(`/api/menu${query}`);
  return data;
}

export async function getMenuItem(slug) {
  const { data } = await request(`/api/menu/${encodeURIComponent(slug)}`);
  return data;
}
