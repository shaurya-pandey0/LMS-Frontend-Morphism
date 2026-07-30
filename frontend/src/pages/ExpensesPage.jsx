import { useState, useMemo, useEffect } from 'react';
import AppShell from '../components/AppShell.jsx';
import { expenseApi, analyticsApi } from '../lib/api.js';
import { useReference, colorForCategory } from '../lib/reference.jsx';
import { todayIso, isoToShort, getDefaultFromDate, getDefaultToDate } from '../lib/date.js';

/* Category list comes from the backend (/api/reference); only the colour
   mapping lives here, since that's presentation. */

/* ── Category icons ── */
function CatIcon({ category }) {
  if (category === 'Housing') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l7-6 7 6" />
        <path d="M5 8v8h10V8" />
      </svg>
    );
  }
  if (category === 'Travel') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 17h14M10 3l5 7-5 0-2 3H6l1-3-4 0z" />
      </svg>
    );
  }
  if (category === 'Wellness') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 17s-6-4-6-8a3 3 0 016-1 3 3 0 016 1c0 4-6 8-6 8z" />
      </svg>
    );
  }
  if (category === 'Misc') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="5" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="15" cy="10" r="1.4" />
      </svg>
    );
  }
  // Food (fork & knife)
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2v6M4 2v4a2 2 0 002 2M6 8v10M14 2c-1.5 0-2.5 1.5-2.5 4s1 3 2.5 3v9" />
    </svg>
  );
}

/* ── Donut chart ── */
function DonutChart({ segments }) {
  const r = 52, cx = 70, cy = 70, strokeW = 22;
  const circ = 2 * Math.PI * r;
  const gap = 2;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const arcs = [];
  let offset = 0;
  for (const seg of segments) {
    const len = (seg.value / total) * circ;
    arcs.push({ ...seg, len, offset });
    offset += len;
  }
  return (
    <svg width="160" height="160" viewBox="0 0 140 140">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--sand-100)" strokeWidth={strokeW} />
      {arcs.map((seg, i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={seg.color}
          strokeWidth={strokeW}
          strokeDasharray={`${Math.max(seg.len - gap, 0)} ${circ - seg.len + gap}`}
          strokeDashoffset={-seg.offset + circ * 0.25}
          strokeLinecap="butt"
        />
      ))}
    </svg>
  );
}

