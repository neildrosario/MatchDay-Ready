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
  hydrateAppStateFromLocalStore
} from './db.js';

let authMode = 'login'; // 'login' | 'signup'

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
    return;
  }

  onAuthStateChanged(auth, async user => {
    if (user) {
      appState.currentUser = user;
      hideAuthModal();
      try {
        await ensureUserAndClubSeeded(user);
        startFirestoreSubscriptions(user);
      } catch (e) {
        console.error('Error initializing club data in Firestore:', e);
        hydrateAppStateFromLocalStore();
      }
    } else {
      clearFirestoreSubscriptions();
      appState.currentUser = null;
      showAuthModal();
    }
    renderAuthStatusBanner();
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
    if (titleEl) titleEl.innerText = 'Register Coach Account (Straffan AFC)';
    if (nameWrap) nameWrap.classList.remove('hidden');
    if (submitBtn) submitBtn.innerText = 'Create Coach Account';
    if (tabSignup) tabSignup.className = 'flex-1 py-1.5 rounded font-bold text-xs bg-emerald-600 text-white';
    if (tabLogin) tabLogin.className = 'flex-1 py-1.5 rounded font-bold text-xs text-slate-400';
  } else {
    if (titleEl) titleEl.innerText = 'Coach Sign In (Straffan AFC)';
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
  appState.currentUser = {
    uid: 'local_coach_1',
    email: 'neil@straffanafc.ie',
    displayName: name
  };
  hideAuthModal();
  hydrateAppStateFromLocalStore();
  renderAuthStatusBanner();
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
    const role = appState.userProfile?.role || 'coach';
    coachNameEl.innerText = `👤 ${name} (${role.toUpperCase()})`;
  }
}
