import { catchAsync } from '../../utils/catchAsync.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { AppError } from '../../utils/AppError.js';
import SiteContent from './siteContent.model.js';

// The editable site copy. Anything not in these lists is not CMS-managed
// (lean mandate: editable content is deliberate, not a free-form key store).
// COPY_KEYS: bilingual text. URL_KEYS: one https URL stored in both
// languages. SECTION_KEYS: homepage sections the admin can show/hide.
export const COPY_KEYS = Object.freeze([
  'tagline', 'menuTitle', 'menuSubtitle', 'menuEmpty',
  'featuredTitle', 'offersTitle', 'offersSubtitle',
  'aboutTitle', 'aboutBody',
  'infoHours', 'infoLocation', 'infoPhone',
  'footerTagline', 'footerRights', 'galleryTitle',
  'reviewsHomeTitle', 'loyaltyTitle', 'loyaltyBody', 'loyaltyCta',
]);
// Image keys hold site-relative photo paths (admin can point them at
// any uploaded asset); social keys hold external https links.
export const URL_KEYS = Object.freeze([
  'socialFacebook', 'socialInstagram', 'socialTiktok',
  'aboutImage1', 'aboutImage2',
  'galleryImage1', 'galleryImage2', 'galleryImage3', 'galleryImage4', 'galleryImage5', 'galleryImage6',
]);
export const SECTION_KEYS = Object.freeze(['sectionFeatured', 'sectionOffers', 'sectionAbout', 'sectionInfo', 'sectionGallery', 'sectionReviews', 'sectionLoyalty', 'footer']);
export const CONTENT_KEYS = Object.freeze([...COPY_KEYS, ...URL_KEYS, ...SECTION_KEYS]);

// GET /api/content - public: the overrides the homepage renders with.
// Absent keys simply do not appear; the client uses its built-in copy.
export const listPublic = catchAsync(async (req, res) => {
  const rows = await SiteContent.find({ key: { $in: CONTENT_KEYS } }).lean();
  const contents = Object.fromEntries(rows.filter((r) => r.value?.ar || r.value?.en).map((r) => [r.key, r.value]));
  const sections = Object.fromEntries(rows.filter((r) => SECTION_KEYS.includes(r.key)).map((r) => [r.key, r.enabled]));
  sendSuccess(res, 200, { contents, sections });
});

export const adminList = catchAsync(async (req, res) => {
  const rows = await SiteContent.find({ key: { $in: CONTENT_KEYS } }).lean();
  sendSuccess(res, 200, {
    contents: Object.fromEntries(rows.map((r) => [r.key, r.value])),
    sections: Object.fromEntries(rows.filter((r) => SECTION_KEYS.includes(r.key)).map((r) => [r.key, r.enabled])),
    keys: CONTENT_KEYS,
    copyKeys: COPY_KEYS,
    urlKeys: URL_KEYS,
    sectionKeys: SECTION_KEYS,
  });
});

// PUT /api/admin/content/:key - upsert one key. Sending both values empty
// deletes the override, reverting that spot to the built-in copy.
export const adminPut = catchAsync(async (req, res) => {
  const { key } = req.params;
  if (!CONTENT_KEYS.includes(key)) {
    throw new AppError(400, 'UNKNOWN_KEY', 'المحتوى ده مش قابل للتعديل', 'This content key is not editable');
  }
  // Section keys toggle visibility only - no copy involved.
  if (SECTION_KEYS.includes(key)) {
    if (typeof req.body?.enabled !== 'boolean') {
      throw new AppError(400, 'VALIDATION', 'قيمة الإظهار مش صحيحة', 'Invalid visibility value');
    }
    const doc = await SiteContent.findOneAndUpdate(
      { key },
      { enabled: req.body.enabled },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sendSuccess(res, 200, { key: doc.key, enabled: doc.enabled });
    return;
  }

  // URL keys: one https link stored for both languages; empty reverts.
  if (URL_KEYS.includes(key)) {
    const url = String(req.body?.url ?? '').trim();
    if (!url) {
      await SiteContent.deleteOne({ key });
      sendSuccess(res, 200, { reverted: true });
      return;
    }
    // https links for socials; site-relative paths allowed for photo keys.
    const ok = /^https:\/\/.+/.test(url) || /^\/[\w./-]+$/.test(url);
    if (url.length > 500 || !ok) {
      throw new AppError(400, 'VALIDATION', 'الرابط لازم https أو مسار صورة من الموقع', 'The URL must be https or a site-relative image path');
    }
    const doc = await SiteContent.findOneAndUpdate(
      { key },
      { value: { ar: url, en: url } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    sendSuccess(res, 200, { key: doc.key, value: doc.value });
    return;
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
