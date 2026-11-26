import ContactMessage from './contactMessage.model.js';
import { catchAsync } from '../../utils/catchAsync.js';
import { AppError } from '../../utils/AppError.js';

// Contact messages (doc 11). Validation lives in the model; the controller
// shapes requests and responses only.

// POST /api/contact - public (guests included), rate-limited at the router.
// If the sender happens to be logged in, optionalAuth links their account.
export const create = catchAsync(async (req, res) => {
  const { name, email, subject, message } = req.body || {};
  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    throw new AppError(400, 'VALIDATION', 'كل الحقول مطلوبة', 'All fields are required');
  }
  await ContactMessage.create({
    name,
    email,
    subject,
    message,
    user: req.user?._id,
  });
  // No record data leaves this response - just the acknowledgement.
  res.status(201).json({ success: true, data: { received: true } });
});

// --- Admin ---
export const adminList = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = String(req.query.status);
  if (req.query.search) {
    const rx = new RegExp(String(req.query.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { subject: rx }];
  }
  const messages = await ContactMessage.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ success: true, data: { messages } });
});

// Mark read (stamps readAt once), archive, or re-open; admin notes ride
// along on the same endpoint.
export const adminUpdate = catchAsync(async (req, res) => {
  const message = await ContactMessage.findById(req.params.id);
  if (!message) {
    throw new AppError(404, 'MESSAGE_NOT_FOUND', 'الرسالة دي مش موجودة', 'Message not found');
  }
  const { status, adminNotes } = req.body || {};
  if (status !== undefined) {
    if (!['new', 'read', 'archived'].includes(status)) {
      throw new AppError(400, 'VALIDATION', 'الحالة دي مش موجودة', 'Unknown status');
    }
    if (status === 'read' && !message.readAt) message.readAt = new Date();
    message.status = status;
  }
  if (adminNotes !== undefined) message.adminNotes = String(adminNotes).trim().slice(0, 500);
  await message.save();
  res.json({ success: true, data: { message } });
});
