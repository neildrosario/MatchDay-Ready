import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  getActiveUserProfile,
  setAdminRoleView,
  findLocalSandboxDataToRecover,
  recoverLocalSandboxDataToCloud,
  ensureUserAndClubSeeded,
  startFirestoreSubscriptions,
  clearFirestoreSubscriptions,
  hydrateAppStateFromLocalStore,
  joinClubWithCode,
  cancelPendingJoinRequest,
  requestTeamAccess,
  cancelTeamAccessRequest,
  approveTeamAccessRequest,
  rejectTeamAccessRequest,
  registerNewClub,
  switchActiveClub,
  claimAdditionalInvite,
  getUserClubMemberships,
  normalizeJoinCode,
  notifyAppState
} from './db.js';
import {
  getRoleMeta,
  getClubAgeGroups,
  isViewer,
  isClubAdmin,
  isAgeGroupLead,
  canRequestTeamAccess,
  getApprovableTeamRequests
} from './permissions.js';

let authMode = 'login'; // 'login' | 'signup'
let clubHubOpenManually = false;
let onboardingTab = 'join'; // 'join' | 'create'
let pendingSignupDisplayName = '';
let pendingSignupJoinCode = '';

const SESSION_INVITE_ID_KEY = 'mdr_pending_invite_id';
const SESSION_INVITE_EMAIL_KEY = 'mdr_pending_invite_email';
const SESSION_JOIN_CODE_KEY = 'mdr_pending_join_code';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function captureAuthUrlHints() {
  try {
    const params = new URLSearchParams(window.location.search);
    const inv = (params.get('invite') || '').trim();
    const invEmail = (params.get('email') || '').trim().toLowerCase();
    const code = normalizeJoinCode(params.get('code') || params.get('join') || '');
    if (inv) sessionStorage.setItem(SESSION_INVITE_ID_KEY, inv);
    if (invEmail) sessionStorage.setItem(SESSION_INVITE_EMAIL_KEY, invEmail);
    if (code) sessionStorage.setItem(SESSION_JOIN_CODE_KEY, code);
  } catch (_) {}
}

function getPendingInviteHint() {
  try {
    const params = new URLSearchParams(window.location.search);
    const inviteId = (params.get('invite') || sessionStorage.getItem(SESSION_INVITE_ID_KEY) || '').trim();
    const email = (params.get('email') || sessionStorage.getItem(SESSION_INVITE_EMAIL_KEY) || '').trim().toLowerCase();
    return { inviteId, email };
  } catch (_) {
    return { inviteId: '', email: '' };
  }
}

function getJoinCodeFromUrlOrSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    return normalizeJoinCode(
      params.get('code') ||
        params.get('join') ||
        sessionStorage.getItem(SESSION_JOIN_CODE_KEY) ||
        ''
    );
  } catch (_) {
    return '';
  }
}

