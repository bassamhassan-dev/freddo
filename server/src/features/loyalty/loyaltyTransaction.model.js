import mongoose from 'mongoose';

// The append-only ledger (doc 14.1). The unique (order, 'earn') pair is the
// idempotency key: an order can award points exactly once, even if the
// award path somehow runs twice.
const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['earn', 'redeem', 'refund', 'adjustment'], required: true },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    description: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index(
  { order: 1, type: 1 },
  { unique: true, partialFilterExpression: { order: { $exists: true }, type: 'earn' } }
);

const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
export default LoyaltyTransaction;
