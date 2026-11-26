import { Router } from 'express';
import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import { requireAuth, requireRole } from '../auth/auth.middleware.js';
import { ROLES } from '../../utils/roles.js';
import * as chatService from './chat.service.js';
import { ChatConversation } from './chat.model.js';
import { broadcastMessage } from './chat.socket.js';
import { upload } from '../uploads/upload.controller.js';
import { isCloudinaryConfigured, uploadImage } from '../uploads/cloudinary.service.js';

// Sprint 26 support chat, REST side: history + send fallback + read
// receipts. Real-time delivery lives in chat.socket.js; both paths share
// the service so counters and previews never disagree.
const router = Router();

// POST /api/chat/uploads - one image for a chat message (customer or
// admin). Same validation as the admin media upload, separate folder.
// Returns 503 until Cloudinary is configured; the client hides the image
// button then.
router.post(
  '/uploads',
  requireAuth,
  upload.single('image'),
  catchAsync(async (req, res) => {
    if (!isCloudinaryConfigured()) {
      throw new AppError(503, 'CLOUDINARY_NOT_CONFIGURED', 'رفع الصور مش متظبط لسه', 'Image upload is not configured yet');
    }
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'مفيش صورة اتبعتت', 'No image was sent');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      throw new AppError(400, 'INVALID_FILE_TYPE', 'نوع الصورة مش مسموح', 'Only JPG, PNG or WebP images are allowed');
    }
    const { imageUrl } = await uploadImage(req.file.buffer, 'freddo-chat');
    sendSuccess(res, 201, { imageUrl });
  })
);

// --- Customer ---

// GET /api/chat/mine - my conversation (created on first use) + history.
router.get(
  '/mine',
  requireAuth,
  catchAsync(async (req, res) => {
    const conversation = await chatService.getOrCreateConversation(req.user._id);
    const messages = await chatService.listMessages(conversation._id, req.query);
    sendSuccess(res, 200, {
      conversation: { id: conversation._id, unreadForCustomer: conversation.unreadForCustomer },
      messages: messages.map((m) => ({
        id: m._id, senderRole: m.senderRole, senderName: m.senderName, kind: m.kind, text: m.text, imageUrl: m.imageUrl, createdAt: m.createdAt,
      })),
    });
  })
);

// POST /api/chat/mine/messages - REST fallback when the socket is down.
router.post(
  '/mine/messages',
  requireAuth,
  catchAsync(async (req, res) => {
    const conversation = await chatService.getOrCreateConversation(req.user._id);
    const message = await chatService.appendMessage(conversation._id, req.user._id, 'customer', req.body || {}, req.user.name);
    broadcastMessage(conversation._id, message.toPublicJSON());
    sendSuccess(res, 201, { message: message.toPublicJSON() });
  })
);

router.post(
  '/mine/read',
  requireAuth,
  catchAsync(async (req, res) => {
    const conversation = await chatService.getOrCreateConversation(req.user._id);
    await chatService.markRead(conversation._id, 'customer');
    sendSuccess(res, 200, { read: true });
  })
);

// --- Admin ---

router.get(
  '/admin',
  requireAuth,
  requireRole(ROLES.ADMIN),
  catchAsync(async (req, res) => {
    sendSuccess(res, 200, { conversations: await chatService.listForAdmin() });
  })
);

async function loadAdminConversation(req) {
  const conversation = await ChatConversation.findById(req.params.id).lean();
  if (!conversation) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'المحادثة دي مش موجودة', 'This conversation does not exist');
  }
  return conversation;
}

router.get(
  '/admin/:id/messages',
  requireAuth,
  requireRole(ROLES.ADMIN),
  catchAsync(async (req, res) => {
    await loadAdminConversation(req);
    const messages = await chatService.listMessages(req.params.id, req.query);
    sendSuccess(res, 200, {
      messages: messages.map((m) => ({
        id: m._id, senderRole: m.senderRole, senderName: m.senderName, kind: m.kind, text: m.text, imageUrl: m.imageUrl, createdAt: m.createdAt,
      })),
    });
  })
);

router.post(
  '/admin/:id/messages',
  requireAuth,
  requireRole(ROLES.ADMIN),
  catchAsync(async (req, res) => {
    await loadAdminConversation(req);
    const message = await chatService.appendMessage(req.params.id, req.user._id, 'admin', req.body || {}, req.user.name);
    broadcastMessage(req.params.id, message.toPublicJSON());
    sendSuccess(res, 201, { message: message.toPublicJSON() });
  })
);

router.post(
  '/admin/:id/read',
  requireAuth,
  requireRole(ROLES.ADMIN),
  catchAsync(async (req, res) => {
    await loadAdminConversation(req);
    await chatService.markRead(req.params.id, 'admin');
    sendSuccess(res, 200, { read: true });
  })
);

export default router;
