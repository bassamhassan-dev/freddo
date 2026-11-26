import { request } from './client.js';

// Order endpoints. The client sends slugs/ids/quantities only - the server
// re-prices everything (doc 8.5), so there is no price field here at all.
export async function apiCreateOrder({ phone, notes, lines, idempotencyKey, couponCode, redeemPoints }) {
  const { data } = await request('/api/orders', {
    method: 'POST',
    body: { phone, notes, lines, idempotencyKey, couponCode, redeemPoints },
  });
  return data;
}

export async function apiMyOrders() {
  const { data } = await request('/api/orders/mine');
  return data;
}

export async function apiGetOrder(id) {
  const { data } = await request(`/api/orders/${id}`);
  return data;
}

export async function apiCancelOrder(id) {
  const { data } = await request(`/api/orders/${id}/cancel`, { method: 'POST' });
  return data;
}
