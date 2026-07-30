import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import AppShell from '../components/AppShell.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
import SegmentedTabs from '../components/SegmentedTabs.jsx';
import { journalApi, aiApi, aiContextApi, expenseApi, dailyLogApi } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useReference, moodDisplay } from '../lib/reference.jsx';
import { todayIso } from '../lib/date.js';
import { useApi } from '../lib/useApi.js';

/* Mood vocabulary comes from the backend (/api/reference); only the
   emoji/label chrome is presentation — see lib/reference.jsx. */

/* Format an ISO yyyy-mm-dd date into the page's display format. */
function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y) return iso;
  return `${m}/${d}/${y}`;
}

/* Ensure list items (1., 2., 3. or - ) crammed together on a single line
   get proper Markdown newlines (\n\n) before being passed to ReactMarkdown. */
function formatMarkdownNewlines(text) {
  if (!text) return '';
  return text
    .replace(/(\S)\s+(\d+[.)])\s+/g, '$1\n\n$2 ')
    .replace(/(\S)\s+([•\-*])\s+/g, '$1\n\n$2 ');
}

/* Map Spring's /api/ai-context response onto the AI service's snake_case
   LifestyleContext shape. The browser no longer derives any of these numbers —
   it just relays what the backend computed. */
function toAiContext(ctx) {
  if (!ctx) return null;
  return {
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
    journal_excerpts: ctx.journalExcerpts || [],
    avg_steps: ctx.avgSteps ?? undefined,
    today_steps: ctx.todaySteps ?? undefined,
    min_steps: ctx.minSteps ?? undefined,
    local_time: new Date().toLocaleString(),
  };
}


