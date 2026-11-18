import './style.css';
import { appState, subscribeAppState } from './db.js';
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
  renderAuthStatusBanner,
  renderAccessGate,
  handleSubmitJoinCodeUI,
  handleCancelJoinRequestUI,
  handleRecheckAccessUI,
  dismissClaimedInviteNotice
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
  handleCopyJoinCodeUI,
  handleRotateJoinCodeUI,
  handleToggleJoinCodeActiveUI,
  handleImportLegacyUI,
  closeBetaImportModal,
  handleConfirmLocalBetaImport,
  handleBetaFileSelect,
  handleBetaSheetDbOrJsonImport
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
import {
  renderAdminDashboard,
  renderAdminNavBadge,
  setAdminSubTab,
  setAdminMemberRoleFilter,
  setAdminMemberSearch
} from './admin.js';
import { isClubAdmin } from './permissions.js';

let currentView = 'pitch';

export function switchView(view) {
  if (view === 'admin' && !isClubAdmin(appState.userProfile)) {
    view = 'pitch';
  }
  currentView = view;
  document.getElementById('view-pitch')?.classList.toggle('hidden', view !== 'pitch');
  document.getElementById('view-splitter')?.classList.toggle('hidden', view !== 'splitter');
  document.getElementById('view-stats')?.classList.toggle('hidden', view !== 'stats');
  document.getElementById('view-admin')?.classList.toggle('hidden', view !== 'admin');

  const btnPitch = document.getElementById('nav-pitch');
  const btnSplitter = document.getElementById('nav-splitter');
  const btnStats = document.getElementById('nav-stats');
  const btnAdmin = document.getElementById('nav-admin');

  const activeClass =
    'flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 font-bold text-[11px] bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 transition';
  const inactiveClass =
    'flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 font-semibold text-[11px] text-slate-400 hover:text-slate-200 border border-transparent transition';
  const adminActiveClass =
    'relative flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 font-bold text-[11px] bg-purple-600/25 text-purple-200 border border-purple-400/50 transition';
  const adminInactiveClass =
    'relative flex-1 py-1.5 px-1 rounded-lg flex flex-col items-center justify-center gap-0.5 font-semibold text-[11px] text-purple-300/80 hover:text-purple-200 border border-transparent transition';

  if (btnPitch) {
    btnPitch.className = view === 'pitch' ? activeClass : inactiveClass;
    btnPitch.setAttribute('aria-current', view === 'pitch' ? 'page' : 'false');
  }
  if (btnSplitter) {
    btnSplitter.className = view === 'splitter' ? activeClass : inactiveClass;
    btnSplitter.setAttribute('aria-current', view === 'splitter' ? 'page' : 'false');
  }
  if (btnStats) {
    btnStats.className = view === 'stats' ? activeClass : inactiveClass;
    btnStats.setAttribute('aria-current', view === 'stats' ? 'page' : 'false');
  }
  if (btnAdmin) {
    btnAdmin.className = view === 'admin' ? adminActiveClass : adminInactiveClass;
    btnAdmin.setAttribute('aria-current', view === 'admin' ? 'page' : 'false');
  }
  renderAdminNavBadge();

  if (view === 'pitch') {
    renderPitch();
  } else if (view === 'splitter') {
    renderSquadSplitter();
  } else if (view === 'admin') {
    renderAdminDashboard();
  } else {
    renderStats();
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
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
  handleCopyJoinCodeUI,
  handleRotateJoinCodeUI,
  handleToggleJoinCodeActiveUI,
  handleImportLegacyUI,
  closeBetaImportModal,
  handleConfirmLocalBetaImport,
  handleBetaFileSelect,
  handleBetaSheetDbOrJsonImport,
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
  handleDisconnectFirebaseUI,
  renderAccessGate,
  handleSubmitJoinCodeUI,
  handleCancelJoinRequestUI,
  handleRecheckAccessUI,
  dismissClaimedInviteNotice,
  renderAdminDashboard,
  renderAdminNavBadge,
  setAdminSubTab,
  setAdminMemberRoleFilter,
  setAdminMemberSearch
});

document.addEventListener('DOMContentLoaded', () => {
  subscribeAppState(() => {
    renderAuthStatusBanner();
    renderAccessGate();
    renderAdminNavBadge();
    renderPitch();
    renderMatchTimer();
    renderAdminCoachesPanel();
    if (currentView === 'admin' && !isClubAdmin(appState.userProfile)) {
      switchView('pitch');
      return;
    }
    if (currentView === 'splitter') {
      renderSquadSplitter();
    } else if (currentView === 'stats') {
      renderStats();
    } else if (currentView === 'admin') {
      renderAdminDashboard();
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
