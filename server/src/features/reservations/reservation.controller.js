import * as service from './reservation.service.js';
import { catchAsync } from '../../utils/catchAsync.js';

export const create = catchAsync(async (req, res) => {
  const reservation = await service.createReservation(req.user, req.body || {});
  res.status(201).json({ success: true, data: { reservation } });
});

export const listMine = catchAsync(async (req, res) => {
  const reservations = await service.listMyReservations(req.user._id);
  res.json({ success: true, data: { reservations } });
});

export const cancelMine = catchAsync(async (req, res) => {
  const reservation = await service.cancelMyReservation(req.user, req.params.id);
  res.json({ success: true, data: { reservation } });
});

// --- Admin ---
export const adminList = catchAsync(async (req, res) => {
  const reservations = await service.listReservations(req.query);
  res.json({ success: true, data: { reservations } });
});

export const adminSetStatus = catchAsync(async (req, res) => {
  const reservation = await service.setReservationStatus(req.params.id, req.body?.to, {
    tableId: req.body?.tableId,
    adminNotes: req.body?.adminNotes,
  });
  res.json({ success: true, data: { reservation } });
});