function clearPendingAuthHints() {
  pendingSignupDisplayName = '';
  pendingSignupJoinCode = '';
  try {
    sessionStorage.removeItem(SESSION_INVITE_ID_KEY);
    sessionStorage.removeItem(SESSION_INVITE_EMAIL_KEY);
    sessionStorage.removeItem(SESSION_JOIN_CODE_KEY);
    const url = new URL(window.location.href);
    let changed = false;
    ['invite', 'email', 'code', 'join'].forEach(k => {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    });
    if (changed) {
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  } catch (_) {}
}

export function initAuth() {
  captureAuthUrlHints();
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

  // Handle mobile Google redirect results cleanly if signInWithRedirect was used
  getRedirectResult(auth).catch(err => {
    console.warn('Google redirect sign-in note:', err);
    const errEl = document.getElementById('authErrorText');
    if (errEl && err?.message) {
      errEl.innerText = err.message;
      errEl.classList.remove('hidden');
    }
  });

  onAuthStateChanged(auth, async user => {
    if (user) {
      appState.currentUser = user;
      appState.adminViewAsRole = 'admin';
      clubHubOpenManually = false;
      hideAuthModal(true);
      const { inviteId, email: expectedInviteEmail } = getPendingInviteHint();
      const codeHint = pendingSignupJoinCode || getJoinCodeFromUrlOrSession();
      const nameHint = pendingSignupDisplayName || user.displayName || '';

      try {
        const res = await ensureUserAndClubSeeded(user, {
          inviteIdHint: inviteId,
          expectedInviteEmail,
          joinCodeHint: codeHint,
          displayNameHint: nameHint
        });
        if (res?.accessStatus === 'ready') {
          clearPendingAuthHints();
          startFirestoreSubscriptions(user);
        }
      } catch (e) {
        console.error('Error initializing club data in Firestore:', e);
        appState.authDiagnosticError =
          e?.message || 'Error connecting to Firestore. Check your internet connection or club permissions.';
        appState.accessStatus = 'needs_onboarding';
        appState.syncState = 'error';
        notifyAppState();
      }
    } else {
      clearFirestoreSubscriptions();
      clubHubOpenManually = false;
      appState.adminViewAsRole = 'admin';
      appState.currentUser = null;
      appState.userProfile = null;
      appState.accessStatus = 'ready';
      appState.pendingJoinRequest = null;
      appState.authDiagnosticError = null;
      appState.inviteEmailMismatch = null;
      appState.claimedInviteNotice = null;
      toggleAuthMode('login');
      showAuthModal();
    }
    renderAuthStatusBanner();
    renderAccessGate();
  });
}

export function showAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('hidden');

  const signedIn = Boolean(appState.currentUser);
  const closeBtn = document.getElementById('authModalCloseBtn');
  const signInPanel = document.getElementById('authSignInPanel');
  const accountPanel = document.getElementById('authAccountPanel');
  const titleEl = document.getElementById('authModalTitle');

  if (closeBtn) closeBtn.classList.toggle('hidden', !signedIn && isFirebaseConfigured());
  if (signInPanel) signInPanel.classList.toggle('hidden', signedIn);
  if (accountPanel) accountPanel.classList.toggle('hidden', !signedIn);

  if (signedIn) {
    if (titleEl) titleEl.innerText = 'Account & Role';
    const acctName = document.getElementById('authAccountName');
    const acctEmail = document.getElementById('authAccountEmail');
    const acctRoleBadge = document.getElementById('authAccountRoleBadge');
    const adminSwitchBox = document.getElementById('authAdminRoleSwitchBox');
    const btnAdmin = document.getElementById('authRoleSwitchAdminBtn');
    const btnLead = document.getElementById('authRoleSwitchLeadBtn');
    const leadDesc = document.getElementById('authRoleSwitchLeadDesc');

    const activeProfile = getActiveUserProfile();
    const meta = getRoleMeta(activeProfile?.role || 'viewer');
    if (acctName) {
      acctName.innerText =
        appState.userProfile?.displayName || appState.currentUser?.displayName || 'Coach';
    }
    if (acctEmail) {
      acctEmail.innerText = appState.currentUser?.email || appState.userProfile?.email || '';
    }
    if (acctRoleBadge) {
      acctRoleBadge.innerText = `${meta.icon} ${meta.label}`;
      acctRoleBadge.className = `inline-block text-[10px] px-2 py-0.5 rounded border font-bold ${meta.badgeClass}`;
    }

    const isRealAdmin = isClubAdmin(appState.userProfile);
    if (adminSwitchBox) adminSwitchBox.classList.toggle('hidden', !isRealAdmin);
    if (isRealAdmin) {
      const inLeadView = appState.adminViewAsRole === 'lead';
      if (btnAdmin) {
        btnAdmin.className = !inLeadView
          ? 'flex-1 py-2 px-2 rounded-lg font-bold text-xs bg-purple-600 text-white border border-purple-400 shadow'
          : 'flex-1 py-2 px-2 rounded-lg font-semibold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500';
      }
      if (btnLead) {
        btnLead.className = inLeadView
          ? 'flex-1 py-2 px-2 rounded-lg font-bold text-xs bg-sky-600 text-white border border-sky-400 shadow'
          : 'flex-1 py-2 px-2 rounded-lg font-semibold text-xs bg-slate-900 text-slate-300 border border-slate-700 hover:border-slate-500';
      }
      const leadAgSel = document.getElementById('authLeadAgeGroupSelect');
      const clubAgs = getClubAgeGroups(appState.allClubTeams || []);
      const agOptions = Array.from(new Set([...(clubAgs.length ? clubAgs : ['U10']), appState.adminLeadAgeGroup].filter(Boolean)));
      const effectiveLead = getActiveUserProfile()?.isRolePreview
        ? getActiveUserProfile()
        : null;
      const selectedLeadAg =
        appState.adminLeadAgeGroup ||
        effectiveLead?.assignedAgeGroups?.[0] ||
        (clubAgs.includes('U10') ? 'U10' : clubAgs[0] || 'U10');

      if (leadAgSel) {
        leadAgSel.innerHTML = agOptions
          .map(ag => `<option value="${escapeHtml(ag)}" ${ag === selectedLeadAg ? 'selected' : ''}>${escapeHtml(ag)}</option>`)
          .join('');
      }
      if (leadDesc) {
        const leadTeams = (appState.allClubTeams || [])
          .filter(t => t.ageGroup === selectedLeadAg)
          .map(t => t.name);
        leadDesc.innerText =
          leadTeams.length > 0
            ? `Lead View scopes your app to ${selectedLeadAg}: ${leadTeams.join(' & ')}.`
            : `Lead View scopes your app to ${selectedLeadAg}.`;
      }
    }
    return;
  }

  const { inviteId, email: inviteEmail } = getPendingInviteHint();
  const urlCode = getJoinCodeFromUrlOrSession();

  const inviteBanner = document.getElementById('authInviteBanner');
  const inviteBannerText = document.getElementById('authInviteBannerText');
  const emailInput = document.getElementById('authEmailInput');
  const joinCodeInput = document.getElementById('authJoinCodeInput');

  if (inviteBanner && inviteBannerText) {
    if (inviteId) {
      inviteBanner.classList.remove('hidden');
      inviteBannerText.innerText = inviteEmail
        ? `Pre-authorized invite for ${inviteEmail} — tap Continue with Google (or sign in) to enter immediately. No registration code needed!`
        : 'You have a pre-authorized coach invite! Sign in with Google SSO or your invited email — no registration code needed.';
    } else {
      inviteBanner.classList.add('hidden');
    }
  }

  if (emailInput && !emailInput.value && inviteEmail) {
    emailInput.value = inviteEmail;
  }

  if (joinCodeInput && !joinCodeInput.value && urlCode) {
    joinCodeInput.value = urlCode;
  }

  // If user arrived via a Club Registration Code link (?code=...) without an email invite, default to Register tab
  if (urlCode && !inviteId) {
    toggleAuthMode('signup');
  } else {
    toggleAuthMode(authMode);
  }
}

