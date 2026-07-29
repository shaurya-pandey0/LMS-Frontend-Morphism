import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { ApiError } from './lib/api.js';

/**
 * LifeTrack Login Page
 *
 * Wired to Spring Boot's `POST /api/auth/login` via the AuthContext.
 * Stores the JWT, hydrates the user, and redirects back to the page the
 * visitor was trying to reach (or /dashboard on direct login).
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      // Must match the backend's @Size(min = 8) rule.
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      const next = location.state?.from || '/dashboard';
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors) setErrors((prev) => ({ ...prev, ...err.fieldErrors }));
        setFormError(err.message || 'Unable to sign in. Please try again.');
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell--auth">
      {/* Decorative overlays defined in layout.css */}
      <div className="botanical-overlay"></div>
      <div className="mesh-overlay"></div>

      {/* Auth Card */}
      <div className="card card--auth">
        {/* Logo */}
        <div className="sidebar__logo" id="login-logo" aria-label="LifeTrack" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }}>
          <svg
            className="sidebar__logo-mark"
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M16 2C14 8 8 14 4 18C8 17 12 18 14 22C14 18 16 12 22 6C20 8 18 6 16 2Z"
              fill="#241F1A"
            />
          </svg>
          <span className="sidebar__logo-text">LifeTrack</span>
        </div>

        {/* Title & Subtitle */}
        <h1 className="card__title" id="login-title">Welcome Back</h1>
        <p className="card__subtitle">
          Sign in to continue your journey toward balance
        </p>

        {/* Form */}
        <form className="card__body" onSubmit={handleSubmit} noValidate>
          {formError && (
            <div
              role="alert"
              className="form-helper form-helper--error"
              style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'rgba(181, 115, 79, 0.08)' }}
            >
              {formError}
            </div>
          )}
          {/* Email */}
          <div className="form-group">
            <input
              type="email"
              id="login-email"
              className={`form-input form-input--auth ${errors.email ? 'form-input--error' : ''}`}
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
              }}
              autoComplete="email"
              required
              aria-label="Email address"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span className="form-helper form-helper--error" id="email-error" role="alert" style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z" />
                </svg>
                {errors.email}
              </span>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <div className="form-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="login-password"
                className={`form-input form-input--auth ${errors.password ? 'form-input--error' : ''}`}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
                autoComplete="current-password"
                required
                aria-label="Password"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'password-error' : undefined}
                style={{ paddingRight: 'var(--space-16)' }}
              />
              <span
                className="form-input-wrapper__suffix"
                id="login-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </span>
            </div>
            {errors.password && (
              <span className="form-helper form-helper--error" id="password-error" role="alert" style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z" />
                </svg>
                {errors.password}
              </span>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn--primary btn--full mt-6"
            id="login-submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <span className="btn__spinner" aria-hidden="true" />}
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer — Register Link */}
        <div className="card__footer">
          <span className="text-sm text-secondary">Don't have an account?</span>
          <Link to="/register" className="btn btn--ghost" id="login-register-link">
            Register
          </Link>
        </div>

      </div>
    </div>
  );
}
