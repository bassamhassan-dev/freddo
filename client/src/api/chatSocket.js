import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
let socket = null;
let socketToken = null;

export function getChatSocket(accessToken) {
  if (!accessToken) return null;
  if (socket && socketToken === accessToken) return socket;
  if (socket) socket.disconnect();
  socketToken = accessToken;
  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
  });
  return socket;
}

export function closeChatSocket() {
  if (socket) socket.disconnect();
  socket = null;
  socketToken = null;
}
