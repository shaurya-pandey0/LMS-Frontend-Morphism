import { useState, useEffect } from 'react';

const PRESET_THEMES = [
  {
    id: 'terracotta',
    name: 'Terracotta',
    primary: '#B5734F',
    secondary: '#7E9469',
    bg: '#FAF6F1',
    heading: '#241F1A',
  },
  {
    id: 'sage',
    name: 'Sage',
    primary: '#5E7050',
    secondary: '#8A4F32',
    bg: '#F2F5F0',
    heading: '#1E2B18',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    primary: '#3B6989',
    secondary: '#5C8A79',
    bg: '#F0F4F7',
    heading: '#1A2C38',
  },
  {
    id: 'amber',
    name: 'Sunset',
    primary: '#C97A2B',
    secondary: '#6E8CA0',
    bg: '#FAF5EE',
    heading: '#33200D',
  },
  {
    id: 'dark',
    name: 'Graphite',
    primary: '#D98A5F',
    secondary: '#94A97E',
    bg: '#1C1917',
    heading: '#F7EDE7',
  },
];

function applyThemePalette(palette) {
  const root = document.documentElement;
  if (!palette) return;

  if (palette.primary) {
    root.style.setProperty('--clay-500', palette.primary);
    root.style.setProperty('--clay-600', palette.primary);
    root.style.setProperty('--clay-700', palette.primary);
    root.style.setProperty('--color-btn-primary-bg', palette.primary);
    root.style.setProperty('--color-bg-active-nav', palette.primary);
  }
  if (palette.secondary) {
    root.style.setProperty('--sage-500', palette.secondary);
    root.style.setProperty('--color-status-success', palette.secondary);
  }
  if (palette.bg) {
    root.style.setProperty('--sand-50', palette.bg);
    root.style.setProperty('--color-bg-app', palette.bg);
  }
  if (palette.heading) {
    root.style.setProperty('--ink-900', palette.heading);
    root.style.setProperty('--color-text-heading', palette.heading);
  }
}

function resetThemePalette() {
  const root = document.documentElement;
  const props = [
    '--clay-500', '--clay-600', '--clay-700', '--color-btn-primary-bg', '--color-bg-active-nav',
    '--sage-500', '--color-status-success',
    '--sand-50', '--color-bg-app',
    '--ink-900', '--color-text-heading',
  ];
  props.forEach((p) => root.style.removeProperty(p));
  localStorage.removeItem('lifetrack_color_theme');
}

function getInitialThemeState() {
  try {
    const saved = localStorage.getItem('lifetrack_color_theme');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        themeId: parsed.id || 'custom',
        colors: parsed.colors || {
          primary: '#B5734F',
          secondary: '#7E9469',
          bg: '#FAF6F1',
          heading: '#241F1A',
        },
      };
    }
  } catch {
    // fallback
  }
  return {
    themeId: 'terracotta',
    colors: {
      primary: '#B5734F',
      secondary: '#7E9469',
      bg: '#FAF6F1',
      heading: '#241F1A',
    },
  };
}

export default function ColorPipelineCard() {
  const [initial] = useState(getInitialThemeState);
  const [activeTheme, setActiveTheme] = useState(initial.themeId);
  const [customColors, setCustomColors] = useState(initial.colors);

  useEffect(() => {
    if (initial.colors) {
      applyThemePalette(initial.colors);
    }
  }, [initial.colors]);

  const handleSelectPreset = (theme) => {
    setActiveTheme(theme.id);
    const colors = {
      primary: theme.primary,
      secondary: theme.secondary,
      bg: theme.bg,
      heading: theme.heading,
    };
    setCustomColors(colors);
    applyThemePalette(colors);
    localStorage.setItem(
      'lifetrack_color_theme',
      JSON.stringify({ id: theme.id, colors })
    );
  };

  const handleColorChange = (leverKey, value) => {
    setActiveTheme('custom');
    const updated = { ...customColors, [leverKey]: value };
    setCustomColors(updated);
    applyThemePalette(updated);
    localStorage.setItem(
      'lifetrack_color_theme',
      JSON.stringify({ id: 'custom', colors: updated })
    );
  };

  const handleReset = () => {
    setActiveTheme('terracotta');
    const defaultColors = {
      primary: '#B5734F',
      secondary: '#7E9469',
      bg: '#FAF6F1',
      heading: '#241F1A',
    };
    setCustomColors(defaultColors);
    resetThemePalette();
  };

  const LEVERS = [
    { key: 'primary', label: 'Primary Accent', title: 'Primary Accent (--clay-500)' },
    { key: 'secondary', label: 'Secondary / Sage', title: 'Secondary Accent (--sage-500)' },
    { key: 'bg', label: 'App Background', title: 'App Background (--sand-50)' },
    { key: 'heading', label: 'Headings Text', title: 'Heading Text (--ink-900)' },
  ];

  return (
    <div className="card" id="card-color-pipeline" style={{ padding: 'var(--space-4)', width: '100%', boxSizing: 'border-box' }}>
      <div className="card__header" style={{ marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
        <h2 className="card__title" style={{ fontSize: 'var(--text-base)', lineHeight: 1.2 }}>Color Pipeline</h2>
        <span className="chip chip--clay" style={{ fontSize: '10px', padding: '1px 6px' }}>Tokens</span>
      </div>

      <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Preset Selector */}
        <div>
          <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--taupe-600)' }}>
            Theme Presets
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {PRESET_THEMES.map((theme) => {
              const isSelected = activeTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectPreset(theme)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 7px',
                    borderRadius: 'var(--radius-full)',
                    border: isSelected ? '1.5px solid var(--clay-500)' : '1px solid var(--sand-200)',
                    background: isSelected ? 'var(--clay-50)' : 'var(--sand-0)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: isSelected ? 'var(--weight-semibold)' : 'var(--weight-medium)',
                    color: 'var(--ink-800)',
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: theme.primary,
                      flexShrink: 0,
                    }}
                  />
                  {theme.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Single Levers for CSS Token Lines */}
        <div>
          <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--taupe-600)' }}>
            Token Levers
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {LEVERS.map(({ key, label, title }) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'space-between',
                  background: 'var(--sand-50)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--sand-100)',
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--ink-800)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <input
                  type="color"
                  value={customColors[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{
                    width: 22,
                    height: 22,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    flexShrink: 0,
                    borderRadius: 4,
                  }}
                  title={title}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Reset Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleReset}
            style={{ fontSize: '11px', padding: '2px 6px', height: 'auto' }}
          >
            Reset Palette
          </button>
        </div>
      </div>
    </div>
  );
}
