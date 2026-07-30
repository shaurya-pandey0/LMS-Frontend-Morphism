import { Link } from 'react-router-dom';
import botanicalShadow from '../assets/botanical-shadow.png';

/**
 * LifeTrack Landing Page
 *
 * Layout: app-shell--landing (full-width, no sidebar)
 * Uses ONLY global CSS classes from src/styles/main.css:
 *  - Layout:      app-shell--landing, topnav, topnav--full, topnav__left,
 *                 topnav__right, topnav__links, topnav__link, topnav__action-btn
 *  - Cards:       card, card--stat, card__title, card__body, card__header
 *  - Chips:       chip, chip--sage, chip--clay
 *  - Buttons:     btn, btn--primary, btn--secondary, btn--ghost
 *  - Typography:  text-display, page-title, text-secondary, text-muted,
 *                 font-display, weight-bold, text-italic
 *  - Utilities:   flex, items-center, gap-*, grid, grid--2
 */

/* ─── Mini bar-chart bars used in the app preview card ─── */
const BAR_DATA = [
  { label: 'Mon', value: 55, active: false },
  { label: 'Tue', value: 42, active: false },
  { label: 'Wed', value: 75, active: true  },
  { label: 'Thu', value: 35, active: false },
  { label: 'Fri', value: 68, active: true  },
  { label: 'Sat', value: 28, active: false },
  { label: 'Sun', value: 20, active: false },
];

/* ─── Expense list items shown in the preview card ─── */
const EXPENSES = [
  { label: 'Food & Dining',   amount: '₹240' },
  { label: 'Transportation',  amount: '₹85'  },
  { label: 'Health & Fitness',amount: '₹120' },
];

