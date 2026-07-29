import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/admin.css';
import { adminApi } from './lib/api.js';
import AppShell from './components/AppShell.jsx';
import BrandLogo from './components/BrandLogo.jsx';
import { useAuth } from './lib/auth.jsx';

/* ── Admin-specific sidebar nav items ── */
const StatsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="10" width="3" height="8" rx="1" />
    <rect x="8.5" y="5" width="3" height="13" rx="1" />
    <rect x="15" y="2" width="3" height="16" rx="1" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3" />
    <path d="M3.5 17c0-3.6 2.9-5.5 6.5-5.5s6.5 1.9 6.5 5.5" />
  </svg>
);

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

const ADMIN_NAV = [
  { id: 'stats',  label: 'System Statistics', Icon: StatsIcon },
  { id: 'users',  label: 'Active Users',      Icon: UsersIcon },
];

/**
 * Admin-specific sidebar matching the backup's layout:
 * Logo, two nav items (System Statistics, Active Users), user footer.
 */
function AdminSidebar({ activeSection, onSectionChange }) {
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
        <BrandLogo />
      </div>

      <nav className="sidebar__nav" aria-label="Admin navigation">
        <ul className="sidebar__nav-list">
          {ADMIN_NAV.map(({ id, label, Icon }) => (
            <li key={id}>
              <button
                type="button"
                id={`nav-admin-${id}`}
                className={`sidebar__nav-item${activeSection === id ? ' sidebar__nav-item--active' : ''}`}
                onClick={() => onSectionChange(id)}
                style={{ width: '100%', textAlign: 'left', border: 'none', font: 'inherit', cursor: 'pointer' }}
              >
                <span className="sidebar__nav-icon"><Icon /></span>
                <span className="sidebar__nav-label">{label}</span>
              </button>
            </li>
          ))}
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
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--taupe-500)', padding: 'var(--space-1)',
            display: 'inline-flex', alignItems: 'center',
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

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('stats');

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([adminApi.stats(), adminApi.users()])
      .then(([s, u]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setStats(s.value);
        else setError(s.reason?.message || 'Could not load admin stats');
        if (u.status === 'fulfilled') setUsers(u.value || []);
      });
    return () => { cancelled = true; };
  }, []);

  // Real counts from /api/admin/stats only — no fabricated fallback numbers
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total Users', value: stats.totalUsers ?? 0 },
      { label: 'Daily Logs', value: stats.totalDailyLogs ?? 0 },
      { label: 'Expenses Logged', value: stats.totalExpenses ?? 0 },
      { label: 'Journal Entries', value: stats.totalJournalEntries ?? 0 },
    ];
  }, [stats]);

  const adminSidebar = (
    <AdminSidebar
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    />
  );

  return (
    <AppShell active="admin" sidebar={adminSidebar}>
      <h1 className="admin__title" style={{ marginBottom: 'var(--space-6)' }}>Admin Dashboard</h1>

      {error && (
        <div role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-3)' }}>
          {error}
        </div>
      )}

      {/* Stat cards — 3-column grid matching backup layout */}
      {!stats && !error ? (
        <div className="admin__stats" style={{ marginBottom: 'var(--space-6)' }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card stat-card" style={{ opacity: 0.6 }}>
              <div className="stat-card__label">Loading…</div>
              <div className="stat-card__value">—</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="admin__stats" style={{ marginBottom: 'var(--space-6)' }}>
          {statCards.map((c) => (
            <div key={c.label} className="card stat-card">
              <div className="stat-card__label">{c.label}</div>
              <div className="stat-card__value">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Users table — matching backup: Name, Email, Role columns */}
      <section className="card" id="card-admin-users">
        <h2 className="admin-card__title">Active Users ({users.length})</h2>
        {users.length === 0 ? (
          <p style={{ color: 'var(--sand-0)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
            No registered users returned.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 'var(--weight-medium)' }}>{u.fullName || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.role === 'ADMIN' ? 'admin-badge--admin' : 'admin-badge--user'}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
