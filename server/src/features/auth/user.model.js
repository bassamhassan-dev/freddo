import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ALL_ROLES, ROLES } from '../../utils/roles.js';

// One User collection for all roles (requirements doc 3.1): a single login
// page authenticates the account and the role decides where the user goes.
// Privileged accounts are never created through public registration - the
// service layer enforces that; the default here is a second net.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    // Normalized (lowercased, trimmed) before save so uniqueness is real:
    // 'Bassam@X.com' and 'bassam@x.com' are the same account.
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    // bcrypt hash, never the plain password. select:false keeps it out of
    // every query result unless explicitly requested - no accidental leaks.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ALL_ROLES, default: ROLES.CUSTOMER },
    // Optional contact phone, set when an admin creates a staff account.
    phone: { type: String, trim: true },
    // Disabled accounts exist but cannot log in (doc 3.3).
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

// What the API is allowed to say about a user. Fields are picked one by
// one - anything added later (phone, addresses...) stays private until
// explicitly exposed here.
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
  };
};

// The admin account view: everything the management table needs (doc 3.7).
// Still picked field by field - passwordHash never appears here.
userSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isActive: this.isActive,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);
export default User;
