import { useState } from 'react';
import AppShell from './components/AppShell.jsx';
import { useReference } from './lib/reference.jsx';
import { ApiError } from './lib/api.js';

/**
 * Settings page — persists all user preferences via GET/PUT /api/settings.
 *
 * React is purely presentational here: it loads values from the backend on
 * mount and submits the full settings object on save.  No business rules,
 * no localStorage, no client-side threshold derivation.
 */
export default function SettingsPage() {
  const { settings, loading, saveSettings } = useReference();

  const [form, setForm] = useState({
    monthlyBudget: '',
    sleepTargetHours: '',
    stepTarget: '',
    waterTargetMl: '',
    insightPeriodDays: '',
    minPairedDays: '',
    lowSleepThreshold: '',
    habitConsistencyTarget: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  // Populate the form once settings arrive from the backend.
  const [loadedSettings, setLoadedSettings] = useState(null);
  if (settings && settings !== loadedSettings) {
    setLoadedSettings(settings);
    setForm({
      monthlyBudget: String(settings.monthlyBudget ?? ''),
      sleepTargetHours: String(settings.sleepTargetHours ?? ''),
      stepTarget: String(settings.stepTarget ?? ''),
      waterTargetMl: String(settings.waterTargetMl ?? ''),
      insightPeriodDays: String(settings.insightPeriodDays ?? '7'),
      minPairedDays: String(settings.minPairedDays ?? '3'),
      lowSleepThreshold: String(settings.lowSleepThreshold ?? '6'),
      habitConsistencyTarget: String(settings.habitConsistencyTarget ?? '70'),
    });
  }

  const updateField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: '' }));
    setSaveMessage('');
  };

  // Client-side validation: range checks only. Cross-field rules are enforced
  // by Spring; Spring's error message is surfaced via saveError.
  const validate = () => {
    const next = {};
    const budget = Number(form.monthlyBudget);
    const sleep = Number(form.sleepTargetHours);
    const steps = Number(form.stepTarget);
    const water = Number(form.waterTargetMl);
    const period = Number(form.insightPeriodDays);
    const paired = Number(form.minPairedDays);
    const lowSleep = Number(form.lowSleepThreshold);
    const consistency = Number(form.habitConsistencyTarget);

    if (form.monthlyBudget === '' || Number.isNaN(budget) || budget < 0)
      next.monthlyBudget = 'Monthly budget must be zero or a positive number.';
    if (form.sleepTargetHours === '' || Number.isNaN(sleep) || sleep <= 0)
      next.sleepTargetHours = 'Sleep target must be a positive number of hours.';
    if (form.stepTarget === '' || Number.isNaN(steps) || steps <= 0)
      next.stepTarget = 'Daily step target must be a positive number.';
    if (form.waterTargetMl === '' || Number.isNaN(water) || water <= 0)
      next.waterTargetMl = 'Water target must be a positive number of mL.';
    if (form.insightPeriodDays === '' || Number.isNaN(period) || period < 7 || period > 30)
      next.insightPeriodDays = 'Analysis period must be between 7 and 30 days.';
    if (form.minPairedDays === '' || Number.isNaN(paired) || paired < 1 || paired > 30)
      next.minPairedDays = 'Minimum paired days must be between 1 and 30.';
    if (form.lowSleepThreshold === '' || Number.isNaN(lowSleep) || lowSleep < 0)
      next.lowSleepThreshold = 'Low sleep threshold must be zero or a positive number.';
    if (form.habitConsistencyTarget === '' || Number.isNaN(consistency) || consistency < 0 || consistency > 100)
      next.habitConsistencyTarget = 'Habit consistency target must be between 0 and 100%.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    setSaveMessage('');
    setSaveError('');
    if (!validate()) return;
    setSaving(true);
    try {
      await saveSettings({
        monthlyBudget: Number(form.monthlyBudget),
        sleepTargetHours: Number(form.sleepTargetHours),
        stepTarget: Number(form.stepTarget),
        waterTargetMl: Number(form.waterTargetMl),
        insightPeriodDays: Math.round(Number(form.insightPeriodDays)),
        minPairedDays: Math.round(Number(form.minPairedDays)),
        lowSleepThreshold: Number(form.lowSleepThreshold),
        habitConsistencyTarget: Math.round(Number(form.habitConsistencyTarget)),
      });
      setSaveMessage('Settings saved.');
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell active="settings" dataScreenLabel="Settings">
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1 className="card__title" style={{ marginBottom: 'var(--space-5)' }}>Settings</h1>

          <section className="card" id="card-settings">
            {loading ? (
              <div className="txn-empty">Loading settings…</div>
            ) : (
              <>
                {saveMessage && (
                  <p role="status" className="form-helper" style={{ color: 'var(--sage-700, var(--sage-500))', marginBottom: 'var(--space-3)' }}>
                    {saveMessage}
                  </p>
                )}
                {saveError && (
                  <p role="alert" className="form-helper form-helper--error" style={{ marginBottom: 'var(--space-3)' }}>
                    {saveError}
                  </p>
                )}

                {/* ── Targets ─────────────────────────────────────────── */}
                <div className="form-group">
                  <label className="form-label" htmlFor="settings-budget">Monthly Budget</label>
                  <input
                    id="settings-budget"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`form-input${errors.monthlyBudget ? ' form-input--error' : ''}`}
                    value={form.monthlyBudget}
                    onChange={updateField('monthlyBudget')}
                    aria-invalid={!!errors.monthlyBudget}
                    aria-describedby={errors.monthlyBudget ? 'settings-budget-error' : undefined}
                  />
                  {errors.monthlyBudget && (
                    <span className="form-helper form-helper--error" id="settings-budget-error" role="alert">
                      {errors.monthlyBudget}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-sleep">Sleep Target Hours</label>
                  <input
                    id="settings-sleep"
                    type="number"
                    min="0"
                    step="0.5"
                    className={`form-input${errors.sleepTargetHours ? ' form-input--error' : ''}`}
                    value={form.sleepTargetHours}
                    onChange={updateField('sleepTargetHours')}
                    aria-invalid={!!errors.sleepTargetHours}
                    aria-describedby={errors.sleepTargetHours ? 'settings-sleep-error' : undefined}
                  />
                  {errors.sleepTargetHours && (
                    <span className="form-helper form-helper--error" id="settings-sleep-error" role="alert">
                      {errors.sleepTargetHours}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-steps">Daily Step Target</label>
                  <input
                    id="settings-steps"
                    type="number"
                    min="0"
                    step="1"
                    className={`form-input${errors.stepTarget ? ' form-input--error' : ''}`}
                    value={form.stepTarget}
                    onChange={updateField('stepTarget')}
                    aria-invalid={!!errors.stepTarget}
                    aria-describedby={errors.stepTarget ? 'settings-steps-error' : undefined}
                  />
                  {errors.stepTarget && (
                    <span className="form-helper form-helper--error" id="settings-steps-error" role="alert">
                      {errors.stepTarget}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-water">Water Target (mL)</label>
                  <input
                    id="settings-water"
                    type="number"
                    min="0"
                    step="50"
                    className={`form-input${errors.waterTargetMl ? ' form-input--error' : ''}`}
                    value={form.waterTargetMl}
                    onChange={updateField('waterTargetMl')}
                    aria-invalid={!!errors.waterTargetMl}
                    aria-describedby={errors.waterTargetMl ? 'settings-water-error' : undefined}
                  />
                  {errors.waterTargetMl && (
                    <span className="form-helper form-helper--error" id="settings-water-error" role="alert">
                      {errors.waterTargetMl}
                    </span>
                  )}
                </div>

                {/* ── AI Analysis Preferences ──────────────────────────── */}
                <p className="form-label" style={{ marginTop: 'var(--space-5)', marginBottom: 'var(--space-3)', color: 'var(--taupe-600)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  AI Analysis Preferences
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-period">
                    AI Analysis Period (days)
                    <span className="text-xs text-secondary" style={{ marginLeft: 'var(--space-2)' }}>7 – 30</span>
                  </label>
                  <input
                    id="settings-period"
                    type="number"
                    min="7"
                    max="30"
                    step="1"
                    className={`form-input${errors.insightPeriodDays ? ' form-input--error' : ''}`}
                    value={form.insightPeriodDays}
                    onChange={updateField('insightPeriodDays')}
                    aria-invalid={!!errors.insightPeriodDays}
                    aria-describedby={errors.insightPeriodDays ? 'settings-period-error' : undefined}
                  />
                  {errors.insightPeriodDays && (
                    <span className="form-helper form-helper--error" id="settings-period-error" role="alert">
                      {errors.insightPeriodDays}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-paired">
                    Minimum Paired Days
                    <span className="text-xs text-secondary" style={{ marginLeft: 'var(--space-2)' }}>must not exceed analysis period</span>
                  </label>
                  <input
                    id="settings-paired"
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    className={`form-input${errors.minPairedDays ? ' form-input--error' : ''}`}
                    value={form.minPairedDays}
                    onChange={updateField('minPairedDays')}
                    aria-invalid={!!errors.minPairedDays}
                    aria-describedby={errors.minPairedDays ? 'settings-paired-error' : undefined}
                  />
                  {errors.minPairedDays && (
                    <span className="form-helper form-helper--error" id="settings-paired-error" role="alert">
                      {errors.minPairedDays}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-low-sleep">
                    Low Sleep Threshold (hrs)
                    <span className="text-xs text-secondary" style={{ marginLeft: 'var(--space-2)' }}>must be below sleep target</span>
                  </label>
                  <input
                    id="settings-low-sleep"
                    type="number"
                    min="0"
                    step="0.5"
                    className={`form-input${errors.lowSleepThreshold ? ' form-input--error' : ''}`}
                    value={form.lowSleepThreshold}
                    onChange={updateField('lowSleepThreshold')}
                    aria-invalid={!!errors.lowSleepThreshold}
                    aria-describedby={errors.lowSleepThreshold ? 'settings-low-sleep-error' : undefined}
                  />
                  {errors.lowSleepThreshold && (
                    <span className="form-helper form-helper--error" id="settings-low-sleep-error" role="alert">
                      {errors.lowSleepThreshold}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="settings-consistency">
                    Habit Consistency Target (%)
                    <span className="text-xs text-secondary" style={{ marginLeft: 'var(--space-2)' }}>0 – 100</span>
                  </label>
                  <input
                    id="settings-consistency"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className={`form-input${errors.habitConsistencyTarget ? ' form-input--error' : ''}`}
                    value={form.habitConsistencyTarget}
                    onChange={updateField('habitConsistencyTarget')}
                    aria-invalid={!!errors.habitConsistencyTarget}
                    aria-describedby={errors.habitConsistencyTarget ? 'settings-consistency-error' : undefined}
                  />
                  {errors.habitConsistencyTarget && (
                    <span className="form-helper form-helper--error" id="settings-consistency-error" role="alert">
                      {errors.habitConsistencyTarget}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  id="btn-save-settings"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
              </>
            )}
          </section>
        </div>
    </AppShell>
  );
}
