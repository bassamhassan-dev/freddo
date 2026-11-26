// One place for every call to the Freddo API. The base URL comes from
// client/.env (VITE_API_URL), falling back to the local dev server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// The API's unified contract (docs/CONVENTIONS.md): every success answers
// { success: true, data: ... }, every error { success: false, error:
// { code, message: { ar, en } } }. Callers always get the unwrapped `data`.
async function request(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    let code = 'UNKNOWN';
    try {
      const body = await res.json();
      code = body.error?.code || code;
    } catch {
      // not JSON - keep the generic code
    }
    throw Object.assign(new Error(`API ${path} failed with ${res.status}`), { status: res.status, code });
  }
  const body = await res.json();
  return body.data;
}

export function getMenu(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request(`/api/menu${query}`);
}

export function getMenuItem(slug) {
  return request(`/api/menu/${encodeURIComponent(slug)}`);
}
