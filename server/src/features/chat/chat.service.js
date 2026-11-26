import { ChatConversation, ChatMessage } from './chat.model.js';
import { AppError } from '../../utils/AppError.js';

// Sprint 26 support chat. One conversation per customer; created lazily on
// the customer's first message. Messages land from the socket gateway and
// from the REST fallback - both go through appendMessage so counters and
// previews stay correct everywhere.

export function previewFor(body) {
  return body.kind === 'image' ? '[image]' : String(body.text || '').slice(0, 120);
}

export async function getOrCreateConversation(customerId) {
  return ChatConversation.findOneAndUpdate(
    { customer: customerId },
    { $setOnInsert: { customer: customerId } },
    { new: true, upsert: true }
  );
}

// senderRole decides which unread counter moves: a customer message is
// unread for the admin team and vice versa.
export async function appendMessage(conversationId, sender, senderRole, body, senderName, senderAvatar) {
  const kind = body.imageUrl ? 'image' : 'text';
  if (kind === 'text' && !String(body.text || '').trim()) {
    throw new AppError(400, 'VALIDATION', 'الرسالة فاضية', 'The message is empty');
  }
  const message = await ChatMessage.create({
    conversation: conversationId,
    sender,
    senderRole,
    senderName: typeof senderName === 'string' ? senderName.slice(0, 80) : undefined,
    senderAvatar: typeof senderAvatar === 'string' ? senderAvatar : undefined,
    kind,
    text: kind === 'text' ? String(body.text).trim() : undefined,
    imageUrl: kind === 'image' ? String(body.imageUrl) : undefined,
  });
  const bump = senderRole === 'customer' ? { unreadForAdmin: 1 } : { unreadForCustomer: 1 };
  await ChatConversation.updateOne(
    { _id: conversationId },
    { $inc: bump, $set: { lastMessageAt: message.createdAt, lastMessagePreview: previewFor({ kind, text: body.text }) } }
  );
  return message;
}

export async function listMessages(conversationId, { before, limit = 50 } = {}) {
  const filter = { conversation: conversationId };
  if (before) filter.createdAt = { $lt: new Date(before) };
  const messages = await ChatMessage.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return messages.reverse(); // oldest first for the chat panel
}

// Opening the thread clears your own unread counter.
export async function markRead(conversationId, readerRole) {
  const field = readerRole === 'admin' ? 'unreadForAdmin' : 'unreadForCustomer';
  await ChatConversation.updateOne({ _id: conversationId }, { $set: { [field]: 0 } });
}

export async function listForAdmin() {
  const conversations = await ChatConversation.find({})
    .sort({ lastMessageAt: -1 })
    .limit(100)
    .populate('customer', 'name email')
    .lean();
  return conversations.map((c) => ({
    id: c._id,
    customer: c.customer ? { id: c.customer._id, name: c.customer.name, email: c.customer.email } : null,
    lastMessageAt: c.lastMessageAt,
    lastMessagePreview: c.lastMessagePreview,
    unreadForAdmin: c.unreadForAdmin,
  }));
}
