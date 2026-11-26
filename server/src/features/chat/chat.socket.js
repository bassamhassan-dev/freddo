import { Server } from 'socket.io';
import { verifyAccessToken } from '../../utils/tokens.js';
import User from '../auth/user.model.js';
import * as chatService from './chat.service.js';
import { ChatConversation } from './chat.model.js';

// Sprint 26: the real-time side of the support chat. One Socket.IO server
// per HTTP server; every socket authenticates with the same JWT access
// token the REST API uses (handshake auth field). Rooms: a customer joins
// their own conversation room, every admin additionally joins the shared
// 'chat:admins' room so new messages reach whoever is on shift.
let io = null;

export function getIo() {
  return io;
}

export function roomFor(conversationId) {
  return `chat:${conversationId}`;
}

// REST fallbacks broadcast through the same rooms, never globally, so one
// customer's messages never leak to another connected customer.
export function broadcastMessage(conversationId, message) {
  io?.to(roomFor(conversationId)).to('chat:admins').emit('chat:message', { conversationId, message });
}

export function attachChatSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: true, credentials: true } });

  io.use(async (socket, next) => {
    try {
      const payload = verifyAccessToken(socket.handshake.auth?.token || '');
      const user = await User.findById(payload.sub);
      if (!user || !user.isActive) throw new Error('inactive');
      socket.user = user;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const isAdmin = socket.user.role === 'admin';

    if (isAdmin) {
      socket.join('chat:admins');
      // Admin opens a thread: join its room and clear the admin unread count.
      // The client emits { conversationId }; accept a bare string too.
      socket.on('chat:join', async (payload, ack) => {
        const conversationId = typeof payload === 'string' ? payload : payload?.conversationId;
        const exists = conversationId && await ChatConversation.exists({ _id: conversationId });
        if (!exists) return ack?.({ error: 'not_found' });
        socket.join(roomFor(conversationId));
        await chatService.markRead(conversationId, 'admin');
        ack?.({ ok: true });
      });
    } else {
      // A customer only ever sees their own conversation.
      const conversation = await chatService.getOrCreateConversation(socket.user._id);
      socket.join(roomFor(conversation._id));
      socket.data.conversationId = conversation._id;
      socket.on('chat:read', async () => chatService.markRead(conversation._id, 'customer'));
    }

    socket.on('chat:send', async (body, ack) => {
      try {
        let conversationId;
        let senderRole;
        if (isAdmin) {
          const exists = await ChatConversation.exists({ _id: body?.conversationId });
          if (!exists) return ack?.({ error: 'not_found' });
          conversationId = body.conversationId;
          senderRole = 'admin';
        } else {
          conversationId = socket.data.conversationId;
          senderRole = 'customer';
        }
        const message = await chatService.appendMessage(conversationId, socket.user._id, senderRole, body || {}, socket.user.name);
        broadcastMessage(conversationId, message.toPublicJSON());
        ack?.({ ok: true, message: message.toPublicJSON() });
      } catch (err) {
        ack?.({ error: err.code === 'VALIDATION' ? 'empty' : 'failed' });
      }
    });
  });

  return io;
}