export function hideAuthModal(force = false) {
  if (!force && isFirebaseConfigured() && !appState.currentUser) {
    return;
  }
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.add('hidden');
}

export function handleSwitchAdminRoleView(mode) {
  const leadAgSel = document.getElementById('authLeadAgeGroupSelect');
  const chosenAg = leadAgSel?.value || appState.adminLeadAgeGroup || '';
  setAdminRoleView(mode, mode === 'lead' ? chosenAg : '');
  hideAuthModal(true);
  if (mode === 'lead' && typeof window.switchView === 'function') {
    window.switchView('pitch');
  }
}

export function handleChangeAdminLeadAgeGroup(ageGroup) {
  if (!ageGroup) return;
  setAdminRoleView(appState.adminViewAsRole, ageGroup);
  showAuthModal();
}

export async function handleRecoverLocalSandboxUI() {
  const btn = document.getElementById('localDataRecoveryBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerText = '☁️ Restoring to Cloud Firestore...';
  }
  try {
    const res = await recoverLocalSandboxDataToCloud();
    alert(
      `✅ Restored local data to Cloud Firestore!\n\n• ${res.teamsRestored} team(s): ${res.teamNames.join(', ') || 'None'}\n• ${res.playersRestored} player(s)\n• ${res.matchesRestored} match(es)\n• ${res.lineupsRestored} period lineup(s)`
    );
    renderAccessGate();
  } catch (e) {
    alert(e.message || 'Could not restore local data.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '☁️ Restore Local Teams, Players & Matches to Cloud';
    }
  }
}

