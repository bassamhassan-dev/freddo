import './env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/utils/AppError.js';
import { catchAsync } from '../src/utils/catchAsync.js';
import { globalErrorHandler } from '../src/middleware/globalErrorHandler.js';
import { notFound } from '../src/middleware/notFound.js';

// Unit tests for the error-handling core: AppError, catchAsync, the 404
// builder and the global handler's translation rules. The handler is
// called directly with a fake res, which keeps these tests fast and free
// of any database.

// Minimal stand-in for an Express response.
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('AppError carries status, code, bilingual message and operational flag', () => {
  const err = new AppError(404, 'ITEM_NOT_FOUND', 'مش موجود', 'Not found');
  assert.ok(err instanceof Error);
  assert.equal(err.statusCode, 404);
  assert.equal(err.code, 'ITEM_NOT_FOUND');
  assert.equal(err.messageAr, 'مش موجود');
  assert.equal(err.messageEn, 'Not found');
  assert.equal(err.message, 'Not found'); // Error.message stays usable in logs
  assert.equal(err.isOperational, true);
  assert.ok(err.stack.includes('Not found')); // stack starts from the message, as usual for Errors
});

test('catchAsync forwards a rejection to next without try/catch', async () => {
  const boom = new AppError(400, 'BAD', 'غلط', 'Bad');
  const handler = catchAsync(async () => {
    throw boom;
  });
  await new Promise((resolve) => {
    handler({}, {}, (err) => {
      assert.equal(err, boom);
      resolve();
    });
  });
});

test('catchAsync lets a successful handler respond normally', async () => {
  const res = fakeRes();
  const handler = catchAsync(async (req, resArg) => {
    resArg.status(200).json({ success: true, data: {} });
  });
  await handler({}, res, () => assert.fail('next must not be called'));
  assert.equal(res.statusCode, 200);
});

test('notFound builds a 404 AppError and hands it to next', () => {
  notFound({ path: '/api/nope' }, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 404);
    assert.equal(err.code, 'NOT_FOUND');
    assert.ok(err.messageAr);
    assert.ok(err.messageEn);
  });
});

test('globalErrorHandler answers an AppError in the standard shape', () => {
  const res = fakeRes();
  const original = console.error;
  console.error = () => {}; // keep the test output clean
  try {
    globalErrorHandler(new AppError(403, 'FORBIDDEN', 'ممنوع', 'Not allowed'), {}, res, () => {});
  } finally {
    console.error = original;
  }
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    success: false,
    error: { code: 'FORBIDDEN', message: { ar: 'ممنوع', en: 'Not allowed' } },
  });
});

test('globalErrorHandler translates a Mongoose CastError into a 400', () => {
  const res = fakeRes();
  const cast = Object.assign(new Error('Cast to ObjectId failed'), { name: 'CastError' });
  globalErrorHandler(cast, {}, res, () => {});
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INVALID_ID');
  assert.ok(res.body.error.message.ar);
  assert.ok(res.body.error.message.en);
});

test('globalErrorHandler translates validation and duplicate-key errors', () => {
  const resValidation = fakeRes();
  globalErrorHandler(
    Object.assign(new Error('validation failed'), { name: 'ValidationError' }),
    {},
    resValidation,
    () => {}
  );
  assert.equal(resValidation.statusCode, 400);
  assert.equal(resValidation.body.error.code, 'VALIDATION_ERROR');

  const resDuplicate = fakeRes();
  globalErrorHandler(
    Object.assign(new Error('E11000 duplicate key'), { code: 11000 }),
    {},
    resDuplicate,
    () => {}
  );
  assert.equal(resDuplicate.statusCode, 409);
  assert.equal(resDuplicate.body.error.code, 'DUPLICATE');
});

test('globalErrorHandler hides unknown errors behind a generic 500', () => {
  const res = fakeRes();
  const original = console.error;
  const logged = [];
  console.error = (err) => logged.push(err);
  try {
    globalErrorHandler(new Error('db password is hunter2'), {}, res, () => {});
  } finally {
    console.error = original;
  }
  // The real error is logged server-side...
  assert.equal(logged.length, 1);
  // ...and never crosses to the client.
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('hunter2'));
});
