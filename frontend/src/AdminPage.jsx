import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/admin.css';
import { adminApi } from './lib/api.js';
import { useAuth } from './lib/auth.jsx';

/* ── Admin sidebar nav ── */
const ADMIN_NAV = [
  {
    id: 'stats', label: 'System Statistics',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="10" width="3" height="8" rx="1" /><rect x="8.5" y="5" width="3" height="13" rx="1" /><rect x="15" y="2" width="3" height="16" rx="1" />
      </svg>
    ),
  },
  {
    id: 'users', label: 'Active Users',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="7" r="3" /><path d="M2 17c0-2.8 2.2-5 5-5s5 2.2 5 5" /><path d="M14 4.5a3 3 0 010 5.8M14.5 12c2.2.3 3.5 2.3 3.5 5" />
      </svg>
    ),
  },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('stats');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

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
  // and no invented "pct" gauge fill (the backend doesn't return one).
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Total Users', value: stats.totalUsers ?? 0 },
      { label: 'Daily Logs', value: stats.totalDailyLogs ?? 0 },
      { label: 'Expenses Logged', value: stats.totalExpenses ?? 0 },
      { label: 'Journal Entries', value: stats.totalJournalEntries ?? 0 },
    ];
  }, [stats]);

  const adminName = user?.fullName || 'Admin';
  const adminInitials = (adminName.match(/\b[A-Za-z]/g) || []).slice(0, 2).join('').toUpperCase() || 'A';

  return (
    <div className="app-shell" data-screen-label="Admin">
      <div className="botanical-overlay" />

      {/* ── Admin Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__logo" aria-label="LifeTrack">
            <svg className="sidebar__logo-mark" width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 2C14 8 8 14 4 18C8 17 12 18 14 22C14 18 16 12 22 6C20 8 18 6 16 2Z" fill="#241F1A" />
            </svg>
            <span className="sidebar__logo-text">LifeTrack</span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Admin navigation">
          <ul className="sidebar__nav-list">
            {ADMIN_NAV.map((item) => (
              <li key={item.id}>
                <button
                  className={`sidebar__nav-item${activeNav === item.id ? ' sidebar__nav-item--active' : ''}`}
                  onClick={() => setActiveNav(item.id)}
                  style={{ width: '100%', background: activeNav === item.id ? undefined : 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left' }}
                >
                  <span className="sidebar__nav-icon">{item.icon}</span>
                  <span className="sidebar__nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__user">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            aria-label={`Open settings for ${adminName}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              flex: 1, minWidth: 0, background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, font: 'inherit', textAlign: 'left',
            }}
          >
            <div className="sidebar__avatar sidebar__avatar--fallback">{adminInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sidebar__username" title={adminName}>{adminName}</div>
              <div className="admin-sidebar__role">Administrator</div>
            </div>
          </button>
          <button
            type="button"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--taupe-500)', padding: 'var(--space-1)', display: 'inline-flex', alignItems: 'center' }}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4h3a1 1 0 011 1v10a1 1 0 01-1 1h-3" />
              <path d="M9 14l-4-4 4-4" />
              <path d="M5 10h10" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="app-main">
        <div className="app-main__content">
          <div className="admin__header">
            <h1 className="admin__title">Admin Dashboard</h1>
          </div>
          {error && (
            <div role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          {/* Stat cards — real counts from /api/admin/stats only */}
          {!stats && !error ? (
            <div className="txn-empty">Loading…</div>
          ) : statCards.length === 0 ? (
            <div className="txn-empty">No data available yet.</div>
          ) : (
            <div className="admin__stats">
              {statCards.map((s) => (
                <div className="card stat-card" key={s.label}>
                  <div>
                    <div className="stat-card__label">{s.label}</div>
                    <div className="stat-card__value">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Aggregated system charts (step distribution, financial velocity,
              habit funnel) were removed — they were seeded random data with
              no backing endpoint. /api/admin/stats returns aggregate counts
              only; nothing chart-worthy to show honestly yet. */}

          {/* Active Users (live from /api/admin/users) */}
          <section className="card" id="card-users" style={{ marginTop: 'var(--space-5)' }}>
            <h2 className="admin-card__title">Active Users ({users.length})</h2>
            {users.length === 0 ? (
              <div className="txn-empty">No users yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 120px', gap: 'var(--space-3)', padding: '0 var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--taupe-600)' }}>
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                </div>
                {users.map((u) => (
                  <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 120px', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--sand-50)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{u.fullName}</span>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-600)' }}>{u.email}</span>
                    <span>
                      <span className={`chip ${u.role === 'ADMIN' ? 'chip--clay' : 'chip--sage'}`} style={{ fontSize: 'var(--text-xs)' }}>{u.role}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
