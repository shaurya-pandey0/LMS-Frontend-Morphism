import { useState, useEffect } from 'react';
import '../styles/daily-log.css';
import { dailyLogApi, habitApi } from '../lib/api.js';
import AppShell from '../components/AppShell.jsx';
import SegmentedTabs from '../components/SegmentedTabs.jsx';
import { useReference, moodDisplay } from '../lib/reference.jsx';
import { todayIso } from '../lib/date.js';

/* ── Speedometer-style Gauge Component ── */
function Gauge({ value = 0, max = 100 }) {
  const pct = Math.min(Math.max(value / max, 0), 1);

  // Needle angle: 0% → 180° (left), 100% → 0° (right)
  const needleAngleDeg = 180 - pct * 180;
  const needleAngleRad = (needleAngleDeg * Math.PI) / 180;

  // Needle tip position
  const needleLen = 13;
  const cx = 20;
  const cy = 22;
  const tipX = cx + needleLen * Math.cos(needleAngleRad);
  const tipY = cy - needleLen * Math.sin(needleAngleRad);

  return (
    <div className="gauge" title={`${Math.round(pct * 100)}%`}>
      <svg className="gauge__svg" viewBox="0 0 40 26" overflow="visible">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D9A88E" />
            <stop offset="100%" stopColor="#6E6052" />
          </linearGradient>
        </defs>

        <path
          d="M4,22 A16,16 0 0,1 36,22"
          fill="none"
          stroke="var(--sand-200)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        <path
          d="M4,22 A16,16 0 0,1 36,22"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={Math.PI * 16}
          strokeDashoffset={Math.PI * 16 * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />

        <line
          x1={cx}
          y1={cy}
          x2={tipX}
          y2={tipY}
          stroke="var(--clay-700)"
          strokeWidth="1.8"
          strokeLinecap="round"
          style={{ transition: 'x2 500ms ease, y2 500ms ease' }}
        />

        <circle cx={cx} cy={cy} r="2" fill="var(--clay-700)" />
      </svg>
    </div>
  );
}

/* Mood <option> list built from the backend vocabulary. */
function MoodOptions({ moods }) {
  return (
    <>
      <option value="">Select mood…</option>
      {moods.map((m) => {
        const { emoji, label } = moodDisplay(m);
        return <option key={m} value={m}>{emoji} {label}</option>;
      })}
    </>
  );
}

export default function DailyLogPage() {
  const { dailyMoods } = useReference();

  const [activeTab, setActiveTab] = useState('log');

  /* Activity & Wellbeing Metrics — Form opens BLANK by default */
  const [sleepHours, setSleepHours] = useState('');
  const [stepTarget, setStepTarget] = useState('');
  const [waterIntake, setWaterIntake] = useState('');
  const [sleepQuality, setSleepQuality] = useState('');
  const [stressLevel, setStressLevel] = useState('');
  const [energyLevel, setEnergyLevel] = useState('');
  const [productivityLevel, setProductivityLevel] = useState('');
  const [dayType, setDayType] = useState('');

  /* Persistent User Habits */
  const [habits, setHabits] = useState([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitName, setEditingHabitName] = useState('');
  const [habitError, setHabitError] = useState('');

  /* Meals with Custom & Standard Names */
  const [meals, setMeals] = useState([]);
  const [customMealName, setCustomMealName] = useState('Breakfast');
  const [newMealItem, setNewMealItem] = useState('');

  /* Moods */
  const [morningMood, setMorningMood] = useState('');
  const [afternoonMood, setAfternoonMood] = useState('');
  const [eveningMood, setEveningMood] = useState('');

  /* Edit state */
  const [editingId, setEditingId] = useState(null);
  const [editingDate, setEditingDate] = useState('');

  /* Form Status */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  /* History State */
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Fetch persistent user habits for target date
  useEffect(() => {
    let cancelled = false;
    const targetDate = editingDate || todayIso();
    habitApi.list(targetDate)
      .then((data) => {
        if (!cancelled) setHabits(data || []);
      })
      .catch((err) => {
        if (!cancelled) setHabitError(err.message || 'Could not load habits');
      });
    return () => { cancelled = true; };
  }, [editingDate]);

  const resetForm = () => {
    setSleepHours('');
    setStepTarget('');
    setWaterIntake('');
    setSleepQuality('');
    setStressLevel('');
    setEnergyLevel('');
    setProductivityLevel('');
    setDayType('');
    setMeals([]);
    setCustomMealName('Breakfast');
    setNewMealItem('');
    setMorningMood('');
    setAfternoonMood('');
    setEveningMood('');
    setEditingId(null);
    setEditingDate('');
    habitApi.list(todayIso())
      .then((data) => setHabits(data || []))
      .catch((err) => setHabitError(err.message || 'Could not load habits'));
  };

  const fetchHistory = () => {
    setHistoryLoading(true);
    setHistoryError('');
    dailyLogApi.list()
      .then((data) => {
        setHistoryLogs(data || []);
        setHistoryError('');
      })
      .catch((err) => setHistoryError(err.message || 'Could not load log history'))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    if (activeTab === 'history') {
      dailyLogApi.list()
        .then((data) => {
          if (!cancelled) {
            setHistoryLogs(data || []);
            setHistoryError('');
          }
        })
        .catch((err) => {
          if (!cancelled) setHistoryError(err.message || 'Could not load log history');
        })
        .finally(() => {
          if (!cancelled) setHistoryLoading(false);
        });
    }
    return () => { cancelled = true; };
  }, [activeTab]);

  /* Habit Operations */
  const handleToggleHabit = (habit) => {
    const targetDate = editingDate || todayIso();
    const nextCompleted = !habit.completedToday;
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, completedToday: nextCompleted } : h))
    );
    habitApi.toggle(habit.id, targetDate, nextCompleted).catch((err) => {
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, completedToday: habit.completedToday } : h))
      );
      setHabitError(err.message || 'Could not toggle habit completion');
    });
  };

  const handleCreateHabit = () => {
    if (!newHabitName.trim()) return;
    if (habits.filter((h) => h.active).length >= 5) {
      setHabitError('Maximum 5 active habits allowed.');
      return;
    }
    setHabitError('');
    habitApi.create({ name: newHabitName.trim() })
      .then((created) => {
        setHabits((prev) => [...prev, created]);
        setNewHabitName('');
      })
      .catch((err) => setHabitError(err.message || 'Could not create habit'));
  };

  const handleRenameHabit = (id) => {
    if (!editingHabitName.trim()) return;
    setHabitError('');
    habitApi.update(id, { name: editingHabitName.trim() })
      .then((updated) => {
        setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name: updated.name } : h)));
        setEditingHabitId(null);
        setEditingHabitName('');
      })
      .catch((err) => setHabitError(err.message || 'Could not rename habit'));
  };

  const handleDeactivateHabit = (id) => {
    setHabitError('');
    habitApi.deactivate(id)
      .then(() => {
        setHabits((prev) => prev.filter((h) => h.id !== id));
      })
      .catch((err) => setHabitError(err.message || 'Could not deactivate habit'));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaveError('');
    setSaveOk(false);

    const completedHabitNames = habits.filter((h) => h.completedToday).map((h) => h.name);

    const isFormEmpty =
      sleepHours === '' &&
      stepTarget === '' &&
      waterIntake === '' &&
      sleepQuality === '' &&
      stressLevel === '' &&
      energyLevel === '' &&
      productivityLevel === '' &&
      dayType === '' &&
      completedHabitNames.length === 0 &&
      meals.length === 0 &&
      morningMood === '' &&
      afternoonMood === '' &&
      eveningMood === '';

    if (editingId === null && isFormEmpty) {
      setSaveError('Please enter or select at least one field to log.');
      return;
    }

    setSaving(true);

    const payload = {
      date: editingDate || todayIso(),
      sleepHours: sleepHours === '' ? null : parseFloat(sleepHours),
      stepTarget: stepTarget === '' ? null : parseInt(stepTarget, 10),
      waterIntake: waterIntake === '' ? null : parseFloat(waterIntake),
      sleepQuality: sleepQuality === '' ? null : parseInt(sleepQuality, 10),
      stressLevel: stressLevel === '' ? null : parseInt(stressLevel, 10),
      energyLevel: energyLevel === '' ? null : parseInt(energyLevel, 10),
      productivityLevel: productivityLevel === '' ? null : parseInt(productivityLevel, 10),
      dayType: dayType || null,
      transactionalHabits: completedHabitNames,
      embeddedHabits: [],
      meals: meals.map((m) => ({ name: m.name, items: m.items })),
      morningMood: morningMood || null,
      afternoonMood: afternoonMood || null,
      eveningMood: eveningMood || null,
    };

    try {
      if (editingId !== null) {
        await dailyLogApi.update(editingId, payload);
      } else {
        await dailyLogApi.merge(payload);
      }
      setSaveOk(true);
      resetForm();
      if (activeTab === 'history') {
        fetchHistory();
      }
    } catch (err) {
      setSaveError(err.message || 'Could not save daily log');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (log) => {
    setEditingId(log.id);
    setEditingDate(log.date || '');
    if (log.date) {
      habitApi.list(log.date)
        .then((data) => setHabits(data || []))
        .catch((err) => setHabitError(err.message || 'Could not load habits for date'));
    }
    setSleepHours(log.sleepHours != null ? String(log.sleepHours) : '');
    setStepTarget(log.stepTarget != null ? String(log.stepTarget) : '');
    setWaterIntake(log.waterIntake != null ? String(log.waterIntake) : '');
    setSleepQuality(log.sleepQuality != null ? String(log.sleepQuality) : '');
    setStressLevel(log.stressLevel != null ? String(log.stressLevel) : '');
    setEnergyLevel(log.energyLevel != null ? String(log.energyLevel) : '');
    setProductivityLevel(log.productivityLevel != null ? String(log.productivityLevel) : '');
    setDayType(log.dayType || '');
    if (Array.isArray(log.meals)) {
      setMeals(log.meals.map((m, idx) => ({
        id: idx + 1,
        name: m.name,
        items: Array.isArray(m.items) ? m.items : [],
      })));
    } else {
      setMeals([]);
    }
    setMorningMood(log.morningMood || '');
    setAfternoonMood(log.afternoonMood || '');
    setEveningMood(log.eveningMood || '');
    setSaveOk(false);
    setSaveError('');
    setActiveTab('log');
  };

  const handleDelete = async (id) => {
    const snapshot = historyLogs;
    setHistoryLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await dailyLogApi.remove(id);
    } catch (err) {
      setHistoryLogs(snapshot);
      setHistoryError(err.message || 'Could not delete log entry');
    }
  };

  const handleAddMeal = () => {
    const name = customMealName.trim() || 'Breakfast';
    const item = newMealItem.trim();
    if (!item) return;

    setMeals((prev) => {
      const existingIdx = prev.findIndex((m) => m.name.toLowerCase() === name.toLowerCase());
      if (existingIdx >= 0) {
        return prev.map((m, idx) =>
          idx === existingIdx ? { ...m, items: [...m.items, item] } : m
        );
      }
      return [...prev, { id: Date.now(), name, items: [item] }];
    });
    setNewMealItem('');
  };

  const removeMealItem = (mealName, itemIdx) => {
    setMeals((prev) =>
      prev
        .map((m) => (m.name === mealName ? { ...m, items: m.items.filter((_, i) => i !== itemIdx) } : m))
        .filter((m) => m.items.length > 0)
    );
  };

  const activeHabitsCount = habits.filter((h) => h.active).length;

  return (
    <AppShell active="daily-log" dataScreenLabel="DailyLog">
      {/* Header Row with Title and Tabs */}
      <header className="daily-log__header-row">
        <div>
          <h1 className="daily-log__title" id="daily-log-page-title">
            Daily Log Page: Commit to Balance
          </h1>
          <p className="daily-log__subtitle">
            {activeTab === 'log'
              ? (editingId ? `Editing Log Entry for ${editingDate}` : "Log today's activity, wellbeing metrics, habits, and meals.")
              : "View and manage historical daily log entries."}
          </p>
        </div>
        <SegmentedTabs
          tabs={[
            { id: 'log', label: 'Log Today' },
            { id: 'history', label: 'History' },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            if (tabId === 'history') {
              setHistoryLoading(true);
              setHistoryError('');
              resetForm();
            }
            setActiveTab(tabId);
          }}
          className="daily-log__tabs"
          btnClass="daily-log__tab"
        />
      </header>

          {activeTab === 'log' ? (
            <>
              {/* Three-column Form Grid */}
              <div className="daily-log__grid">
                {/* ── Column 1: Today's Activity + Daily Mood Parameters ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="card" id="card-activity-metrics">
                  <h2 className="daily-log-card__title">Today's Activity</h2>

                  {/* Sleep Hours */}
                  <div className="metric-row">
                    <div className="metric-row__input-group">
                      <label className="metric-row__label" htmlFor="sleep-hours">
                        Sleep Hours (Last Night)
                      </label>
                      <input
                        type="number"
                        id="sleep-hours"
                        className="metric-row__input"
                        placeholder="hours"
                        min="0"
                        max="24"
                        step="0.5"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(e.target.value)}
                      />
                    </div>
                    <Gauge value={sleepHours ? parseFloat(sleepHours) : 0} max={12} />
                  </div>

                  {/* Step Target */}
                  <div className="metric-row">
                    <div className="metric-row__input-group">
                      <label className="metric-row__label" htmlFor="step-target">
                        Step Target (Daily Goal)
                      </label>
                      <input
                        type="number"
                        id="step-target"
                        className="metric-row__input"
                        placeholder="e.g. 10000"
                        min="0"
                        max="50000"
                        step="500"
                        value={stepTarget}
                        onChange={(e) => setStepTarget(e.target.value)}
                      />
                    </div>
                    <Gauge value={stepTarget ? parseInt(stepTarget, 10) : 0} max={15000} />
                  </div>

                  {/* Water Intake */}
                  <div className="metric-row">
                    <div className="metric-row__input-group">
                      <label className="metric-row__label" htmlFor="water-intake">
                        Water Intake
                      </label>
                      <input
                        type="number"
                        id="water-intake"
                        className="metric-row__input"
                        placeholder="mL"
                        min="0"
                        max="10000"
                        step="250"
                        value={waterIntake}
                        onChange={(e) => setWaterIntake(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                  {/* Daily Mood Parameters — moved from Col 3 */}
                  <div className="card" id="card-mood-parameters">
                    <h2 className="daily-log-card__title">Daily Mood Parameters</h2>
                    <div className="mood-group">
                      <div className="mood-item">
                        <label className="mood-item__label" htmlFor="morning-mood">Morning Mood</label>
                        <select
                          id="morning-mood"
                          className="mood-item__select"
                          value={morningMood}
                          onChange={(e) => setMorningMood(e.target.value)}
                        >
                          <MoodOptions moods={dailyMoods} />
                        </select>
                      </div>
                      <div className="mood-item">
                        <label className="mood-item__label" htmlFor="afternoon-mood">Afternoon Mood</label>
                        <select
                          id="afternoon-mood"
                          className="mood-item__select"
                          value={afternoonMood}
                          onChange={(e) => setAfternoonMood(e.target.value)}
                        >
                          <MoodOptions moods={dailyMoods} />
                        </select>
                      </div>
                      <div className="mood-item">
                        <label className="mood-item__label" htmlFor="evening-mood">Evening Mood</label>
                        <select
                          id="evening-mood"
                          className="mood-item__select"
                          value={eveningMood}
                          onChange={(e) => setEveningMood(e.target.value)}
                        >
                          <MoodOptions moods={dailyMoods} />
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Column 2: My Habits + Meals ── */}
                <div className="card" id="card-habits-nutrition">
                  {/* Single My Habits Card */}
                  <div className="my-habits__header">
                    <h2 className="daily-log-card__title" style={{ margin: 0 }}>My Habits</h2>
                    <span className="my-habits__count">{activeHabitsCount}/5 Active</span>
                  </div>

                  {habitError && (
                    <div role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-2)' }}>
                      {habitError}
                    </div>
                  )}

                  <div className="checklist" id="my-habits-checklist">
                    {habits.length === 0 ? (
                      <p className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>
                        No habits defined yet. Add a habit below.
                      </p>
                    ) : (
                      habits.map((habit) => (
                        <div key={habit.id} className="habit-item">
                          <div className="habit-item__left">
                            <input
                              type="checkbox"
                              className="checklist__checkbox"
                              checked={!!habit.completedToday}
                              onChange={() => handleToggleHabit(habit)}
                            />
                            {editingHabitId === habit.id ? (
                              <input
                                type="text"
                                className="metric-row__input"
                                style={{ height: '30px', padding: '0 6px', fontSize: 'var(--text-sm)' }}
                                value={editingHabitName}
                                onChange={(e) => setEditingHabitName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRenameHabit(habit.id); }}
                              />
                            ) : (
                              <span
                                className={`habit-item__name ${habit.completedToday ? 'habit-item__name--completed' : ''}`}
                                onClick={() => handleToggleHabit(habit)}
                              >
                                {habit.name} {!habit.active && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--taupe-600)', fontStyle: 'italic' }}>(Inactive)</span>}
                              </span>
                            )}
                          </div>

                          <div className="habit-item__actions">
                            {editingHabitId === habit.id ? (
                              <button
                                type="button"
                                className="habit-item__action-btn"
                                onClick={() => handleRenameHabit(habit.id)}
                              >
                                Save
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="habit-item__action-btn"
                                onClick={() => { setEditingHabitId(habit.id); setEditingHabitName(habit.name); }}
                              >
                                Rename
                              </button>
                            )}
                            {habit.active && (
                              <button
                                type="button"
                                className="habit-item__action-btn"
                                onClick={() => handleDeactivateHabit(habit.id)}
                                title="Deactivate Habit"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Habit Row (if active habits count < 5) */}
                  {activeHabitsCount < 5 && (
                    <div className="my-habits__add-row">
                      <input
                        type="text"
                        className="metric-row__input"
                        placeholder="Add new habit (max 5 allowed)"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateHabit(); } }}
                      />
                      <button type="button" className="btn btn--secondary" onClick={handleCreateHabit}>
                        + Habit
                      </button>
                    </div>
                  )}

                  {/* Meals & Nutrition Card (Unchanged) */}
                  <h3 className="daily-log-card__section-title" style={{ marginTop: 'var(--space-6)' }}>
                    Meals &amp; Nutrition
                  </h3>
                  
                  {/* Custom & Standard Meal Input Controls */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <input
                        list="standard-meal-options"
                        className="metric-row__input"
                        placeholder="Meal Name (e.g. Lunch, High Tea, Brunch)"
                        value={customMealName}
                        onChange={(e) => setCustomMealName(e.target.value)}
                      />
                      <datalist id="standard-meal-options">
                        <option value="Breakfast" />
                        <option value="Lunch" />
                        <option value="High Tea" />
                        <option value="Dinner" />
                        <option value="Snacks" />
                        <option value="Brunch" />
                      </datalist>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <input
                        type="text"
                        className="metric-row__input"
                        placeholder="Food item (e.g. Oatmeal, Scones)"
                        value={newMealItem}
                        onChange={(e) => setNewMealItem(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMeal(); } }}
                      />
                      <button type="button" className="btn btn--secondary" onClick={handleAddMeal}>
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Render Logged Meals */}
                  <div className="meal-cards">
                    {meals.length === 0 ? (
                      <p className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>
                        No meals added yet. Add items above.
                      </p>
                    ) : (
                      meals.map((meal) => (
                        <div key={meal.name} className="meal-card">
                          <span className="meal-card__title">{meal.name}</span>
                          <div className="meal-card__items">
                            {meal.items.map((item, idx) => (
                              <div key={`${item}-${idx}`} className="meal-card__item">
                                <span>{item}</span>
                                <button
                                  type="button"
                                  className="meal-card__remove"
                                  title="Remove item"
                                  onClick={() => removeMealItem(meal.name, idx)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Save Bar — moved from below grid into Col 2 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn--primary"
                      id="btn-save-daily-log"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Saving…' : (editingId !== null ? `Update Log (${editingDate})` : "Save Today's Log")}
                    </button>
                    {editingId !== null && (
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={resetForm}
                      >
                        Cancel Edit
                      </button>
                    )}
                    {saveOk && (
                      <span className="form-helper" style={{ color: 'var(--sage-700, var(--sage-500))' }}>
                        Saved. Form reset to blank.
                      </span>
                    )}
                    {saveError && (
                      <span role="alert" className="form-helper form-helper--error">{saveError}</span>
                    )}
                  </div>
                </div>

                {/* ── Column 3: Self-Reported Wellbeing + Moods ── */}
                <div className="daily-log__right-stack">
                  {/* Self-Reported Wellbeing (Moved to Column 3 where Embedded Habits was) */}
                  <div className="card" id="card-wellbeing-metrics">
                    <h2 className="daily-log-card__title">Self-Reported Wellbeing</h2>

                    <div className="wellbeing-group">
                      <div className="metric-row">
                        <div className="metric-row__input-group">
                          <label className="metric-row__label" htmlFor="day-type">Day Type</label>
                          <select
                            id="day-type"
                            className="metric-row__input"
                            value={dayType}
                            onChange={(e) => setDayType(e.target.value)}
                          >
                            <option value="">Select Day Type…</option>
                            <option value="STUDY_WORK">Study / Work</option>
                            <option value="DAY_OFF">Day Off</option>
                            <option value="TRAVEL">Travel</option>
                            <option value="SICK">Sick</option>
                            <option value="UNUSUAL">Unusual</option>
                          </select>
                        </div>
                      </div>

                      <div className="metric-row">
                        <div className="metric-row__input-group">
                          <label className="metric-row__label" htmlFor="sleep-quality">Sleep Quality</label>
                          <select
                            id="sleep-quality"
                            className="metric-row__input"
                            value={sleepQuality}
                            onChange={(e) => setSleepQuality(e.target.value)}
                          >
                            <option value="">Select (1–5)…</option>
                            <option value="1">1 - Very Poor</option>
                            <option value="2">2 - Poor</option>
                            <option value="3">3 - Fair</option>
                            <option value="4">4 - Good</option>
                            <option value="5">5 - Excellent</option>
                          </select>
                        </div>
                      </div>

                      <div className="metric-row">
                        <div className="metric-row__input-group">
                          <label className="metric-row__label" htmlFor="stress-level">Stress Level</label>
                          <select
                            id="stress-level"
                            className="metric-row__input"
                            value={stressLevel}
                            onChange={(e) => setStressLevel(e.target.value)}
                          >
                            <option value="">Select (1–5)…</option>
                            <option value="1">1 - Very Low</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Moderate</option>
                            <option value="4">4 - High</option>
                            <option value="5">5 - Very High</option>
                          </select>
                        </div>
                      </div>

                      <div className="metric-row">
                        <div className="metric-row__input-group">
                          <label className="metric-row__label" htmlFor="energy-level">Energy Level</label>
                          <select
                            id="energy-level"
                            className="metric-row__input"
                            value={energyLevel}
                            onChange={(e) => setEnergyLevel(e.target.value)}
                          >
                            <option value="">Select (1–5)…</option>
                            <option value="1">1 - Very Low</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Moderate</option>
                            <option value="4">4 - High</option>
                            <option value="5">5 - Very High</option>
                          </select>
                        </div>
                      </div>

                      <div className="metric-row">
                        <div className="metric-row__input-group">
                          <label className="metric-row__label" htmlFor="productivity-level">Productivity / Study</label>
                          <select
                            id="productivity-level"
                            className="metric-row__input"
                            value={productivityLevel}
                            onChange={(e) => setProductivityLevel(e.target.value)}
                          >
                            <option value="">Select (1–5)…</option>
                            <option value="1">1 - Very Low</option>
                            <option value="2">2 - Low</option>
                            <option value="3">3 - Moderate</option>
                            <option value="4">4 - High</option>
                            <option value="5">5 - Very High</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          ) : (
            /* ── History Tab ── */
            <div className="card" id="card-daily-log-history">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 className="daily-log-card__title" style={{ margin: 0 }}>Historical Daily Logs</h2>
                <span className="text-sm text-secondary">{historyLogs.length} entries</span>
              </div>

              {historyLoading ? (
                <div className="txn-empty">Loading log history…</div>
              ) : historyError ? (
                <div role="alert" className="form-helper form-helper--error">{historyError}</div>
              ) : historyLogs.length === 0 ? (
                <div className="txn-empty">No daily logs recorded yet.</div>
              ) : (
                <div className="history-list">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="history-item">
                      <div>
                        <div className="history-item__date">{log.date}</div>
                        <div className="history-item__details">
                          {log.sleepHours != null && <span className="history-item__chip">Sleep: {log.sleepHours} hrs</span>}
                          {log.stepTarget != null && <span className="history-item__chip">Step target: {log.stepTarget}</span>}
                          {log.waterIntake != null && <span className="history-item__chip">Water: {log.waterIntake} mL</span>}
                          {log.dayType && <span className="history-item__chip">Day: {log.dayType}</span>}
                          {log.sleepQuality != null && <span className="history-item__chip">Quality: {log.sleepQuality}/5</span>}
                          {log.stressLevel != null && <span className="history-item__chip">Stress: {log.stressLevel}/5</span>}
                          {log.energyLevel != null && <span className="history-item__chip">Energy: {log.energyLevel}/5</span>}
                          {log.productivityLevel != null && <span className="history-item__chip">Productivity: {log.productivityLevel}/5</span>}
                          {Array.isArray(log.meals) && log.meals.length > 0 && (
                            <span className="history-item__chip">Meals: {log.meals.length}</span>
                          )}
                        </div>
                      </div>
                      <div className="history-item__actions">
                        <button
                          type="button"
                          className="btn btn--secondary"
                          style={{ padding: '4px 12px', fontSize: 'var(--text-xs)' }}
                          onClick={() => handleEdit(log)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--secondary"
                          style={{ padding: '4px 12px', fontSize: 'var(--text-xs)', color: 'var(--clay-700)' }}
                          onClick={() => handleDelete(log.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
    </AppShell>
  );
}
