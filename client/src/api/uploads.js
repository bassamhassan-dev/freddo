import { request } from './client.js';

// Admin media uploads (doc 16). The status endpoint tells the UI whether
// to show the upload widget or fall back to the plain image URL field.
export async function apiUploadStatus() {
  const { data } = await request('/api/admin/uploads/status');
  return data;
}

export async function apiUploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const { data } = await request('/api/admin/uploads', { method: 'POST', body: fd });
  return data;
}
