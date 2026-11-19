export const UI_THEME_STORAGE_KEY = 'mdr_ui_theme';
export const UI_PREVIEW_DISMISSED_KEY = 'mdr_glass_banner_dismissed';

export const UI_THEMES = {
  CLASSIC: 'classic',
  GLASS: 'glass-turf'
};

const GLASS_ALIASES = new Set(['glass', 'glass-turf', 'new', 'v2', 'turf', 'preview']);
const CLASSIC_ALIASES = new Set(['classic', 'default', 'old', 'v1']);

/**
 * Pure theme normalizer (safe to run in Node tests without DOM).
 */
export function normalizeUiTheme(value) {
  if (!value || typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase();
  if (GLASS_ALIASES.has(cleaned)) return UI_THEMES.GLASS;
  if (CLASSIC_ALIASES.has(cleaned)) return UI_THEMES.CLASSIC;
  return null;
}

/**
 * Resolves the active UI theme with precedence:
 * 1. Explicit URL query param (?ui=glass or ?ui=classic)
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

export function getUiTheme() {
  if (typeof document === 'undefined') return UI_THEMES.CLASSIC;
  return normalizeUiTheme(document.documentElement?.dataset?.ui) || UI_THEMES.CLASSIC;
}

function updateThemeControlsUI(theme) {
  if (typeof document === 'undefined') return;
  const isGlass = theme === UI_THEMES.GLASS;

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isGlass ? '#061310' : '#0f172a');
  }

  const btn = document.getElementById('uiThemeToggleBtn');
  if (btn) {
    btn.setAttribute('aria-pressed', isGlass ? 'true' : 'false');
    btn.dataset.themeState = theme;
    if (isGlass) {
      btn.innerHTML = '<span>↩️</span><span>Classic</span>';
      btn.title = 'Switch back to Classic UI';
    } else {
      btn.innerHTML = '<span>✨</span><span>Glass</span>';
      btn.title = 'Try the new Matchday Glass & Turf UI preview';
    }
  }

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
  return normalized;
}

export function setUiTheme(theme) {
  const normalized = normalizeUiTheme(theme) || UI_THEMES.CLASSIC;
  if (normalized === UI_THEMES.GLASS) {
    try {
      sessionStorage.removeItem(UI_PREVIEW_DISMISSED_KEY);
    } catch (_) {}
  }
  return applyUiTheme(normalized, { persist: true });
}

export function toggleUiTheme() {
  const current = getUiTheme();
  const next = current === UI_THEMES.GLASS ? UI_THEMES.CLASSIC : UI_THEMES.GLASS;
  return setUiTheme(next);
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
