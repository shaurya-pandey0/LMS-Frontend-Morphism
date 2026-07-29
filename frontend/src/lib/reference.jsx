// ReferenceProvider — domain vocabulary + per-user settings from the backend.
//
// These used to be hardcoded in the pages (expense categories, habit catalogs,
// mood lists, MONTHLY_BUDGET, an "8 hour" sleep target). The backend is now the
// single source of truth: GET /api/reference and GET /api/settings.
//
// Colours deliberately stay here — the backend says *which* categories exist,
// the design system decides what they look like.
/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { referenceApi, settingsApi } from './api';
import { useAuth } from './auth.jsx';

// Presentation-only: category → swatch. Extend when the backend adds a category.
export const CATEGORY_COLOR = {
  Food: '#7E9469',
  Housing: '#D2C4B4',
  Travel: '#B5734F',
  Wellness: '#A9B894',
  Misc: '#E6DCD0',
};

export const CATEGORY_FALLBACK_COLOR = '#C9BFB4';

export function colorForCategory(category) {
  return CATEGORY_COLOR[category] || CATEGORY_FALLBACK_COLOR;
}

// Presentation-only: mood → emoji/label chrome for the pickers.
export const MOOD_DISPLAY = {
  happy: { emoji: '😄', label: 'Happy' },
  calm: { emoji: '😌', label: 'Calm' },
  anxious: { emoji: '😢', label: 'Anxious' },
  grateful: { emoji: '❤️', label: 'Grateful' },
  tired: { emoji: '😪', label: 'Tired' },
  great: { emoji: '😊', label: 'Great' },
  good: { emoji: '🙂', label: 'Good' },
  okay: { emoji: '😐', label: 'Okay' },
  meh: { emoji: '😕', label: 'Meh' },
  bad: { emoji: '😞', label: 'Bad' },
};

export function moodDisplay(id) {
  return MOOD_DISPLAY[id] || { emoji: '🙂', label: id };
}

const EMPTY_REFERENCE = {
  expenseCategories: [],
  transactionalHabits: [],
  embeddedHabits: [],
  journalMoods: [],
  dailyMoods: [],
};

const ReferenceContext = createContext(null);

export function ReferenceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [reference, setReference] = useState(EMPTY_REFERENCE);
  const [settings, setSettings] = useState(null);
  // Starts true so the first render doesn't look "loaded but empty"; the fetch
  // effect only ever flips it to false.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    Promise.allSettled([referenceApi.get(), settingsApi.get()])
      .then(([ref, set]) => {
        if (cancelled) return;
        if (ref.status === 'fulfilled') setReference(ref.value || EMPTY_REFERENCE);
        if (set.status === 'fulfilled') setSettings(set.value);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const saveSettings = useCallback(async (next) => {
    const saved = await settingsApi.update(next);
    setSettings(saved);
    return saved;
  }, []);

  // Derive the logged-out view rather than clearing state in an effect, so a
  // signed-out user never sees the previous user's reference data/settings.
  const value = useMemo(() => (
    isAuthenticated
      ? { ...reference, settings, loading, saveSettings }
      : { ...EMPTY_REFERENCE, settings: null, loading: false, saveSettings }
  ), [isAuthenticated, reference, settings, loading, saveSettings]);

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}

export function useReference() {
  const ctx = useContext(ReferenceContext);
  if (!ctx) throw new Error('useReference must be used inside <ReferenceProvider>');
  return ctx;
}
