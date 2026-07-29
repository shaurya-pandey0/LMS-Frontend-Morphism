// Thin fetch wrapper that talks to the Spring Boot backend.
//
// Responsibilities:
//   - Attach the JWT from localStorage to every request.
//   - Parse JSON and raise an ApiError with status + server message on non-2xx.
//   - On 401, clear the token and emit a custom event the AuthProvider listens to.

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const TOKEN_KEY = 'lifetrack.token';

export class ApiError extends Error {
  constructor(status, message, fieldErrors) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors || null;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore storage errors */ }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { 'Accept': 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.');
  }

  // 204 No Content
  if (res.status === 204) return null;

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!res.ok) {
    if (res.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('lifetrack:unauthorized'));
    }
    const message = (payload && typeof payload === 'object' && payload.message)
      || (typeof payload === 'string' ? payload : `Request failed (${res.status})`);
    const fieldErrors = (payload && typeof payload === 'object' && payload.errors) || null;
    throw new ApiError(res.status, message, fieldErrors);
  }

  return payload;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

// ---- Typed endpoint helpers (matches backend/README.md) --------------------
export const authApi = {
  register: (data) => api.post('/auth/register', data, { auth: false }),
  login: (data) => api.post('/auth/login', data, { auth: false }),
  me: () => api.get('/auth/me'),
};

export const dailyLogApi = {
  list: () => api.get('/daily-logs'),
  // Returns null (204) when nothing is logged for today yet.
  today: () => api.get('/daily-logs/today'),
  byDate: (date) => api.get(`/daily-logs?date=${date}`),
  get: (id) => api.get(`/daily-logs/${id}`),
  upsert: (data) => api.post('/daily-logs', data),
  merge: (data) => api.post('/daily-logs/merge', data),
  update: (id, data) => api.put(`/daily-logs/${id}`, data),
  remove: (id) => api.del(`/daily-logs/${id}`),
};

export const habitApi = {
  list: (date) => api.get(date ? `/habits?date=${date}` : '/habits'),
  create: (data) => api.post('/habits', data),
  update: (id, data) => api.put(`/habits/${id}`, data),
  deactivate: (id) => api.del(`/habits/${id}`),
  toggle: (id, date, completed) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (completed !== undefined && completed !== null) params.append('completed', String(completed));
    const queryString = params.toString();
    return api.post(`/habits/${id}/toggle${queryString ? `?${queryString}` : ''}`);
  },
};

export const expenseApi = {
  list: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const q = params.toString();
    return api.get(q ? `/expenses?${q}` : '/expenses');
  },
  create: (data) => api.post('/expenses', data),
  update: (id, data) => api.put(`/expenses/${id}`, data),
  remove: (id) => api.del(`/expenses/${id}`),
};

export const journalApi = {
  list: () => api.get('/journal'),
  create: (data) => api.post('/journal', data),
  update: (id, data) => api.put(`/journal/${id}`, data),
  remove: (id) => api.del(`/journal/${id}`),
};

export const analyticsApi = {
  summary: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const q = params.toString();
    return api.get(q ? `/analytics?${q}` : '/analytics');
  },
};

export const insightsApi = {
  list: () => api.get('/insights'),
};

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: () => api.get('/admin/users'),
};

// Domain vocabulary (categories, habit catalogs, moods) — backend owns these.
export const referenceApi = {
  get: () => api.get('/reference'),
};

// Per-user targets (monthly budget, sleep/step/water targets).
export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

// Aggregated lifestyle context for the AI service. Built by Spring so the
// browser never assembles domain data or names whose context to read.
export const aiContextApi = {
  get: (days) => api.get(days ? `/ai-context?days=${days}` : '/ai-context'),
};

// ---- AI microservice (separate FastAPI service, no JWT in dev) -------------
const AI_BASE = import.meta.env.VITE_AI_BASE_URL || 'http://localhost:8100';

async function aiRequest(path, body, { method = 'POST', signal } = {}) {
  let res;
  try {
    res = await fetch(`${AI_BASE}${path}`, {
      method,
      headers: body !== undefined
        ? { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        : { 'Accept': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'AI service is unavailable.');
  }
  const text = await res.text();
  let payload = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }
  if (!res.ok) {
    const message = (payload && typeof payload === 'object' && (payload.detail || payload.message))
      || `AI request failed (${res.status})`;
    throw new ApiError(res.status, typeof message === 'string' ? message : 'AI request failed');
  }
  return payload;
}

export const aiApi = {
  health: () => aiRequest('/health', undefined, { method: 'GET' }),
  chat: (payload) => aiRequest('/chat', payload),
  insights: (payload) => aiRequest('/insights', payload),
  command: (payload) => aiRequest('/command', payload),
};
