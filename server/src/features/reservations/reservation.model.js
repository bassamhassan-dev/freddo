import mongoose from 'mongoose';

// Reservations (doc 10.2). Independent of orders: no purchase implied.
//
// Time handling: the café wall clock is the source of truth a human means,
// so the booking date/time are stored as plain strings ("2026-11-27",
// "19:00") next to the computed startsAt/endsAt instants used for overlap
// math. The instants use a fixed UTC+2 café offset - a documented
// simplification (Egypt's DST switches would need a tz library; consistent
// offset is what overlap math needs).
export const RESERVATION_STATUSES = Object.freeze(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']);

const reservationSchema = new mongoose.Schema(
  {
    reservationNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Assigned by staff at confirm time (open decision: automatic
    // assignment chosen over customer table selection).
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    guestCount: { type: Number, required: true, min: 1, max: 12 },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'pending' },
    customerNotes: { type: String, trim: true, maxlength: 500 },
    adminNotes: { type: String, trim: true, maxlength: 500 },
    confirmedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

reservationSchema.index({ user: 1, createdAt: -1 });
reservationSchema.index({ date: 1, status: 1 });
reservationSchema.index({ table: 1, startsAt: 1, endsAt: 1 });

const Reservation = mongoose.model('Reservation', reservationSchema);
export default Reservation;
