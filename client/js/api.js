/* =========================================================
   CHANGARA CONNECT - API client
   Small fetch wrapper with JWT handling and friendly errors.
   ========================================================= */

const API_BASE = ''; // Empty = same origin (works locally & on Render)

const TOKEN_KEY = 'cc_token';
const USER_KEY = 'cc_user';

const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY) || '',
  setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
    catch (e) { return null; }
  },
  setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
  isLoggedIn: () => Boolean(Auth.getToken())
};

/**
 * Low-level request helper.
 * @param {string} method GET|POST|PUT|PATCH|DELETE
 * @param {string} url     e.g. /api/businesses
 * @param {object|FormData} body
 * @param {object} opts   { auth: true, form: true }
 */
async function apiRequest(method, url, body, opts = {}) {
  const headers = {};
  const token = Auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) {
    payload = body; // browser sets multipart boundary automatically
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(API_BASE + url, { method, headers, body: payload });
  } catch (err) {
    throw new Error('NetworkError');
  }

  if (res.status === 401 && url !== '/api/auth/login' && !url.startsWith('/api/auth')) {
    Auth.clear();
    const here = window.location.pathname;
    if (!here.endsWith('login.html') && !here.endsWith('register.html')) {
      window.location.href = 'login.html?next=' + encodeURIComponent(here + window.location.search);
    }
    throw new Error('Session expired. Please log in again.');
  }

  let json = {};
  try { json = await res.json(); } catch (e) { /* empty body */ }

  if (!res.ok) {
    const message = (json && json.message) || 'Something went wrong. Please try again.';
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return json;
}

const API = {
  get: (url) => apiRequest('GET', url),
  post: (url, body, opts) => apiRequest('POST', url, body, opts),
  put: (url, body, opts) => apiRequest('PUT', url, body, opts),
  patch: (url, body, opts) => apiRequest('PATCH', url, body, opts),
  delete: (url) => apiRequest('DELETE', url),
  // multipart helpers (used by the post/update forms)
  postForm: (url, formData) => apiRequest('POST', url, formData, { form: true }),
  putForm: (url, formData) => apiRequest('PUT', url, formData, { form: true })
};

/** Friendly network failure message. */
function apiErrorMessage(err, fallback) {
  if (err && err.message === 'NetworkError') {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (err && err.message) return err.message;
  return fallback || 'Something went wrong. Please try again.';
}