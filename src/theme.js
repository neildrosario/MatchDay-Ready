export const UI_THEME_STORAGE_KEY = 'mdr_ui_theme';
export const UI_PREVIEW_DISMISSED_KEY = 'mdr_glass_banner_dismissed';

export const UI_THEMES = {
  CLASSIC: 'classic',
  GLASS: 'glass-turf',
  NEO: 'neo'
};

/** Ordered list powering the header theme picker (and cycle toggle). */
export const UI_THEME_OPTIONS = [
  { id: UI_THEMES.CLASSIC, label: 'Classic', icon: '🌙', description: 'Original dark sideline UI' },
  { id: UI_THEMES.GLASS, label: 'Glass & Turf', icon: '✨', description: 'Frosted stadium glass' },
  { id: UI_THEMES.NEO, label: 'Neo', icon: '⚡', description: 'Light, fluid neo-bank style' }
];

const THEME_COLORS = {
  [UI_THEMES.CLASSIC]: '#0f172a',
  [UI_THEMES.GLASS]: '#061310',
  [UI_THEMES.NEO]: '#f4f5f7'
};

const GLASS_ALIASES = new Set(['glass', 'glass-turf', 'new', 'v2', 'turf', 'preview']);
const CLASSIC_ALIASES = new Set(['classic', 'default', 'old', 'v1']);
const NEO_ALIASES = new Set(['neo', 'bank', 'neo-bank', 'neobank', 'light', 'v3']);

/**
 * Pure theme normalizer (safe to run in Node tests without DOM).
 */
export function normalizeUiTheme(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  if (NEO_ALIASES.has(cleaned)) return UI_THEMES.NEO;
  if (GLASS_ALIASES.has(cleaned)) return UI_THEMES.GLASS;
  if (CLASSIC_ALIASES.has(cleaned)) return UI_THEMES.CLASSIC;
  return null;
}

/**
 * Resolves the active UI theme with precedence:
 * 1. Explicit URL query param (?ui=glass | ?ui=neo | ?ui=classic)
 * 2. Stored user preference (localStorage)
 * 3. Default: 'classic' (zero disruption for existing users)
 */
export function resolveUiTheme({ search = '', storedTheme = null } = {}) {
  try {
    if (search) {
      const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
      const fromUrl = normalizeUiTheme(params.get('ui'));
      if (fromUrl) return fromUrl;
    }
  } catch (_) {}

  const fromStorage = normalizeUiTheme(storedTheme);
  if (fromStorage) return fromStorage;

  return UI_THEMES.CLASSIC;
}

/** Pure helper: next theme in the picker order (wraps around). */
export function getNextUiTheme(current) {
  const normalized = normalizeUiTheme(current) || UI_THEMES.CLASSIC;
  const idx = UI_THEME_OPTIONS.findIndex(o => o.id === normalized);
  return UI_THEME_OPTIONS[(idx + 1) % UI_THEME_OPTIONS.length].id;
}

export function getUiTheme() {
  if (typeof document === 'undefined') return UI_THEMES.CLASSIC;
  return normalizeUiTheme(document.documentElement?.dataset?.ui) || UI_THEMES.CLASSIC;
}

function updateThemeControlsUI(theme) {
  if (typeof document === 'undefined') return;
  const isGlass = theme === UI_THEMES.GLASS;
  const option = UI_THEME_OPTIONS.find(o => o.id === theme) || UI_THEME_OPTIONS[0];

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS[UI_THEMES.CLASSIC]);
  }

  const btn = document.getElementById('uiThemeToggleBtn');
  if (btn) {
    btn.dataset.themeState = theme;
    btn.innerHTML = `<span aria-hidden="true">${option.icon}</span><span>${option.id === UI_THEMES.GLASS ? 'Glass' : option.label}</span><span aria-hidden="true" class="opacity-70">▾</span>`;
    btn.title = `UI style: ${option.label} (tap to change)`;
  }

  document.querySelectorAll('[data-theme-option]').forEach(el => {
    const active = el.getAttribute('data-theme-option') === theme;
    el.setAttribute('aria-checked', active ? 'true' : 'false');
    el.dataset.active = active ? 'true' : 'false';
  });

  const banner = document.getElementById('glassPreviewBanner');
  if (banner) {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(UI_PREVIEW_DISMISSED_KEY) === '1';
    } catch (_) {}
    banner.classList.toggle('hidden', !isGlass || dismissed);
  }
}

export function applyUiTheme(theme, { persist = true } = {}) {
  const normalized = normalizeUiTheme(theme) || UI_THEMES.CLASSIC;
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.ui = normalized;
  }
  if (persist) {
    try {
      localStorage.setItem(UI_THEME_STORAGE_KEY, normalized);
    } catch (_) {}
  }
  updateThemeControlsUI(normalized);
  if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
    window.dispatchEvent(new CustomEvent('mdr:themechange', { detail: { theme: normalized } }));
  }
  return normalized;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

export function setUiTheme(theme) {
  const normalized = normalizeUiTheme(theme) || UI_THEMES.CLASSIC;
  if (normalized === UI_THEMES.GLASS) {
    try {
      sessionStorage.removeItem(UI_PREVIEW_DISMISSED_KEY);
    } catch (_) {}
  }

  const picker = typeof document !== 'undefined' ? document.getElementById('uiThemePicker') : null;
  try {
    if (picker && picker.matches(':popover-open')) picker.hidePopover();
  } catch (_) {}

  // Smooth cross-fade between themes where View Transitions are supported
  if (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    normalized !== getUiTheme() &&
    !prefersReducedMotion()
  ) {
    document.documentElement.dataset.themeSwitching = 'true';
    const vt = document.startViewTransition(() => applyUiTheme(normalized, { persist: true }));
    vt.finished.finally(() => {
      delete document.documentElement.dataset.themeSwitching;
    });
    return normalized;
  }
  return applyUiTheme(normalized, { persist: true });
}

export function toggleUiTheme() {
  return setUiTheme(getNextUiTheme(getUiTheme()));
}

export function dismissGlassPreviewBanner() {
  try {
    sessionStorage.setItem(UI_PREVIEW_DISMISSED_KEY, '1');
  } catch (_) {}
  const banner = document.getElementById('glassPreviewBanner');
  if (banner) banner.classList.add('hidden');
}

export function initUiTheme() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return UI_THEMES.CLASSIC;
  }

  let stored = null;
  try {
    stored = localStorage.getItem(UI_THEME_STORAGE_KEY);
  } catch (_) {}

  const search = window.location?.search || '';
  const urlParamTheme = (() => {
    try {
      return normalizeUiTheme(new URLSearchParams(search).get('ui'));
    } catch (_) {
      return null;
    }
  })();

  const resolved = resolveUiTheme({ search, storedTheme: stored });
  return applyUiTheme(resolved, { persist: Boolean(urlParamTheme) });
}
