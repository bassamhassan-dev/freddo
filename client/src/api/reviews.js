import { request } from './client.js';

export async function apiReviews(productSlug) {
  const { data } = await request(`/api/reviews?target=product&product=${encodeURIComponent(productSlug)}`);
  return data;
}

export async function apiWriteReview(body) {
  const { data } = await request('/api/reviews', { method: 'POST', body });
  return data;
}

export async function apiAdminReviews(visible) {
  const query = visible === undefined ? '' : `?visible=${visible}`;
  const { data } = await request(`/api/admin/reviews${query}`);
  return data;
}

export async function apiSetReviewVisibility(id, isVisible) {
  const { data } = await request(`/api/admin/reviews/${id}/visibility`, { method: 'PATCH', body: { isVisible } });
  return data;
}
