import { useState } from 'react';

/**
 * Shared PasswordInput component with show/hide password toggle suffix.
 *
 * @param {string}  toggleId     — explicit ID for the toggle button (default: `${id}-toggle`).
 * @param {string}  showLabel    — aria-label when password is hidden (default: 'Show password').
 * @param {string}  hideLabel    — aria-label when password is visible (default: 'Hide password').
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Password',
  required = false,
  autoComplete = 'current-password',
  error = false,
  ariaInvalid = false,
  ariaLabel = 'Password',
  className = 'form-input form-input--auth',
  toggleId,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
}) {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShow = () => setShowPassword((prev) => !prev);

  return (
    <div className="form-input-wrapper">
      <input
        type={showPassword ? 'text' : 'password'}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        className={`${className} ${error ? 'form-input--error' : ''}`}
        style={{ paddingRight: 'var(--space-16)' }}
      />
      <span
        role="button"
        tabIndex={0}
        id={toggleId || (id ? `${id}-toggle` : undefined)}
        className="form-input-wrapper__suffix"
        onClick={toggleShow}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleShow()}
        aria-label={showPassword ? hideLabel : showLabel}
      >
        {showPassword ? 'Hide' : 'Show'}
      </span>
    </div>
  );
}
