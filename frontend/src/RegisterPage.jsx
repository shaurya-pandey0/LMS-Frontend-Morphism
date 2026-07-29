import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { ApiError } from './lib/api.js';
import AuthShell from './components/AuthShell.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import PasswordInput from './components/PasswordInput.jsx';

/**
 * LifeTrack Registration Page
 *
 * Wired to Spring Boot's `POST /api/auth/register`.
 * Server-side validation errors (duplicate email, password rules) surface
 * either as a top-of-form banner or as individual field errors.
 */
/* ── Error helper markup ── */
const ErrorMsg = ({ id, msg }) =>
  msg ? (
    <span
      className="form-helper form-helper--error"
      id={id}
      role="alert"
      style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z" />
      </svg>
      {msg}
    </span>
  ) : null;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors]                   = useState({});
  const [formError, setFormError]             = useState('');
  const [isSubmitting, setIsSubmitting]       = useState(false);

  /* ── Validation ── */
  const validateForm = () => {
    const e = {};

    if (!fullName.trim()) {
      e.fullName = 'Full name is required';
    }

    if (!email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      e.email = 'Please enter a valid email address';
    }

    if (!password) {
      e.password = 'Password is required';
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    }

    if (!confirmPassword) {
      e.confirmPassword = 'Please confirm your password';
    } else if (password && confirmPassword !== password) {
      e.confirmPassword = 'Passwords do not match';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  /* ── Submit Handler ── */
  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await register(fullName.trim(), email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.fieldErrors && Object.keys(err.fieldErrors).length > 0) {
          setErrors(err.fieldErrors);
        } else {
          setFormError(err.message || 'Registration failed. Please check your information.');
        }
      } else {
        setFormError('Cannot reach the server. Please check that the backend is running.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <BrandLogo id="register-logo" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }} />

      <h1 className="card__title" id="register-title">Begin Your Journey</h1>
      <p className="card__subtitle">
        Create your account to start achieving balance
      </p>

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

        {/* Full Name */}
        <div className="form-group">
          <input
            type="text"
            id="register-fullname"
            className={`form-input form-input--auth${errors.fullName ? ' form-input--error' : ''}`}
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => { setFullName(e.target.value); clearError('fullName'); }}
            autoComplete="name"
            required
            aria-label="Full name"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'fullname-error' : undefined}
          />
          <ErrorMsg id="fullname-error" msg={errors.fullName} />
        </div>

        {/* Email Address */}
        <div className="form-group">
          <input
            type="email"
            id="register-email"
            className={`form-input form-input--auth${errors.email ? ' form-input--error' : ''}`}
            placeholder="Email Address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
            autoComplete="email"
            required
            aria-label="Email address"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
          />
          <ErrorMsg id="register-email-error" msg={errors.email} />
        </div>

        {/* Password */}
        <div className="form-group">
          <div className="form-input-wrapper">
            <input
              type="password"
              id="register-password"
              className={`form-input form-input--auth${errors.password ? ' form-input--error' : ''}`}
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
              autoComplete="new-password"
              required
              aria-invalid={!!errors.password}
              aria-label="Password"
              style={{ paddingRight: 'var(--space-16)' }}
            />
          </div>
          <ErrorMsg id="register-password-error" msg={errors.password} />
        </div>

        {/* Confirm Password */}
        <div className="form-group">
          <PasswordInput
            id="register-confirm-password"
            toggleId="register-toggle-password"
            showLabel="Show passwords"
            hideLabel="Hide passwords"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
            placeholder="Confirm Password"
            required
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            ariaInvalid={!!errors.confirmPassword}
            ariaLabel="Confirm password"
          />
          <ErrorMsg id="confirm-password-error" msg={errors.confirmPassword} />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn btn--primary btn--full mt-6"
          id="register-submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting && <span className="btn__spinner" aria-hidden="true" />}
          {isSubmitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <div className="card__footer">
        <span className="text-sm text-secondary">Already have an account?</span>
        <Link to="/login" className="btn btn--ghost" id="register-login-link">
          Login
        </Link>
      </div>
    </AuthShell>
  );
}
