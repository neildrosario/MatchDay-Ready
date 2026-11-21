/**
 * MatchDay Ready — "Neo" UI layer (light, neo-bank style).
 *
 * Purely presentational: every floating control proxies a click to the
 * EXISTING button in the DOM, so RBAC (hidden/disabled states), business
 * logic and data flows stay exactly as they are in Classic / Glass.
 * Nothing here runs visually unless html[data-ui="neo"] is active.
 */
import { getUiTheme, UI_THEMES } from './theme.js';

const ACTION_SOURCES = {
  autofair: '[data-neo-src="autofair"]',
  midsub: '[data-neo-src="midsub"]',
  event: '[data-neo-src="event"]',
  share: '[data-neo-src="share"]'
};

export function isNeoActive() {
  return getUiTheme() === UI_THEMES.NEO;
}

export function isAnimatedUiActive() {
  const theme = getUiTheme();
  return theme === UI_THEMES.NEO || theme === UI_THEMES.GLASS;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (_) {
    return false;
  }
}

/** Pure helper (unit-tested): slide direction between two bottom-nav views. */
export function getViewTransitionDirection(prevView, nextView, visibleViews = []) {
  const from = visibleViews.indexOf(prevView);
  const to = visibleViews.indexOf(nextView);
  if (from === -1 || to === -1 || from === to) return 'none';
  return to > from ? 'forward' : 'back';
}

/**
 * Runs a DOM update inside a View Transition when Neo or Glass & Turf is active
 * and supported. Falls back to an immediate synchronous update everywhere else.
 */
export function runNeoViewTransition(update, { direction = 'none' } = {}) {
  const canAnimate =
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    direction !== 'none' &&
    isAnimatedUiActive() &&
    !prefersReducedMotion();

  if (!canAnimate) {
    update();
    return;
  }

  const root = document.documentElement;
  root.dataset.navDir = direction;
  try {
    const vt = document.startViewTransition(update);
    vt.finished.finally(() => {
      if (root.dataset.navDir === direction) delete root.dataset.navDir;
    });
  } catch (_) {
    delete root.dataset.navDir;
    update();
  }
}

/* --------------------------------------------------------------------------
   Element visibility helper (respects RBAC-driven .hidden / disabled states,
   ignoring outer view containers like #view-pitch during view switches)
   -------------------------------------------------------------------------- */
export function isSourceUsable(el) {
  if (!el || el.disabled) return false;
  if (typeof el.closest === 'function') {
    const hiddenAncestor = el.closest('.hidden:not([id^="view-"])');
    if (hiddenAncestor) return false;
  }
  return true;
}

/* --------------------------------------------------------------------------
   1. Speed-Dial Floating Action Button
   -------------------------------------------------------------------------- */
function initFab() {
  const fab = document.getElementById('neoFab');
  const toggle = document.getElementById('neoFabToggle');
  if (!fab || !toggle) return;

  const setOpen = open => {
    fab.dataset.open = open ? 'true' : 'false';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      refreshFabAvailability();
      try {
        navigator.vibrate?.(8);
      } catch (_) {}
    }
  };

  toggle.addEventListener('click', () => setOpen(fab.dataset.open !== 'true'));
  fab.querySelector('[data-neo-fab-close]')?.addEventListener('click', () => setOpen(false));

  fab.querySelectorAll('[data-neo-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-neo-action');
      const src = document.querySelector(ACTION_SOURCES[key]);
      setOpen(false);
      if (isSourceUsable(src)) src.click();
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && fab.dataset.open === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener('mdr:themechange', () => {
    setOpen(false);
    refreshFabAvailability();
  });
}

function refreshFabAvailability() {
  const fab = document.getElementById('neoFab');
  if (!fab) return;
  let anyUsable = false;
  fab.querySelectorAll('[data-neo-action]').forEach(btn => {
    const src = document.querySelector(ACTION_SOURCES[btn.getAttribute('data-neo-action')]);
    const usable = isSourceUsable(src);
    btn.hidden = !usable;
    anyUsable = anyUsable || usable;
  });
  fab.dataset.empty = anyUsable ? 'false' : 'true';
}

/* --------------------------------------------------------------------------
   2. Floating Mini Timer Pill (mirrors the live timer card)
   -------------------------------------------------------------------------- */
