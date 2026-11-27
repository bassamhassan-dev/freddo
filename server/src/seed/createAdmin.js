import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../features/auth/user.model.js';
import { ROLES } from '../utils/roles.js';

// Safe first-admin bootstrap for a real database (npm run create-admin -w server).
// Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from server/.env. It only
// ever creates ONE account. If the email already exists it changes nothing,
// unless --reset-password is passed on purpose. It touches no menu, no
// orders and no other user.
export async function ensureAdmin({ email, password, name, resetPassword = false }) {
  const clean = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('ADMIN_EMAIL is missing or not a valid email');
  if (typeof password !== 'string' || password.length < 8) throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  const existing = await User.findOne({ email: clean });
  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      throw new Error(`${clean} already exists as a ${existing.role}. Change its role from the admin panel or use another email.`);
    }
    if (!resetPassword) return { status: 'exists', email: clean };
    existing.passwordHash = await User.hashPassword(password);
    await existing.save();
    return { status: 'password-reset', email: clean };
  }
  await User.create({
    name: (name || 'Freddo Admin').trim(),
    email: clean,
    passwordHash: await User.hashPassword(password),
    role: ROLES.ADMIN,
    emailVerifiedAt: new Date(),
  });
  return { status: 'created', email: clean };
}

if (process.argv[1] && process.argv[1].endsWith('createAdmin.js')) {
  (async () => {
    await connectDB();
    const r = await ensureAdmin({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: process.env.ADMIN_NAME,
      resetPassword: process.argv.includes('--reset-password'),
    });
    console.log(`Admin ${r.status}: ${r.email} / حساب الأدمن: ${r.status}`);
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
