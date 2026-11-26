import crypto from 'node:crypto';
import User from '../auth/user.model.js';
import RefreshToken from '../auth/refreshToken.model.js';
import { AppError } from '../../utils/AppError.js';
import { ROLES } from '../../utils/roles.js';
import LoyaltyAccount from '../loyalty/loyaltyAccount.model.js';

// Admin account management (requirements doc 3.7). Privileged accounts are
// created here, never through public registration.

const PAGE_SIZE = 20;

// List with search/filters/pagination plus the overview totals the table
// header shows. Two cheap aggregate queries, no separate stats endpoint.
export async function listAccounts({ role, status, search, page = 1 } = {}) {
  const filter = {};
  if (role && ALL_SAFE_ROLES.includes(role)) filter.role = role;
  if (status === 'active') filter.isActive = true;
  if (status === 'disabled') filter.isActive = false;
  if (search) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const pageNumber = Math.max(1, Number(page) || 1);
  const [total, users, grouped] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNumber - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    User.aggregate([
      { $group: { _id: { role: '$role', isActive: '$isActive' }, count: { $sum: 1 } } },
    ]),
  ]);

  const overview = {};
  for (const r of ALL_SAFE_ROLES) overview[r] = { active: 0, disabled: 0 };
  for (const row of grouped) {
    overview[row._id.role][row._id.isActive ? 'active' : 'disabled'] = row.count;
  }

  const loyaltyRows = await LoyaltyAccount.find({ user: { $in: users.map((u) => u._id) } }).lean();
  const balanceByUser = new Map(loyaltyRows.map((row) => [String(row.user), row.balance]));

  return {
    accounts: users.map((u) => ({ ...u.toAdminJSON(), loyaltyBalance: balanceByUser.get(String(u._id)) || 0 })),
    total,
    page: pageNumber,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    overview,
  };
}

// Create a privileged (admin or barista) account. The password is a random
// one-time temporary: the admin never types a password for someone else and
// no password is ever viewable later (doc 3.7). It is returned once in the
// creation response; an email invitation flow replaces this when the email
// provider decision (open decision #10) lands.
export async function createStaffAccount({ name, email, phone, role }) {
  if (![ROLES.ADMIN, ROLES.BARISTA].includes(role)) {
    throw new AppError(400, 'ROLE_NOT_ALLOWED', 'الدور ده مش مسموح إنشاؤه من هنا', 'This role cannot be created here');
  }
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw new AppError(409, 'EMAIL_TAKEN', 'الإيميل ده مسجل قبل كده', 'This email is already registered');
  }
  const temporaryPassword = crypto.randomBytes(9).toString('base64url');
  const passwordHash = await User.hashPassword(temporaryPassword);
  const user = await User.create({
    name: name.trim(),
    email,
    phone: phone?.trim() || undefined,
    passwordHash,
    role,
  });
  return { account: user.toAdminJSON(), temporaryPassword };
}

// Activate or deactivate. Safeguards (doc 3.7): no self-deactivation, never
// deactivate the last active admin, and every deactivation kills the
// account's sessions immediately.
export async function setAccountActive(actor, targetId, isActive) {
  const target = await User.findById(targetId);
  if (!target) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'الحساب ده مش موجود', 'Account not found');

  if (!isActive) {
    if (String(target._id) === String(actor._id)) {
      throw new AppError(400, 'CANNOT_DISABLE_SELF', 'مينفعش توقف حسابك بنفسك', 'You cannot disable your own account');
    }
    await assertNotLastActiveAdmin(target);
  }

  target.isActive = Boolean(isActive);
  await target.save();
  if (!isActive) await revokeSessions(target._id);
  return target.toAdminJSON();
}

// Role change with the same safeguards plus session revocation (doc 3.7):
// the old role's tokens die on the spot.
export async function changeAccountRole(actor, targetId, role) {
  if (!ALL_SAFE_ROLES.includes(role)) {
    throw new AppError(400, 'ROLE_NOT_ALLOWED', 'الدور ده مش موجود', 'Unknown role');
  }
  const target = await User.findById(targetId);
  if (!target) throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'الحساب ده مش موجود', 'Account not found');
  if (String(target._id) === String(actor._id)) {
    throw new AppError(400, 'CANNOT_CHANGE_OWN_ROLE', 'مينفعش تغيّر دورك بنفسك', 'You cannot change your own role');
  }
  // Only demoting an admin needs the last-admin check; promoting to admin
  // and changes between customer/barista never do.
  if (target.role === ROLES.ADMIN && role !== ROLES.ADMIN) await assertNotLastActiveAdmin(target);

  target.role = role;
  await target.save();
  await revokeSessions(target._id);
  return target.toAdminJSON();
}

async function assertNotLastActiveAdmin(target) {
  if (target.role !== ROLES.ADMIN || !target.isActive) return;
  const otherActiveAdmins = await User.countDocuments({
    _id: { $ne: target._id },
    role: ROLES.ADMIN,
    isActive: true,
  });
  if (otherActiveAdmins === 0) {
    throw new AppError(
      409,
      'LAST_ADMIN',
      'ده آخر أدمن شغال - عيّن أدمن تاني الأول',
      'This is the last active admin - appoint another admin first'
    );
  }
}

function revokeSessions(userId) {
  return RefreshToken.deleteMany({ user: userId });
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALL_SAFE_ROLES = [ROLES.ADMIN, ROLES.BARISTA, ROLES.CUSTOMER];
