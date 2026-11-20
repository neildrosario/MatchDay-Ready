import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

export const DEFAULT_CLUB_ID = import.meta.env.VITE_DEFAULT_CLUB_ID || 'straffan_afc';
export const DEFAULT_CLUB_NAME = import.meta.env.VITE_DEFAULT_CLUB_NAME || 'Straffan AFC';
export const DEFAULT_CLUB_FULL_NAME = 'Straffan Association Football Club';

const RUNTIME_CONFIG_KEY = 'matchday_firebase_config_v1';

export function getFirebaseConfig() {
  // 1. Check runtime config saved via UI modal (allows instant setup without rebuild)
  try {
    const saved = localStorage.getItem(RUNTIME_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Invalid runtime Firebase config in localStorage:', e);
  }

  // 2. Check Vite build-time environment variables (with matchday-ready project defaults)
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB1mk0th-aEHTnER2YszF9Kj5DjN5REo7U',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'matchday-ready.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'matchday-ready',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'matchday-ready.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '287259807842',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:287259807842:web:79e89ff173bb506e4d413b',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-X4ZX8DJ5BB'
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function isFirebaseConfigured() {
  return Boolean(getFirebaseConfig());
}

export function saveRuntimeFirebaseConfig(rawInput) {
  let cleaned = rawInput.trim();
  // Support pasting either pure JSON or a JS snippet like `const firebaseConfig = { ... };`
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  // Convert unquoted JS object keys to valid JSON if needed
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (_) {
    const jsonNormalized = cleaned
      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*}/g, '}');
    parsed = JSON.parse(jsonNormalized);
  }

  if (!parsed.apiKey || !parsed.projectId) {
    throw new Error('Config must include at least "apiKey" and "projectId".');
  }

  localStorage.setItem(RUNTIME_CONFIG_KEY, JSON.stringify(parsed));
  return parsed;
}

export function clearRuntimeFirebaseConfig() {
  localStorage.removeItem(RUNTIME_CONFIG_KEY);
}

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let googleProvider = null;

export function getFirebaseServices() {
  const config = getFirebaseConfig();
  if (!config) {
    return { app: null, auth: null, db: null, googleProvider: null, configured: false };
  }

  if (!appInstance) {
    appInstance = getApps().length ? getApp() : initializeApp(config);
    authInstance = getAuth(appInstance);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    try {
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (_) {
      dbInstance = getFirestore(appInstance);
    }
  }

  return {
    app: appInstance,
    auth: authInstance,
    db: dbInstance,
    googleProvider,
    configured: true
  };
}
