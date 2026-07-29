import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const AI_BASE = import.meta.env.VITE_AI_BASE_URL || 'http://localhost:8100';
const TOKEN_KEY = 'lifetrack.token';

/** Custom error class wrapping HTTP status, message, and field validation errors */
export class ApiError extends Error {
  constructor(status, message, fieldErrors = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** Retrieves JWT authorization token from localStorage */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Stores or removes JWT authorization token in localStorage */
export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore storage errors */ }
}

// Shared Axios client instances
const springClient = axios.create({ baseURL: API_BASE, headers: { Accept: 'application/json' } });
const aiClient = axios.create({ baseURL: AI_BASE, headers: { Accept: 'application/json' } });

// Attach JWT token to Spring Boot requests unless skipAuth is true
springClient.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Shared error handler for Axios clients
function handleAxiosError(error, fallbackMsg, isSpring = false) {
  // Preserve request cancellation
  if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
    return Promise.reject(error);
  }
  // Server responded with non-2xx status code
  if (error.response) {
    if (isSpring && error.response.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('lifetrack:unauthorized'));
    }
    const data = error.response.data;
    let rawMsg = data && typeof data === 'object' ? (data.message || data.detail) : (typeof data === 'string' ? data : null);

    // Normalize FastAPI 422 array errors or object details into string
    if (Array.isArray(rawMsg)) {
      rawMsg = rawMsg.map((err) => (typeof err === 'object' && err?.msg ? err.msg : String(err))).join('; ');
    } else if (rawMsg && typeof rawMsg === 'object') {
      rawMsg = rawMsg.msg || rawMsg.message || JSON.stringify(rawMsg);
    }

    const message = (typeof rawMsg === 'string' && rawMsg.trim().length > 0)
      ? rawMsg
      : `Request failed (${error.response.status})`;
    const fieldErrors = (data && typeof data === 'object' && data.errors) || null;

    return Promise.reject(new ApiError(error.response.status, message, fieldErrors));
  }
  // Network failure or backend unreachable
  return Promise.reject(new ApiError(0, fallbackMsg));
}

// Return response.data directly from interceptors
springClient.interceptors.response.use(
  (res) => (res.status === 204 ? null : res.data),
  (err) => handleAxiosError(err, 'Cannot reach the server. Check that the backend is running.', true)
);

aiClient.interceptors.response.use(
  (res) => res.data,
  (err) => handleAxiosError(err, 'AI service is unavailable.')
);

// ---- Domain Endpoint Helpers ------------------------------------------------

/** User Authentication endpoints (/api/auth) */
export const authApi = {
  register: (data) => springClient.post('/auth/register', data, { skipAuth: true }),
  login: (data) => springClient.post('/auth/login', data, { skipAuth: true }),
  me: () => springClient.get('/auth/me'),
};

/** Daily Logs management endpoints (/api/daily-logs) */
export const dailyLogApi = {
  list: () => springClient.get('/daily-logs'),
  merge: (data) => springClient.post('/daily-logs/merge', data),
  update: (id, data) => springClient.put(`/daily-logs/${id}`, data),
  remove: (id) => springClient.delete(`/daily-logs/${id}`),
};

/** Habit tracking endpoints (/api/habits) */
export const habitApi = {
  list: (date) => springClient.get('/habits', { params: { date } }),
  create: (data) => springClient.post('/habits', data),
  update: (id, data) => springClient.put(`/habits/${id}`, data),
  deactivate: (id) => springClient.delete(`/habits/${id}`),
  toggle: (id, date, completed) => springClient.post(`/habits/${id}/toggle`, null, { params: { date, completed } }),
};

/** Expense management endpoints (/api/expenses) */
export const expenseApi = {
  list: (from, to) => springClient.get('/expenses', { params: { from, to } }),
  create: (data) => springClient.post('/expenses', data),
  update: (id, data) => springClient.put(`/expenses/${id}`, data),
  remove: (id) => springClient.delete(`/expenses/${id}`),
};

/** Personal Journal endpoints (/api/journal) */
export const journalApi = {
  list: () => springClient.get('/journal'),
  create: (data) => springClient.post('/journal', data),
  update: (id, data) => springClient.put(`/journal/${id}`, data),
  remove: (id) => springClient.delete(`/journal/${id}`),
};

/** Lifestyle Analytics endpoints (/api/analytics) */
export const analyticsApi = {
  summary: (from, to) => springClient.get('/analytics', { params: { from, to } }),
};

/** Rule-based Insights endpoints (/api/insights) */
export const insightsApi = {
  list: () => springClient.get('/insights'),
};

/** Admin Statistics & User Management endpoints (/api/admin) */
export const adminApi = {
  stats: () => springClient.get('/admin/stats'),
  users: () => springClient.get('/admin/users'),
};

/** Domain Vocabulary & Reference metadata (/api/reference) */
export const referenceApi = {
  get: () => springClient.get('/reference'),
};

/** User Goals & Target Settings (/api/settings) */
export const settingsApi = {
  get: () => springClient.get('/settings'),
  update: (data) => springClient.put('/settings', data),
};

/** Aggregated Lifestyle Context for AI processing (/api/ai-context) */
export const aiContextApi = {
  get: (days) => springClient.get('/ai-context', { params: { days } }),
};

/** FastAPI AI Microservice endpoints (/chat, /insights, /command) */
export const aiApi = {
  chat: (payload, opts) => aiClient.post('/chat', payload, opts),
  insights: (payload, opts) => aiClient.post('/insights', payload, opts),
  command: (payload, opts) => aiClient.post('/command', payload, opts),
};
