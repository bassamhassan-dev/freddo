import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import SiteContent from './siteContent.model.js';

// The editable homepage copy. Anything not in this list is not CMS-managed
// (lean mandate: editable content is deliberate, not a free-form key store).
export const CONTENT_KEYS = Object.freeze(['tagline', 'menuTitle', 'menuSubtitle', 'menuEmpty']);

// GET /api/content - public: the overrides the homepage renders with.
// Absent keys simply do not appear; the client uses its built-in copy.
export const listPublic = catchAsync(async (req, res) => {
  const rows = await SiteContent.find({ key: { $in: CONTENT_KEYS } }).lean();
  const contents = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  sendSuccess(res, 200, { contents });
});

export const adminList = catchAsync(async (req, res) => {
  const rows = await SiteContent.find({ key: { $in: CONTENT_KEYS } }).lean();
  sendSuccess(res, 200, { contents: Object.fromEntries(rows.map((r) => [r.key, r.value])), keys: CONTENT_KEYS });
});

// PUT /api/admin/content/:key - upsert one key. Sending both values empty
// deletes the override, reverting that spot to the built-in copy.
export const adminPut = catchAsync(async (req, res) => {
  const { key } = req.params;
  if (!CONTENT_KEYS.includes(key)) {
    throw new AppError(400, 'UNKNOWN_KEY', 'المحتوى ده مش قابل للتعديل', 'This content key is not editable');
  }
  const ar = String(req.body?.ar ?? '').trim();
  const en = String(req.body?.en ?? '').trim();
  if (!ar && !en) {
    await SiteContent.deleteOne({ key });
    sendSuccess(res, 200, { reverted: true });
    return;
  }
  if (!ar || !en) {
    throw new AppError(400, 'VALIDATION', 'لازم النسختين العربي والإنجليزي', 'Both Arabic and English values are required');
  }
  const doc = await SiteContent.findOneAndUpdate(
    { key },
    { value: { ar, en } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  sendSuccess(res, 200, { key: doc.key, value: doc.value });
});
