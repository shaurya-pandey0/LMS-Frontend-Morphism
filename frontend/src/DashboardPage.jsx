import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import UserProfileModal from './components/UserProfileModal';
import ColorPipelineCard from './components/ColorPipelineCard.jsx';
import { analyticsApi, insightsApi, aiApi, aiContextApi } from './lib/api.js';
import { useAuth } from './lib/auth.jsx';
import { useReference, colorForCategory } from './lib/reference.jsx';

/* ─── Donut chart (SVG) ─────────────────────────────────── */
function DonutChart({ segments }) {
  const r = 52, cx = 70, cy = 70, strokeW = 22;
  const circ = 2 * Math.PI * r;
  const gap = 3;
  const arcs = [];
  let offset = 0;
  for (const seg of segments) {
    const len = (seg.pct / 100) * circ;
    arcs.push({ ...seg, len, offset });
    offset += len;
  }
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--sand-100)" strokeWidth={strokeW}/>
      {arcs.map((seg, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeW}
          strokeDasharray={`${seg.len - gap} ${circ - seg.len + gap}`}
          strokeDashoffset={-seg.offset + circ * 0.25}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}

/* ─── Dashboard ─────────────────────────────────────────── */
function weekdayShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useReference();
  // Sleep target comes from the user's settings, not a constant in a chart.
  const sleepTarget = settings?.sleepTargetHours || 8;
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');

  // AI-enhanced insights are opt-in (saves tokens / works offline by default).
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);

  const runAiInsights = async () => {
    if (aiLoading) return;
    setAiError('');
    setAiLoading(true);
    try {
      // Spring uses the user's saved insightPeriodDays by default.
      const ctx = await aiContextApi.get();
      const res = await aiApi.insights({
        user_name: user?.fullName,
        context: {
          period_days: ctx.periodDays,
          avg_sleep_hours: ctx.avgSleepHours ?? undefined,
          min_sleep_hours: ctx.minSleepHours,
          good_sleep_hours: ctx.goodSleepHours,
          weekly_spend: ctx.weeklySpend ?? undefined,
          spend_threshold: ctx.spendThreshold,
          expenses_by_category: ctx.expensesByCategory || {},
          avg_water_ml: ctx.avgWaterMl ?? undefined,
          min_water_ml: ctx.minWaterMl,
          habit_consistency: ctx.habitConsistency ?? undefined,
          habit_consistency_threshold: ctx.habitConsistencyThreshold,
          mood_counts: ctx.moodCounts || {},
        },
        use_ai: true,
      });
      setAiInsights(res);
    } catch (err) {
      setAiError(err.message || 'AI service unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([analyticsApi.summary(), insightsApi.list()])
      .then(([s, i]) => {
        if (cancelled) return;
        if (s.status === 'fulfilled') setSummary(s.value);
        else setError(s.reason?.message || 'Could not load summary');
        if (i.status === 'fulfilled') setInsights(i.value);
      });
    return () => { cancelled = true; };
  }, []);

  // Backend weeklySleep -> SLEEP_DATA-shaped array.
  const sleepData = useMemo(() => {
    const points = summary?.weeklySleep || [];
    if (!points.length) {
      return [
        { day: 'Mon', hours: 0, pct: 0 }, { day: 'Tue', hours: 0, pct: 0 },
        { day: 'Wed', hours: 0, pct: 0 }, { day: 'Thu', hours: 0, pct: 0 },
        { day: 'Fri', hours: 0, pct: 0 }, { day: 'Sat', hours: 0, pct: 0 },
        { day: 'Sun', hours: 0, pct: 0 },
      ];
    }
    return points.map((p) => ({
      day: weekdayShort(p.date),
      hours: p.hours ?? 0,
      pct: Math.min(((p.hours ?? 0) / sleepTarget) * 100, 100),
    }));
  }, [summary, sleepTarget]);

  // Most recent day's sleep hours, if any — the only real figure for the
  // "Today's Stats" chip row.
  const latestSleepHours = useMemo(() => {
    const points = summary?.weeklySleep || [];
    if (!points.length) return null;
    const last = points[points.length - 1];
    return typeof last?.hours === 'number' ? last.hours : null;
  }, [summary]);

  // Backend expensesByCategory -> donut segments.
  const donutSegments = useMemo(() => {
    const byCat = summary?.expensesByCategory || {};
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    if (!total) {
      return [{ label: 'No data', pct: 100, color: 'var(--sand-200)' }];
    }
    return Object.entries(byCat).map(([label, value]) => ({
      label,
      pct: Math.round((value / total) * 100),
      color: colorForCategory(label),
    }));
  }, [summary]);

  const displayName = user?.fullName || 'Guest';
  const initials = initialsFor(user?.fullName);

  return (
    <AppShell active="dashboard">
      {/* ── Top Header / User Profile Trigger ── */}
      <div id="dashboard-topnav" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          id="topnav-profile-trigger"
          onClick={() => setProfileOpen(true)}
          aria-label={`Open account info for ${displayName}`}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit',
          }}
        >
          <div className="avatar avatar--md avatar--fallback" id="topnav-avatar" style={{ fontSize: 'var(--text-sm)' }}>
            {initials}
          </div>
          <span className="topnav__user-name">{displayName}</span>
        </button>
      </div>

      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* ── Main Content ── */}
          {error && (
            <div role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-3)' }}>
              {error}
            </div>
          )}

          {/* 3-column grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '260px 1fr 260px',
            gap: 'var(--space-5)',
            alignItems: 'start',
          }}>

            {/* ══ LEFT COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

              {/* Quick Actions */}
              <div className="card" id="card-quick-actions">
                <div className="card__header">
                  <h2 className="card__title">Quick Actions</h2>
                </div>
                <div className="card__body">
                  <button
                    className="btn btn--primary btn--full"
                    id="btn-log-wellness-primary"
                    onClick={() => navigate('/daily-log')}
                  >
                    Log Wellness
                  </button>
                </div>
              </div>

              {/* Color Theme Pipeline Card */}
              <ColorPipelineCard />

              {/* Health At A Glance — removed: Stress Level, Hydration, and
                  Heart Rate had no backend data source and were hardcoded
                  (60/75/80). Nothing here to show honestly yet. */}

              {/* LifeTrack Compass teaser — removed: had no backend data
                  source (fixed "balance score" placeholder). */}
            </div>

            {/* ══ CENTER COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

              {/* Weekly Sleep Duration chart */}
              <div className="card" id="card-sleep-chart">
                <div className="card__header">
                  <h2 className="card__title">Weekly Sleep Duration</h2>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <span className="chip chip--sage">Sleep Health</span>
                    <span className="chip chip--success">Optimal</span>
                  </div>
                </div>

                {/* Y-axis + bars */}
                <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-3)' }}>
                  {/* Y labels */}
                  <div style={{
                    display: 'flex', flexDirection: 'column-reverse',
                    justifyContent: 'space-between',
                    paddingBottom: '24px',
                    fontSize: 'var(--text-xs)', color: 'var(--taupe-400)',
                    textAlign: 'right', minWidth: '24px',
                  }}>
                    {['0h', '1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h'].map(l => (
                      <span key={l}>{l}</span>
                    ))}
                  </div>
                  {/* Chart area */}
                  <div style={{ flex: 1 }}>
                    {/* Horizontal grid lines */}
                    <div style={{ position: 'relative', height: '180px', display: 'flex', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                      {/* Grid lines overlay */}
                      {[0, 25, 50, 75, 100].map(p => (
                        <div key={p} style={{
                          position: 'absolute', bottom: `${p}%`, left: 0, right: 0,
                          borderTop: '1px dashed var(--sand-200)',
                          zIndex: 0,
                        }}/>
                      ))}
                      {/* Bars */}
                      {sleepData.map((d, i) => (
                        <div key={d.day} style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 'var(--space-1)',
                          height: '100%', justifyContent: 'flex-end', position: 'relative', zIndex: 1,
                        }}>
                          <div style={{
                            width: '100%',
                            height: `${d.pct}%`,
                            background: i % 2 === 0 ? 'var(--sage-500)' : 'var(--sand-300)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'opacity 200ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                          title={`${d.hours}h`}
                          />
                        </div>
                      ))}
                    </div>
                    {/* X labels */}
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                      {sleepData.map((d, i) => (
                        <div key={`${d.day}-${i}`} style={{
                          flex: 1, textAlign: 'center',
                          fontSize: 'var(--text-xs)', color: 'var(--taupe-400)',
                        }}>
                          {d.day}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mindfulness & Journalling — cards link to the Journal page */}
              <div className="card" id="card-mindfulness">
                <div className="card__header">
                  <h2 className="card__title">Mindfulness &amp; Journalling</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <button
                    type="button"
                    className="card"
                    onClick={() => navigate('/journal')}
                    style={{
                      background: 'var(--sand-50)',
                      border: '1px solid var(--sand-200)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-600)' }}>
                      Today's Journal Entry
                    </span>
                  </button>
                  <button
                    type="button"
                    className="card"
                    onClick={() => navigate('/journal')}
                    style={{
                      background: 'var(--sand-50)',
                      border: '1px solid var(--sand-200)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-600)' }}>
                      Recent Reflections
                    </span>
                  </button>
                </div>
              </div>

              {/* Begin Your Daily Reflection CTA */}
              <div className="card" id="card-reflection-cta"
                style={{ textAlign: 'center', background: 'var(--sand-100)' }}>
                <h2 className="card__title" style={{ marginBottom: 'var(--space-2)' }}>
                  Begin Your Daily Reflection
                </h2>
                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-5)', maxWidth: '100%' }}>
                  Leading on daily features and other wellbeing insights.
                </p>
                <button className="btn btn--primary" id="btn-start-reflection" onClick={() => navigate('/journal')}>
                  Start Reflection
                </button>
              </div>
            </div>

            {/* ══ RIGHT COLUMN ══ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

              {/* Financial Wellness donut */}
              <div className="card" id="card-financial-wellness">
                <div className="card__header">
                  <h2 className="card__title">Financial Wellness</h2>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-3) 0' }}>
                  <DonutChart segments={donutSegments} />
                </div>
                {/* Legend */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-2)',
                }}>
                  {donutSegments.map(seg => (
                    <div key={seg.label + seg.color} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: seg.color, flexShrink: 0,
                      }}/>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--taupe-600)' }}>{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rule-based Insights (live from /api/insights), AI-upgradable */}
              <div className="card" id="card-insights">
                <div className="card__header">
                  <h2 className="card__title">Insights</h2>
                  <button
                    className="btn btn--ghost"
                    style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
                    onClick={runAiInsights}
                    disabled={aiLoading}
                    title="Generate richer insights with the AI service"
                  >
                    {aiLoading ? 'Thinking…' : '✨ AI'}
                  </button>
                </div>
                {(aiInsights || insights) && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--taupe-400)', marginBottom: 'var(--space-2)' }}>
                    {aiInsights
                      ? (aiInsights.source === 'ai' ? 'Generated by AI' : 'AI unavailable — showing rules')
                      : 'Rule-based'}
                  </p>
                )}
                {aiError && (
                  <p role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-2)' }}>
                    {aiError}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {!insights && !aiInsights && (
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-400)' }}>
                      Loading insights…
                    </p>
                  )}
                  {((aiInsights?.insights) || (insights?.insights) || []).map((ins, i, arr) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                        <span
                          className={`chip ${ins.severity === 'positive' ? 'chip--success' : ins.severity === 'warning' ? 'chip--clay' : 'chip--info'}`}
                          style={{ fontSize: 'var(--text-xs)' }}
                        >
                          {ins.category}
                        </span>
                        <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-800)' }}>{ins.title}</strong>
                      </div>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--taupe-600)', lineHeight: 'var(--lh-sm)' }}>
                        {ins.message}
                      </p>
                      {i < (arr.length - 1) && <div className="card__divider" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick stat chips — only the sleep figure has a real backend
                  source (/api/analytics weeklySleep, most recent day). Steps,
                  mood-of-the-day and a goals count have no endpoint yet, so
                  they're omitted rather than shown as fabricated numbers. */}
              <div className="card" id="card-stats" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                <h2 className="card__title">Today's Stats</h2>
                {latestSleepHours != null ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <span className="chip chip--clay">Sleep: {latestSleepHours.toFixed(1)}h</span>
                  </div>
                ) : (
                  <div className="txn-empty">No data available yet.</div>
                )}
              </div>
            </div>
          </div>
    </AppShell>
  );
}
