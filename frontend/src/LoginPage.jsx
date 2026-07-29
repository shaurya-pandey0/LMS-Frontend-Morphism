import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import { ApiError } from './lib/api.js';
import AuthShell from './components/AuthShell.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import PasswordInput from './components/PasswordInput.jsx';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form error & validation state
  const [formError, setFormError] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
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
    <AuthShell>
      <BrandLogo id="login-logo" style={{ marginBottom: 'var(--space-6)', display: 'inline-flex' }} />

      <h1 className="card__title" id="login-title">Welcome Back</h1>
      <p className="card__subtitle">
        Sign in to continue your journey toward balance
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

        <div className="form-group">
          <PasswordInput
            id="login-password"
            toggleId="login-toggle-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
            }}
            placeholder="Password"
            required
            autoComplete="current-password"
            error={!!errors.password}
            ariaInvalid={!!errors.password}
            ariaLabel="Password"
          />
          {errors.password && (
            <span className="form-helper form-helper--error" id="password-error" role="alert" style={{ marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.75v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z" />
              </svg>
              {errors.password}
            </span>
          )}
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full mt-6"
          id="login-submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="card__footer">
        <span className="text-sm text-secondary">Don't have an account?</span>
        <Link to="/register" className="btn btn--ghost" id="login-register-link">
          Register
        </Link>
      </div>
    </AuthShell>
  );
}
