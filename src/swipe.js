/**
 * Mobile Horizontal Swipe Navigation between Primary Bottom-Nav Views
 * Order: Pitch -> Splitter -> Stats -> Admin (filtered dynamically by RBAC tab visibility)
 * - Swipe Left  (dx < -65px) => move to next tab on the right (e.g. Pitch -> Splitter)
 * - Swipe Right (dx > +65px) => move back to previous tab on the left (e.g. Splitter -> Pitch)
 */

const MODAL_IDS = ['swapModal', 'eventModal', 'betaImportModal', 'authModal', 'accessGateModal'];

export function resolveSwipeNavigation({
  currentView,
  dx,
  dy,
  durationMs = 200,
  visibleViews = ['pitch', 'splitter', 'stats'],
  minDistance = 65,
  maxDurationMs = 650,
  dominanceRatio = 1.6
} = {}) {
  if (!Array.isArray(visibleViews) || visibleViews.length < 2) return null;
  if (durationMs > maxDurationMs) return null;

  const absX = Math.abs(dx || 0);
  const absY = Math.abs(dy || 0);
  if (absX < minDistance) return null;
  if (absX <= absY * dominanceRatio) return null;

  const currentIdx = visibleViews.indexOf(currentView);
  if (currentIdx === -1) return null;

  const delta = dx < 0 ? 1 : -1;
  const nextIdx = currentIdx + delta;
  if (nextIdx < 0 || nextIdx >= visibleViews.length) return null;

  return visibleViews[nextIdx];
}

function isAnyModalOpen() {
  return MODAL_IDS.some(id => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden');
  });
}

function shouldIgnoreSwipeTarget(target) {
  if (!target || typeof target.closest !== 'function') return false;
  if (target.closest('input, textarea, select, [data-no-swipe]')) {
    return true;
  }

  // Do not hijack horizontal table scrolling (e.g., narrow-screen Stats table)
  let node = target;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 6) {
      const style = window.getComputedStyle(node);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    node = node.parentElement;
  }
  return false;
}

export function initSwipeNavigation({ getCurrentView, getVisibleViews, onSwitchView }) {
  if (typeof document === 'undefined') return;
  const mainEl = document.querySelector('main');
  if (!mainEl) return;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let tracking = false;

  mainEl.addEventListener(
    'touchstart',
    e => {
      if (!e.touches || e.touches.length !== 1) {
        tracking = false;
        return;
      }
      if (isAnyModalOpen() || shouldIgnoreSwipeTarget(e.target)) {
        tracking = false;
        return;
      }
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
      tracking = true;
    },
    { passive: true }
  );

  mainEl.addEventListener(
    'touchcancel',
    () => {
      tracking = false;
    },
    { passive: true }
  );

  mainEl.addEventListener(
    'touchend',
    e => {
      if (!tracking || !e.changedTouches || e.changedTouches.length !== 1) {
        tracking = false;
        return;
      }
      tracking = false;
      if (isAnyModalOpen()) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const durationMs = Date.now() - startTime;

      const nextView = resolveSwipeNavigation({
        currentView: getCurrentView(),
        dx,
        dy,
        durationMs,
        visibleViews: getVisibleViews()
      });

      if (nextView && typeof onSwitchView === 'function') {
        onSwitchView(nextView);
      }
    },
    { passive: true }
  );
}
