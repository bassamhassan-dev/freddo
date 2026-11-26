import mongoose from 'mongoose';

// One account per customer (doc 14.1): the cached balance plus lifetime
// totals. The ledger (LoyaltyTransaction) is the truth; this is the fast
// read. Redemption rules are not finalized in the doc, so only earning is
// built - redeem arrives with the reward catalog decision.
const loyaltyAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0, min: 0 },
    lifetimeEarned: { type: Number, default: 0, min: 0 },
    lifetimeRedeemed: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const LoyaltyAccount = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
export default LoyaltyAccount;
