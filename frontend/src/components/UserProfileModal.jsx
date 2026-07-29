import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../lib/auth.jsx';

/**
 * Read-only account info modal. Shown when the top-right user chip is
 * clicked. Pulls straight from AuthContext (already hydrated from
 * GET /api/auth/me on login) — no extra network call, no new endpoint.
 *
 * Deliberately narrow: full name, email, role only. No health/fitness or
 * subscription fields — those don't exist on the backend user model.
 */
export default function UserProfileModal({ open, onClose }) {
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="modal-overlay modal-overlay--visible"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-hidden={false}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <button
          type="button"
          className="modal__close"
          aria-label="Close profile"
          onClick={onClose}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 3l10 10M13 3L3 13" />
          </svg>
        </button>

        <h2 id="profile-modal-title" className="modal__title">Account</h2>

        <div className="modal__body">
          <div className="form-group">
            <span className="form-label">Full Name</span>
            <p style={{ margin: 0, color: 'var(--ink-800)' }}>{user?.fullName || '—'}</p>
          </div>
          <div className="form-group">
            <span className="form-label">Email</span>
            <p style={{ margin: 0, color: 'var(--ink-800)' }}>{user?.email || '—'}</p>
          </div>
          <div className="form-group">
            <span className="form-label">Role</span>
            <p style={{ margin: 0, color: 'var(--ink-800)' }}>{user?.role || '—'}</p>
          </div>
        </div>

        <div className="modal__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

