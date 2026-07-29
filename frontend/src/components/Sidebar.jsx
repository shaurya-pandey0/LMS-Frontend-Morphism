import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

/* ── Inline SVG icons for sidebar nav ── */
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="7" height="7" rx="1.5" />
    <rect x="11" y="2" width="7" height="7" rx="1.5" />
    <rect x="2" y="11" width="7" height="7" rx="1.5" />
    <rect x="11" y="11" width="7" height="7" rx="1.5" />
  </svg>
);

const DailyLogIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="2" width="14" height="16" rx="2" />
    <path d="M7 2V4" />
    <path d="M13 2V4" />
    <line x1="6" y1="8" x2="14" y2="8" />
    <line x1="6" y1="11" x2="14" y2="11" />
    <line x1="6" y1="14" x2="10" y2="14" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="10" width="3" height="8" rx="1" />
    <rect x="8.5" y="5" width="3" height="13" rx="1" />
    <rect x="15" y="2" width="3" height="16" rx="1" />
  </svg>
);

const ExpensesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="8" />
    <path d="M10 5V15" />
    <path d="M7 7.5C7 7.5 8 6.5 10 6.5C12 6.5 13 7.5 13 8.5C13 9.5 12 10 10 10C8 10 7 10.5 7 11.5C7 12.5 8 13.5 10 13.5C12 13.5 13 12.5 13 12.5" />
  </svg>
);

const JournalIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 3C4 2.44772 4.44772 2 5 2H15C15.5523 2 16 2.44772 16 3V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V3Z" />
    <line x1="7" y1="6" x2="13" y2="6" />
    <line x1="7" y1="9" x2="13" y2="9" />
    <line x1="7" y1="12" x2="10" y2="12" />
  </svg>
);

const AdminIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3" />
    <path d="M3.5 17c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
  </svg>
);

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', Icon: DashboardIcon },
  { id: 'daily-log', label: 'Daily Log', path: '/daily-log', Icon: DailyLogIcon },
  { id: 'analytics', label: 'Analytics', path: '/analytics', Icon: AnalyticsIcon },
  { id: 'expenses', label: 'Expenses', path: '/expenses', Icon: ExpensesIcon },
  { id: 'journal', label: 'Journal', path: '/journal', Icon: JournalIcon },
];

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

/**
 * Shared LifeTrack sidebar.
 *
 * Reads the current user from AuthContext. The admin link appears only for
 * ADMIN role users. Clicking the avatar/name block navigates to /settings;
 * the sign-out button is a separate control and never triggers navigation.
 *
 * @param {string} active   The id of the active nav item (e.g. "expenses").
 */
export default function Sidebar({ active }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const displayName = user?.fullName || 'Guest';
  const initials = initialsFor(user?.fullName);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__logo" aria-label="LifeTrack">
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
      </div>

      <nav className="sidebar__nav" aria-label="Main navigation">
        <ul className="sidebar__nav-list">
          {NAV_ITEMS.map(({ id, label, path, Icon }) => (
            <li key={id}>
              <Link
                to={path}
                id={`nav-${id}`}
                className={`sidebar__nav-item${active === id ? ' sidebar__nav-item--active' : ''}`}
              >
                <span className="sidebar__nav-icon"><Icon /></span>
                <span className="sidebar__nav-label">{label}</span>
              </Link>
            </li>
          ))}
          {isAdmin && (
            <li>
              <Link
                to="/admin"
                id="nav-admin"
                className={`sidebar__nav-item${active === 'admin' ? ' sidebar__nav-item--active' : ''}`}
              >
                <span className="sidebar__nav-icon"><AdminIcon /></span>
                <span className="sidebar__nav-label">Admin</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>

      <div className="sidebar__user">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label={`Open settings for ${displayName}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
            flex: 1, minWidth: 0, background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, font: 'inherit', textAlign: 'left',
          }}
        >
          <div className="sidebar__avatar sidebar__avatar--fallback">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar__username" title={displayName}>{displayName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--taupe-400)' }}>
              {isAdmin ? 'Administrator' : 'Account settings'}
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          title="Sign out"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--taupe-500)',
            padding: 'var(--space-1)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4h3a1 1 0 011 1v10a1 1 0 01-1 1h-3" />
            <path d="M9 14l-4-4 4-4" />
            <path d="M5 10h10" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
