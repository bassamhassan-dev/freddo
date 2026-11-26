// The one HTTP client for the whole app. Knows three things:
//  1. The API's unified shape ({ success, data } / { success, error }).
//  2. The access token, kept in memory only (never localStorage - XSS
//     cannot steal what JS storage does not hold; the refresh cookie is
//     HttpOnly for the same reason).
//  3. One silent retry: on a 401 the auth store gets one chance to refresh
//     the session, then the request is replayed once.
//
// The auth store registers itself below, which keeps this module free of
// store imports (no circular dependencies).
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

let accessToken = null;
let onUnauthorized = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

async function rawRequest(path, { method = 'GET', body, token } = {}) {
  // FormData (image uploads) sets its own multipart boundary - never
  // JSON-stringify it and never hand it a content-type.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (body !== undefined && !isForm) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? (isForm ? body : JSON.stringify(body)) : undefined,
    credentials: 'include', // the refresh cookie rides along to /api/auth/*
  });
  if (res.status === 204) return { status: 204, data: null };
  const parsed = await res.json().catch(() => null);
  if (!res.ok) {
    const code = parsed?.error?.code || 'UNKNOWN';
    const message = parsed?.error?.message || null;
    throw Object.assign(new Error(`API ${path} failed with ${res.status}`), {
      status: res.status,
      code,
      message,
    });
  }
  return { status: res.status, data: parsed?.data };
}

// A 401 from an auth endpoint (bad login, expired refresh cookie) is a
// final answer, never a reason to refresh - retrying those would recurse.
const AUTH_PATHS = /^\/api\/auth\//;

export async function request(path, options = {}) {
  try {
    return await rawRequest(path, { ...options, token: accessToken });
  } catch (err) {
    if (err.status === 401 && onUnauthorized && !options.retried && !AUTH_PATHS.test(path)) {
      const renewed = await onUnauthorized();
      if (renewed) return rawRequest(path, { ...options, token: accessToken, retried: true });
    }
    throw err;
  }
}