function initMiniTimer() {
  const pill = document.getElementById('neoMiniTimer');
  const card = document.getElementById('timerCard');
  const readout = document.getElementById('timerDigitalReadout');
  const badge = document.getElementById('timerPeriodBadge');
  const srcToggle = document.getElementById('timerToggleBtn');
  const pillReadout = document.getElementById('neoMiniTimerReadout');
  const pillPeriod = document.getElementById('neoMiniTimerPeriod');
  const pillToggle = document.getElementById('neoMiniTimerToggle');
  const pillJump = document.getElementById('neoMiniTimerJump');
  if (!pill || !card || !readout || !pillReadout) return;

  const sync = () => {
    pillReadout.textContent = readout.textContent.trim() || '00:00';
    if (badge && pillPeriod) {
      pillPeriod.textContent = badge.textContent.replace('⏱️', '').trim() || 'Q1';
    }
    const cls = readout.className || '';
    pill.dataset.state = cls.includes('rose') ? 'full' : cls.includes('amber') ? 'mid' : 'idle';

    if (srcToggle && pillToggle) {
      const running = /pause/i.test(srcToggle.textContent || '');
      pill.dataset.running = running ? 'true' : 'false';
      pillToggle.textContent = running ? '⏸' : '▶';
      pillToggle.setAttribute('aria-label', running ? 'Pause match timer' : 'Start match timer');
      pillToggle.hidden = !isSourceUsable(srcToggle);
    }
  };

  const mo = new MutationObserver(sync);
  [readout, badge, srcToggle].filter(Boolean).forEach(el =>
    mo.observe(el, { childList: true, characterData: true, subtree: true, attributes: true })
  );
  sync();

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      entries => {
        const entry = entries[entries.length - 1];
        pill.dataset.visible = entry.isIntersecting ? 'false' : 'true';
      },
      { rootMargin: '-96px 0px -96px 0px', threshold: 0 }
    );
    io.observe(card);
  }

  pillToggle?.addEventListener('click', e => {
    e.stopPropagation();
    if (isSourceUsable(srcToggle)) srcToggle.click();
  });
  pillJump?.addEventListener('click', () => {
    card.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
  });
}

/* --------------------------------------------------------------------------
   3. Sliding Bottom-Dock Indicator
   -------------------------------------------------------------------------- */
function initNavIndicator() {
  const nav = document.getElementById('bottomNav');
  const track = nav?.firstElementChild;
  if (!nav || !track) return;

  let indicator = document.getElementById('neoNavIndicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.id = 'neoNavIndicator';
    indicator.setAttribute('aria-hidden', 'true');
    track.prepend(indicator);
  }

  let raf = 0;
  const update = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const active = track.querySelector('button[aria-current="page"]:not(.hidden)');
      if (!active || !active.offsetWidth) {
        indicator.style.opacity = '0';
        return;
      }
      indicator.style.opacity = '1';
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.height = `${active.offsetHeight}px`;
      indicator.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      indicator.dataset.tab = active.id || '';
    });
  };

  const mo = new MutationObserver(update);
  track.querySelectorAll('button').forEach(btn =>
    mo.observe(btn, { attributes: true, attributeFilter: ['aria-current', 'class'] })
  );
  window.addEventListener('resize', update, { passive: true });
  window.addEventListener('mdr:themechange', update);
  update();
}

/* --------------------------------------------------------------------------
   Public init + per-view sync
   -------------------------------------------------------------------------- */
export function syncNeoView(view) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.view = view;
  const fab = document.getElementById('neoFab');
  if (fab && view !== 'pitch' && fab.dataset.open === 'true') {
    fab.dataset.open = 'false';
    document.getElementById('neoFabToggle')?.setAttribute('aria-expanded', 'false');
  }
  if (view === 'pitch') refreshFabAvailability();
}

export function initNeoUi({ getCurrentView } = {}) {
  if (typeof document === 'undefined') return;
  initFab();
  initMiniTimer();
  initNavIndicator();
  syncNeoView(typeof getCurrentView === 'function' ? getCurrentView() : 'pitch');

  // Keep FAB items in step with RBAC-driven toolbar visibility
  const toolbar = document.getElementById('pitchActionToolbar');
  if (toolbar) {
    new MutationObserver(refreshFabAvailability).observe(toolbar, {
      attributes: true,
      attributeFilter: ['class']
    });
  }
}
