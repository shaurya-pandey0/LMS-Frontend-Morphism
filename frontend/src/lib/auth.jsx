/* eslint-disable react-refresh/only-export-components */
// Redux-backed Auth hook & initialization component.
// Replaces AuthContext with Redux Toolkit while maintaining the useAuth() API contract.

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginThunk, registerThunk, clearAuth, fetchMe } from '../store/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const { user, token, loading } = useSelector((state) => state.auth);

  const login = useCallback(
    async (email, password) => {
      const res = await dispatch(loginThunk({ email, password })).unwrap();
      return res.user;
    },
    [dispatch]
  );

  const register = useCallback(
    async (fullName, email, password) => {
      const res = await dispatch(registerThunk({ fullName, email, password })).unwrap();
      return res.user;
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(clearAuth());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === 'ADMIN',
    loading,
    login,
    register,
    logout,
  };
}

export function AuthInit({ children }) {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);

  // Refresh user from /auth/me if we have a token but no user
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  // Listen for 401 unauthorized signals emitted by api.js
  useEffect(() => {
    const onUnauth = () => {
      dispatch(clearAuth());
    };
    window.addEventListener('lifetrack:unauthorized', onUnauth);
    return () => window.removeEventListener('lifetrack:unauthorized', onUnauth);
  }, [dispatch]);

  return children;
}
