import { AppError } from '../utils/AppError.js';

// Mounted after all routers: reaching here means no route matched.
// It only builds the error; globalErrorHandler writes the response, so the
// 404 of an unknown route looks exactly like any other API error.
export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'الطريق ده مش موجود', 'This route does not exist'));
}
