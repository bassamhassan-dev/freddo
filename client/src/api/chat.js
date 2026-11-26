import { request } from './client';

export const getMyChat = () => request('/api/chat/mine');
export const sendMyMessage = (body) =>
  request('/api/chat/mine/messages', { method: 'POST', body });
export const markMyChatRead = () =>
  request('/api/chat/mine/read', { method: 'POST', body: {} });
export const adminListChats = () => request('/api/chat/admin');
export const adminGetMessages = (id) => request(`/api/chat/admin/${id}/messages`);
export const adminSendMessage = (id, body) =>
  request(`/api/chat/admin/${id}/messages`, { method: 'POST', body });
export const adminMarkRead = (id) =>
  request(`/api/chat/admin/${id}/read`, { method: 'POST', body: {} });

export async function uploadChatImage(file) {
  const form = new FormData();
  form.append('image', file);
  return request('/api/chat/uploads', { method: 'POST', body: form });
}