export function toggleAuthMode(mode) {
  authMode = mode;
  const titleEl = document.getElementById('authModalTitle');
  const nameWrap = document.getElementById('authNameWrapper');
  const codeWrap = document.getElementById('authJoinCodeWrapper');
  const submitBtn = document.getElementById('authSubmitBtn');
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');

  if (mode === 'signup') {
    if (titleEl) titleEl.innerText = 'Register Coach Account';
    if (nameWrap) nameWrap.classList.remove('hidden');
    if (codeWrap) codeWrap.classList.remove('hidden');
    if (submitBtn) submitBtn.innerText = 'Create Coach Profile';
    if (tabSignup) tabSignup.className = 'flex-1 py-1.5 rounded font-bold text-xs bg-emerald-600 text-white';
    if (tabLogin) tabLogin.className = 'flex-1 py-1.5 rounded font-bold text-xs text-slate-400';
  } else {
    if (titleEl) titleEl.innerText = 'Coach Sign In';
    if (nameWrap) nameWrap.classList.add('hidden');
    if (codeWrap) codeWrap.classList.add('hidden');
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
  const joinCode = normalizeJoinCode(document.getElementById('authJoinCodeInput')?.value || '');
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
      // Save name & registration code BEFORE creating account so onAuthStateChanged reads them immediately
      pendingSignupDisplayName = displayName || '';
      pendingSignupJoinCode = joinCode || '';
      if (joinCode) {
        try {
          sessionStorage.setItem(SESSION_JOIN_CODE_KEY, joinCode);
        } catch (_) {}
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        try {
          await updateProfile(cred.user, { displayName });
        } catch (_) {}
      }
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    hideAuthModal();
  } catch (e) {
    pendingSignupDisplayName = '';
    pendingSignupJoinCode = '';
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

  // Persist any join code typed into the Register form before launching Google SSO
  const typedCode = normalizeJoinCode(document.getElementById('authJoinCodeInput')?.value || '');
  if (typedCode) {
    pendingSignupJoinCode = typedCode;
    try {
      sessionStorage.setItem(SESSION_JOIN_CODE_KEY, typedCode);
    } catch (_) {}
  }

  try {
    await signInWithPopup(auth, googleProvider);
    hideAuthModal();
  } catch (e) {
    // Mobile/Safari in-app browsers often block popups -> seamlessly fall back to redirect
    if (
      e?.code === 'auth/popup-blocked' ||
      e?.code === 'auth/operation-not-supported-in-this-environment'
    ) {
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirErr) {
        if (errEl) {
          errEl.innerText = redirErr.message || 'Google Sign-In redirect failed.';
          errEl.classList.remove('hidden');
        }
        return;
      }
    }
    if (errEl) {
      errEl.innerText = e.message || 'Google Sign-In failed.';
      errEl.classList.remove('hidden');
    }
  }
}

export async function handleSwitchGoogleAccount() {
  const { auth, configured } = getFirebaseServices();
  if (!configured || !auth) return;
  try {
    await signOut(auth);
  } catch (_) {}
  await handleGoogleSignIn();
}

export function useLocalSandboxCoach(name = "Neil D'Rosario") {
  // Block sandbox bypass whenever Firebase Auth is configured
  if (isFirebaseConfigured()) {
    console.warn('Local Sandbox mode is disabled when Firebase Authentication is enabled.');
    return;
  }
  clearFirestoreSubscriptions();
  appState.currentUser = {
    uid: 'local_coach_1',
    email: 'neil@straffanafc.ie',
    displayName: name
  };
  hideAuthModal(true);
  hydrateAppStateFromLocalStore();
  renderAuthStatusBanner();
  renderAccessGate();
}

