import {
  appState,
  getCurrentMatchDoc,
  getMatchPeriods,
  getPeriodShortLabel
} from './db.js';
import { setQuarter, openSwapModal } from './pitch.js';

const TIMER_STORAGE_KEY = 'matchday_live_timer_v1';

let timerInterval = null;
let wakeLockSentinel = null;
let wakeLockDesired = false;

function getTimerStateKey() {
  const match = getCurrentMatchDoc();
  return `${match.matchId}_p${appState.currentQuarter}`;
}

function loadAllTimers() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) {
    return {};
  }
}

function saveAllTimers(all) {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(all));
}

function getActivePeriodTimer() {
  const all = loadAllTimers();
  const key = getTimerStateKey();
  return (
    all[key] || {
      running: false,
      startedAt: null,
      accumulatedMs: 0,
      midAlertAcked: false,
      endAlertFired: false
    }
  );
}

function updateActivePeriodTimer(updates) {
  const all = loadAllTimers();
  const key = getTimerStateKey();
  const current = getActivePeriodTimer();
  all[key] = { ...current, ...updates };
  saveAllTimers(all);
  return all[key];
}

export function getElapsedMs() {
  const t = getActivePeriodTimer();
  if (!t.running || !t.startedAt) {
    return t.accumulatedMs || 0;
  }
  return (t.accumulatedMs || 0) + Math.max(0, Date.now() - t.startedAt);
}

/**
 * Milestone 12 helper: Returns current match period minute string (e.g. "06'")
 */
export function getCurrentMatchMinuteString() {
  const elapsedMs = getElapsedMs();
  if (elapsedMs <= 0) return '';
  const mins = Math.max(1, Math.ceil(elapsedMs / 60000));
  return `${mins}'`;
}

function formatMMSS(totalMs) {
  const totalSec = Math.floor(totalMs / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// --- MILESTONE 10: SCREEN WAKE LOCK API ---
export async function requestScreenWakeLock() {
  wakeLockDesired = true;
  if (!('wakeLock' in navigator)) {
    renderWakeLockButton();
    return false;
  }
  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
        renderWakeLockButton();
      });
    }
    renderWakeLockButton();
    return true;
  } catch (_) {
    renderWakeLockButton();
    return false;
  }
}

export async function releaseScreenWakeLock() {
  wakeLockDesired = false;
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch (_) {}
    wakeLockSentinel = null;
  }
  renderWakeLockButton();
}

export async function toggleScreenWakeLock() {
  if (wakeLockSentinel || wakeLockDesired) {
    await releaseScreenWakeLock();
  } else {
    await requestScreenWakeLock();
  }
}

function renderWakeLockButton() {
  const btn = document.getElementById('wakeLockBtn');
  if (!btn) return;
  const active = Boolean(wakeLockSentinel) || wakeLockDesired;
  if (active) {
    btn.className =
      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded font-bold text-[10px]';
    btn.innerText = '🔆 Awake';
  } else {
    btn.className =
      'bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded font-semibold text-[10px]';
    btn.innerText = '🔆 Keep Awake';
  }
}

function playSidelineBeep(frequencies = [880, 1174.66]) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.18 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + idx * 0.18);
      osc.stop(ctx.currentTime + idx * 0.18 + 0.17);
    });
  } catch (_) {}
}

function triggerHapticAndSound(type = 'mid') {
  try {
    if (navigator.vibrate) {
      if (type === 'mid') {
        navigator.vibrate([250, 120, 250]);
      } else {
        navigator.vibrate([350, 150, 350, 150, 500]);
      }
    }
  } catch (_) {}
  playSidelineBeep(type === 'mid' ? [880, 1174.66] : [987.77, 1318.51, 1567.98]);
}

export function toggleMatchTimer() {
  const t = getActivePeriodTimer();
  if (t.running) {
    // Pause
    const elapsed = getElapsedMs();
    updateActivePeriodTimer({
      running: false,
      startedAt: null,
      accumulatedMs: elapsed
    });
  } else {
    // Start / Resume -> also engage Screen Wake Lock automatically on the sideline!
    updateActivePeriodTimer({
      running: true,
      startedAt: Date.now()
    });
    requestScreenWakeLock();
  }
  ensureIntervalLoop();
  renderMatchTimer();
}

export function resetMatchTimer() {
  updateActivePeriodTimer({
    running: false,
    startedAt: null,
    accumulatedMs: 0,
    midAlertAcked: false,
    midSoundPlayed: false,
    endAlertFired: false
  });
  renderMatchTimer();
}

export function acknowledgeMidSubAlert(openSwap = false) {
  updateActivePeriodTimer({ midAlertAcked: true });
  renderMatchTimer();
  if (openSwap) {
    openSwapModal();
  }
}

export function advanceToNextPeriodFromTimer() {
  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const nextP = appState.currentQuarter + 1;
  if (nextP <= periods.length) {
    setQuarter(nextP);
    renderMatchTimer();
  }
}

function ensureIntervalLoop() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    const t = getActivePeriodTimer();
    if (t.running) {
      renderMatchTimer();
    }
  }, 500);
}

