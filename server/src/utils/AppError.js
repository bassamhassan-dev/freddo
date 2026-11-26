// The one error class the whole app throws on purpose.
//
// statusCode:    the HTTP status the client should get (400, 404, 409...).
// code:          a stable UPPER_SNAKE string the client can branch on
//                (ITEM_NOT_FOUND, VALIDATION_ERROR), because HTTP statuses
//                alone are too coarse and message text can change.
// messageAr/En:  the bilingual, user-safe message. Every Freddo API error
//                carries both languages so the client shows the active one.
// isOperational: true means "we expected this can happen" (not found, bad
//                input, duplicate). Programming bugs are plain Errors with
//                isOperational = false, and the global handler answers them
//                with a generic 500 instead of leaking internals.
export class AppError extends Error {
  constructor(statusCode, code, messageAr, messageEn) {
    super(messageEn);
    this.statusCode = statusCode;
    this.code = code;
    this.messageAr = messageAr;
    this.messageEn = messageEn;
    this.isOperational = true;
    // Keeps the stack trace pointed at the throw site, not this constructor.
    Error.captureStackTrace(this, this.constructor);
  }
}
