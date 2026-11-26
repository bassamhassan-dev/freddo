import { request } from './client';

export async function getMarquee() {
  const { data } = await request('/api/marquee');
  return data;
}

export async function apiPutMarquee(body) {
  const { data } = await request('/api/admin/marquee', { method: 'PUT', body });
  return data;
}
