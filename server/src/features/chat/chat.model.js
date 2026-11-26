import mongoose from 'mongoose';

// Sprint 26: one support conversation per customer with the admin team.
// Unread counters live on the conversation so the admin list and the
// customer widget never need to scan messages for badges.
const conversationSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessagePreview: { type: String, trim: true, maxlength: 120 },
    unreadForAdmin: { type: Number, default: 0, min: 0 },
    unreadForCustomer: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ lastMessageAt: -1 });

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatConversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['customer', 'admin'], required: true },
    kind: { type: String, enum: ['text', 'image'], default: 'text' },
    text: { type: String, trim: true, maxlength: 2000 },
    imageUrl: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

messageSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    conversationId: this.conversation,
    senderRole: this.senderRole,
    kind: this.kind,
    text: this.text,
    imageUrl: this.imageUrl,
    createdAt: this.createdAt,
  };
};

export const ChatConversation = mongoose.model('ChatConversation', conversationSchema);
export const ChatMessage = mongoose.model('ChatMessage', messageSchema);