export default function LandingPage() {
  return (
    <div className="app-shell--landing font-body">

      {/* ── Top Navigation ── */}
      <nav className="topnav topnav--full" style={{ position: 'relative', left: 0 }}>
        <div className="topnav__left">
          {/* Logo */}
          <div className="sidebar__logo" id="landing-logo" aria-label="LifeTrack">
            <svg
              className="sidebar__logo-mark"
              width="28" height="28"
              viewBox="0 0 32 32" fill="none"
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

          {/* Nav links */}
          <div className="topnav__links" style={{ marginLeft: 'var(--space-8)' }}>
            <a href="#features" className="topnav__link topnav__link--active" id="nav-features">Features</a>
            <a href="#preview"  className="topnav__link" id="nav-preview">Preview</a>
            <Link to="/about" className="topnav__link" id="nav-about">About</Link>
          </div>
        </div>

        <div className="topnav__right">
          <Link to="/login"      className="btn btn--ghost"      id="nav-login">Log In</Link>
          <Link to="/register" className="topnav__action-btn"  id="nav-signup">Get Started</Link>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <main
        id="features"
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-12)',
          alignItems: 'center',
          padding: 'var(--space-16) var(--space-12)',
          maxWidth: '1280px',
          margin: '0 auto',
          width: '100%',
        }}
      >

        {/* ── LEFT: App Preview Mockup ── */}
        <div
          id="preview"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          {/* Sleep Duration Chart Card */}
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div className="card__header">
              <div>
                <div
                  style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--taupe-400)',
                    fontWeight: 'var(--weight-medium)',
                    marginBottom: 'var(--space-1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Analytics
                </div>
                <div className="card__title card-heading">
                  Sleep duration
                </div>
              </div>
              <span className="chip chip--sage">4 Health</span>
            </div>

            {/* Bar chart */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 'var(--space-2)',
                height: '120px',
                padding: 'var(--space-2) 0',
              }}
            >
              {BAR_DATA.map((bar) => (
                <div
                  key={bar.label}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${bar.value}%`,
                      background: bar.active
                        ? 'var(--sage-500)'
                        : 'var(--sand-300)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'background 200ms ease',
                    }}
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--taupe-400)' }}>
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom row: Expense + Journal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

            {/* Expense Card */}
            <div
              className="card"
              style={{
                background: 'var(--clay-600)',
                border: 'none',
                color: 'var(--sand-0)',
                padding: 'var(--space-5)',
              }}
            >
              <div
                className="card-heading"
                style={{
                  marginBottom: 'var(--space-4)',
                  color: 'var(--sand-0)',
                }}
              >
                Expense
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {EXPENSES.map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 'var(--text-sm)',
                      color: 'rgba(250,246,241,0.8)',
                    }}
                  >
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--sand-0)' }}>
                      {item.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Journal Card — botanical photo overlay */}
            <div
              className="card"
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: 'none',
                minHeight: '160px',
                padding: 0,
                background: 'var(--sand-200)',
              }}
            >
              {/* Botanical shadow image as background */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${botanicalShadow})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.55,
                }}
              />
              {/* Label */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 'var(--space-4)',
                  left: 'var(--space-4)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 'var(--weight-semibold)',
                  color: 'var(--sand-0)',
                  textShadow: '0 1px 4px rgba(0,0,0,0.3)',
                }}
              >
                Journal
              </div>
            </div>

          </div>
        </div>

        {/* ── RIGHT: Hero Copy ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-6)',
            paddingLeft: 'var(--space-8)',
          }}
        >
          {/* Label chip */}
          <div>
            <span className="chip chip--clay" id="landing-saas-label">SaaS Platform</span>
          </div>

          {/* Headline */}
          <h1
            className="text-display"
            id="landing-headline"
            style={{
              fontStyle: 'normal',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            Bring Balance<br />to Your Life
          </h1>

          {/* Sub-headline */}
          <p
            className="text-secondary"
            style={{
              fontSize: 'var(--text-lg)',
              lineHeight: 'var(--lh-lg)',
              maxWidth: '42ch',
            }}
          >
            Focus on <strong style={{ color: 'var(--ink-900)', fontWeight: 'var(--weight-semibold)' }}>LifeTrack</strong>,
            a human-centric lifestyle intelligence platform that helps you log,
            understand, and improve every dimension of your daily life.
          </p>

          {/* CTA buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/register"
              className="btn btn--primary btn--lg"
              id="landing-cta-primary"
            >
              Begin Journey
            </Link>
            <a
              href="#preview"
              className="btn btn--secondary btn--lg"
              id="landing-cta-secondary"
            >
              See Preview
            </a>
          </div>

          {/* Social proof strip */}
          <div
            className="flex items-center gap-4"
            style={{ marginTop: 'var(--space-2)' }}
          >
            {/* Avatars */}
            <div style={{ display: 'flex' }}>
              {['#B5734F', '#7E9469', '#6E8CA0', '#A89685'].map((color, i) => (
                <div
                  key={i}
                  className="avatar avatar--sm avatar--fallback"
                  style={{
                    background: color,
                    marginLeft: i === 0 ? 0 : '-8px',
                    border: '2px solid var(--sand-50)',
                    zIndex: 4 - i,
                    position: 'relative',
                    color: 'var(--sand-0)',
                    fontSize: '10px',
                    fontWeight: 'var(--weight-bold)',
                  }}
                >
                  {['J', 'S', 'M', 'A'][i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-secondary">
              Join <strong style={{ color: 'var(--ink-800)' }}>2,400+</strong> people already on their journey
            </span>
          </div>
        </div>

      </main>

      {/* ── Features Strip ── */}
      <section
        id="about"
        style={{
          background: 'var(--sand-100)',
          borderTop: '1px solid var(--sand-200)',
          padding: 'var(--space-12) var(--space-12)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-8)',
            }}
          >
            {[
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                ),
                title: 'Daily Log',
                desc: 'Track meals, sleep, mood, steps and habits in one streamlined daily entry.',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: 'Trends & Insights',
                desc: 'Visualise patterns across health, finance, and wellbeing with beautiful charts.',
              },
              {
                icon: (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                  </svg>
                ),
                title: 'Journal & Reflect',
                desc: 'Write and reflect on your day. A contextual AI companion is planned for a future release.',
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--clay-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--clay-600)',
                  }}
                >
                  {icon}
                </div>
                <div className="sub-heading">
                  {title}
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-600)', lineHeight: 'var(--lh-lg)', maxWidth: '100%' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid var(--sand-200)',
          padding: 'var(--space-6) var(--space-12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="sidebar__logo" style={{ pointerEvents: 'none' }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 2C14 8 8 14 4 18C8 17 12 18 14 22C14 18 16 12 22 6C20 8 18 6 16 2Z" fill="#241F1A"/>
          </svg>
          <span className="sidebar__logo-text" style={{ fontSize: 'var(--text-base)' }}>
            LifeTrack
          </span>
        </div>
        <span className="text-sm text-muted">© 2026 LifeTrack. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-secondary" style={{ textDecoration: 'none' }}>Privacy</a>
          <a href="#" className="text-sm text-secondary" style={{ textDecoration: 'none' }}>Terms</a>
        </div>
      </footer>

    </div>
  );
}
