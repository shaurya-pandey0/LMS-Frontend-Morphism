import { Link } from 'react-router-dom';
import botanicalShadow from '../assets/botanical-shadow.png';
import '../styles/about.css';

const TEAM_PHOTOS = import.meta.glob('../assets/team/*.webp', {
  eager: true,
  import: 'default',
  query: '?url',
});

function getTeamPhoto(filename) {
  return TEAM_PHOTOS[`../assets/team/${filename}`] ?? null;
}

const TEAM = [
  {
    name: 'Jagdish Butte',
    role: 'Project Member',
    initials: 'JB',
    tone: 'clay',
    photo: getTeamPhoto('jagdish-butte.webp'),
  },
  {
    name: 'Mahim Jain',
    role: 'Project Member',
    initials: 'MJ',
    tone: 'sage',
    photo: getTeamPhoto('mahim-jain.webp'),
  },
  {
    name: 'Shaurya Pandey',
    role: 'Project Member',
    initials: 'SP',
    tone: 'slate',
    photo: getTeamPhoto('shaurya-pandey.webp'),
  },
  {
    name: 'Aditya Sabale',
    role: 'Project Guide',
    initials: 'AS',
    tone: 'sand',
    photo: getTeamPhoto('aditya-sabale.webp'),
  },
];

const PILLARS = [
  {
    number: '01',
    title: 'Collect',
    description: 'One place for daily logs, meals, mood, habits, journals and expenses.',
  },
  {
    number: '02',
    title: 'Connect',
    description: 'Bring related lifestyle records together so patterns are easier to see.',
  },
  {
    number: '03',
    title: 'Explain',
    description: 'Turn stored data into clear trends, analytics and rule-based insights.',
  },
  {
    number: '04',
    title: 'Advise',
    description: 'Provide trusted context for the Python AI and RAG work planned for Phase 4.',
  },
];

const FEATURES = [
  {
    icon: '▦',
    title: 'Daily Log',
    description: 'Track meals, sleep, mood, targets and habits in one streamlined daily entry.',
  },
  {
    icon: '⌁',
    title: 'Trends & Insights',
    description: 'Visualise real patterns across health, finance and wellbeing.',
  },
  {
    icon: '▤',
    title: 'Journal & Reflect',
    description: 'Write and reflect on your day, with future AI support built on trusted context.',
  },
];

function LifeTrackLogo() {
  return (
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
  );
}

export default function AboutPage() {
  return (
    <div className="about-page font-body">
      <nav className="topnav topnav--full" style={{ position: 'relative', left: 0 }}>
        <div className="topnav__left">
          <LifeTrackLogo />
          <div className="topnav__links" style={{ marginLeft: 'var(--space-8)' }}>
            <Link to="/#features" className="topnav__link">Features</Link>
            <Link to="/#preview" className="topnav__link">Preview</Link>
            <Link to="/about" className="topnav__link topnav__link--active" aria-current="page">
              About
            </Link>
          </div>
        </div>

        <div className="topnav__right">
          <Link to="/login" className="btn btn--ghost">Log In</Link>
          <Link to="/register" className="topnav__action-btn">Get Started</Link>
        </div>
      </nav>

      <main>
        <section className="about-hero" aria-labelledby="about-title">
          <div
            className="about-hero__botanical"
            style={{ backgroundImage: `url(${botanicalShadow})` }}
            aria-hidden="true"
          />

          <h1 id="about-title" className="about-title page-title">About Us</h1>

          <div className="about-intro">
            <article className="about-story">
              <p className="about-eyebrow">The big picture</p>
              <h2 className="section-heading">
                From fragmented tracking to unified lifestyle intelligence.
              </h2>

              <div className="about-flow" aria-label="LifeTrack information flow">
                <div className="about-flow__inputs">
                  <span>Sleep</span>
                  <span>Spending</span>
                  <span>Habits</span>
                  <span>Mood</span>
                </div>
                <span className="about-flow__arrow" aria-hidden="true">→</span>
                <div className="about-flow__platform">
                  <strong>LifeTrack</strong>
                  <span>Connects the dots</span>
                  <small>One platform · Spring · MySQL</small>
                </div>
                <span className="about-flow__arrow" aria-hidden="true">→</span>
                <div className="about-flow__outcome">
                  <span className="about-flow__spark" aria-hidden="true">✦</span>
                  <strong>Clear insight</strong>
                  <small>Analytics and explainable rules</small>
                </div>
              </div>

              <p className="about-story__copy">
                LifeTrack brings daily data, sleep, mood, spending and reflection into one secure
                platform. Spring Boot owns the rules and MySQL records the truth, giving every
                insight a pipeline the team can clearly explain.
              </p>

              <p className="about-eyebrow about-eyebrow--pillars">Why LifeTrack?</p>
              <div className="about-pillars">
                {PILLARS.map((pillar) => (
                  <article className="about-pillar" key={pillar.title}>
                    <span className="about-pillar__number">{pillar.number}</span>
                    <h3 className="sub-heading">{pillar.title}</h3>
                    <p>{pillar.description}</p>
                  </article>
                ))}
              </div>
            </article>

            <section className="about-team" aria-labelledby="team-title">
              <div className="about-team__heading">
                <p className="about-eyebrow">The people behind LifeTrack</p>
                <h2 id="team-title" className="section-heading">
                  Built together, with one clear purpose.
                </h2>
              </div>

              <div className="about-team__grid">
                {TEAM.map((member) => (
                  <article className="team-card" key={member.name}>
                    <div
                      className={`team-card__portrait team-card__portrait--${member.tone}`}
                      style={{ backgroundImage: `url(${botanicalShadow})` }}
                      role="img"
                      aria-label={`${member.name} identity portrait`}
                    >
                      <span aria-hidden="true">{member.initials}</span>
                      {member.photo && (
                        <img
                          className="team-card__photo"
                          src={member.photo}
                          alt=""
                          aria-hidden="true"
                          onError={(event) => {
                            event.currentTarget.hidden = true;
                          }}
                        />
                      )}
                    </div>
                    <h3 className="card-heading">{member.name}</h3>
                    <p>{member.role}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="about-features" aria-label="LifeTrack capabilities">
          <div className="about-features__grid">
            {FEATURES.map((feature) => (
              <article className="about-feature-card" key={feature.title}>
                <span className="about-feature-card__icon" aria-hidden="true">{feature.icon}</span>
                <h2 className="card-heading">{feature.title}</h2>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="about-footer">
        <LifeTrackLogo />
        <p>© 2026 LifeTrack. Built as a secure, explainable lifestyle platform.</p>
      </footer>
    </div>
  );
}
