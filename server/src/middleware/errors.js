// Central error handling. Every error the API returns on purpose has the
// same shape: { error: { code, message: { ar, en } } } so the client can
// show the message in the active language and branch on the code.

export class ApiError extends Error {
  constructor(status, code, messageAr, messageEn) {
    super(messageEn);
    this.status = status;
    this.code = code;
    this.messageAr = messageAr;
    this.messageEn = messageEn;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: { ar: 'الطريق ده مش موجود', en: 'This route does not exist' },
    },
  });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: { ar: err.messageAr, en: err.messageEn } },
    });
    return;
  }
  // Unknown errors: log the details server-side, return a generic message
  // so internals never leak to the client.
  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: { ar: 'حصل خطأ من عندنا، جرب تاني', en: 'Something went wrong on our side' },
    },
  });
}