export default function JournalPage() {
  const { user } = useAuth();
  const { journalMoods } = useReference();
  const [draft, setDraft] = useState('');
  const [moodChoice, setMoodChoice] = useState('');
  const mood = moodChoice || journalMoods[0] || '';
  const setMood = setMoodChoice;
  const fetchEntries = useCallback(async () => {
    const data = await journalApi.list();
    return (data || []).map((e) => ({
      id: e.id,
      date: formatDate(e.date),
      isoDate: e.date,
      mood: e.mood,
      text: e.text,
    }));
  }, []);

  const { data: rawEntries, setData: setEntries, loading, error: loadError } = useApi(fetchEntries, []);
  const entries = rawEntries || [];

  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // View mode tab: 'today' | 'history'
  const [activeTab, setActiveTab] = useState('today');

  // 3-Mode control for AI Assistant: 'chat' | 'expense' | 'daily_log'
  const [mode, setMode] = useState('chat');

  const [chat, setChat] = useState([
    { from: 'bot', text: 'Ask me about your lifestyle — sleep, mood, habits, or spending. Select mode to extract expenses or daily logs.' },
  ]);
  const [message, setMessage] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [chat, botTyping, activeTab]);

  const saveEntry = async () => {
    if (!draft.trim() || saving) return;
    setSaveError('');
    setSaving(true);
    try {
      if (editingId !== null) {
        const updated = await journalApi.update(editingId, {
          date: todayIso(),
          mood,
          text: draft.trim(),
        });
        setEntries((prev) => (prev || []).map((e) =>
          e.id === editingId ? { ...e, mood: updated.mood, text: updated.text, date: formatDate(updated.date), isoDate: updated.date } : e
        ));
        setEditingId(null);
      } else {
        const created = await journalApi.create({
          date: todayIso(),
          mood,
          text: draft.trim(),
        });
        setEntries((prev) => [{
          id: created.id,
          date: formatDate(created.date),
          isoDate: created.date,
          mood: created.mood,
          text: created.text,
        }, ...(prev || [])]);
      }
      setDraft('');
      setMood('');
    } catch (err) {
      setSaveError(err.message || 'Could not save your entry');
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (e) => {
    setEditingId(e.id);
    setDraft(e.text);
    setMood(e.mood);
    setActiveTab('today');
    document.getElementById('journal-textarea')?.focus();
  };

  const deleteEntry = async (id) => {
    const snapshot = entries;
    setEntries((prev) => (prev || []).filter((e) => e.id !== id));
    if (editingId === id) { setEditingId(null); setDraft(''); setMood(''); }
    try {
      await journalApi.remove(id);
    } catch (err) {
      setEntries(snapshot);
      setSaveError(err.message || 'Could not delete that entry');
    }
  };

  const handleSend = async () => {
    if (!message.trim() || botTyping) return;
    const text = message.trim();
    const userMsg = { from: 'user', text };
    setChat((prev) => [...prev, userMsg]);
    setMessage('');
    setBotTyping(true);

    try {
      if (mode === 'chat') {
        const history = chat.slice(-6).map((c) => ({
          role: c.from === 'bot' ? 'assistant' : 'user',
          content: c.text,
        }));
        const springContext = await aiContextApi.get(30).catch(() => null);
        const res = await aiApi.chat({
          query: text,
          context: toAiContext(springContext) || undefined,
          history,
          context_mode: 'full',
          user_name: user?.fullName || undefined,
        });
        setChat((prev) => [...prev, { from: 'bot', text: res.reply }]);
      } else {
        // Command mode: 'expense' or 'daily_log'
        const history = chat.slice(-6).map((c) => ({
          role: c.from === 'bot' ? 'assistant' : 'user',
          content: c.text,
        }));
        const res = await aiApi.command({
          target: mode,
          text,
          date: todayIso(),
          history,
        });

        if (res.status === 'success' && res.payload) {
          setChat((prev) => [
            ...prev,
            {
              from: 'bot',
              text: res.message,
              draft: {
                id: Date.now(),
                target: res.target,
                payload: res.payload,
                status: 'pending',
              },
            },
          ]);
        } else {
          setChat((prev) => [...prev, { from: 'bot', text: res.message || 'Could not process command.' }]);
        }
      }
    } catch {
      setChat((prev) => [...prev, {
        from: 'bot',
        text: "I couldn't reach the AI service just now. Make sure it's running on port 8100, then try again.",
      }]);
    } finally {
      setBotTyping(false);
    }
  };

  const handleConfirmDraft = async (msgIndex, draftItem) => {
    setChat((prev) =>
      prev.map((item, idx) =>
        idx === msgIndex && item.draft
          ? { ...item, draft: { ...item.draft, status: 'saving' } }
          : item
      )
    );

    try {
      if (draftItem.target === 'expense') {
        await expenseApi.create(draftItem.payload);
        setChat((prev) => [
          ...prev.map((item, idx) =>
            idx === msgIndex && item.draft
              ? { ...item, draft: { ...item.draft, status: 'confirmed' } }
              : item
          ),
          { from: 'bot', text: '✅ Expense created and saved successfully!' },
        ]);
      } else if (draftItem.target === 'daily_log') {
        await dailyLogApi.merge(draftItem.payload);
        setChat((prev) => [
          ...prev.map((item, idx) =>
            idx === msgIndex && item.draft
              ? { ...item, draft: { ...item.draft, status: 'confirmed' } }
              : item
          ),
          { from: 'bot', text: '✅ Daily Log updated successfully!' },
        ]);
      }
    } catch (err) {
      setChat((prev) => [
        ...prev.map((item, idx) =>
          idx === msgIndex && item.draft
            ? { ...item, draft: { ...item.draft, status: 'pending' } }
            : item
        ),
        { from: 'bot', text: `❌ Could not save: ${err.message || 'Server error'}` },
      ]);
    }
  };

  const handleCancelDraft = (msgIndex) => {
    setChat((prev) =>
      prev.map((item, idx) =>
        idx === msgIndex && item.draft
          ? { ...item, draft: { ...item.draft, status: 'cancelled' } }
          : item
      )
    );
  };

  return (
    <AppShell active="journal" dataScreenLabel="Journal">
      {/* Top bar */}
      <div className="journal__topbar">
        <div className="journal__brand">
          <BrandLogo />
        </div>

        <div className="journal__topbar-actions">
          <button
            className="btn btn--primary"
            id="btn-create-entry"
            style={{ height: 44 }}
            onClick={() => { setActiveTab('today'); setEditingId(null); setDraft(''); document.getElementById('journal-textarea')?.focus(); }}
          >
            Create New Entry
          </button>

          <SegmentedTabs
            tabs={[
              { id: 'today', label: 'Today' },
              { id: 'history', label: 'History' },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="journal__tabs"
            btnClass="journal__tab"
          />
        </div>
      </div>

          <div className="journal__grid">
            {/* ── Column 1: New reflection ── */}
            <section className="card" id="card-new-reflection">
              <h2 className="journal-card__title">Add New Journal Reflection</h2>
              <textarea
                id="journal-textarea"
                className="journal-textarea"
                placeholder="My Thoughts Today…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />

              <p className="journal__mood-prompt">Select your daily mood…</p>
              <div className="mood-pills" role="radiogroup" aria-label="Daily mood">
                {journalMoods.map((id) => {
                  const { emoji, label } = moodDisplay(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={mood === id}
                      className={`mood-pill${mood === id ? ' mood-pill--active' : ''}`}
                      onClick={() => setMood(id)}
                    >
                      <span className="mood-pill__emoji">{emoji}</span>
                      <span className="mood-pill__label">{label}</span>
                    </button>
                  );
                })}
              </div>

              <button className="btn btn--primary btn--full" id="btn-save-entry" onClick={saveEntry} disabled={saving}>
                {saving ? 'Saving…' : (editingId !== null ? 'Update Entry' : 'Save Entry')}
              </button>
              {saveError && (
                <p role="alert" className="form-helper form-helper--error" style={{ marginTop: 'var(--space-2)' }}>
                  {saveError}
                </p>
              )}
            </section>

            {/* ── Column 2: Full Right Side (LifeTrack AI Assistant in Today mode / History in History mode) ── */}
            {activeTab === 'today' ? (
              <aside className="ai-panel" id="ai-assistant">
                <div className="ai-panel__header">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="10" cy="10" r="7.5" /><path d="M7 8.5l3 3 3-5" />
                  </svg>
                  LifeTrack AI Assistant
                </div>
                <div className="ai-panel__body" ref={bodyRef}>
                  {chat.map((c, i) => (
                    <div key={i} className={`ai-bubble ${c.from === 'bot' ? 'ai-bubble--bot' : 'ai-bubble--user'}`}>
                      <div className="ai-bubble__content">
                        {c.from === 'bot' ? (
                          <ReactMarkdown>{formatMarkdownNewlines(c.text)}</ReactMarkdown>
                        ) : (
                          c.text
                        )}
                      </div>
                      {c.draft && (
                        <div className="ai-draft-card">
                          <div className="ai-draft-card__header">
                            <span className="ai-draft-card__title">
                              {c.draft.target === 'expense' ? 'Draft Expense' : 'Draft Daily Log'}
                            </span>
                            <span className={`ai-draft-card__badge ai-draft-card__badge--${c.draft.status}`}>
                              {c.draft.status === 'pending' && 'Review'}
                              {c.draft.status === 'saving' && 'Saving…'}
                              {c.draft.status === 'confirmed' && 'Saved'}
                              {c.draft.status === 'cancelled' && 'Cancelled'}
                            </span>
                          </div>

                          <div className="ai-draft-card__fields">
                            {Object.entries(c.draft.payload).map(([key, val]) => {
                              if (val === null || val === undefined) return null;
                              let displayVal = val;
                              if (typeof val === 'object') displayVal = JSON.stringify(val);
                              return (
                                <div key={key} className="ai-draft-card__field">
                                  <span className="ai-draft-card__label">{key}:</span>
                                  <span className="ai-draft-card__value">
                                    {key === 'amount' && (typeof val === 'number' || !isNaN(Number(val)))
                                      ? `₹${Number(val).toFixed(2)}`
                                      : String(displayVal)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {c.draft.status === 'pending' && (
                            <div className="ai-draft-card__actions">
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => handleConfirmDraft(i, c.draft)}
                              >
                                Confirm &amp; Save
                              </button>
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                onClick={() => handleCancelDraft(i)}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {botTyping && (
                    <div className="ai-bubble ai-bubble--bot ai-bubble--typing" aria-label="Assistant is typing">
                      <span className="ai-typing-dot" />
                      <span className="ai-typing-dot" />
                      <span className="ai-typing-dot" />
                    </div>
                  )}
                </div>

                {/* Footer with Mode Segmented Pills and Input row */}
                <div className="ai-panel__footer">
                  <div className="ai-panel__mode-pills" role="tablist" aria-label="AI Mode Selector">
                    <button
                      type="button"
                      className={`ai-panel__mode-pill${mode === 'chat' ? ' ai-panel__mode-pill--active' : ''}`}
                      onClick={() => setMode('chat')}
                    >
                      Chat
                    </button>
                    <button
                      type="button"
                      className={`ai-panel__mode-pill${mode === 'expense' ? ' ai-panel__mode-pill--active' : ''}`}
                      onClick={() => setMode('expense')}
                    >
                      + Expense
                    </button>
                    <button
                      type="button"
                      className={`ai-panel__mode-pill${mode === 'daily_log' ? ' ai-panel__mode-pill--active' : ''}`}
                      onClick={() => setMode('daily_log')}
                    >
                      + Daily Log
                    </button>
                  </div>
                  <div className="ai-panel__input-row">
                    <input
                      className="ai-panel__input"
                      placeholder={
                        mode === 'chat'
                          ? 'Interactive AI Chatbot…'
                          : mode === 'expense'
                          ? 'Describe expense (e.g. Spent 15 on lunch)…'
                          : 'Describe log (e.g. Slept 7.5 hrs, good quality)…'
                      }
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      aria-label="Message the assistant"
                    />
                    <button className="ai-panel__send" onClick={handleSend} aria-label="Send message">
                      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 10h12M10 5l5 5-5 5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </aside>
            ) : (
              <section className="card" id="card-previous-journals">
                <h2 className="journal-card__title">Previous Journals (Last 30 Days)</h2>
                <div className="journal-list">
                  {loading && <div className="txn-empty">Loading entries…</div>}
                  {loadError && !loading && (
                    <div className="txn-empty" role="alert" style={{ color: 'var(--clay-600)' }}>
                      {loadError}
                    </div>
                  )}
                  {!loading && !loadError && entries.length === 0 && (
                    <div className="txn-empty">No reflections yet — write your first one on the left.</div>
                  )}
                  {entries.map((e) => {
                    const m = moodDisplay(e.mood);
                    return (
                      <div className="journal-entry" key={e.id}>
                        <div className="journal-entry__icon" title={m.label}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 3h9l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
                            <line x1="6.5" y1="8" x2="12" y2="8" /><line x1="6.5" y1="11" x2="10" y2="11" />
                          </svg>
                        </div>
                        <div className="journal-entry__body">
                          <div className="journal-entry__date">Date: {e.date}</div>
                          <div className="journal-entry__preview">{m.emoji} {m.label} · {e.text}</div>
                        </div>
                        <div className="journal-entry__actions">
                          <button className="journal-entry__action" onClick={() => editEntry(e)}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2l3 3-8 8H3v-3z" /></svg>
                            Edit
                          </button>
                          <button className="journal-entry__action journal-entry__action--delete" onClick={() => deleteEntry(e.id)}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h10M6 4V2.5h4V4M5 4l.5 9h5L11 4" /></svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
    </AppShell>
  );
}
