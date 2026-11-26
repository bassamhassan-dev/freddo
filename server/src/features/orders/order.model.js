import mongoose from 'mongoose';

// One ordered line, as a snapshot (doc 9.5): everything the kitchen and
// the receipt need, frozen at purchase time. The product reference is kept
// for analytics, but the order stays correct even if the menu item is
// edited, repriced or deleted later - that is the whole point.
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: {
      ar: { type: String, required: true },
      en: { type: String, required: true },
    },
    image: { type: String },
    variantLabel: {
      ar: { type: String },
      en: { type: String },
    },
    addOns: [
      {
        name: { ar: { type: String, required: true }, en: { type: String, required: true } },
        price: { type: Number, required: true, min: 0 },
      },
    ],
    notes: { type: String, trim: true, maxlength: 300 },
    unitPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1, max: 20 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Every status change is recorded: from, to, when, and who (doc 9.6).
const statusHistorySchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

export const ORDER_STATUSES = Object.freeze([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'completed',
  'cancelled',
]);

// Valid transitions (doc 9.6: "transitions must be validated"). Cancel is
// allowed while nothing irreversible happened yet; the customer-facing
// rule (pending only) is enforced separately in the service.
export const ORDER_TRANSITIONS = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

const orderSchema = new mongoose.Schema(
  {
    // Human-facing number, separate from _id: short, unique, pronounceable
    // over the counter.
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: { type: [orderItemSchema], validate: [(v) => v.length > 0, 'empty order'] },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 }, // coupons land in their own sprint
    total: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['cod'], default: 'cod' }, // COD only in v1 (doc 9.3)
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending' },
    statusHistory: { type: [statusHistorySchema], default: [] },
    // Contact snapshot: the phone used for this order, frozen like the items.
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
    },
    // Fulfillment is pickup-only for now: delivery zones/fees are open
    // decision #1 in the requirements doc, so v1 does not guess them.
    fulfillmentType: { type: String, enum: ['pickup'], default: 'pickup' },
    notes: { type: String, trim: true, maxlength: 500 },
    // Client-supplied idempotency key (doc 9.4): a retried POST with the
    // same key returns the original order instead of creating a duplicate.
    idempotencyKey: { type: String, sparse: true, unique: true },
    placedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
