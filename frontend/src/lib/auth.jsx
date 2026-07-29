// AuthProvider: holds the current user + JWT, persists across reloads, and
// exposes login/register/logout. Use the useAuth() hook in any component.
/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, getToken, setToken } from './api';

const USER_KEY = 'lifetrack.user';

const AuthContext = createContext(null);

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readUser());
  const [token, setTokenState] = useState(() => getToken());
  // Start in "loading" only when we have a token but no cached user, i.e. we
  // must hydrate via /auth/me. Lazy init avoids a synchronous setState in the
  // effect below.
  const [loading, setLoading] = useState(() => !!getToken() && !readUser());

  // If we have a token but no user (or stale), refresh from /auth/me.
  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    if (user) return;
    authApi.me()
      .then((u) => { if (!cancelled) { setUser(u); writeUser(u); } })
      .catch(() => { /* api.js already cleared the token on 401 */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, user]);

  // Listen for the 401 signal from the fetch wrapper.
  useEffect(() => {
    const onUnauth = () => {
      setTokenState(null);
      setUser(null);
      writeUser(null);
    };
    window.addEventListener('lifetrack:unauthorized', onUnauth);
    return () => window.removeEventListener('lifetrack:unauthorized', onUnauth);
  }, []);

  const applyAuth = useCallback((res) => {
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    writeUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    return applyAuth(res);
  }, [applyAuth]);

  const register = useCallback(async (fullName, email, password) => {
    const res = await authApi.register({ fullName, email, password });
    return applyAuth(res);
  }, [applyAuth]);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    writeUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'ADMIN',
    loading,
    login,
    register,
    logout,
  }), [user, token, loading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
