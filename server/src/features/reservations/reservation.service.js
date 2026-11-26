import crypto from 'node:crypto';
import Reservation from './reservation.model.js';
import Table from './table.model.js';
import { AppError } from '../../utils/AppError.js';

// Reservation rules (doc 10). Policies that the doc leaves open live here
// as named constants, documented in CONVENTIONS.md and the walkthrough:
// fixed 2-hour slots, kitchen hours 08:00-23:00 (last seating 21:00), at
// least 1 hour lead time, at most 30 days ahead, staff assign the table at
// confirm time, customers cancel while pending.
const SLOT_MINUTES = 120;
const OPEN_HOUR = 8;
const LAST_SEATING_HOUR = 21;
const MIN_LEAD_MS = 60 * 60 * 1000;
const MAX_ADVANCE_MS = 30 * 24 * 60 * 60 * 1000;
const CAFE_OFFSET = '+02:00';

// Admin transitions (doc 10.3/10.5). Customer cancel is pending->cancelled
// only, same policy as orders.
const ADMIN_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
};

function badRequest(code, ar, en) {
  return new AppError(400, code, ar, en);
}

function makeReservationNumber() {
  return `RSV-${crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase()}`;
}

export function toInstants(date, time) {
  const startsAt = new Date(`${date}T${time}:00${CAFE_OFFSET}`);
  const endsAt = new Date(startsAt.getTime() + SLOT_MINUTES * 60 * 1000);
  return { startsAt, endsAt };
}

// Customer booking. Auth is required (doc: reservation management is an
// authenticated-customer capability). Validation happens here, server-side.
export async function createReservation(user, { date, time, guestCount, notes }) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw badRequest('INVALID_DATE', 'اختار تاريخ صحيح', 'Choose a valid date');
  }
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw badRequest('INVALID_TIME', 'اختار وقت صحيح', 'Choose a valid time');
  }
  const hour = Number(time.slice(0, 2));
  if (hour < OPEN_HOUR || hour > LAST_SEATING_HOUR) {
    throw badRequest(
      'OUTSIDE_HOURS',
      `الحجز من ${OPEN_HOUR} صباحاً لـ ${LAST_SEATING_HOUR} مساءً`,
      `Reservations run ${OPEN_HOUR}:00-${LAST_SEATING_HOUR}:00`
    );
  }
  const guests = Number(guestCount);
  if (!Number.isInteger(guests) || guests < 1 || guests > 12) {
    throw badRequest('INVALID_GUESTS', 'عدد الضيوف من 1 لـ 12', 'Guest count must be 1-12');
  }

  const { startsAt, endsAt } = toInstants(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    throw badRequest('INVALID_DATE', 'التاريخ ده مش موجود', 'This date does not exist');
  }
  const now = Date.now();
  if (startsAt.getTime() < now + MIN_LEAD_MS) {
    throw badRequest('TOO_SOON', 'احجز قبلها بساعة على الأقل', 'Book at least one hour ahead');
  }
  if (startsAt.getTime() > now + MAX_ADVANCE_MS) {
    throw badRequest('TOO_FAR', 'الحجز متاح لحد 30 يوم قدام', 'Bookings open up to 30 days ahead');
  }

  // The party must fit on the biggest active table - combining tables is an
  // open decision, not built (documented).
  const biggest = await Table.findOne({ isActive: true }).sort({ capacity: -1 });
  if (!biggest || guests > biggest.capacity) {
    throw badRequest('NO_CAPACITY', 'مفيش ترابيزة تسع العدد ده', 'No table fits this party size');
  }

  const build = () => ({
    reservationNumber: makeReservationNumber(),
    user: user._id,
    date,
    time,
    startsAt,
    endsAt,
    guestCount: guests,
    customerNotes: typeof notes === 'string' ? notes.trim().slice(0, 500) : '',
    status: 'pending',
  });

  try {
    return await Reservation.create(build());
  } catch (err) {
    if (err.code === 11000) return Reservation.create(build()); // number collision: retry once
    throw err;
  }
}

export async function listMyReservations(userId) {
  return Reservation.find({ user: userId }).populate('table', 'number zone').sort({ startsAt: -1 }).lean();
}

// Customer cancel: owner only, pending only - same policy as orders.
export async function cancelMyReservation(user, id) {
  const reservation = await Reservation.findById(id);
  if (!reservation || String(reservation.user) !== String(user._id)) {
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'الحجز ده مش موجود', 'This reservation does not exist');
  }
  if (reservation.status !== 'pending') {
    throw new AppError(409, 'CANNOT_CANCEL', 'الحجز ده اتأكد خلاص - كلم الفرع', 'This reservation is already confirmed - call the branch');
  }
  reservation.status = 'cancelled';
  reservation.cancelledAt = new Date();
  await reservation.save();
  return reservation;
}

// --- Admin ---

export async function listReservations({ date, status } = {}) {
  const filter = {};
  if (date) filter.date = String(date);
  if (status) filter.status = String(status);
  return Reservation.find(filter)
    .populate('user', 'name email phone')
    .populate('table', 'number zone capacity')
    .sort({ date: 1, time: 1 })
    .limit(100)
    .lean();
}

// Confirm/cancel/complete/no-show. Confirming requires the table assignment
// and runs the overlap check (doc 10.6): a confirmed reservation blocks its
// table for its whole slot.
export async function setReservationStatus(id, to, { tableId, adminNotes } = {}) {
  const reservation = await Reservation.findById(id);
  if (!reservation) {
    throw new AppError(404, 'RESERVATION_NOT_FOUND', 'الحجز ده مش موجود', 'This reservation does not exist');
  }
  if (!ADMIN_TRANSITIONS[reservation.status]?.includes(to)) {
    throw new AppError(409, 'BAD_TRANSITION', `مينفعش من ${reservation.status} لـ ${to}`, `Cannot move from ${reservation.status} to ${to}`);
  }

  if (to === 'confirmed') {
    const table = await Table.findOne({ _id: tableId, isActive: true });
    if (!table) {
      throw badRequest('INVALID_TABLE', 'اختار ترابيزة شغالة', 'Choose an active table');
    }
    if (reservation.guestCount > table.capacity) {
      throw badRequest('TABLE_TOO_SMALL', 'الترابيزة دي صغيرة على العدد', 'This table is too small for the party');
    }
    const overlap = await Reservation.findOne({
      _id: { $ne: reservation._id },
      table: table._id,
      status: 'confirmed',
      startsAt: { $lt: reservation.endsAt },
      endsAt: { $gt: reservation.startsAt },
    });
    if (overlap) {
      throw new AppError(409, 'TABLE_CONFLICT', `الترابيزة دي محجوزة (${overlap.reservationNumber})`, `This table is already booked (${overlap.reservationNumber})`);
    }
    reservation.table = table._id;
    reservation.confirmedAt = new Date();
  }
  if (to === 'cancelled') reservation.cancelledAt = new Date();
  if (adminNotes !== undefined) reservation.adminNotes = String(adminNotes).trim().slice(0, 500);

  reservation.status = to;
  await reservation.save();
  return reservation;
}
