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
  onFormationChange,
  onOppositionInputChange,
  openSwapModal,
  closeSwapModal,
  executeSwap,
  clearSwaps,
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
import { exportTeamSheet } from './export.js';

let currentView = 'pitch';

export function switchView(view) {
  currentView = view;
  document.getElementById('view-pitch')?.classList.toggle('hidden', view !== 'pitch');
  document.getElementById('view-stats')?.classList.toggle('hidden', view !== 'stats');

  const btnPitch = document.getElementById('nav-pitch');
  const btnStats = document.getElementById('nav-stats');

  if (view === 'pitch') {
    if (btnPitch)
      btnPitch.className =
        'flex-1 py-2 text-center font-bold text-xs rounded bg-emerald-600 text-white shadow';
    if (btnStats)
      btnStats.className =
        'flex-1 py-2 text-center font-bold text-xs rounded bg-slate-900 text-slate-400';
    renderPitch();
  } else {
    if (btnStats)
      btnStats.className =
        'flex-1 py-2 text-center font-bold text-xs rounded bg-emerald-600 text-white shadow';
    if (btnPitch)
      btnPitch.className =
        'flex-1 py-2 text-center font-bold text-xs rounded bg-slate-900 text-slate-400';
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
  onFormationChange,
  onOppositionInputChange,
  openSwapModal,
  closeSwapModal,
  executeSwap,
  clearSwaps,
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
  exportTeamSheet,
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
    renderAdminCoachesPanel();
    if (currentView === 'stats') {
      renderStats();
    }
  });

  initAuth();
  renderPitch();
});
