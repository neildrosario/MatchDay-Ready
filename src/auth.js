import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import {
  getFirebaseServices,
  isFirebaseConfigured,
  saveRuntimeFirebaseConfig,
  clearRuntimeFirebaseConfig
} from './firebase.js';
import {
  appState,
  ensureUserAndClubSeeded,
  startFirestoreSubscriptions,
  clearFirestoreSubscriptions,
  hydrateAppStateFromLocalStore,
  submitJoinCodeRequest,
  cancelPendingJoinRequest,
  registerNewClub,
  switchActiveClub,
  claimAdditionalInvite,
  getUserClubMemberships,
  normalizeJoinCode,
  notifyAppState
} from './db.js';
import { getRoleMeta, isViewer } from './permissions.js';

let authMode = 'login'; // 'login' | 'signup'
let clubHubOpenManually = false;
let onboardingTab = 'join'; // 'join' | 'create'

function getJoinCodeFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeJoinCode(params.get('code') || params.get('join') || '');
  } catch (_) {
    return '';
  }
}

export function initAuth() {
  const { auth, configured } = getFirebaseServices();

  if (!configured || !auth) {
    // Run in multi-tenant local club mode until Firebase config is added
    appState.currentUser = {
      uid: 'local_coach_1',
      email: 'neil@straffanafc.ie',
      displayName: "Neil D'Rosario"
    };
    hydrateAppStateFromLocalStore();
    renderAuthStatusBanner();
    renderAccessGate();
    return;
  }

  onAuthStateChanged(auth, async user => {
    if (user) {
      appState.currentUser = user;
      hideAuthModal();
      try {
        const res = await ensureUserAndClubSeeded(user);
        if (res?.accessStatus === 'ready') {
          startFirestoreSubscriptions(user);
        }
      } catch (e) {
        console.error('Error initializing club data in Firestore:', e);
        appState.accessStatus = 'needs_onboarding';
        appState.syncState = 'error';
        notifyAppState();
      }
    } else {
      clearFirestoreSubscriptions();
      appState.currentUser = null;
      appState.userProfile = null;
      appState.accessStatus = 'ready';
      appState.pendingJoinRequest = null;
      showAuthModal();
    }
    renderAuthStatusBanner();
    renderAccessGate();
  });
}

export function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');
}

export function hideAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

export function toggleAuthMode(mode) {
  authMode = mode;
  const titleEl = document.getElementById('authModalTitle');
  const nameWrap = document.getElementById('authNameWrapper');
  const submitBtn = document.getElementById('authSubmitBtn');
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');

  if (mode === 'signup') {
    if (titleEl) titleEl.innerText = 'Register Coach Account';
    if (nameWrap) nameWrap.classList.remove('hidden');
    if (submitBtn) submitBtn.innerText = 'Create Coach Account';
    if (tabSignup) tabSignup.className = 'flex-1 py-1.5 rounded font-bold text-xs bg-emerald-600 text-white';
    if (tabLogin) tabLogin.className = 'flex-1 py-1.5 rounded font-bold text-xs text-slate-400';
  } else {
    if (titleEl) titleEl.innerText = 'Coach Sign In';
    if (nameWrap) nameWrap.classList.add('hidden');
    if (submitBtn) submitBtn.innerText = 'Sign In';
    if (tabLogin) tabLogin.className = 'flex-1 py-1.5 rounded font-bold text-xs bg-emerald-600 text-white';
    if (tabSignup) tabSignup.className = 'flex-1 py-1.5 rounded font-bold text-xs text-slate-400';
  }
}

