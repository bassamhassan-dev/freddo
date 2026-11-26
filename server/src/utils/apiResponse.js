// The single success shape of the whole API. Every endpoint answers:
//
//   { success: true, data: ... }
//
// and errors always go through globalErrorHandler as:
//
//   { success: false, error: { code, message: { ar, en } } }
//
// `success` is the one field the client checks first; the HTTP status
// carries the semantics (200, 201, 404...) and `data` carries the payload.
// Nothing else is added - no meta, no pagination keys until a real
// paginated endpoint needs them (YAGNI, see docs/CONVENTIONS.md).
export function sendSuccess(res, statusCode, data) {
  res.status(statusCode).json({ success: true, data });
}