export default function ExpensesPage() {
  const { expenseCategories } = useReference();

  const fromDate = getDefaultFromDate();
  const toDate = getDefaultToDate();

  const [categoryChoice, setCategory] = useState('');
  const defaultCategory = () => expenseCategories[0] || '';
  const category = categoryChoice || defaultCategory();

  const [editingId, setEditingId] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  const [txns, setTxns] = useState([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const refreshData = () => {
    Promise.all([expenseApi.list(fromDate, toDate), analyticsApi.summary(fromDate, toDate)])
      .then(([data, summaryData]) => {
        setTxns((data || []).map((e) => ({
          id: e.id,
          isoDate: e.date,
          date: isoToShort(e.date),
          category: e.category,
          amount: Number(e.amount),
        })));
        setAnalytics(summaryData);
      })
      .catch(() => {});
  };

  // Load expenses and backend-computed analytics on mount using same PC-local current-month range.
  useEffect(() => {
    let cancelled = false;
    Promise.all([expenseApi.list(fromDate, toDate), analyticsApi.summary(fromDate, toDate)])
      .then(([data, summaryData]) => {
        if (cancelled) return;
        setTxns((data || []).map((e) => ({
          id: e.id,
          isoDate: e.date,
          date: isoToShort(e.date),
          category: e.category,
          amount: Number(e.amount),
        })));
        setAnalytics(summaryData);
        setPageError('');
      })
      .catch((err) => { if (!cancelled) setPageError(err.message || 'Could not load expenses'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fromDate, toDate]);

  const handleSubmit = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setAmountError('Enter an amount greater than 0');
      document.getElementById('entry-amount')?.focus();
      return;
    }
    setAmountError('');
    setPageError('');
    const iso = date || todayIso();
    const payload = { date: iso, category, amount: value };

    try {
      if (editingId !== null) {
        const updated = await expenseApi.update(editingId, payload);
        setTxns((prev) => prev.map((t) => (t.id === editingId
          ? { id: updated.id, isoDate: updated.date, date: isoToShort(updated.date), category: updated.category, amount: Number(updated.amount) }
          : t)));
        setEditingId(null);
      } else {
        const created = await expenseApi.create(payload);
        const row = { id: created.id, isoDate: created.date, date: isoToShort(created.date), category: created.category, amount: Number(created.amount) };
        setTxns((prev) => [row, ...prev]);
      }
      setAmount('');
      setDate('');
      setCategory(defaultCategory());
      refreshData();
    } catch (err) {
      setPageError(err.message || 'Could not save that expense');
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setAmount(String(t.amount));
    setCategory(t.category);
    setDate(t.isoDate || '');
    setAmountError('');
    setPageError('');
    document.getElementById('entry-amount')?.focus();
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setDate('');
    setCategory(defaultCategory());
    setAmountError('');
  };

  const handleDelete = async (id) => {
    const snapshot = txns;
    setTxns((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setAmount('');
      setDate('');
      setCategory(defaultCategory());
    }
    try {
      await expenseApi.remove(id);
      refreshData();
    } catch (err) {
      setTxns(snapshot);
      setPageError(err.message || 'Could not delete that expense');
    }
  };

  // Business totals come from Spring (/api/analytics) — React does NOT compute these.
  const total = analytics?.totalExpenses ?? 0;

  const segments = useMemo(() => {
    if (!analytics?.expensesByCategory) return [];
    return Object.entries(analytics.expensesByCategory)
      .map(([cat, val]) => ({
        label: cat,
        color: colorForCategory(cat),
        value: Number(val),
      }))
      .filter((s) => s.value > 0);
  }, [analytics]);

  const spendPct = analytics?.budgetUsagePct ?? 0;
  const fmtMoney = (n) =>
    n >= 1000 ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 2)}k` : `₹${n.toFixed(2)}`;

  return (
    <AppShell active="expenses" dataScreenLabel="Expenses">
      {/* Top bar */}
      <div className="expenses__topbar">
            <h1 className="expenses__title">Expenses Page</h1>
            <button
              className="btn btn--primary"
              id="btn-log-expense"
              style={{ height: 44, borderRadius: 'var(--radius-md)' }}
              onClick={() => {
                document.getElementById('card-add-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('entry-amount')?.focus();
              }}
            >
              Log New Expense
            </button>
          </div>

          <div className="expenses__grid">
            {/* ── Column 1: Add entry ── */}
            <section className="card" id="card-add-entry">
              <h2 className="expenses-card__title">Add New Transaction Entry</h2>

              <div className="entry-field">
                <label className="entry-field__label" htmlFor="entry-amount">Transaction Amount</label>
                <div className="entry-input-row">
                  <span className="entry-input-row__icon">₹</span>
                  <input
                    id="entry-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`entry-input${amountError ? ' entry-input--error' : ''}`}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); if (amountError) setAmountError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    aria-invalid={!!amountError}
                    aria-describedby={amountError ? 'entry-amount-error' : undefined}
                  />
                </div>
                {amountError && (
                  <span className="form-helper form-helper--error" id="entry-amount-error" role="alert" style={{ display: 'block', marginTop: 'var(--space-1)' }}>
                    {amountError}
                  </span>
                )}
              </div>

              <div className="entry-field">
                <label className="entry-field__label" htmlFor="entry-date">Date</label>
                <div className="entry-input-row">
                  <span className="entry-input-row__icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="14" height="13" rx="2" /><path d="M3 8h14M7 2v4M13 2v4" />
                    </svg>
                  </span>
                  <input
                    id="entry-date"
                    type="date"
                    className="entry-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="entry-field">
                <label className="entry-field__label">Category Filter</label>
                <div className="category-list" role="radiogroup" aria-label="Category">
                  {expenseCategories.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={category === c}
                      className={`category-list__item${category === c ? ' category-list__item--active' : ''}`}
                      onClick={() => setCategory(c)}
                    >
                      <span className="category-list__dot" style={{ background: colorForCategory(c) }} />
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn--primary btn--full" id="btn-add-entry" onClick={handleSubmit}>
                {editingId !== null ? 'Save Changes' : '+ Add Entry'}
              </button>
              {editingId !== null && (
                <button className="btn btn--secondary btn--full mt-2" id="btn-cancel-edit" onClick={cancelEdit}>
                  Cancel Edit
                </button>
              )}
            </section>

            {/* ── Column 2: Transaction history ── */}
            <section className="card" id="card-txn-history">
              <h2 className="expenses-card__title">Active Month's Transaction History</h2>

              <div className="txn-table" style={{ display: 'grid' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '36px 70px 1fr auto auto', gap: 'var(--space-3)', padding: '0 var(--space-3) var(--space-3)' }}>
                  <span />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--taupe-600)' }}>Date</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--taupe-600)' }}>Category</span>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--taupe-600)', textAlign: 'right' }}>Amount</span>
                  <span />
                </div>

                {loading ? (
                  <div className="txn-empty">Loading expenses…</div>
                ) : pageError ? (
                  <div className="txn-empty" role="alert" style={{ color: 'var(--clay-600)' }}>{pageError}</div>
                ) : txns.length === 0 ? (
                  <div className="txn-empty">No transactions yet — add your first entry.</div>
                ) : (
                  txns.map((t) => (
                    <div className="txn-pill" key={t.id} style={{ outline: editingId === t.id ? '2px solid var(--clay-300)' : 'none' }}>
                      <span className="txn-pill__icon" style={{ background: colorForCategory(t.category), color: '#fff' }}>
                        <CatIcon category={t.category} />
                      </span>
                      <span className="txn-pill__date">{t.date}</span>
                      <span className="txn-pill__cat">{t.category}</span>
                      <span className="txn-pill__amt">₹{t.amount.toFixed(2)}</span>
                      <span style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                        <button className="txn-action" onClick={() => handleEdit(t)} aria-label={`Edit ${t.category} transaction`}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3z" /></svg>
                          Edit
                        </button>
                        <button className="txn-action txn-action--delete" onClick={() => handleDelete(t.id)} aria-label={`Delete ${t.category} transaction`}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" /></svg>
                          Delete
                        </button>
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="txn-summary">
                <span>Monthly Spend:</span>
                <span className="txn-summary__value">{spendPct.toFixed(2)}%</span>
              </div>
            </section>

            {/* ── Column 3: Breakdown ── */}
            <section className="card" id="card-breakdown">
              <h2 className="expenses-card__title">Category Expenditure Breakdown</h2>
              <div className="breakdown__delta">{fmtMoney(total)}</div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {segments.length ? (
                  <DonutChart segments={segments} />
                ) : (
                  <div className="txn-empty">No data to chart yet.</div>
                )}
              </div>

              <div className="breakdown__legend">
                {expenseCategories.map((c) => {
                  const value = analytics?.expensesByCategory?.[c] ?? 0;
                  const pct = total ? (value / total) * 100 : 0;
                  return (
                    <div className="breakdown__legend-item" key={c}>
                      <span className="breakdown__legend-swatch" style={{ background: colorForCategory(c) }} />
                      {c}
                      <span className="breakdown__legend-pct">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
    </AppShell>
  );
}