export async function handleEmailAuthSubmit(event) {
  if (event) event.preventDefault();
  const { auth, configured } = getFirebaseServices();
  const email = document.getElementById('authEmailInput')?.value.trim();
  const password = document.getElementById('authPasswordInput')?.value;
  const displayName = document.getElementById('authNameInput')?.value.trim();
  const errEl = document.getElementById('authErrorText');

  if (errEl) errEl.classList.add('hidden');

  if (!configured || !auth) {
    useLocalSandboxCoach(displayName || email || 'Straffan Coach');
    return;
  }

  if (!email || !password) {
    if (errEl) {
      errEl.innerText = 'Please enter both email and password.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  try {
    if (authMode === 'signup') {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    hideAuthModal();
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Authentication failed.';
      errEl.classList.remove('hidden');
    }
  }
}

export async function handleGoogleSignIn() {
  const { auth, googleProvider, configured } = getFirebaseServices();
  const errEl = document.getElementById('authErrorText');
  if (errEl) errEl.classList.add('hidden');

  if (!configured || !auth) {
    if (errEl) {
      errEl.innerText = 'Configure your Firebase Project keys first to use Google Sign-In, or use Local Sandbox Mode.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  try {
    await signInWithPopup(auth, googleProvider);
    hideAuthModal();
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Google Sign-In failed.';
      errEl.classList.remove('hidden');
    }
  }
}

export function useLocalSandboxCoach(name = "Neil D'Rosario") {
  clearFirestoreSubscriptions();
  appState.currentUser = {
    uid: 'local_coach_1',
    email: 'neil@straffanafc.ie',
    displayName: name
  };
  hideAuthModal();
  hydrateAppStateFromLocalStore();
  renderAuthStatusBanner();
  renderAccessGate();
}

export async function handleLogout() {
  const { auth, configured } = getFirebaseServices();
  if (configured && auth && appState.mode === 'firebase') {
    await signOut(auth);
  } else {
    showAuthModal();
  }
}

export function handleSaveFirebaseConfigUI() {
  const raw = document.getElementById('firebaseConfigInput')?.value || '';
  if (!raw.trim()) {
    alert('Please paste your Firebase configuration JSON or object.');
    return;
  }
  try {
    saveRuntimeFirebaseConfig(raw);
    alert('✅ Firebase Configuration saved! Reloading app to connect to Firebase Auth & Firestore...');
    window.location.reload();
  } catch (e) {
    alert(`Invalid Firebase config: ${e.message}`);
  }
}

export function handleDisconnectFirebaseUI() {
  if (!confirm('Switch back to Local Club Mode? (Your local data remains intact).')) return;
  clearRuntimeFirebaseConfig();
  window.location.reload();
}

// --- MILESTONE 13 & 15: MULTI-CLUB ACCESS GATE, SELF-ONBOARDING & CLUB SWITCHER ---

export function openClubHubModal(defaultTab = 'join') {
  clubHubOpenManually = true;
  onboardingTab = defaultTab;
  hideAuthModal();
  renderAccessGate();
}

export function closeClubHubModal() {
  clubHubOpenManually = false;
  renderAccessGate();
}

export function toggleOnboardingTab(tab) {
  onboardingTab = tab === 'create' ? 'create' : 'join';
  renderAccessGate();
}

export function renderClubSwitcher() {
  const badgeBtn = document.getElementById('clubTitleBadge');
  const switcherSel = document.getElementById('clubSwitcherSelect');
  const activeClubName = appState.club?.shortName || appState.club?.name || 'MatchDay Ready';
  const memberships = getUserClubMemberships(appState.userProfile);

  // Dynamically brand the browser tab title with the active club
  document.title = appState.club?.shortName
    ? `MatchDay Ready — ${appState.club.shortName}`
    : 'MatchDay Ready — Club Football Manager';

  if (memberships.length > 1 && switcherSel && badgeBtn) {
    badgeBtn.classList.add('hidden');
    switcherSel.classList.remove('hidden');
    switcherSel.innerHTML = memberships
      .map(m => {
        const selected = m.clubId === appState.userProfile?.clubId ? 'selected' : '';
        const meta = getRoleMeta(m.role);
        return `<option value="${m.clubId}" ${selected}>🏟️ ${m.clubName || m.clubId} (${meta.short})</option>`;
      })
      .join('');
  } else if (badgeBtn && switcherSel) {
    switcherSel.classList.add('hidden');
    badgeBtn.classList.remove('hidden');
    badgeBtn.innerText = activeClubName;
  }
}

export async function handleSwitchClubUI(targetClubId) {
  if (!targetClubId || targetClubId === appState.userProfile?.clubId) return;
  try {
    await switchActiveClub(targetClubId);
    clubHubOpenManually = false;
    renderAccessGate();
    renderClubSwitcher();
  } catch (e) {
    alert(e.message || 'Could not switch club.');
    renderClubSwitcher();
  }
}

export async function handleClaimAdditionalInviteUI(inviteId) {
  if (!inviteId) return;
  try {
    await claimAdditionalInvite(inviteId);
    clubHubOpenManually = false;
    renderAccessGate();
    renderClubSwitcher();
  } catch (e) {
    alert(e.message || 'Could not accept club invite.');
  }
}

export async function handleRegisterNewClubUI(event) {
  if (event) event.preventDefault();
  const clubName = document.getElementById('newClubFullNameInput')?.value.trim() || '';
  const shortName = document.getElementById('newClubShortNameInput')?.value.trim() || '';
  const firstTeamName = document.getElementById('newClubFirstTeamInput')?.value.trim() || 'U10 White';
  const ageGroup = document.getElementById('newClubAgeGroupInput')?.value.trim() || 'U10';
  const defaultFormation = document.getElementById('newClubFormatSelect')?.value || '7v7';
  const defaultPeriods = Number(document.getElementById('newClubPeriodsSelect')?.value) || 4;
  const errEl = document.getElementById('accessGateCreateError');
  const submitBtn = document.getElementById('accessGateCreateBtn');

  if (errEl) errEl.classList.add('hidden');
  if (!clubName || clubName.length < 2) {
    if (errEl) {
      errEl.innerText = 'Please enter your club name (e.g. Maynooth Town FC).';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Club Workspace...';
  }

  try {
    const res = await registerNewClub({
      clubName,
      shortName: shortName || clubName,
      firstTeamName,
      ageGroup,
      defaultFormation,
      defaultPeriods,
      defaultQtrMins: 12
    });
    clubHubOpenManually = false;
    renderAccessGate();
    renderClubSwitcher();
    alert(
      `🏟️ Created "${res.club.shortName}"!\n\nYour Club Join Code is: ${res.joinCode}\nShare it from 🛡️ Admin → 🏟️ Club to onboard your coaches.`
    );
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Could not create club.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = '🚀 Create Club & Start Coaching';
    }
  }
}

export function renderAccessGate() {
  renderClubSwitcher();

  const gateModal = document.getElementById('accessGateModal');
  const closeBtn = document.getElementById('accessGateCloseBtn');
  const emailBadge = document.getElementById('accessGateEmail');
  const myClubsSection = document.getElementById('accessGateMyClubsSection');
  const myClubsList = document.getElementById('accessGateMyClubsList');
  const pendingInvitesBox = document.getElementById('accessGatePendingInvitesBox');
  const formPanel = document.getElementById('accessGateJoinFormPanel');
  const joinTabPanel = document.getElementById('onboardingPanelJoin');
  const createTabPanel = document.getElementById('onboardingPanelCreate');
  const joinTabBtn = document.getElementById('onboardingTabJoin');
  const createTabBtn = document.getElementById('onboardingTabCreate');
  const pendingPanel = document.getElementById('accessGatePendingPanel');
  const pendingClubName = document.getElementById('accessGatePendingClub');
  const pendingCodeText = document.getElementById('accessGatePendingCode');
  const rejectedBanner = document.getElementById('accessGateRejectedBanner');
  const suspendedPanel = document.getElementById('accessGateSuspendedPanel');
  const codeInput = document.getElementById('accessGateJoinCodeInput');
  const nameInput = document.getElementById('accessGateNameInput');

  const status = appState.accessStatus;
  const isBlockedGate =
    appState.mode === 'firebase' &&
    Boolean(appState.currentUser) &&
    ['needs_onboarding', 'pending_approval', 'rejected', 'suspended'].includes(status);

  const shouldShowGate = isBlockedGate || clubHubOpenManually;

  if (gateModal) {
    gateModal.classList.toggle('hidden', !shouldShowGate);
  }

  if (closeBtn) {
    closeBtn.classList.toggle('hidden', isBlockedGate);
  }

  if (shouldShowGate) {
    if (emailBadge) {
      emailBadge.innerText = appState.currentUser?.email || appState.currentUser?.displayName || 'Local Mode';
    }
    if (nameInput && !nameInput.value && appState.currentUser?.displayName) {
      nameInput.value = appState.currentUser.displayName;
    }
    const urlCode = getJoinCodeFromUrl();
    if (codeInput && !codeInput.value && urlCode) {
      codeInput.value = urlCode;
    }

    // Show user's existing clubs when opened manually as Club Hub
    const memberships = getUserClubMemberships(appState.userProfile);
    if (myClubsSection && myClubsList) {
      const showMyClubs = !isBlockedGate && memberships.length > 0;
      myClubsSection.classList.toggle('hidden', !showMyClubs);
      if (showMyClubs) {
        myClubsList.innerHTML = memberships
          .map(m => {
            const isCurrent = m.clubId === appState.userProfile?.clubId;
            const meta = getRoleMeta(m.role);
            return `
              <div class="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-2 rounded border ${
                isCurrent ? 'border-emerald-500/60' : 'border-slate-700'
              }">
                <div class="min-w-0">
                  <div class="font-bold text-white text-xs truncate">🏟️ ${m.clubName || m.clubId}</div>
                  <div class="text-[10px] text-slate-400">${meta.icon} ${meta.label}</div>
                </div>
                ${
                  isCurrent
                    ? `<span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold shrink-0">Active</span>`
                    : `<button onclick="handleSwitchClubUI('${m.clubId}')" class="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shrink-0">Switch</button>`
                }
              </div>
            `;
          })
          .join('');
      }
    }

    // Show pending email invites inside the hub if any exist
    if (pendingInvitesBox) {
      const myInvites = appState.myPendingInvites || [];
      pendingInvitesBox.classList.toggle('hidden', myInvites.length === 0);
      if (myInvites.length > 0) {
        pendingInvitesBox.innerHTML = myInvites
          .map(
            inv => `
            <div class="flex items-center justify-between gap-2 bg-emerald-950/50 border border-emerald-500/40 rounded-lg p-2 text-xs">
              <div class="min-w-0">
                <div class="font-bold text-emerald-300 truncate">✉️ Invite: ${inv.clubName || inv.clubId}</div>
                <div class="text-[10px] text-slate-300">Role: ${getRoleMeta(inv.role).label}</div>
              </div>
              <button onclick="handleClaimAdditionalInviteUI('${inv.inviteId}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shrink-0">Accept</button>
            </div>`
          )
          .join('');
      }
    }

    const isPending = isBlockedGate && status === 'pending_approval';
    const isRejected = isBlockedGate && status === 'rejected';
    const isSuspended = isBlockedGate && status === 'suspended';

    if (formPanel) formPanel.classList.toggle('hidden', isPending || isSuspended);
    if (pendingPanel) pendingPanel.classList.toggle('hidden', !isPending);
    if (rejectedBanner) rejectedBanner.classList.toggle('hidden', !isRejected);
    if (suspendedPanel) suspendedPanel.classList.toggle('hidden', !isSuspended);

    // Toggle Join vs Create New Club sub-panels
    if (joinTabPanel) joinTabPanel.classList.toggle('hidden', onboardingTab !== 'join');
    if (createTabPanel) createTabPanel.classList.toggle('hidden', onboardingTab !== 'create');
    if (joinTabBtn) {
      joinTabBtn.className =
        onboardingTab === 'join'
          ? 'flex-1 py-1.5 rounded font-bold text-xs bg-emerald-600 text-white shadow'
          : 'flex-1 py-1.5 rounded font-semibold text-xs text-slate-400';
    }
    if (createTabBtn) {
      createTabBtn.className =
        onboardingTab === 'create'
          ? 'flex-1 py-1.5 rounded font-bold text-xs bg-indigo-600 text-white shadow'
          : 'flex-1 py-1.5 rounded font-semibold text-xs text-slate-400';
    }

    if (isPending && appState.pendingJoinRequest) {
      if (pendingClubName) pendingClubName.innerText = appState.pendingJoinRequest.clubName || 'your club';
      if (pendingCodeText) pendingCodeText.innerText = appState.pendingJoinRequest.joinCode || '';
    }
  }

  // Additional club invite banner (shown on main app if another club invites an existing user)
  const addInvBanner = document.getElementById('additionalInviteBanner');
  const addInvContent = document.getElementById('additionalInviteContent');
  if (addInvBanner && addInvContent) {
    const myInvites = appState.accessStatus === 'ready' ? appState.myPendingInvites || [] : [];
    addInvBanner.classList.toggle('hidden', myInvites.length === 0);
    if (myInvites.length > 0) {
      const inv = myInvites[0];
      addInvContent.innerHTML = `
        <span class="truncate">✉️ You've been invited to <strong>${inv.clubName || inv.clubId}</strong> (${getRoleMeta(inv.role).label})</span>
        <button onclick="handleClaimAdditionalInviteUI('${inv.inviteId}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shrink-0">Accept &amp; Join</button>
      `;
    }
  }

  // Invited welcome banner
  const inviteBanner = document.getElementById('claimedInviteBanner');
  const inviteText = document.getElementById('claimedInviteText');
  if (inviteBanner && inviteText) {
    const hasNotice = Boolean(appState.claimedInviteNotice);
    inviteBanner.classList.toggle('hidden', !hasNotice);
    if (hasNotice) inviteText.innerText = appState.claimedInviteNotice;
  }

  // Read-only viewer banner
  const viewerBanner = document.getElementById('viewerReadOnlyBanner');
  if (viewerBanner) {
    const showViewer =
      appState.accessStatus === 'ready' && isViewer(appState.userProfile);
    viewerBanner.classList.toggle('hidden', !showViewer);
  }

  // No teams assigned warning (for active coach/lead/viewer with 0 assigned teams)
  const noTeamsBanner = document.getElementById('noTeamsAssignedBanner');
  if (noTeamsBanner) {
    const showNoTeams =
      appState.accessStatus === 'ready' &&
      appState.syncState === 'synced' &&
      Boolean(appState.userProfile) &&
      appState.userProfile.role !== 'admin' &&
      appState.teams.length === 0;
    noTeamsBanner.classList.toggle('hidden', !showNoTeams);
  }
}

export async function handleSubmitJoinCodeUI(event) {
  if (event) event.preventDefault();
  const codeInput = document.getElementById('accessGateJoinCodeInput');
  const nameInput = document.getElementById('accessGateNameInput');
  const noteInput = document.getElementById('accessGateNoteInput');
  const errEl = document.getElementById('accessGateError');
  const submitBtn = document.getElementById('accessGateSubmitBtn');

  if (errEl) errEl.classList.add('hidden');
  const joinCode = normalizeJoinCode(codeInput?.value || '');
  if (!joinCode) {
    if (errEl) {
      errEl.innerText = 'Please enter a valid Club Join Code (e.g. STRAFFAN-2026).';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Checking Join Code...';
  }
  try {
    await submitJoinCodeRequest({
      joinCode,
      displayName: nameInput?.value.trim() || '',
      note: noteInput?.value.trim() || ''
    });
    renderAccessGate();
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Could not submit join request.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = '🔑 Request Club Access';
    }
  }
}

export async function handleCancelJoinRequestUI() {
  const reqId = appState.pendingJoinRequest?.requestId;
  if (!reqId) return;
  if (!confirm('Cancel your pending join request?')) return;
  try {
    await cancelPendingJoinRequest(reqId);
    renderAccessGate();
  } catch (e) {
    alert(e.message || 'Could not cancel request.');
  }
}

export async function handleRecheckAccessUI() {
  if (!appState.currentUser) return;
  const errEl = document.getElementById('accessGateError');
  if (errEl) errEl.classList.add('hidden');
  try {
    const res = await ensureUserAndClubSeeded(appState.currentUser);
    if (res?.accessStatus === 'ready') {
      startFirestoreSubscriptions(appState.currentUser);
    } else if (errEl && res?.accessStatus === 'needs_onboarding') {
      errEl.innerText = 'No pending email invite found yet for your email. Enter a Club Join Code below or ask your Club Admin to invite your email.';
      errEl.classList.remove('hidden');
    }
    renderAccessGate();
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Could not refresh access status.';
      errEl.classList.remove('hidden');
    }
  }
}

export function dismissClaimedInviteNotice() {
  appState.claimedInviteNotice = null;
  renderAccessGate();
}

export function renderAuthStatusBanner() {
  const syncBadge = document.getElementById('syncStatus');
  const configBadge = document.getElementById('configBadge');
  const coachNameEl = document.getElementById('coachProfileBadge');
  const configured = isFirebaseConfigured();

  if (syncBadge) {
    if (appState.mode === 'firebase' && appState.syncState === 'synced') {
      syncBadge.className =
        'text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30';
      syncBadge.innerText = '🔥 Firestore Live';
    } else if (appState.mode === 'firebase' && appState.syncState === 'syncing') {
      syncBadge.className =
        'text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded border border-sky-500/30';
      syncBadge.innerText = 'Syncing...';
    } else if (appState.mode === 'firebase' && appState.syncState === 'error') {
      syncBadge.className =
        'text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30';
      syncBadge.innerText = 'Sync Error';
    } else {
      syncBadge.className =
        'text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30';
      syncBadge.innerText = 'Local Club Mode';
    }
  }

  if (configBadge) {
    configBadge.innerText = configured ? 'Firebase Connected ✅' : 'Local Mode (Tap to link Firebase)';
    configBadge.className = configured
      ? 'text-[10px] text-emerald-400 font-semibold'
      : 'text-[10px] text-amber-400 font-semibold';
  }

  if (coachNameEl) {
    const name =
      appState.userProfile?.displayName ||
      appState.currentUser?.displayName ||
      appState.currentUser?.email ||
      'Coach';
    const meta = getRoleMeta(appState.userProfile?.role || 'viewer');
    coachNameEl.innerText = `${meta.icon} ${name} (${meta.short})`;
  }
}
