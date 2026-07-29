import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, { setAuth, clearAuth, getInitialState, loginThunk, registerThunk, fetchMe } from '../authSlice';
import { authApi, ApiError } from '../../lib/api';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual('../../lib/api');
  return {
    ...actual,
    authApi: {
      login: vi.fn(),
      register: vi.fn(),
      me: vi.fn(),
    },
  };
});

describe('authSlice Redux authentication flow', () => {
  const mockUser = { id: 1, email: 'shauryapandey@example.com', fullName: 'Shaurya Pandey', role: 'USER' };
  const mockAdminUser = { id: 2, email: 'admin@example.com', fullName: 'Admin User', role: 'ADMIN' };
  const mockToken = 'mock-jwt-token-12345';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Redux Reducers (setAuth & clearAuth)', () => {
    it('setAuth updates state and persists user + token to localStorage', () => {
      const initialState = { user: null, token: null, loading: false };
      const nextState = authReducer(initialState, setAuth({ user: mockUser, token: mockToken }));

      expect(nextState.user).toEqual(mockUser);
      expect(nextState.token).toBe(mockToken);
      expect(nextState.loading).toBe(false);
      expect(localStorage.getItem('lifetrack.token')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('lifetrack.user'))).toEqual(mockUser);
    });

    it('clearAuth resets state and removes user + token from localStorage', () => {
      localStorage.setItem('lifetrack.token', mockToken);
      localStorage.setItem('lifetrack.user', JSON.stringify(mockUser));

      const initialState = { user: mockUser, token: mockToken, loading: false };
      const nextState = authReducer(initialState, clearAuth());

      expect(nextState.user).toBeNull();
      expect(nextState.token).toBeNull();
      expect(nextState.loading).toBe(false);
      expect(localStorage.getItem('lifetrack.token')).toBeNull();
      expect(localStorage.getItem('lifetrack.user')).toBeNull();
    });
  });

  describe('Session Restoration on Page Refresh', () => {
    it('restores session from localStorage on initial state evaluation', () => {
      localStorage.setItem('lifetrack.token', mockToken);
      localStorage.setItem('lifetrack.user', JSON.stringify(mockUser));

      const state = getInitialState();

      expect(state.token).toBe(mockToken);
      expect(state.user).toEqual(mockUser);
      expect(state.loading).toBe(false);
    });
  });

  describe('Async Thunks (loginThunk, registerThunk, fetchMe)', () => {
    it('loginThunk handles successful login and updates state', async () => {
      authApi.login.mockResolvedValueOnce({ user: mockUser, token: mockToken });

      const dispatch = vi.fn();
      const getState = vi.fn();

      const result = await loginThunk({ email: 'shauryapandey@example.com', password: 'password123' })(dispatch, getState, undefined);

      expect(authApi.login).toHaveBeenCalledWith({ email: 'shauryapandey@example.com', password: 'password123' });
      expect(result.type).toBe('auth/login/fulfilled');
      expect(result.payload).toEqual({ user: mockUser, token: mockToken });
      expect(localStorage.getItem('lifetrack.token')).toBe(mockToken);
      expect(JSON.parse(localStorage.getItem('lifetrack.user'))).toEqual(mockUser);
    });

    it('loginThunk handles failed login and exposes backend ApiError message', async () => {
      const errorResponse = new ApiError(401, 'Invalid email or password');
      authApi.login.mockRejectedValueOnce(errorResponse);

      const dispatch = vi.fn();
      const getState = vi.fn();

      const result = await loginThunk({ email: 'invalid@example.com', password: 'wrong' })(dispatch, getState, undefined);

      expect(result.type).toBe('auth/login/rejected');
      expect(result.payload).toEqual(errorResponse);
    });

    it('registerThunk handles successful registration', async () => {
      authApi.register.mockResolvedValueOnce({ user: mockUser, token: mockToken });

      const dispatch = vi.fn();
      const getState = vi.fn();

      const result = await registerThunk({ fullName: 'Shaurya Pandey', email: 'shauryapandey@example.com', password: 'password123' })(dispatch, getState, undefined);

      expect(authApi.register).toHaveBeenCalledWith({ fullName: 'Shaurya Pandey', email: 'shauryapandey@example.com', password: 'password123' });
      expect(result.type).toBe('auth/register/fulfilled');
      expect(result.payload).toEqual({ user: mockUser, token: mockToken });
    });

    it('fetchMe updates user data on successful /auth/me call', async () => {
      authApi.me.mockResolvedValueOnce(mockUser);

      const dispatch = vi.fn();
      const getState = vi.fn();

      const result = await fetchMe()(dispatch, getState, undefined);

      expect(authApi.me).toHaveBeenCalled();
      expect(result.type).toBe('auth/fetchMe/fulfilled');
      expect(result.payload).toEqual(mockUser);
      expect(JSON.parse(localStorage.getItem('lifetrack.user'))).toEqual(mockUser);
    });
  });

  describe('Protected & Admin Role Verification', () => {
    it('distinguishes between regular USER and ADMIN roles', () => {
      const userState = authReducer(undefined, setAuth({ user: mockUser, token: mockToken }));
      expect(userState.user.role).toBe('USER');

      const adminState = authReducer(undefined, setAuth({ user: mockAdminUser, token: mockToken }));
      expect(adminState.user.role).toBe('ADMIN');
    });
  });
});
