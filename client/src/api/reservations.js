import { request } from './client.js';

export async function apiBookReservation(body) {
  const { data } = await request('/api/reservations', { method: 'POST', body });
  return data;
}

export async function apiMyReservations() {
  const { data } = await request('/api/reservations/mine');
  return data;
}

export async function apiCancelReservation(id) {
  const { data } = await request(`/api/reservations/${id}/cancel`, { method: 'POST' });
  return data;
}

export async function apiAdminReservations({ date, status } = {}) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (status) params.set('status', status);
  const query = params.toString() ? `?${params}` : '';
  const { data } = await request(`/api/admin/reservations${query}`);
  return data;
}

export async function apiSetReservationStatus(id, to, extra = {}) {
  const { data } = await request(`/api/admin/reservations/${id}/status`, { method: 'POST', body: { to, ...extra } });
  return data;
}

export async function apiAdminTables() {
  const { data } = await request('/api/admin/tables');
  return data;
}
