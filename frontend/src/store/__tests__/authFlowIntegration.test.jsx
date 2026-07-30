import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../authSlice';
import { AuthInit } from '../../lib/auth';
import { authApi, ApiError } from '../../lib/api';
import LoginPage from '../../pages/LoginPage';

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

function renderWithStore(ui, { initialState } = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <MemoryRouter>
          <AuthInit>{ui}</AuthInit>
        </MemoryRouter>
      </Provider>
    ),
  };
}

describe('Redux Authentication Integration & UI Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('triggers clearAuth and resets store when lifetrack:unauthorized custom event is dispatched', async () => {
    const mockUser = { id: 1, email: 'test@example.com', fullName: 'Test User', role: 'USER' };
    const mockToken = 'valid-token';

    localStorage.setItem('lifetrack.token', mockToken);
    localStorage.setItem('lifetrack.user', JSON.stringify(mockUser));

    const { store } = renderWithStore(<div>App Shell</div>, {
      initialState: {
        auth: { user: mockUser, token: mockToken, loading: false },
      },
    });

    expect(store.getState().auth.user).toEqual(mockUser);
    expect(store.getState().auth.token).toBe(mockToken);

    // Dispatch custom event (simulating 401 response interceptor in api.js) wrapped in act
    act(() => {
      window.dispatchEvent(new CustomEvent('lifetrack:unauthorized'));
    });

    await waitFor(() => {
      expect(store.getState().auth.user).toBeNull();
      expect(store.getState().auth.token).toBeNull();
      expect(localStorage.getItem('lifetrack.token')).toBeNull();
    });
  });

  it('displays backend error message on failed login attempt in LoginPage', async () => {
    const backendError = new ApiError(401, 'Invalid email or password');
    authApi.login.mockRejectedValueOnce(backendError);

    renderWithStore(<LoginPage />);

    const emailInput = screen.getByPlaceholderText("Email address");
    const passwordInput = screen.getByPlaceholderText("Password");
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });
});
