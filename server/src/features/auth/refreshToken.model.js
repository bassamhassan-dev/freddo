import mongoose from 'mongoose';

// One document per active refresh session. The requirements doc points at
// Redis for this; we deliberately use MongoDB instead (documented in
// CONVENTIONS.md): one less piece of infrastructure to run, a TTL index
// cleans up expired sessions by itself, and the whole flow (rotation,
// revocation, reuse detection) is identical. If the platform ever needs
// sub-millisecond session reads, this one module is the swap point.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // SHA-256 of the refresh token - the raw token only ever lives in the
    // user's HttpOnly cookie.
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mongo deletes the document itself once it expires.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
