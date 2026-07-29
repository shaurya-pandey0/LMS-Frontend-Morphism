import { useState, useMemo, useEffect } from 'react';
import AppShell from './components/AppShell.jsx';
import './styles/analytics.css';
import { analyticsApi } from './lib/api.js';

function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultFromDate() {
  const now = new Date();
  return formatLocalDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function getDefaultToDate() {
  return formatLocalDate(new Date());
}

/* ── Line / area chart ── */
function LineAreaChart({ data, yLabels, max }) {
  const W = 460, H = 200, padL = 8, padR = 8, padB = 4;
  const innerW = W - padL - padR;
  const stepX = innerW / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = H - padB - (d.value / max) * (H - padB - 8);
    return [x, y];
  });

  // Smooth path (Catmull-Rom → bezier)
  const line = pts.map((p, i) => {
    if (i === 0) return `M ${p[0]},${p[1]}`;
    const prev = pts[i - 1];
    const cx = (prev[0] + p[0]) / 2;
    return `C ${cx},${prev[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }).join(' ');
  const area = `${line} L ${pts[pts.length - 1][0]},${H} L ${pts[0][0]},${H} Z`;

  return (
    <div className="chart-area">
      <div className="chart-yaxis" style={{ paddingBottom: 4 }}>
        {yLabels.map((l) => <span key={l}>{l}</span>)}
      </div>
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
          {[0, 25, 50, 75, 100].map((p) => (
            <line key={p} x1="0" x2={W} y1={H - (p / 100) * (H - padB - 8) - padB} y2={H - (p / 100) * (H - padB - 8) - padB}
              stroke="var(--sand-200)" strokeWidth="1" strokeDasharray="4 4" />
          ))}
          <path d={area} fill="var(--sage-100)" opacity="0.5" />
          <path d={line} fill="none" stroke="var(--sage-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (data.length <= 10 || i % Math.ceil(data.length / 7) === 0) && (
            <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--clay-500)" stroke="var(--sand-0)" strokeWidth="2" />
          ))}
        </svg>
        <div className="chart-xaxis">
          {data.map((d, i) => <span key={i}>{(data.length <= 7 || i % Math.ceil(data.length / 5) === 0) ? d.label : ''}</span>)}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [fromDate, setFromDate] = useState(getDefaultFromDate);
  const [toDate, setToDate] = useState(getDefaultToDate);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    let cancelled = false;
    analyticsApi.summary(fromDate, toDate)
      .then((s) => { if (!cancelled) { setSummary(s); setSummaryError(''); } })
      .catch((err) => { if (!cancelled) setSummaryError(err.message || 'Could not load analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fromDate, toDate]);

  // Map backend sleep points into LineAreaChart's shape.
  const sleepData = useMemo(() => {
    const points = summary?.sleepPoints || summary?.weeklySleep || [];
    if (!points.length) return [];
    return points.map((p) => ({
      label: p.date?.slice(5) || '',  // mm-dd
      value: typeof p.hours === 'number' ? p.hours : 0,
    }));
  }, [summary]);

  // Map backend daily expense points into LineAreaChart's shape.
  const dailyExpenseData = useMemo(() => {
    const points = summary?.dailyExpenses || [];
    if (!points.length) return [];
    return points.map((p) => ({
      label: p.date?.slice(5) || '',  // mm-dd
      value: typeof p.totalAmount === 'number' ? p.totalAmount : 0,
    }));
  }, [summary]);

  const maxExpenseVal = useMemo(() => {
    if (!dailyExpenseData.length) return 1000;
    const maxVal = Math.max(...dailyExpenseData.map((d) => d.value));
    return maxVal > 0 ? Math.ceil(maxVal * 1.2) : 1000;
  }, [dailyExpenseData]);

  return (
    <AppShell active="analytics" dataScreenLabel="Analytics">
      <div className="analytics__header">
        <h1 className="analytics__title">Your Lifestyle Trends &amp; Historical Analytics</h1>
      </div>

          {/* Master date-range filter bar */}
          <div className="range-bar" id="analytics-range-bar">
            <span className="range-bar__label">Trends Filter</span>
            <div className="range-bar__controls">
              <label htmlFor="analytics-from" style={{ color: 'var(--sand-0)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                From:
              </label>
              <input
                id="analytics-from"
                type="date"
                className="range-bar__date-input"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <label htmlFor="analytics-to" style={{ color: 'var(--sand-0)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginLeft: 'var(--space-2)' }}>
                To:
              </label>
              <input
                id="analytics-to"
                type="date"
                className="range-bar__date-input"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {summaryError && (
            <div role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-3)' }}>
              {summaryError}
            </div>
          )}

          {/* Charts Grid */}
          <div className="analytics__grid">
            {/* Sleep Duration Line Chart */}
            <section className="card" id="card-sleep-duration">
              <div className="chart-card__header">
                <h2 className="chart-card__title">Sleep Duration Line Chart</h2>
                <span className="chip chip--info">Body Analytics</span>
              </div>
              {loading ? (
                <div className="txn-empty">Loading…</div>
              ) : summaryError ? (
                <div className="txn-empty" role="alert" style={{ color: 'var(--clay-600)' }}>{summaryError}</div>
              ) : sleepData.length === 0 ? (
                <div className="txn-empty">No sleep data available for selected range.</div>
              ) : (
                <LineAreaChart
                  data={sleepData}
                  yLabels={['0 hrs', '2 hrs', '4 hrs', '6 hrs', '8 hrs', '10 hrs', '12 hrs']}
                  max={12}
                />
              )}
            </section>

            {/* Daily Expenses Trend Chart */}
            <section className="card" id="card-daily-expenses">
              <div className="chart-card__header">
                <h2 className="chart-card__title">Daily Expenses Trend</h2>
                <span className="chip chip--success">Financial Analytics</span>
              </div>
              {loading ? (
                <div className="txn-empty">Loading…</div>
              ) : summaryError ? (
                <div className="txn-empty" role="alert" style={{ color: 'var(--clay-600)' }}>{summaryError}</div>
              ) : dailyExpenseData.length === 0 ? (
                <div className="txn-empty">No expense data available for selected range.</div>
              ) : (
                <LineAreaChart
                  data={dailyExpenseData}
                  yLabels={[
                    '₹0',
                    `₹${Math.round(maxExpenseVal * 0.25)}`,
                    `₹${Math.round(maxExpenseVal * 0.5)}`,
                    `₹${Math.round(maxExpenseVal * 0.75)}`,
                    `₹${maxExpenseVal}`
                  ]}
                  max={maxExpenseVal}
                />
              )}
            </section>
          </div>
    </AppShell>
  );
}
