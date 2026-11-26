import { AppError } from '../utils/AppError.js';

// Translates known third-party errors into our AppError shape, so services
// and controllers can throw Mongoose errors around without each route
// knowing what a CastError is.
function normalize(err) {
  if (err instanceof AppError) return err;

  // Mongoose: an id that is not a valid ObjectId.
  if (err.name === 'CastError') {
    return new AppError(400, 'INVALID_ID', 'المعرّف ده مش صحيح', 'This identifier is not valid');
  }
  // Mongoose: schema validation failed (missing required field, min/max...).
  if (err.name === 'ValidationError') {
    return new AppError(
      400,
      'VALIDATION_ERROR',
      'البيانات المبعوتة فيها حاجة غلط',
      'The submitted data is invalid'
    );
  }
  // Multer: a file over the upload size cap.
  if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(400, 'FILE_TOO_LARGE', 'الصورة أكبر من 5 ميجا', 'The image is larger than 5MB');
  }
  // Mongo: unique index violation (e.g. a slug that already exists).
  if (err.code === 11000) {
    return new AppError(409, 'DUPLICATE', 'ده موجود بالفعل', 'This already exists');
  }
  return null;
}

// The final error middleware (4 arguments is what makes Express treat it
// as one). Every error the API ever returns is written here and nowhere
// else, which is what guarantees one consistent error shape.
//
// eslint-disable-next-line no-unused-vars
export function globalErrorHandler(err, req, res, next) {
  const known = normalize(err);

  if (known) {
    res.status(known.statusCode).json({
      success: false,
      error: {
        code: known.code,
        message: { ar: known.messageAr, en: known.messageEn },
      },
    });
    return;
  }

  // Unknown = programming bug. Log the real error server-side, answer the
  // client with a generic bilingual 500: stack traces, SQL/state and library
  // internals must never cross the API boundary.
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: { ar: 'حصل خطأ من عندنا، جرب تاني', en: 'Something went wrong on our side' },
    },
  });
}