export async function handleLogout() {
  const { auth, configured } = getFirebaseServices();
  clearFirestoreSubscriptions();
  clubHubOpenManually = false;
  appState.adminViewAsRole = 'admin';
  clearPendingAuthHints();

  if (configured && auth) {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  appState.currentUser = null;
  appState.userProfile = null;
  appState.accessStatus = 'ready';
  appState.pendingJoinRequest = null;
  appState.authDiagnosticError = null;
  appState.inviteEmailMismatch = null;
  appState.claimedInviteNotice = null;
  toggleAuthMode('login');
  renderAccessGate();
  renderAuthStatusBanner();
  showAuthModal();
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

// --- MULTI-CLUB ACCESS GATE, INSTANT JOIN-CODE REGISTRATION, TEAM REQUESTS & CLUB SWITCHER ---

export function openClubHubModal(defaultTab = 'join') {
  if (!appState.currentUser && appState.mode === 'firebase') {
    showAuthModal();
    return;
  }
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
        return `<option value="${m.clubId}" ${selected}>🏟️ ${escapeHtml(m.clubName || m.clubId)} (${meta.short})</option>`;
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
    clearPendingAuthHints();
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
    clearPendingAuthHints();
    renderAccessGate();
    renderClubSwitcher();
    alert(
      `🏟️ Created "${res.club.shortName}"!\n\nYour Club Registration Code is: ${res.joinCode}\nShare it from 🛡️ Admin → 🏟️ Club to onboard your coaches.`
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

function buildTeamRequestRowsHtml() {
  const profile = appState.userProfile;
  if (!profile || !canRequestTeamAccess(profile)) return '';
  const allTeams = appState.allClubTeams || [];
  const assignedSet = new Set(profile.assignedTeamIds || []);
  const myReqs = (appState.allClubTeamRequests || []).filter(r => r.uid === profile.uid);
  const reqByTeamId = {};
  myReqs.forEach(r => {
    if (!reqByTeamId[r.teamId] || r.status === 'pending') {
      reqByTeamId[r.teamId] = r;
    }
  });

  const requestableTeams = allTeams.filter(t => !assignedSet.has(t.teamId));
  if (requestableTeams.length === 0) {
    return `<p class="text-[11px] text-slate-400 italic">No additional club teams available to request right now.</p>`;
  }

  return requestableTeams
    .map(t => {
      const existingReq = reqByTeamId[t.teamId];
      const isPending = existingReq && existingReq.status === 'pending';
      const isRejected = existingReq && existingReq.status === 'rejected';
      return `
        <div class="flex items-center justify-between gap-2 bg-slate-900/90 px-2.5 py-2 rounded-lg border ${
          isPending ? 'border-amber-500/50' : 'border-slate-700'
        }">
          <div class="min-w-0">
            <div class="font-bold text-white text-xs truncate">🛡️ ${escapeHtml(t.name)}</div>
            <div class="text-[10px] text-slate-400">${escapeHtml(t.ageGroup || 'Club')} • ${escapeHtml(t.defaultFormation || '7v7')}${
        isRejected ? ' • <span class="text-rose-400">Previously declined</span>' : ''
      }</div>
          </div>
          ${
            isPending
              ? `<div class="flex items-center gap-1.5 shrink-0">
                  <span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">⏳ Pending</span>
                  <button type="button" onclick="handleCancelTeamRequestUI('${escapeHtml(existingReq.requestId)}')" class="text-[10px] text-slate-400 hover:text-rose-300 font-bold px-1" title="Cancel request">✕</button>
                </div>`
              : `<button type="button" onclick="handleRequestTeamAccessUI('${escapeHtml(t.teamId)}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shrink-0 shadow">Request Access</button>`
          }
        </div>
      `;
    })
    .join('');
}

export function renderAccessGate() {
  renderClubSwitcher();

  const gateModal = document.getElementById('accessGateModal');
  const closeBtn = document.getElementById('accessGateCloseBtn');
  const emailBadge = document.getElementById('accessGateEmail');
  const mismatchBox = document.getElementById('accessGateMismatchBanner');
  const diagnosticBox = document.getElementById('accessGateDiagnosticBanner');
  const myClubsSection = document.getElementById('accessGateMyClubsSection');
  const myClubsList = document.getElementById('accessGateMyClubsList');
  const requestTeamSection = document.getElementById('accessGateRequestTeamSection');
  const requestTeamList = document.getElementById('accessGateRequestTeamList');
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
    const urlCode = getJoinCodeFromUrlOrSession();
    if (codeInput && !codeInput.value && urlCode) {
      codeInput.value = urlCode;
    }

    // Show Google account mismatch banner if coach opened ?invite= link with wrong Google email
    if (mismatchBox) {
      const mm = appState.inviteEmailMismatch;
      mismatchBox.classList.toggle('hidden', !mm);
      if (mm) {
        mismatchBox.innerHTML = `
          <div class="font-bold text-amber-200">✉️ Pre-Authorized Invite Email Mismatch</div>
          <p class="text-[11px] text-slate-200 leading-snug">
            This invite link is pre-authorized for <strong>${escapeHtml(mm.expectedEmail)}</strong>,
            but you signed in as <strong>${escapeHtml(mm.signedInEmail)}</strong>.
          </p>
          <button type="button" onclick="handleSwitchGoogleAccount()" class="w-full bg-white text-slate-900 hover:bg-slate-100 py-1.5 rounded font-bold text-[11px] shadow">
            🔄 Switch Google Account
          </button>
        `;
      }
    }

    // Surface real Firestore/Auth errors instead of hiding them
    if (diagnosticBox) {
      const diag = appState.authDiagnosticError;
      diagnosticBox.classList.toggle('hidden', !diag);
      if (diag) {
        diagnosticBox.innerText = `⚠️ ${diag}`;
      }
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
                  <div class="font-bold text-white text-xs truncate">🏟️ ${escapeHtml(m.clubName || m.clubId)}</div>
                  <div class="text-[10px] text-slate-400">${meta.icon} ${meta.label}</div>
                </div>
                ${
                  isCurrent
                    ? `<span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold shrink-0">Active</span>`
                    : `<button onclick="handleSwitchClubUI('${escapeHtml(m.clubId)}')" class="bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shrink-0">Switch</button>`
                }
              </div>
            `;
          })
          .join('');
      }
    }

    // Allow active non-admin coaches to request access to additional teams inside Club Hub
    if (requestTeamSection && requestTeamList) {
      const showReqTeams =
        !isBlockedGate &&
        appState.accessStatus === 'ready' &&
        canRequestTeamAccess(appState.userProfile) &&
        (appState.allClubTeams || []).some(
          t => !(appState.userProfile?.assignedTeamIds || []).includes(t.teamId)
        );
      requestTeamSection.classList.toggle('hidden', !showReqTeams);
      if (showReqTeams) {
        requestTeamList.innerHTML = buildTeamRequestRowsHtml();
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
                <div class="font-bold text-emerald-300 truncate">✉️ Invite: ${escapeHtml(inv.clubName || inv.clubId)}</div>
                <div class="text-[10px] text-slate-300">Role: ${getRoleMeta(inv.role).label}</div>
              </div>
              <button onclick="handleClaimAdditionalInviteUI('${escapeHtml(inv.inviteId)}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shrink-0">Accept</button>
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
        <span class="truncate">✉️ You've been invited to <strong>${escapeHtml(inv.clubName || inv.clubId)}</strong> (${getRoleMeta(inv.role).label})</span>
        <button onclick="handleClaimAdditionalInviteUI('${escapeHtml(inv.inviteId)}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded shrink-0">Accept &amp; Join</button>
      `;
    }
  }

  // Invited / Joined welcome banner
  const inviteBanner = document.getElementById('claimedInviteBanner');
  const inviteText = document.getElementById('claimedInviteText');
  if (inviteBanner && inviteText) {
    const hasNotice = Boolean(appState.claimedInviteNotice);
    inviteBanner.classList.toggle('hidden', !hasNotice);
    if (hasNotice) inviteText.innerText = appState.claimedInviteNotice;
  }

  // Local Sandbox Device Data Recovery banner (shown to Club Admin if local device holds teams/matches missing from Cloud)
  const localRecBanner = document.getElementById('localDataRecoveryBanner');
  const localRecText = document.getElementById('localDataRecoveryText');
  if (localRecBanner && localRecText) {
    const canRecover =
      appState.mode === 'firebase' &&
      appState.accessStatus === 'ready' &&
      appState.syncState === 'synced' &&
      isClubAdmin(appState.userProfile);
    const localFound = canRecover ? findLocalSandboxDataToRecover() : null;
    const cloudMatchCount = Object.keys(appState.allMatches || {}).length;
    const shouldOfferRecovery =
      Boolean(localFound) &&
      (appState.allClubTeams.length === 0 ||
        localFound.matches.length > cloudMatchCount);
    localRecBanner.classList.toggle('hidden', !shouldOfferRecovery);
    if (shouldOfferRecovery && localFound) {
      const teamLabel = localFound.teamNames.length > 0 ? localFound.teamNames.join(', ') : `${localFound.teams.length} team(s)`;
      const matchLabel =
        localFound.matchSummaries.length > 0
          ? ` • Matches: ${localFound.matchSummaries.slice(0, 3).join(', ')}`
          : '';
      localRecText.innerText = `Found ${teamLabel} (${localFound.players.length} players, ${localFound.matches.length} matches${matchLabel}) saved locally on this device.`;
    }
  }

  // Admin viewing as Age-Group Lead banner (one-tap return to full Admin mode)
  const adminLeadBanner = document.getElementById('adminLeadModeBanner');
  const adminLeadText = document.getElementById('adminLeadModeText');
  if (adminLeadBanner && adminLeadText) {
    const activeProfile = getActiveUserProfile();
    const inLeadPreview =
      appState.accessStatus === 'ready' &&
      isClubAdmin(appState.userProfile) &&
      activeProfile?.isRolePreview === true;
    adminLeadBanner.classList.toggle('hidden', !inLeadPreview);
    if (inLeadPreview) {
      const teamNames = (appState.teams || []).map(t => t.name).join(' & ');
      const agLabel = (activeProfile.assignedAgeGroups || []).join(', ') || 'Age Group';
      adminLeadText.innerText = teamNames
        ? `Lead View (${agLabel}): ${teamNames}`
        : `Lead View (${agLabel})`;
    }
  }

  // Read-only viewer banner
  const activeProfile = getActiveUserProfile();
  const viewerBanner = document.getElementById('viewerReadOnlyBanner');
  if (viewerBanner) {
    const showViewer =
      appState.accessStatus === 'ready' && isViewer(activeProfile);
    viewerBanner.classList.toggle('hidden', !showViewer);
  }

  // Age-Group Lead pending team access requests banner (Admins also see them in 🛡️ Admin → Staff)
  const leadReqBanner = document.getElementById('leadTeamRequestsBanner');
  const leadReqList = document.getElementById('leadTeamRequestsList');
  if (leadReqBanner && leadReqList) {
    const isLead = appState.accessStatus === 'ready' && isAgeGroupLead(activeProfile);
    const approvable = isLead
      ? getApprovableTeamRequests(activeProfile, appState.allClubTeamRequests)
      : [];
    leadReqBanner.classList.toggle('hidden', approvable.length === 0);
    if (approvable.length > 0) {
      leadReqList.innerHTML = approvable
        .map(
          r => `
          <div class="flex items-center justify-between gap-2 bg-slate-900/90 px-2.5 py-2 rounded border border-sky-500/40">
            <div class="min-w-0">
              <div class="font-bold text-white text-xs truncate">${escapeHtml(r.displayName || r.email)} → <span class="text-emerald-300">${escapeHtml(r.teamName || r.teamId)}</span></div>
              <div class="text-[10px] text-slate-400 truncate">${escapeHtml(r.email || '')} • ${escapeHtml(r.ageGroup || '')}</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button type="button" onclick="handleApproveTeamRequestUI('${escapeHtml(r.requestId)}')" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2 py-1 rounded">✓ Approve</button>
              <button type="button" onclick="handleRejectTeamRequestUI('${escapeHtml(r.requestId)}')" class="bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-[10px] px-2 py-1 rounded">✕</button>
            </div>
          </div>`
        )
        .join('');
    }
  }

  // No teams assigned panel -> Interactive Team Access Request selector for self-registered coaches!
  const noTeamsBanner = document.getElementById('noTeamsAssignedBanner');
  if (noTeamsBanner) {
    const showNoTeams =
      appState.accessStatus === 'ready' &&
      appState.syncState === 'synced' &&
      Boolean(activeProfile) &&
      !isClubAdmin(activeProfile) &&
      appState.teams.length === 0;
    noTeamsBanner.classList.toggle('hidden', !showNoTeams);
    // Keep pitch/match details hidden while coach has 0 assigned teams so unassigned teams' data isn't exposed
    const matchAcc = document.getElementById('matchDetailsAccordion');
    const viewPitch = document.getElementById('view-pitch');
    const viewSplitter = document.getElementById('view-splitter');
    const viewStats = document.getElementById('view-stats');
    if (matchAcc) matchAcc.classList.toggle('hidden', showNoTeams);
    if (showNoTeams) {
      if (viewPitch) viewPitch.classList.add('hidden');
      if (viewSplitter) viewSplitter.classList.add('hidden');
      if (viewStats) viewStats.classList.add('hidden');
    } else if (
      viewPitch &&
      viewPitch.classList.contains('hidden') &&
      viewSplitter?.classList.contains('hidden') &&
      viewStats?.classList.contains('hidden') &&
      document.getElementById('view-admin')?.classList.contains('hidden')
    ) {
      viewPitch.classList.remove('hidden');
    }
    if (showNoTeams) {
      const teamRows = buildTeamRequestRowsHtml();
      noTeamsBanner.innerHTML = `
        <div class="space-y-2">
          <div>
            <div class="font-bold text-amber-200 text-xs">🛡️ Request Access to Your Team(s)</div>
            <p class="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Your coach profile is active in <strong>${escapeHtml(appState.club?.shortName || 'your club')}</strong>!
              Select the team(s) you coach below — once your Club Admin or Age-Group Lead approves, your squad unlocks automatically.
            </p>
          </div>
          <div class="space-y-1.5">${teamRows}</div>
        </div>
      `;
    }
  }
}

export async function handleSubmitJoinCodeUI(event) {
  if (event) event.preventDefault();
  const codeInput = document.getElementById('accessGateJoinCodeInput');
  const nameInput = document.getElementById('accessGateNameInput');
  const errEl = document.getElementById('accessGateError');
  const submitBtn = document.getElementById('accessGateSubmitBtn');

  if (errEl) errEl.classList.add('hidden');
  const joinCode = normalizeJoinCode(codeInput?.value || '');
  if (!joinCode) {
    if (errEl) {
      errEl.innerText = 'Please enter a valid Club Registration Code (e.g. STRAFFAN-2026).';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Coach Profile...';
  }
  try {
    await joinClubWithCode({
      joinCode,
      displayName: nameInput?.value.trim() || ''
    });
    clubHubOpenManually = false;
    clearPendingAuthHints();
    renderAccessGate();
    renderClubSwitcher();
  } catch (e) {
    if (errEl) {
      errEl.innerText = e.message || 'Could not join club with that registration code.';
      errEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = '🔑 Join Club & Create Coach Profile';
    }
  }
}

export async function handleRequestTeamAccessUI(teamId) {
  if (!teamId) return;
  try {
    await requestTeamAccess({ teamId });
    renderAccessGate();
  } catch (e) {
    alert(e.message || 'Could not submit team access request.');
  }
}

export async function handleCancelTeamRequestUI(requestId) {
  if (!requestId) return;
  try {
    await cancelTeamAccessRequest(requestId);
    renderAccessGate();
  } catch (e) {
    alert(e.message || 'Could not cancel team request.');
  }
}

export async function handleApproveTeamRequestUI(requestId) {
  if (!requestId) return;
  try {
    const req = await approveTeamAccessRequest(requestId);
    alert(`✅ Approved ${req.displayName || req.email} for ${req.teamName}! Their app will unlock automatically.`);
  } catch (e) {
    alert(e.message || 'Could not approve team request.');
  }
}

export async function handleRejectTeamRequestUI(requestId) {
  if (!requestId) return;
  if (!confirm('Decline this team access request?')) return;
  try {
    await rejectTeamAccessRequest(requestId);
  } catch (e) {
    alert(e.message || 'Could not decline team request.');
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
  const { inviteId, email: expectedInviteEmail } = getPendingInviteHint();
  try {
    const res = await ensureUserAndClubSeeded(appState.currentUser, {
      inviteIdHint: inviteId,
      expectedInviteEmail
    });
    if (res?.accessStatus === 'ready') {
      clearPendingAuthHints();
      startFirestoreSubscriptions(appState.currentUser);
    } else if (errEl && res?.accessStatus === 'needs_onboarding' && !appState.authDiagnosticError && !appState.inviteEmailMismatch) {
      errEl.innerText = `No pending email invite found yet for ${appState.currentUser.email || 'your email'}. Enter your Club Registration Code above to create your coach profile immediately, or ask your Club Admin to invite your email.`;
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
    const activeProfile = getActiveUserProfile();
    const name =
      activeProfile?.displayName ||
      appState.currentUser?.displayName ||
      appState.currentUser?.email ||
      'Coach';
    const meta = getRoleMeta(activeProfile?.role || 'viewer');
    coachNameEl.innerText = `${meta.icon} ${name} (${meta.short})`;
  }
}
