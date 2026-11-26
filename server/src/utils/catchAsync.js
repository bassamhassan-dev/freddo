// Express 4 does not forward rejections from async handlers to the error
// middleware on its own, so every async route would need its own try/catch
// whose only job is `next(err)`. This wrapper is that try/catch, once:
// wrap a handler and any rejection lands in globalErrorHandler.
//
// Usage: router.get('/', catchAsync(myController));
export const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};