export function initMatchTimer() {
  ensureIntervalLoop();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (wakeLockDesired) {
        requestScreenWakeLock();
      }
      renderMatchTimer();
    }
  });
  renderMatchTimer();
}

export function renderMatchTimer() {
  renderWakeLockButton();
  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const periodCount = periods.length;
  const curPeriod = appState.currentQuarter;
  const periodLabel = getPeriodShortLabel(curPeriod, periodCount);

  const periodMins = parseFloat(match.qtrMins) || 12;
  const targetMs = periodMins * 60 * 1000;
  const midMs = targetMs / 2;

  const t = getActivePeriodTimer();
  const elapsedMs = getElapsedMs();
  const pct = Math.min(100, (elapsedMs / targetMs) * 100);

  // Check if we just crossed the 50% Mid-Period mark or 100% Full-Period mark
  const isAtOrPastMid = elapsedMs >= midMs && elapsedMs < targetMs;
  const isAtOrPastFull = elapsedMs >= targetMs;

  if (isAtOrPastMid && !t.midAlertAcked && t.running && !t.midSoundPlayed) {
    updateActivePeriodTimer({ midSoundPlayed: true });
    triggerHapticAndSound('mid');
  }

  if (isAtOrPastFull && !t.endAlertFired && t.running) {
    updateActivePeriodTimer({ endAlertFired: true });
    triggerHapticAndSound('end');
  }

  // Update DOM Elements
  const badgeEl = document.getElementById('timerPeriodBadge');
  const readoutEl = document.getElementById('timerDigitalReadout');
  const targetEl = document.getElementById('timerTargetReadout');
  const subAtEl = document.getElementById('timerMidSubTarget');
  const toggleBtn = document.getElementById('timerToggleBtn');
  const progressBar = document.getElementById('timerProgressBar');
  const alertBanner = document.getElementById('timerAlertBanner');

  if (badgeEl) badgeEl.innerText = `⏱️ ${periodLabel}`;
  if (readoutEl) {
    readoutEl.innerText = formatMMSS(elapsedMs);
    readoutEl.className = isAtOrPastFull
      ? 'font-mono font-extrabold text-base text-rose-400'
      : isAtOrPastMid
      ? 'font-mono font-extrabold text-base text-amber-400'
      : 'font-mono font-extrabold text-base text-white';
  }
  if (targetEl) targetEl.innerText = `/ ${formatMMSS(targetMs)}`;
  if (subAtEl) subAtEl.innerText = `50% Sub @ ${formatMMSS(midMs)}`;

  if (toggleBtn) {
    if (t.running) {
      toggleBtn.innerText = '⏸ Pause';
      toggleBtn.className =
        'bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded font-bold text-xs shadow';
    } else {
      toggleBtn.innerText = elapsedMs > 0 ? '▶ Resume' : '▶ Start';
      toggleBtn.className =
        'bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded font-bold text-xs shadow';
    }
  }

  if (progressBar) {
    progressBar.style.width = `${pct.toFixed(1)}%`;
    progressBar.className = isAtOrPastFull
      ? 'h-full bg-rose-500 transition-all duration-300'
      : isAtOrPastMid
      ? 'h-full bg-amber-400 transition-all duration-300'
      : 'h-full bg-emerald-500 transition-all duration-300';
  }

  if (alertBanner) {
    if (isAtOrPastFull) {
      const hasNext = curPeriod < periodCount;
      const nextLabel = getPeriodShortLabel(curPeriod + 1, periodCount);
      alertBanner.classList.remove('hidden');
      alertBanner.className =
        'mt-2 pt-2 border-t border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-200';
      alertBanner.innerHTML = `
        <span class="font-bold">🏁 Full Time Reached for ${periodLabel}!</span>
        <div class="flex gap-1.5">
          ${
            hasNext
              ? `<button onclick="advanceToNextPeriodFromTimer()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">⏭️ Go to ${nextLabel}</button>`
              : ''
          }
          <button onclick="resetMatchTimer()" class="bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded text-[11px]">Reset</button>
        </div>
      `;
    } else if (isAtOrPastMid && !t.midAlertAcked) {
      alertBanner.classList.remove('hidden');
      alertBanner.className =
        'mt-2 pt-2 border-t border-amber-500/40 flex items-center justify-between gap-2 text-xs text-amber-200 animate-pulse';
      alertBanner.innerHTML = `
        <span class="font-bold">🔔 50% Mid-${periodLabel} Sub Window Due!</span>
        <div class="flex gap-1.5">
          <button onclick="acknowledgeMidSubAlert(true)" class="bg-amber-600 hover:bg-amber-500 text-white px-2.5 py-1 rounded font-bold text-[11px] shadow">🔄 Make Sub</button>
          <button onclick="acknowledgeMidSubAlert(false)" class="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded text-[11px]">Dismiss</button>
        </div>
      `;
    } else {
      alertBanner.classList.add('hidden');
      alertBanner.innerHTML = '';
    }
  }
}
