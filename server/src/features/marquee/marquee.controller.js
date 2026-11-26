import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import Marquee from './marquee.model.js';

const MAX_PHRASES = 8;

// GET /api/marquee - public. The client renders nothing when disabled or
// empty, so an untouched database simply means no strip.
export const getPublic = catchAsync(async (req, res) => {
  const doc = await Marquee.findOne({ singleton: 'main' }).lean();
  sendSuccess(res, 200, {
    enabled: doc?.isEnabled === true && (doc.phrases?.length || 0) > 0,
    phrases: doc?.phrases || [],
  });
});

// PUT /api/admin/marquee - full replace: on/off plus the whole ordered
// phrase list (the admin editor sends the state it shows).
export const adminPut = catchAsync(async (req, res) => {
  const { isEnabled, phrases } = req.body || {};
  if (typeof isEnabled !== 'boolean') {
    throw new AppError(400, 'VALIDATION_ERROR', 'ابعت isEnabled true أو false', 'Send isEnabled as true or false');
  }
  if (!Array.isArray(phrases) || phrases.length > MAX_PHRASES) {
    throw new AppError(400, 'VALIDATION_ERROR', `الجمل لازم تكون لستة لحد ${MAX_PHRASES} جمل`, `Phrases must be a list of at most ${MAX_PHRASES}`);
  }
  const clean = phrases.map((p) => ({
    ar: typeof p?.ar === 'string' ? p.ar.trim() : '',
    en: typeof p?.en === 'string' ? p.en.trim() : '',
  }));
  if (clean.some((p) => !p.ar || !p.en || p.ar.length > 120 || p.en.length > 120)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'كل جملة لازم عربي وإنجليزي (حد أقصى 120 حرف)', 'Every phrase needs Arabic and English (max 120 chars)');
  }
  const doc = await Marquee.findOneAndUpdate(
    { singleton: 'main' },
    { isEnabled, phrases: clean },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  sendSuccess(res, 200, { enabled: doc.isEnabled, phrases: doc.phrases });
});
