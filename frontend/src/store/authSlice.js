import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, getToken, setToken } from '../lib/api';

const USER_KEY = 'lifetrack.user';

function readUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeUser(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch { /* ignore storage errors */ }
}

export function getInitialState() {
  const token = getToken();
  const user = readUser();
  return {
    user,
    token,
    loading: !!token && !user,
  };
}

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const user = await authApi.me();
    writeUser(user);
    return user;
  } catch (err) {
    return rejectWithValue(err.message || 'Failed to fetch user');
  }
});

export const loginThunk = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.login({ email, password });
    setToken(res.token);
    writeUser(res.user);
    return res;
  } catch (err) {
    return rejectWithValue(err);
  }
});

export const registerThunk = createAsyncThunk('auth/register', async ({ fullName, email, password }, { rejectWithValue }) => {
  try {
    const res = await authApi.register({ fullName, email, password });
    setToken(res.token);
    writeUser(res.user);
    return res;
  } catch (err) {
    return rejectWithValue(err);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setAuth(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.loading = false;
      setToken(token);
      writeUser(user);
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.loading = false;
      setToken(null);
      writeUser(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.loading = false;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.loading = false;
      });
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
