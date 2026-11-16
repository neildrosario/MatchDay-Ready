import './style.css';
import { subscribeAppState } from './db.js';
import {
  initAuth,
  showAuthModal,
  hideAuthModal,
  toggleAuthMode,
  handleEmailAuthSubmit,
  handleGoogleSignIn,
  useLocalSandboxCoach,
  handleLogout,
  handleSaveFirebaseConfigUI,
  handleDisconnectFirebaseUI,
  renderAuthStatusBanner
} from './auth.js';
import {
  renderPitch,
  setQuarter,
  onTeamSelectChange,
  onDateInputChange,
  onConfigQtrMinsChange,
  onPeriodCountChange,
  onFormationChange,
  onTacticalShapeChange,
  applyShapeToAllQuarters,
  onOppositionInputChange,
  openSwapModal,
  closeSwapModal,
  executeSwap,
  clearSwaps,
  openEventModal,
  closeEventModal,
  onEventTypeSelectChange,
  executeLogEvent,
  autoGenerateMatch,
  copyPreviousQuarter
} from './pitch.js';
import {
  renderStats,
  renderAdminCoachesPanel,
  handleAddPlayerUI,
  handleBulkAddPlayersUI,
  handleClearTeamPlayersUI,
  handleCreateTeamUI,
  handleInviteCoachUI,
  handleImportLegacyUI
} from './stats.js';
import {
  renderSquadSplitter,
  autoSplitAgeGroupPlayers,
  resetSplitterToPrimary,
  handleQuickAddAgeGroupTeam,
  handlePublishSquadSplit,
  copySquadSplitWhatsApp
} from './splitter.js';
import { exportTeamSheet } from './export.js';
import {
  initMatchTimer,
  renderMatchTimer,
  toggleMatchTimer,
  resetMatchTimer,
  acknowledgeMidSubAlert,
  advanceToNextPeriodFromTimer,
  toggleScreenWakeLock,
  getCurrentMatchMinuteString
} from './timer.js';

let currentView = 'pitch';

export function switchView(view) {
  currentView = view;
  document.getElementById('view-pitch')?.classList.toggle('hidden', view !== 'pitch');
  document.getElementById('view-splitter')?.classList.toggle('hidden', view !== 'splitter');
  document.getElementById('view-stats')?.classList.toggle('hidden', view !== 'stats');

  const btnPitch = document.getElementById('nav-pitch');
  const btnSplitter = document.getElementById('nav-splitter');
  const btnStats = document.getElementById('nav-stats');

  const activeClass =
    'flex-1 py-2 text-center font-bold text-xs rounded bg-emerald-600 text-white shadow';
  const inactiveClass =
    'flex-1 py-2 text-center font-bold text-xs rounded bg-slate-900 text-slate-400';

  if (btnPitch) btnPitch.className = view === 'pitch' ? activeClass : inactiveClass;
  if (btnSplitter) btnSplitter.className = view === 'splitter' ? activeClass : inactiveClass;
  if (btnStats) btnStats.className = view === 'stats' ? activeClass : inactiveClass;

  if (view === 'pitch') {
    renderPitch();
  } else if (view === 'splitter') {
    renderSquadSplitter();
  } else {
    renderStats();
  }
}

// Expose global UI actions for inline attributes or direct inspection
Object.assign(window, {
  switchView,
  setQuarter,
  onTeamSelectChange,
  onDateInputChange,
  onConfigQtrMinsChange,
  onPeriodCountChange,
  onFormationChange,
  onTacticalShapeChange,
  applyShapeToAllQuarters,
  onOppositionInputChange,
  openSwapModal,
  closeSwapModal,
  executeSwap,
  clearSwaps,
  openEventModal,
  closeEventModal,
  onEventTypeSelectChange,
  executeLogEvent,
  autoGenerateMatch,
  copyPreviousQuarter,
  renderStats,
  renderAdminCoachesPanel,
  handleAddPlayerUI,
  handleBulkAddPlayersUI,
  handleClearTeamPlayersUI,
  handleCreateTeamUI,
  handleInviteCoachUI,
  handleImportLegacyUI,
  renderSquadSplitter,
  autoSplitAgeGroupPlayers,
  resetSplitterToPrimary,
  handleQuickAddAgeGroupTeam,
  handlePublishSquadSplit,
  copySquadSplitWhatsApp,
  exportTeamSheet,
  toggleMatchTimer,
  resetMatchTimer,
  acknowledgeMidSubAlert,
  advanceToNextPeriodFromTimer,
  toggleScreenWakeLock,
  getCurrentMatchMinuteString,
  renderMatchTimer,
  showAuthModal,
  hideAuthModal,
  toggleAuthMode,
  handleEmailAuthSubmit,
  handleGoogleSignIn,
  useLocalSandboxCoach,
  handleLogout,
  handleSaveFirebaseConfigUI,
  handleDisconnectFirebaseUI
});

document.addEventListener('DOMContentLoaded', () => {
  subscribeAppState(() => {
    renderAuthStatusBanner();
    renderPitch();
    renderMatchTimer();
    renderAdminCoachesPanel();
    if (currentView === 'splitter') {
      renderSquadSplitter();
    } else if (currentView === 'stats') {
      renderStats();
    }
  });

  initAuth();
  initMatchTimer();
  renderPitch();

  // Register PWA Service Worker (Milestone 10)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
});
