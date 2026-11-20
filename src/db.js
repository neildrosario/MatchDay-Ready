import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  getFirebaseServices,
  DEFAULT_CLUB_ID,
  DEFAULT_CLUB_NAME,
  DEFAULT_CLUB_FULL_NAME
} from './firebase.js';
import {
  getAccessibleTeamsForProfile,
  getEffectiveUserProfile,
  isClubAdmin,
  isPrimaryAdminEmail,
  isProfileActive,
  canModifyUserRole,
  canRemoveUser,
  canApproveTeamRequest,
  normalizeRole
} from './permissions.js';
import {
  FORMAT_SIZES,
  FORMATIONS_BY_FORMAT,
  FORMATIONS,
  getDefaultShapeForFormat,
  getAvailableShapesForFormat,
  getPositionsForFormatAndShape,
  getMatchPeriodsForCount,
  getPeriodShortLabel,
  getPeriodLongLabel,
  getPeriodUnitLabel,
  computeHistoricalSeasonFairnessSeed,
  detectSharedPlayerConflicts,
  normalizeJoinCode,
  generateClubJoinCode,
  generateClubSlug,
  extractUFootballVersionRank,
  parseUFootballPayloadFromString
} from './engine.js';

export {
  FORMAT_SIZES,
  FORMATIONS_BY_FORMAT,
  FORMATIONS,
  getDefaultShapeForFormat,
  getAvailableShapesForFormat,
  getPositionsForFormatAndShape,
  getPeriodShortLabel,
  getPeriodLongLabel,
  getPeriodUnitLabel,
  normalizeJoinCode,
  generateClubJoinCode,
  generateClubSlug,
  extractUFootballVersionRank,
  parseUFootballPayloadFromString
};

const LOCAL_CLUB_STORE_KEY = 'matchday_club_store_v3';

function createInitialSeedData(adminUid = 'local_coach_1', adminEmail = 'neil@straffanafc.ie', adminName = "Neil D'Rosario") {
  const defaultPlayers = [
    { firstName: 'Liam', lastName: "O'Connor", primary: 'u10_white', shared: true },
    { firstName: 'Noah', lastName: 'Byrne', primary: 'u10_white', shared: true },
    { firstName: 'Oliver', lastName: 'Doyle', primary: 'u10_white', shared: false },
    { firstName: 'Jack', lastName: 'Ryan', primary: 'u10_white', shared: false },
    { firstName: 'Harry', lastName: 'Walsh', primary: 'u10_white', shared: false },
    { firstName: 'Charlie', lastName: 'Murphy', primary: 'u10_white', shared: false },
    { firstName: 'Leo', lastName: 'Kelly', primary: 'u10_white', shared: false },
    { firstName: 'Oscar', lastName: 'Dunn', primary: 'u10_white', shared: false },
    { firstName: 'Max', lastName: 'Smith', primary: 'u10_white', shared: false },
    { firstName: 'Lucas', lastName: 'Kavanagh', primary: 'u10_white', shared: false },
    { firstName: 'Sam', lastName: 'Brown', primary: 'u10_green', shared: true },
    { firstName: 'Ethan', lastName: 'Nolan', primary: 'u10_green', shared: true },
    { firstName: 'Finn', lastName: 'Gallagher', primary: 'u10_green', shared: false },
    { firstName: 'Cian', lastName: 'Farrell', primary: 'u10_green', shared: false },
    { firstName: 'Tadhg', lastName: 'Brennan', primary: 'u10_green', shared: false },
    { firstName: 'Rory', lastName: 'Maguire', primary: 'u10_green', shared: false },
    { firstName: 'Darragh', lastName: 'Keane', primary: 'u10_green', shared: false },
    { firstName: 'Senan', lastName: 'Healy', primary: 'u10_green', shared: false }
  ];

  const playersMap = {};
  defaultPlayers.forEach((p, idx) => {
    const id = `player_${idx + 1}_${p.firstName.toLowerCase()}`;
    const displayName = `${p.firstName} ${p.lastName.charAt(0).toUpperCase()}.`;
    playersMap[id] = {
      playerId: id,
      clubId: DEFAULT_CLUB_ID,
      ageGroup: 'U10',
      firstName: p.firstName,
      lastName: p.lastName,
      displayName,
      primaryTeamId: p.primary,
      allowedTeamIds: p.shared ? ['u10_white', 'u10_green'] : [p.primary]
    };
  });

  return {
    clubs: {
      [DEFAULT_CLUB_ID]: {
        clubId: DEFAULT_CLUB_ID,
        name: DEFAULT_CLUB_FULL_NAME,
        shortName: DEFAULT_CLUB_NAME,
        joinCode: 'STRAFFAN-2026',
        joinCodeEnabled: true,
        joinDefaultRole: 'coach',
        createdAt: new Date().toISOString()
      }
    },
    teams: {
      u10_white: {
        teamId: 'u10_white',
        clubId: DEFAULT_CLUB_ID,
        name: 'U10 White',
        ageGroup: 'U10',
        defaultFormation: '7v7',
        defaultQtrMins: 12,
        coachIds: [adminUid]
      },
      u10_green: {
        teamId: 'u10_green',
        clubId: DEFAULT_CLUB_ID,
        name: 'U10 Green',
        ageGroup: 'U10',
        defaultFormation: '7v7',
        defaultQtrMins: 12,
        coachIds: [adminUid]
      }
    },
    users: {
      [adminUid]: {
        uid: adminUid,
        email: adminEmail,
        displayName: adminName,
        role: 'admin',
        status: 'active',
        clubId: DEFAULT_CLUB_ID,
        assignedTeamIds: ['u10_white', 'u10_green'],
        assignedAgeGroups: ['U10'],
        memberClubIds: [DEFAULT_CLUB_ID],
        clubMemberships: {
          [DEFAULT_CLUB_ID]: {
            clubId: DEFAULT_CLUB_ID,
            clubName: DEFAULT_CLUB_NAME,
            role: 'admin',
            status: 'active',
            assignedTeamIds: ['u10_white', 'u10_green'],
            assignedAgeGroups: ['U10']
          }
        }
      }
    },
    invites: {},
    joinCodes: {
      'STRAFFAN-2026': {
        code: 'STRAFFAN-2026',
        clubId: DEFAULT_CLUB_ID,
        clubName: DEFAULT_CLUB_NAME,
        active: true,
        defaultRole: 'coach',
        updatedAt: new Date().toISOString(),
        updatedBy: adminUid
      }
    },
    joinRequests: {},
    teamRequests: {},
    players: playersMap,
    matches: {},
    lineups: {}
  };
}

// Reactive application state shared across UI modules
export const appState = {
  mode: 'local', // 'firebase' | 'local'
  syncState: 'local', // 'synced' | 'syncing' | 'local' | 'error'
  accessStatus: 'ready', // 'ready' | 'loading' | 'needs_onboarding' | 'pending_approval' | 'rejected' | 'suspended'
  pendingJoinRequest: null, // Active/rejected joinRequest for unattached user
  claimedInviteNotice: null, // Banner notice shown after auto-claiming an email invite or joining via code
  authDiagnosticError: null, // Surfaces real Firestore/auth errors instead of silently dumping to join code gate
  inviteEmailMismatch: null, // { expectedEmail, signedInEmail, inviteId } when SSO account doesn't match invite link
  myPendingInvites: [], // Pending email invites addressed to the signed-in user across clubs (Milestone 15)
  currentUser: null, // Firebase auth user or local user profile
  userProfile: null, // Real document from `users` collection
  adminViewAsRole: 'admin', // 'admin' | 'lead' — lets Club Admin switch to Age-Group Lead view for their own teams
  adminLeadAgeGroup: localStorage.getItem('matchday_admin_lead_ag_v1') || '', // Optional selected age group for Admin Lead View (e.g. 'U8')
  club: null,
  teams: [], // Teams accessible to this user
  allClubTeams: [], // All teams in club (for shared player badges & admin)
  allClubUsers: [], // All coaches/leads/viewers/admins in club
  allClubInvites: [], // Pending/accepted email invites for club (Admin only)
  allClubJoinRequests: [], // Legacy pending/reviewed join-code requests (Admin only)
  allClubTeamRequests: [], // Team access requests (Coach own requests, Lead age-group requests, Admin all requests)
  selectedTeamId: localStorage.getItem('matchday_selected_team_v3') || 'u10_white',
  selectedDate: new Date().toISOString().split('T')[0],
  currentQuarter: 1,
  players: [], // All players in club/ageGroup
  allMatches: {}, // { [matchId]: matchDoc } across all club teams
  matchesByTeam: {}, // { [matchId]: matchDoc } for selectedTeamId
  lineupsByMatch: {}, // { [matchId]: { 1: lineupDoc, 2: lineupDoc, 3: lineupDoc, 4: lineupDoc } }
  sameDateLineupsAllTeams: [] // Used for real-time shared player conflict warnings
};

const listeners = new Set();
let activeUnsubscribes = [];
let adminUnsubscribes = [];
let accessGateUnsubscribes = [];
const backfilledClubIds = new Set();

export function getActiveClubId() {
  return appState.userProfile?.clubId || appState.club?.clubId || DEFAULT_CLUB_ID;
}

/**
 * Returns the effective user profile for UI filtering & permissions.
 * Club Admins default to 'admin' on sign-in, and can toggle to 'lead' to scope
 * their view strictly to their own age-group teams (e.g. U10 Green & U10 White).
 */
export function getActiveUserProfile() {
  return getEffectiveUserProfile(
    appState.userProfile,
    appState.adminViewAsRole,
    appState.allClubTeams,
    appState.adminLeadAgeGroup
  );
}

export function setAdminRoleView(mode = 'admin', ageGroup = '') {
  if (!isClubAdmin(appState.userProfile)) {
    appState.adminViewAsRole = 'admin';
    return;
  }
  if (ageGroup) {
    appState.adminLeadAgeGroup = ageGroup.trim();
    try {
      localStorage.setItem('matchday_admin_lead_ag_v1', appState.adminLeadAgeGroup);
    } catch (_) {}
  }
  appState.adminViewAsRole = mode === 'lead' ? 'lead' : 'admin';
  filterAccessibleTeams();
  notifyAppState();
}

/**
 * Returns the normalized list of clubs the signed-in user belongs to (Milestone 15).
 * Gracefully handles legacy single-club user docs that don't yet have `clubMemberships`.
 */
export function getUserClubMemberships(profile = appState.userProfile) {
  if (!profile) return [];
  const map = profile.clubMemberships && typeof profile.clubMemberships === 'object'
    ? { ...profile.clubMemberships }
    : {};

  if (profile.clubId && !map[profile.clubId]) {
    map[profile.clubId] = {
      clubId: profile.clubId,
      clubName:
        appState.club?.clubId === profile.clubId
          ? appState.club.shortName || appState.club.name || profile.clubId
          : profile.clubId,
      role: normalizeRole(profile.role || 'viewer'),
      status: profile.status || 'active',
      assignedTeamIds: Array.isArray(profile.assignedTeamIds) ? profile.assignedTeamIds : [],
      assignedAgeGroups: Array.isArray(profile.assignedAgeGroups) ? profile.assignedAgeGroups : []
    };
  }

  if (appState.club?.clubId && map[appState.club.clubId]) {
    map[appState.club.clubId] = {
      ...map[appState.club.clubId],
      clubName: appState.club.shortName || appState.club.name || map[appState.club.clubId].clubName
    };
  }

  return Object.values(map).sort((a, b) =>
    (a.clubName || a.clubId || '').localeCompare(b.clubName || b.clubId || '')
  );
}

function buildSeededMembershipsForUser(existingProfile) {
  const base =
    existingProfile?.clubMemberships && typeof existingProfile.clubMemberships === 'object'
      ? { ...existingProfile.clubMemberships }
      : {};
  if (existingProfile?.clubId && !base[existingProfile.clubId]) {
    base[existingProfile.clubId] = {
      clubId: existingProfile.clubId,
      clubName:
        appState.club?.clubId === existingProfile.clubId
          ? appState.club.shortName || appState.club.name || existingProfile.clubId
          : existingProfile.clubId,
      role: normalizeRole(existingProfile.role || 'coach'),
      status: existingProfile.status || 'active',
      assignedTeamIds: Array.isArray(existingProfile.assignedTeamIds)
        ? [...existingProfile.assignedTeamIds]
        : [],
      assignedAgeGroups: Array.isArray(existingProfile.assignedAgeGroups)
        ? [...existingProfile.assignedAgeGroups]
        : [],
      canViewSplitter: existingProfile.canViewSplitter !== false,
      canViewStats: existingProfile.canViewStats !== false
    };
  }
  return base;
}

export function subscribeAppState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notifyAppState() {
  listeners.forEach(fn => {
    try {
      fn(appState);
    } catch (e) {
      console.error('State listener error:', e);
    }
  });
}

// --- LOCAL MULTI-TENANT FALLBACK STORE ---
function loadLocalStore() {
  try {
    const raw = localStorage.getItem(LOCAL_CLUB_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.clubs && parsed.teams) return parsed;
    }
  } catch (e) {
    console.warn('Error loading local store:', e);
  }
  const seed = createInitialSeedData();
  localStorage.setItem(LOCAL_CLUB_STORE_KEY, JSON.stringify(seed));
  return seed;
}

function saveLocalStore(store) {
  localStorage.setItem(LOCAL_CLUB_STORE_KEY, JSON.stringify(store));
  hydrateAppStateFromLocalStore(store);
}

export function hydrateAppStateFromLocalStore(storeInput) {
  const store = storeInput || loadLocalStore();
  appState.mode = 'local';
  appState.syncState = 'local';
  appState.accessStatus = 'ready';
  appState.pendingJoinRequest = null;
  appState.myPendingInvites = [];

  const uid = appState.currentUser?.uid || 'local_coach_1';
  if (!store.users[uid]) {
    store.users[uid] = {
      uid,
      email: appState.currentUser?.email || 'neil@straffanafc.ie',
      displayName: appState.currentUser?.displayName || "Neil D'Rosario",
      role: 'admin',
      status: 'active',
      clubId: DEFAULT_CLUB_ID,
      assignedTeamIds: ['u10_white', 'u10_green'],
      assignedAgeGroups: ['U10'],
      memberClubIds: [DEFAULT_CLUB_ID],
      clubMemberships: {
        [DEFAULT_CLUB_ID]: {
          clubId: DEFAULT_CLUB_ID,
          clubName: DEFAULT_CLUB_NAME,
          role: 'admin',
          status: 'active',
          assignedTeamIds: ['u10_white', 'u10_green'],
          assignedAgeGroups: ['U10']
        }
      }
    };
  }

  appState.userProfile = store.users[uid];
  const activeClubId = appState.userProfile.clubId || DEFAULT_CLUB_ID;

  appState.club = store.clubs[activeClubId] || store.clubs[DEFAULT_CLUB_ID] || {
    clubId: activeClubId,
    name: DEFAULT_CLUB_FULL_NAME,
    shortName: DEFAULT_CLUB_NAME,
    joinCode: 'STRAFFAN-2026',
    joinCodeEnabled: true
  };

  appState.allClubTeams = Object.values(store.teams || {}).filter(
    t => (t.clubId || DEFAULT_CLUB_ID) === activeClubId
  );
  appState.allClubUsers = Object.values(store.users || {})
    .filter(
      u =>
        (u.clubId || DEFAULT_CLUB_ID) === activeClubId ||
        (Array.isArray(u.memberClubIds) && u.memberClubIds.includes(activeClubId))
    )
    .map(u => projectUserForClub(u, activeClubId));
  appState.allClubInvites = Object.values(store.invites || {}).filter(
    i => (i.clubId || DEFAULT_CLUB_ID) === activeClubId
  );
  appState.allClubJoinRequests = Object.values(store.joinRequests || {}).filter(
    r => (r.clubId || DEFAULT_CLUB_ID) === activeClubId
  );
  appState.allClubTeamRequests = Object.values(store.teamRequests || {}).filter(
    r => (r.clubId || DEFAULT_CLUB_ID) === activeClubId
  );
  appState.teams = getAccessibleTeamsForProfile(appState.userProfile, appState.allClubTeams);

  if (appState.teams.length > 0 && !appState.teams.some(t => t.teamId === appState.selectedTeamId)) {
    appState.selectedTeamId = appState.teams[0].teamId;
  }

  appState.players = Object.values(store.players || {}).filter(
    p => (p.clubId || DEFAULT_CLUB_ID) === activeClubId
  );
  appState.allMatches = {};
  appState.matchesByTeam = {};
  Object.values(store.matches || {}).forEach(m => {
    if ((m.clubId || DEFAULT_CLUB_ID) !== activeClubId) return;
    appState.allMatches[m.matchId] = m;
    if (m.teamId === appState.selectedTeamId) {
      appState.matchesByTeam[m.matchId] = m;
    }
  });

  appState.lineupsByMatch = {};
  appState.sameDateLineupsAllTeams = [];
  Object.values(store.lineups || {}).forEach(l => {
    if ((l.clubId || DEFAULT_CLUB_ID) !== activeClubId) return;
    if (!appState.lineupsByMatch[l.matchId]) {
      appState.lineupsByMatch[l.matchId] = {};
    }
    appState.lineupsByMatch[l.matchId][l.quarter] = l;
    if (l.date === appState.selectedDate) {
      appState.sameDateLineupsAllTeams.push(l);
    }
  });

  notifyAppState();
}

function projectUserForClub(userDoc, clubId) {
  if (!userDoc) return userDoc;
  if (userDoc.clubId === clubId) return userDoc;
  const m = userDoc.clubMemberships?.[clubId];
  if (!m) return userDoc;
  return {
    ...userDoc,
    role: m.role || userDoc.role,
    status: m.status || 'active',
    assignedTeamIds: Array.isArray(m.assignedTeamIds) ? m.assignedTeamIds : [],
    assignedAgeGroups: Array.isArray(m.assignedAgeGroups) ? m.assignedAgeGroups : [],
    canViewSplitter: m.canViewSplitter !== false,
    canViewStats: m.canViewStats !== false
  };
}

// --- CLOUD FIRESTORE SEEDING, INVITE CLAIMING & SUBSCRIPTIONS (Milestone 13) ---
function clearAdminSubscriptions() {
  adminUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (_) {}
  });
  adminUnsubscribes = [];
}

function clearAccessGateSubscriptions() {
  accessGateUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (_) {}
  });
  accessGateUnsubscribes = [];
}

export function clearFirestoreSubscriptions() {
  activeUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (_) {}
  });
  activeUnsubscribes = [];
  clearAdminSubscriptions();
  clearAccessGateSubscriptions();
}

function resetClubRuntimeData() {
  appState.club = null;
  appState.teams = [];
  appState.allClubTeams = [];
  appState.allClubUsers = [];
  appState.allClubInvites = [];
  appState.allClubJoinRequests = [];
  appState.allClubTeamRequests = [];
  appState.players = [];
  appState.allMatches = {};
  appState.matchesByTeam = {};
  appState.lineupsByMatch = {};
  appState.sameDateLineupsAllTeams = [];
}

/**
 * Watches `users/{uid}`, `invites` (by email), and legacy `joinRequests` while an unattached user
 * is on the Access Gate, so the moment an Admin invites or approves them, the app unlocks live!
 */
function startAccessGateWatcher(firebaseUser) {
  clearAccessGateSubscriptions();
  const { db } = getFirebaseServices();
  if (!db || !firebaseUser) return;

  accessGateUnsubscribes.push(
    onSnapshot(doc(db, 'users', firebaseUser.uid), snap => {
      if (snap.exists()) {
        const profile = snap.data();
        appState.userProfile = profile;
        if (isProfileActive(profile)) {
          clearAccessGateSubscriptions();
          appState.accessStatus = 'ready';
          appState.pendingJoinRequest = null;
          appState.authDiagnosticError = null;
          appState.inviteEmailMismatch = null;
          startFirestoreSubscriptions(firebaseUser);
        } else {
          appState.accessStatus = 'suspended';
          notifyAppState();
        }
      }
    })
  );

  // Live watcher for late email invites -> auto-claims immediately when Admin sends an invite!
  const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
  if (cleanEmail) {
    let claimingFromWatcher = false;
    accessGateUnsubscribes.push(
      onSnapshot(
        query(collection(db, 'invites'), where('email', '==', cleanEmail)),
        async snap => {
          if (claimingFromWatcher || appState.accessStatus === 'ready') return;
          const pending = snap.docs
            .map(d => ({ inviteId: d.id, ...d.data() }))
            .find(inv => inv.status === 'pending');
          if (pending) {
            claimingFromWatcher = true;
            try {
              const res = await ensureUserAndClubSeeded(firebaseUser, {
                inviteIdHint: pending.inviteId
              });
              if (res?.accessStatus === 'ready') {
                startFirestoreSubscriptions(firebaseUser);
              }
            } catch (err) {
              console.warn('Live invite auto-claim error:', err);
            } finally {
              claimingFromWatcher = false;
            }
          }
        },
        err => {
          console.warn('Invite watcher error:', err);
        }
      )
    );
  }

  accessGateUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'joinRequests'), where('uid', '==', firebaseUser.uid)),
      snap => {
        const reqs = snap.docs
          .map(d => ({ requestId: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        const pending = reqs.find(r => r.status === 'pending');
        const rejected = reqs.find(r => r.status === 'rejected');
        if (pending) {
          appState.pendingJoinRequest = pending;
          if (appState.accessStatus !== 'ready') {
            appState.accessStatus = 'pending_approval';
          }
        } else if (rejected && appState.accessStatus !== 'ready') {
          appState.pendingJoinRequest = rejected;
          appState.accessStatus = 'rejected';
        } else if (appState.accessStatus === 'pending_approval') {
          appState.pendingJoinRequest = null;
          appState.accessStatus = 'needs_onboarding';
        }
        notifyAppState();
      },
      err => {
        console.warn('Join request watcher error:', err);
      }
    )
  );
}

/**
 * Resolves a signed-in user's club membership:
 * 1. Existing `users/{uid}` profile -> Active or Suspended (auto-claims additional club if `?invite=` matches another club)
 * 2. Pre-authorized email invite (direct `?invite=` getDoc OR email query) -> Auto-claim immediately (ZERO join code popup!)
 * 3. Club Registration Code provided via signup form or `?code=` URL -> Instant active coach profile (0 teams; coach requests team access)
 * 4. Brand-new empty Firestore (no default club yet) -> Bootstrap founding Admin
 * 5. Otherwise -> Show Access Gate (Join Club with Registration Code or Register New Club) with full diagnostic clarity
 */
export async function ensureUserAndClubSeeded(firebaseUser, options = {}) {
  const { db, configured } = getFirebaseServices();
  if (!configured || !db || !firebaseUser) return { accessStatus: 'needs_onboarding' };

  const inviteIdHint = (options.inviteIdHint || '').trim();
  const expectedInviteEmail = (options.expectedInviteEmail || '').trim().toLowerCase();
  const joinCodeHint = normalizeJoinCode(options.joinCodeHint || '');
  const displayNameHint = (options.displayNameHint || '').trim();

  appState.mode = 'firebase';
  appState.syncState = 'syncing';
  appState.accessStatus = 'loading';
  appState.claimedInviteNotice = null;
  appState.authDiagnosticError = null;
  appState.inviteEmailMismatch = null;
  notifyAppState();

  const userRef = doc(db, 'users', firebaseUser.uid);
  const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
  const resolvedName =
    displayNameHint ||
    firebaseUser.displayName ||
    (cleanEmail ? cleanEmail.split('@')[0] : 'Coach');

  // Helper to claim a pending invite for a first-time user (strictly surfaces errors!)
  const claimPendingInviteForNewUser = async inv => {
    const claimedRole = normalizeRole(inv.role || 'coach');
    const claimedTeams = Array.isArray(inv.assignedTeamIds) ? [...inv.assignedTeamIds] : [];
    const claimedGroups = Array.isArray(inv.assignedAgeGroups) ? [...inv.assignedAgeGroups] : [];
    const claimedSplitter = claimedRole === 'admin' ? true : inv.canViewSplitter !== false;
    const claimedStats = claimedRole === 'admin' ? true : inv.canViewStats !== false;
    const newProfile = {
      uid: firebaseUser.uid,
      email: cleanEmail,
      displayName: displayNameHint || firebaseUser.displayName || inv.displayName || resolvedName,
      role: claimedRole,
      status: 'active',
      clubId: inv.clubId,
      assignedTeamIds: claimedTeams,
      assignedAgeGroups: claimedGroups,
      canViewSplitter: claimedSplitter,
      canViewStats: claimedStats,
      memberClubIds: [inv.clubId],
      clubMemberships: {
        [inv.clubId]: {
          clubId: inv.clubId,
          clubName: inv.clubName || inv.clubId,
          role: claimedRole,
          status: 'active',
          assignedTeamIds: claimedTeams,
          assignedAgeGroups: claimedGroups,
          canViewSplitter: claimedSplitter,
          canViewStats: claimedStats
        }
      },
      claimedInviteId: inv.inviteId,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(userRef, newProfile);
    } catch (writeErr) {
      console.error('Failed to activate pre-authorized invite profile:', writeErr);
      appState.authDiagnosticError =
        `Your pre-authorized invite for ${inv.clubName || inv.clubId} was found, but Firestore blocked activating your profile (${writeErr.code || writeErr.message}). Please ask your Club Admin to deploy the latest Firestore security rules.`;
      return null;
    }

    try {
      await updateDoc(doc(db, 'invites', inv.inviteId), {
        status: 'accepted',
        claimedBy: firebaseUser.uid,
        claimedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not mark invite as accepted:', err);
    }

    clearAccessGateSubscriptions();
    appState.userProfile = newProfile;
    appState.accessStatus = 'ready';
    appState.pendingJoinRequest = null;
    appState.authDiagnosticError = null;
    appState.inviteEmailMismatch = null;
    appState.claimedInviteNotice = `Welcome to ${inv.clubName || 'your club'}! Your pre-authorized ${newProfile.role.toUpperCase()} access is active.`;
    notifyAppState();
    return { accessStatus: 'ready', userProfile: newProfile, claimedInvite: inv };
  };

  // 1. Check existing user profile first
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    let profile = userSnap.data();

    // Ensure verified primary owner (neildrosario@gmail.com) ALWAYS defaults to active Club Admin
    if (isPrimaryAdminEmail(cleanEmail)) {
      const activeClub = profile.clubId || DEFAULT_CLUB_ID;
      const existingMemberships = buildSeededMembershipsForUser(profile);
      const currentClubEntry = existingMemberships[activeClub] || {
        clubId: activeClub,
        clubName: activeClub === DEFAULT_CLUB_ID ? DEFAULT_CLUB_NAME : activeClub,
        role: 'admin',
        status: 'active',
        assignedTeamIds: Array.isArray(profile.assignedTeamIds) ? [...profile.assignedTeamIds] : [],
        assignedAgeGroups:
          Array.isArray(profile.assignedAgeGroups) && profile.assignedAgeGroups.length > 0
            ? [...profile.assignedAgeGroups]
            : ['U10'],
        canViewSplitter: true,
        canViewStats: true
      };
      const leadAgeGroups =
        Array.isArray(profile.assignedAgeGroups) && profile.assignedAgeGroups.length > 0
          ? [...profile.assignedAgeGroups]
          : ['U10'];
      const needsAdminUpgrade =
        profile.role !== 'admin' ||
        profile.status !== 'active' ||
        currentClubEntry.role !== 'admin' ||
        !Array.isArray(profile.assignedAgeGroups) ||
        profile.assignedAgeGroups.length === 0;

      if (needsAdminUpgrade) {
        const now = new Date().toISOString();
        const upgradedMemberships = {
          ...existingMemberships,
          [activeClub]: {
            ...currentClubEntry,
            role: 'admin',
            status: 'active',
            assignedAgeGroups: leadAgeGroups,
            canViewSplitter: true,
            canViewStats: true
          }
        };
        const upgradePatch = {
          role: 'admin',
          status: 'active',
          assignedAgeGroups: leadAgeGroups,
          canViewSplitter: true,
          canViewStats: true,
          clubMemberships: upgradedMemberships,
          memberClubIds: Array.from(new Set([...(profile.memberClubIds || []), activeClub])),
          updatedAt: now
        };
        try {
          await setDoc(userRef, upgradePatch, { merge: true });
        } catch (upgradeErr) {
          console.warn('Primary admin profile sync note:', upgradeErr);
        }
        profile = { ...profile, ...upgradePatch };
      }
      appState.adminViewAsRole = 'admin';
    }

    appState.userProfile = profile;
    if (!isProfileActive(profile)) {
      resetClubRuntimeData();
      appState.accessStatus = 'suspended';
      appState.syncState = 'synced';
      notifyAppState();
      startAccessGateWatcher(firebaseUser);
      return { accessStatus: 'suspended', userProfile: profile };
    }

    // If user clicked an invite link for ANOTHER club while already having a profile, auto-claim it!
    if (inviteIdHint && cleanEmail) {
      try {
        const directSnap = await getDoc(doc(db, 'invites', inviteIdHint));
        if (directSnap.exists()) {
          const inv = { inviteId: directSnap.id, ...directSnap.data() };
          if (
            inv.status === 'pending' &&
            (inv.email || '').trim().toLowerCase() === cleanEmail &&
            inv.clubId &&
            inv.clubId !== profile.clubId &&
            !(profile.clubMemberships && profile.clubMemberships[inv.clubId])
          ) {
            appState.myPendingInvites = [inv];
            await claimAdditionalInvite(inv.inviteId);
            return { accessStatus: 'ready', userProfile: appState.userProfile, claimedInvite: inv };
          }
        }
      } catch (err) {
        console.warn('Direct additional invite check note:', err);
      }
    }

    appState.accessStatus = 'ready';
    notifyAppState();
    return { accessStatus: 'ready', userProfile: profile };
  }

  // 1B. Primary owner admin (neildrosario@gmail.com) with no profile doc yet -> create active Club Admin immediately
  if (isPrimaryAdminEmail(cleanEmail)) {
    const now = new Date().toISOString();
    const ownerProfile = {
      uid: firebaseUser.uid,
      email: cleanEmail,
      displayName: resolvedName || "Neil D'Rosario",
      role: 'admin',
      status: 'active',
      clubId: DEFAULT_CLUB_ID,
      assignedTeamIds: [],
      assignedAgeGroups: ['U10'],
      canViewSplitter: true,
      canViewStats: true,
      memberClubIds: [DEFAULT_CLUB_ID],
      clubMemberships: {
        [DEFAULT_CLUB_ID]: {
          clubId: DEFAULT_CLUB_ID,
          clubName: DEFAULT_CLUB_NAME,
          role: 'admin',
          status: 'active',
          assignedTeamIds: [],
          assignedAgeGroups: ['U10'],
          canViewSplitter: true,
          canViewStats: true
        }
      },
      createdAt: now,
      updatedAt: now
    };
    await setDoc(userRef, ownerProfile);
    appState.userProfile = ownerProfile;
    appState.adminViewAsRole = 'admin';
    appState.accessStatus = 'ready';
    notifyAppState();
    return { accessStatus: 'ready', userProfile: ownerProfile };
  }

  // 2. Check pre-authorized email invite (Direct ?invite= lookup first, then email query)
  if (cleanEmail) {
    // 2A. Direct getDoc lookup via ?invite=<inviteId>
    if (inviteIdHint) {
      try {
        const directSnap = await getDoc(doc(db, 'invites', inviteIdHint));
        if (directSnap.exists()) {
          const inv = { inviteId: directSnap.id, ...directSnap.data() };
          if (inv.status === 'pending' && (inv.email || '').trim().toLowerCase() === cleanEmail) {
            const claimed = await claimPendingInviteForNewUser(inv);
            if (claimed) return claimed;
          }
        }
      } catch (err) {
        console.warn('Direct invite lookup note:', err);
        if (expectedInviteEmail && expectedInviteEmail !== cleanEmail) {
          appState.inviteEmailMismatch = {
            expectedEmail: expectedInviteEmail,
            signedInEmail: cleanEmail,
            inviteId: inviteIdHint
          };
        } else if (err?.code === 'permission-denied') {
          appState.inviteEmailMismatch = {
            expectedEmail: expectedInviteEmail || 'the invited email address',
            signedInEmail: cleanEmail,
            inviteId: inviteIdHint
          };
        }
      }
    }

    // 2B. Email-based collection query lookup (works even without ?invite= in URL!)
    if (!appState.authDiagnosticError) {
      try {
        const inviteSnap = await getDocs(
          query(collection(db, 'invites'), where('email', '==', cleanEmail))
        );
        const pendingInvites = inviteSnap.docs
          .map(d => ({ inviteId: d.id, ...d.data() }))
          .filter(inv => inv.status === 'pending');

        if (pendingInvites.length > 0) {
          const claimed = await claimPendingInviteForNewUser(pendingInvites[0]);
          if (claimed) return claimed;
        }
      } catch (err) {
        console.error('Invite lookup error:', err);
        appState.authDiagnosticError =
          `Could not verify your pre-authorized email invite (${err.code || err.message}). If your Club Admin already invited ${cleanEmail}, please ensure the latest Firestore rules are deployed.`;
      }
    }
  }

  // 3. Auto-redeem Club Registration Code if provided during signup or via ?code= link
  if (joinCodeHint && !appState.inviteEmailMismatch) {
    try {
      const joined = await joinClubWithCode({
        joinCode: joinCodeHint,
        displayName: resolvedName,
        autoStartSubscriptions: false
      });
      if (joined) {
        return { accessStatus: 'ready', userProfile: joined };
      }
    } catch (codeErr) {
      console.warn('Auto join-code registration note:', codeErr);
      appState.authDiagnosticError = codeErr.message || 'Could not redeem Club Registration Code.';
    }
  }

  // 4. Check if default club needs initial first-ever bootstrap (empty Firebase project only)
  const clubRef = doc(db, 'clubs', DEFAULT_CLUB_ID);
  let clubExists = true;
  try {
    const clubSnap = await getDoc(clubRef);
    clubExists = clubSnap.exists();
  } catch (err) {
    // Permission denied means the club already exists and this uninvited user is not a member
    clubExists = true;
  }

  if (!clubExists) {
    const seed = createInitialSeedData(
      firebaseUser.uid,
      firebaseUser.email || 'neil@straffanafc.ie',
      resolvedName || "Neil D'Rosario"
    );

    // Create founding Admin user first (allowed when club does not exist yet), then club & seed data
    await setDoc(userRef, seed.users[firebaseUser.uid]);
    await setDoc(clubRef, {
      ...seed.clubs[DEFAULT_CLUB_ID],
      createdAt: serverTimestamp()
    });
    const defaultJoinCode = seed.clubs[DEFAULT_CLUB_ID].joinCode;
    await setDoc(doc(db, 'joinCodes', defaultJoinCode), seed.joinCodes[defaultJoinCode]);
    for (const team of Object.values(seed.teams)) {
      await setDoc(doc(db, 'teams', team.teamId), team);
    }
    for (const player of Object.values(seed.players)) {
      await setDoc(doc(db, 'players', player.playerId), player);
    }

    appState.userProfile = seed.users[firebaseUser.uid];
    appState.accessStatus = 'ready';
    notifyAppState();
    return { accessStatus: 'ready', userProfile: appState.userProfile };
  }

  // 5. Club exists & user has no profile or matching invite yet -> Check legacy joinRequests & show Access Gate
  resetClubRuntimeData();
  appState.userProfile = null;
  let accessStatus = 'needs_onboarding';
  let foundReq = null;

  try {
    const reqSnap = await getDocs(
      query(collection(db, 'joinRequests'), where('uid', '==', firebaseUser.uid))
    );
    const reqs = reqSnap.docs
      .map(d => ({ requestId: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    const pending = reqs.find(r => r.status === 'pending');
    const rejected = reqs.find(r => r.status === 'rejected');
    if (pending) {
      accessStatus = 'pending_approval';
      foundReq = pending;
    } else if (rejected) {
      accessStatus = 'rejected';
      foundReq = rejected;
    }
  } catch (err) {
    console.warn('Join request check error:', err);
  }

  appState.pendingJoinRequest = foundReq;
  appState.accessStatus = accessStatus;
  appState.syncState = 'synced';
  notifyAppState();
  startAccessGateWatcher(firebaseUser);
  return { accessStatus, joinRequest: foundReq };
}

/**
 * One-time safe migration for existing Straffan AFC deployments:
 * 1. Stamps `clubId` on any legacy `matches` & `lineups` docs for the user's assigned teams so
 *    club-scoped queries (`where('clubId', '==', clubId)`) pick them up permanently.
 * 2. Ensures `clubs/{clubId}` has an active Join Code synced in `joinCodes/{code}` (Admin only).
 */
async function backfillLegacyClubDataIfNeeded(clubId) {
  if (backfilledClubIds.has(clubId)) return;
  const { db } = getFirebaseServices();
  if (!db || !appState.userProfile) return;
  backfilledClubIds.add(clubId);

  try {
    // 1. Backfill `clubId` onto legacy matches & lineups for user's assigned teams
    const teamIds = appState.userProfile.assignedTeamIds || [];
    for (const tId of teamIds) {
      try {
        const mSnap = await getDocs(
          query(collection(db, 'matches'), where('teamId', '==', tId))
        );
        for (const d of mSnap.docs) {
          if (!d.data().clubId) {
            await setDoc(doc(db, 'matches', d.id), { clubId }, { merge: true });
          }
        }

        const lSnap = await getDocs(
          query(collection(db, 'lineups'), where('teamId', '==', tId))
        );
        for (const d of lSnap.docs) {
          if (!d.data().clubId) {
            await setDoc(doc(db, 'lineups', d.id), { clubId }, { merge: true });
          }
        }
      } catch (err) {
        console.warn(`Legacy backfill skipped for team ${tId}:`, err.message);
      }
    }

    // 2. If Admin, ensure club has a joinCode & matching `joinCodes/{code}` doc
    if (isClubAdmin(appState.userProfile)) {
      const clubSnap = await getDoc(doc(db, 'clubs', clubId));
      if (clubSnap.exists()) {
        const clubData = clubSnap.data();
        const existingCode = normalizeJoinCode(clubData.joinCode || '');
        if (!existingCode) {
          const newCode = generateClubJoinCode(clubData.shortName || clubData.name || 'CLUB');
          await setDoc(
            doc(db, 'clubs', clubId),
            {
              joinCode: newCode,
              joinCodeEnabled: true,
              joinDefaultRole: 'coach'
            },
            { merge: true }
          );
          await setDoc(doc(db, 'joinCodes', newCode), {
            code: newCode,
            clubId,
            clubName: clubData.shortName || clubData.name || 'Club',
            active: true,
            defaultRole: 'coach',
            updatedAt: new Date().toISOString(),
            updatedBy: appState.userProfile.uid
          });
        } else {
          // Ensure lookup doc exists in `joinCodes`
          const codeSnap = await getDoc(doc(db, 'joinCodes', existingCode));
          if (!codeSnap.exists()) {
            await setDoc(doc(db, 'joinCodes', existingCode), {
              code: existingCode,
              clubId,
              clubName: clubData.shortName || clubData.name || 'Club',
              active: clubData.joinCodeEnabled !== false,
              defaultRole: clubData.joinDefaultRole || 'coach',
              updatedAt: new Date().toISOString(),
              updatedBy: appState.userProfile.uid
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('Legacy club data backfill note:', err);
  }
}

function startAdminSubscriptions(db, clubId) {
  clearAdminSubscriptions();

  adminUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'invites'), where('clubId', '==', clubId)),
      snap => {
        appState.allClubInvites = snap.docs
          .map(d => ({ inviteId: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        notifyAppState();
      },
      err => console.warn('Invites subscription error:', err)
    )
  );

  adminUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'joinRequests'), where('clubId', '==', clubId)),
      snap => {
        appState.allClubJoinRequests = snap.docs
          .map(d => ({ requestId: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        notifyAppState();
      },
      err => console.warn('JoinRequests subscription error:', err)
    )
  );
}

export function startFirestoreSubscriptions(firebaseUser) {
  clearFirestoreSubscriptions();
  const { db, configured } = getFirebaseServices();
  if (!configured || !db || !firebaseUser) return;

  const clubId = appState.userProfile?.clubId || DEFAULT_CLUB_ID;

  appState.mode = 'firebase';
  appState.syncState = 'syncing';
  appState.accessStatus = 'ready';
  notifyAppState();

  // Trigger safe legacy backfill in background
  backfillLegacyClubDataIfNeeded(clubId);

  // 1. Subscribe to Club document
  activeUnsubscribes.push(
    onSnapshot(doc(db, 'clubs', clubId), snap => {
      if (snap.exists()) {
        appState.club = snap.data();
        notifyAppState();
      }
    })
  );

  // 2. Subscribe to own User profile (handles live role/team changes & suspension)
  let adminSubsActive = isClubAdmin(appState.userProfile);
  if (adminSubsActive) {
    startAdminSubscriptions(db, clubId);
  }

  activeUnsubscribes.push(
    onSnapshot(doc(db, 'users', firebaseUser.uid), snap => {
      if (!snap.exists()) {
        clearFirestoreSubscriptions();
        resetClubRuntimeData();
        appState.userProfile = null;
        appState.accessStatus = 'needs_onboarding';
        notifyAppState();
        startAccessGateWatcher(firebaseUser);
        return;
      }
      const profile = snap.data();
      const prevClubId = clubId;
      appState.userProfile = profile;

      if (!isProfileActive(profile)) {
        clearFirestoreSubscriptions();
        resetClubRuntimeData();
        appState.accessStatus = 'suspended';
        notifyAppState();
        startAccessGateWatcher(firebaseUser);
        return;
      }

      // If active club switched (e.g. from another tab or Club Switcher), restart club-scoped listeners
      if (profile.clubId && profile.clubId !== prevClubId) {
        resetClubRuntimeData();
        startFirestoreSubscriptions(firebaseUser);
        return;
      }

      const nowAdmin = isClubAdmin(profile);
      if (nowAdmin && !adminSubsActive) {
        adminSubsActive = true;
        startAdminSubscriptions(db, clubId);
      } else if (!nowAdmin && adminSubsActive) {
        adminSubsActive = false;
        clearAdminSubscriptions();
        appState.allClubInvites = [];
        appState.allClubJoinRequests = [];
      }

      filterAccessibleTeams();
      notifyAppState();
    })
  );

  // 2B. Watch pending email invites addressed to THIS signed-in user across ANY club (Milestone 15)
  const myEmailLower = (firebaseUser.email || '').trim().toLowerCase();
  if (myEmailLower) {
    activeUnsubscribes.push(
      onSnapshot(
        query(collection(db, 'invites'), where('email', '==', myEmailLower)),
        snap => {
          appState.myPendingInvites = snap.docs
            .map(d => ({ inviteId: d.id, ...d.data() }))
            .filter(inv => inv.status === 'pending');
          notifyAppState();
        },
        err => console.warn('My pending invites listener note:', err)
      )
    );
  }

  // 2C. Watch team access requests (Admin & Lead see club requests; Coach/Viewer see their own requests)
  const roleForTeamReqs = normalizeRole(appState.userProfile?.role || 'viewer');
  const teamReqQuery =
    roleForTeamReqs === 'admin' || roleForTeamReqs === 'lead'
      ? query(collection(db, 'teamRequests'), where('clubId', '==', clubId))
      : query(
          collection(db, 'teamRequests'),
          where('clubId', '==', clubId),
          where('uid', '==', firebaseUser.uid)
        );
  activeUnsubscribes.push(
    onSnapshot(
      teamReqQuery,
      snap => {
        appState.allClubTeamRequests = snap.docs
          .map(d => ({ requestId: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        notifyAppState();
      },
      err => console.warn('Team requests listener note:', err)
    )
  );

  // 3. Subscribe to Club Users (active in clubId OR multi-club members of clubId)
  let primaryClubUsersMap = {};
  let multiClubUsersMap = {};
  const emitMergedClubUsers = () => {
    const merged = { ...multiClubUsersMap, ...primaryClubUsersMap };
    appState.allClubUsers = Object.values(merged).map(u => projectUserForClub(u, clubId));
    notifyAppState();
  };

  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'users'), where('clubId', '==', clubId)),
      snap => {
        primaryClubUsersMap = {};
        snap.docs.forEach(d => {
          const data = d.data();
          primaryClubUsersMap[data.uid || d.id] = data;
        });
        emitMergedClubUsers();
      }
    )
  );

  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'users'), where('memberClubIds', 'array-contains', clubId)),
      snap => {
        multiClubUsersMap = {};
        snap.docs.forEach(d => {
          const data = d.data();
          multiClubUsersMap[data.uid || d.id] = data;
        });
        emitMergedClubUsers();
      },
      err => console.warn('Multi-club users listener note:', err)
    )
  );

  // 4. Subscribe to Club Teams (club-scoped)
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'teams'), where('clubId', '==', clubId)),
      snap => {
        appState.allClubTeams = snap.docs.map(d => d.data());
        filterAccessibleTeams();
        appState.syncState = 'synced';
        notifyAppState();
      },
      err => {
        console.error('Teams subscription error:', err);
        appState.syncState = 'error';
        notifyAppState();
      }
    )
  );

  // 5. Subscribe to Club Players (club-scoped)
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'players'), where('clubId', '==', clubId)),
      snap => {
        appState.players = snap.docs.map(d => d.data());
        notifyAppState();
      }
    )
  );

  // 6. Subscribe to Club Matches (strictly club-scoped!)
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'matches'), where('clubId', '==', clubId)),
      snap => {
        const allM = {};
        const byTeam = {};
        snap.docs.forEach(d => {
          const data = d.data();
          allM[data.matchId] = data;
          if (data.teamId === appState.selectedTeamId) {
            byTeam[data.matchId] = data;
          }
        });
        appState.allMatches = allM;
        appState.matchesByTeam = byTeam;
        notifyAppState();
      },
      err => console.error('Matches subscription error:', err)
    )
  );

  // 7. Subscribe to Club Lineups (strictly club-scoped!)
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'lineups'), where('clubId', '==', clubId)),
      snap => {
        const byMatch = {};
        const sameDate = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (!byMatch[data.matchId]) byMatch[data.matchId] = {};
          byMatch[data.matchId][data.quarter] = data;
          if (data.date === appState.selectedDate) {
            sameDate.push(data);
          }
        });
        appState.lineupsByMatch = byMatch;
        appState.sameDateLineupsAllTeams = sameDate;
        appState.syncState = 'synced';
        notifyAppState();
      },
      err => console.error('Lineups subscription error:', err)
    )
  );
}

function filterAccessibleTeams() {
  const activeProfile = getActiveUserProfile();
  if (!activeProfile) {
    appState.teams = [];
    return;
  }
  appState.teams = getAccessibleTeamsForProfile(activeProfile, appState.allClubTeams);
  if (appState.teams.length === 0 && !isClubAdmin(activeProfile)) {
    appState.selectedTeamId = '';
    return;
  }
  if (
    appState.teams.length > 0 &&
    !appState.teams.some(t => t.teamId === appState.selectedTeamId)
  ) {
    appState.selectedTeamId = appState.teams[0].teamId;
    localStorage.setItem('matchday_selected_team_v3', appState.selectedTeamId);
  }
}

// --- HELPER SELECTORS ---
export function getSelectedTeam() {
  const activeProfile = getActiveUserProfile();
  if (activeProfile && !isClubAdmin(activeProfile) && appState.teams.length === 0) {
    return {
      teamId: '',
      clubId: getActiveClubId(),
      name: 'No Team Assigned',
      ageGroup: '',
      defaultFormation: '7v7',
      defaultQtrMins: 12
    };
  }
  return (
    appState.teams.find(t => t.teamId === appState.selectedTeamId) ||
    appState.teams[0] ||
    appState.allClubTeams.find(t => t.teamId === appState.selectedTeamId) ||
    appState.allClubTeams[0] || {
      teamId: appState.selectedTeamId || 'u10_white',
      clubId: getActiveClubId(),
      name: 'Squad',
      ageGroup: 'U10',
      defaultFormation: '7v7',
      defaultQtrMins: 12
    }
  );
}

export function getMatchId(teamId, dateStr) {
  return `${teamId}_${dateStr}`;
}

export function getLineupId(matchId, quarter) {
  return `${matchId}_q${quarter}`;
}

export function getTeamPlayers(teamId = appState.selectedTeamId) {
  return appState.players
    .filter(
      p =>
        p.primaryTeamId === teamId ||
        (Array.isArray(p.allowedTeamIds) && p.allowedTeamIds.includes(teamId))
    )
    .sort((a, b) => {
      // Primary team players first, then shared pool alphabetically
      const aPrimary = a.primaryTeamId === teamId ? 0 : 1;
      const bPrimary = b.primaryTeamId === teamId ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      return getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b));
    });
}

export function getPlayerDisplayName(playerObjOrName) {
  if (!playerObjOrName) return '';
  if (typeof playerObjOrName === 'string') return playerObjOrName;
  if (playerObjOrName.displayName) return playerObjOrName.displayName;
  const lastInitial = playerObjOrName.lastName
    ? ` ${playerObjOrName.lastName.trim()}"`
    : '';
  return `${playerObjOrName.firstName}${lastInitial}`.trim();
}

export function getCurrentMatchDoc() {
  const team = getSelectedTeam();
  const matchId = getMatchId(team.teamId, appState.selectedDate);
  const existing = appState.matchesByTeam[matchId];
  const formation = existing?.formation || team.defaultFormation || '7v7';
  const periodCount = Number(existing?.periodCount) || Number(team.defaultPeriods) || 4;
  const defaultShape = getDefaultShapeForFormat(formation);
  const validShapes = getAvailableShapesForFormat(formation);
  const tacticalShape =
    existing?.tacticalShape && validShapes.includes(existing.tacticalShape)
      ? existing.tacticalShape
      : defaultShape;

  return existing
    ? { ...existing, formation, periodCount, tacticalShape }
    : {
        matchId,
        teamId: team.teamId,
        date: appState.selectedDate,
        opposition: '',
        qtrMins: team.defaultQtrMins || 12,
        periodCount,
        formation,
        tacticalShape
      };
}

export function getMatchPeriods(matchDocInput = null) {
  const match = matchDocInput || getCurrentMatchDoc();
  return getMatchPeriodsForCount(match?.periodCount || 4);
}

export function getQuarterLineupDoc(quarter = appState.currentQuarter, matchIdInput = null) {
  const team = getSelectedTeam();
  const match = getCurrentMatchDoc();
  const matchId = matchIdInput || match.matchId;
  const byQ = appState.lineupsByMatch[matchId] || {};
  const existingQ = byQ[quarter];
  const validShapes = getAvailableShapesForFormat(match.formation || '7v7');
  const resolvedShape =
    existingQ?.tacticalShape && validShapes.includes(existingQ.tacticalShape)
      ? existingQ.tacticalShape
      : match.tacticalShape || getDefaultShapeForFormat(match.formation || '7v7');

  return existingQ
    ? { ...existingQ, tacticalShape: resolvedShape, events: existingQ.events || [] }
    : {
        lineupId: getLineupId(matchId, quarter),
        matchId,
        teamId: team.teamId,
        date: appState.selectedDate,
        quarter,
        tacticalShape: resolvedShape,
        lineup: {},
        unavailablePlayers: [],
        swaps: [],
        events: []
      };
}

/**
 * Milestone 11: Compute Season-to-Date Historical Fairness Seed (excluding `excludeDateStr`)
 * Returns a map `{ [playerName]: { totalQtrs, GK, DEF, MID, ATT, rawTotalMins } }` so
 * Auto-Fair Squad can automatically prioritize players who played fewer minutes or played GK in prior weeks.
 */
export function getHistoricalSeasonFairnessSeed(
  teamId = appState.selectedTeamId,
  excludeDateStr = appState.selectedDate
) {
  const team = getSelectedTeam();
  const teamPlayers = getTeamPlayers(teamId);
  const playerNames = teamPlayers.map(p => getPlayerDisplayName(p));
  const currentMatch = getCurrentMatchDoc();
  const baseUnitMins = parseFloat(currentMatch.qtrMins) || team.defaultQtrMins || 12;

  const priorMatches = Object.values(appState.allMatches || {}).filter(
    m => m.teamId === teamId && m.date && m.date !== excludeDateStr
  );

  return computeHistoricalSeasonFairnessSeed({
    playerNames,
    priorMatches,
    lineupsByMatch: appState.lineupsByMatch || {},
    baseUnitMins
  });
}

/**
 * Real-Time Shared Player Conflict Detection (Blueprint Section 4)
 * Returns an array of conflicts if a player assigned to the current team in `quarter`
 * is simultaneously assigned to another club team on the same date & quarter.
 */
export function getSharedPlayerConflicts(quarter = appState.currentQuarter) {
  const currentTeam = getSelectedTeam();
  const currentQDoc = getQuarterLineupDoc(quarter);
  return detectSharedPlayerConflicts({
    currentTeamId: currentTeam.teamId,
    currentLineup: currentQDoc.lineup || {},
    dateStr: appState.selectedDate,
    quarter,
    sameDateLineupsAllTeams: appState.sameDateLineupsAllTeams || [],
    allClubTeams: appState.allClubTeams || []
  });
}

// --- MUTATION FUNCTIONS (Optimistic + Firestore / Local Store) ---

export async function selectTeam(teamId) {
  appState.selectedTeamId = teamId;
  localStorage.setItem('matchday_selected_team_v3', teamId);
  if (appState.mode === 'firebase' && appState.currentUser) {
    startFirestoreSubscriptions(appState.currentUser);
  } else {
    hydrateAppStateFromLocalStore();
  }
}

export function selectDate(dateStr) {
  if (!dateStr) return;
  appState.selectedDate = dateStr;
  if (appState.mode === 'firebase' && appState.currentUser) {
    startFirestoreSubscriptions(appState.currentUser);
  } else {
    hydrateAppStateFromLocalStore();
  }
}

export async function saveMatchMetadata(updates) {
  const current = getCurrentMatchDoc();
  const clubId = getActiveClubId();
  const updatedMatch = {
    ...current,
    ...updates,
    clubId,
    updatedAt: new Date().toISOString(),
    updatedBy: appState.currentUser?.uid || 'local_coach_1'
  };

  // Optimistic update
  appState.allMatches[updatedMatch.matchId] = updatedMatch;
  appState.matchesByTeam[updatedMatch.matchId] = updatedMatch;
  notifyAppState();

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    appState.syncState = 'syncing';
    notifyAppState();
    await setDoc(doc(db, 'matches', updatedMatch.matchId), updatedMatch, { merge: true });
    appState.syncState = 'synced';
    notifyAppState();
  } else {
    const store = loadLocalStore();
    store.matches[updatedMatch.matchId] = updatedMatch;
    saveLocalStore(store);
  }
}

export async function saveQuarterLineup(quarter, updates) {
  const match = getCurrentMatchDoc();
  const currentQ = getQuarterLineupDoc(quarter, match.matchId);
  const clubId = getActiveClubId();
  const updatedLineup = {
    ...currentQ,
    ...updates,
    clubId,
    lineupId: getLineupId(match.matchId, quarter),
    matchId: match.matchId,
    teamId: match.teamId,
    date: match.date,
    quarter
  };

  // Ensure the parent match doc exists as well
  if (!appState.matchesByTeam[match.matchId]) {
    await saveMatchMetadata({});
  }

  // Optimistic update
  if (!appState.lineupsByMatch[match.matchId]) {
    appState.lineupsByMatch[match.matchId] = {};
  }
  appState.lineupsByMatch[match.matchId][quarter] = updatedLineup;
  notifyAppState();

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    appState.syncState = 'syncing';
    notifyAppState();
    await setDoc(doc(db, 'lineups', updatedLineup.lineupId), updatedLineup, { merge: true });
    appState.syncState = 'synced';
    notifyAppState();
  } else {
    const store = loadLocalStore();
    store.lineups[updatedLineup.lineupId] = updatedLineup;
    saveLocalStore(store);
  }
}

export async function addClubPlayer({
  firstName,
  lastName,
  primaryTeamId,
  preferredGroup = 'ANY',
  sharedWithTeamIds = []
}) {
  const team = getSelectedTeam();
  const cleanFirst = firstName.trim();
  const cleanLast = (lastName || '').trim();
  if (!cleanFirst) return;

  const clubId = getActiveClubId();
  const displayName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;
  const playerId = `player_${Date.now()}_${cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const allowed = Array.from(new Set([primaryTeamId || team.teamId, ...sharedWithTeamIds]));

  const newPlayer = {
    playerId,
    clubId,
    ageGroup: team.ageGroup || 'U10',
    firstName: cleanFirst,
    lastName: cleanLast,
    displayName,
    preferredGroup: preferredGroup || 'ANY',
    primaryTeamId: primaryTeamId || team.teamId,
    allowedTeamIds: allowed
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'players', playerId), newPlayer);
  } else {
    const store = loadLocalStore();
    store.players[playerId] = newPlayer;
    saveLocalStore(store);
  }
}

export async function updatePlayerPreferredGroup(playerId, preferredGroup) {
  const player = appState.players.find(p => p.playerId === playerId);
  if (!player) return;
  const updated = { ...player, preferredGroup: preferredGroup || 'ANY' };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'players', playerId), { preferredGroup: updated.preferredGroup }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.players[playerId]) {
      store.players[playerId] = updated;
      saveLocalStore(store);
    }
  }
}

export async function togglePlayerSharedAccess(playerId, targetTeamId) {
  const player = appState.players.find(p => p.playerId === playerId);
  if (!player) return;

  const currentAllowed = new Set(player.allowedTeamIds || [player.primaryTeamId]);
  if (currentAllowed.has(targetTeamId) && player.primaryTeamId !== targetTeamId) {
    currentAllowed.delete(targetTeamId);
  } else {
    currentAllowed.add(targetTeamId);
  }
  const updated = {
    ...player,
    allowedTeamIds: Array.from(currentAllowed)
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'players', playerId), updated, { merge: true });
  } else {
    const store = loadLocalStore();
    store.players[playerId] = updated;
    saveLocalStore(store);
  }
}

export async function removeClubPlayer(playerId) {
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'players', playerId));
  } else {
    const store = loadLocalStore();
    delete store.players[playerId];
    saveLocalStore(store);
  }
}

/**
 * Milestone 5C: Bulk add players from a pasted newline/comma list (e.g. WhatsApp / Excel)
 */
export async function bulkAddClubPlayers({ rawText, primaryTeamId, sharedWithTeamIds = [] }) {
  const team = getSelectedTeam();
  const targetPrimary = primaryTeamId || team.teamId;
  const lines = (rawText || '')
    .split(/[\r\n,]+/)
    .map(l => l.replace(/^\s*\d+[\.\)\-]?\s*/, '').trim()) // strip leading numbers like "1. " or "2) "
    .filter(Boolean);

  if (lines.length === 0) return 0;

  let addedCount = 0;
  for (const full of lines) {
    const parts = full.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ');
    if (firstName) {
      await addClubPlayer({
        firstName,
        lastName,
        primaryTeamId: targetPrimary,
        sharedWithTeamIds
      });
      addedCount++;
    }
  }
  return addedCount;
}

/**
 * Milestone 5C: Clear primary players of the selected team (e.g. to wipe sample names before pasting real squad)
 */
export async function clearCurrentTeamPlayers(teamId = appState.selectedTeamId) {
  const toRemove = appState.players.filter(p => p.primaryTeamId === teamId);
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    for (const p of toRemove) {
      await deleteDoc(doc(db, 'players', p.playerId));
    }
  } else {
    const store = loadLocalStore();
    toRemove.forEach(p => {
      delete store.players[p.playerId];
    });
    saveLocalStore(store);
  }
  return toRemove.length;
}

/**
 * Milestone 13: Club Admin — Pre-authorize or invite a coach/lead/viewer/admin by email
 * Writes to dedicated `invites/{inviteId}` collection so invitees can securely claim on sign-in.
 */
export async function inviteOrPreAuthorizeCoach({
  email,
  displayName,
  role = 'coach',
  assignedTeamIds = [],
  assignedAgeGroups = [],
  canViewSplitter = true,
  canViewStats = true
}) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Coach email is required.');

  const clubId = getActiveClubId();
  const clubName = appState.club?.shortName || appState.club?.name || DEFAULT_CLUB_NAME;
  const safeRole = normalizeRole(role);
  const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0];
  const inviteId = `${clubId}__${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;

  const defaultTeams =
    safeRole === 'admin'
      ? appState.allClubTeams.map(t => t.teamId)
      : assignedTeamIds.length > 0
      ? assignedTeamIds
      : safeRole === 'lead' && assignedAgeGroups.length > 0
      ? appState.allClubTeams
          .filter(t => assignedAgeGroups.includes(t.ageGroup))
          .map(t => t.teamId)
      : [appState.selectedTeamId].filter(Boolean);

  const cleanAgeGroups =
    safeRole === 'lead'
      ? Array.from(new Set(assignedAgeGroups.filter(Boolean)))
      : [];

  const allowSplitter = safeRole === 'admin' ? true : canViewSplitter !== false;
  const allowStats = safeRole === 'admin' ? true : canViewStats !== false;

  const inviteDoc = {
    inviteId,
    clubId,
    clubName,
    email: cleanEmail,
    displayName: cleanName,
    role: safeRole,
    assignedTeamIds: Array.from(new Set(defaultTeams)),
    assignedAgeGroups: cleanAgeGroups,
    canViewSplitter: allowSplitter,
    canViewStats: allowStats,
    status: 'pending',
    invitedBy: appState.userProfile?.uid || appState.currentUser?.uid || 'local_coach_1',
    createdAt: new Date().toISOString()
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'invites', inviteId), inviteDoc);
  } else {
    const store = loadLocalStore();
    if (!store.invites) store.invites = {};
    store.invites[inviteId] = inviteDoc;
    saveLocalStore(store);
  }
  return inviteDoc;
}

export async function revokeClubInvite(inviteId) {
  if (!inviteId) return;
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'invites', inviteId));
  } else {
    const store = loadLocalStore();
    if (store.invites) {
      delete store.invites[inviteId];
      saveLocalStore(store);
    }
  }
}

async function writeClubMemberPatch(uid, memberFieldsPatch) {
  const clubId = getActiveClubId();
  const clubName = appState.club?.shortName || appState.club?.name || clubId;
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const now = new Date().toISOString();

  const existingMemberships = buildSeededMembershipsForUser(user);
  const prevClubEntry = existingMemberships[clubId] || {
    clubId,
    clubName,
    role: normalizeRole(user.role || 'coach'),
    status: user.status || 'active',
    assignedTeamIds: Array.isArray(user.assignedTeamIds) ? [...user.assignedTeamIds] : [],
    assignedAgeGroups: Array.isArray(user.assignedAgeGroups) ? [...user.assignedAgeGroups] : [],
    canViewSplitter: user.canViewSplitter !== false,
    canViewStats: user.canViewStats !== false
  };
  const nextClubEntry = {
    ...prevClubEntry,
    ...memberFieldsPatch,
    clubId,
    clubName
  };
  const nextMemberships = {
    ...existingMemberships,
    [clubId]: nextClubEntry
  };
  const nextMemberClubIds = Array.from(
    new Set([...(user.memberClubIds || []), ...Object.keys(nextMemberships)])
  );

  // If this club is the user's currently active club, update top-level fields + clubMemberships
  const isUsersActiveClub = (user.clubId || clubId) === clubId;
  const fullPatch = isUsersActiveClub
    ? {
        ...memberFieldsPatch,
        clubMemberships: nextMemberships,
        memberClubIds: nextMemberClubIds,
        updatedAt: now
      }
    : {
        clubMemberships: nextMemberships,
        memberClubIds: nextMemberClubIds,
        updatedAt: now
      };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), fullPatch, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid] = { ...store.users[uid], ...fullPatch };
      saveLocalStore(store);
    }
  }
}

export async function updateCoachRole(uid, newRole) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const check = canModifyUserRole(appState.userProfile, user, newRole, appState.allClubUsers);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const safeRole = normalizeRole(newRole);
  const patch = { role: safeRole };
  // If promoting to Age-Group Lead and no age groups set yet, seed from their assigned teams
  if (safeRole === 'lead' && (!user.assignedAgeGroups || user.assignedAgeGroups.length === 0)) {
    const teamGroups = appState.allClubTeams
      .filter(t => (user.assignedTeamIds || []).includes(t.teamId))
      .map(t => t.ageGroup)
      .filter(Boolean);
    if (teamGroups.length > 0) {
      patch.assignedAgeGroups = Array.from(new Set(teamGroups));
    }
  }

  await writeClubMemberPatch(uid, patch);
}

export async function toggleCoachTeamAssignment(uid, teamId) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const current = new Set(user.assignedTeamIds || []);
  if (current.has(teamId)) {
    current.delete(teamId);
  } else {
    current.add(teamId);
  }
  await writeClubMemberPatch(uid, { assignedTeamIds: Array.from(current) });
}

export async function toggleCoachAgeGroupAssignment(uid, ageGroup) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user || !ageGroup) return;
  const current = new Set(user.assignedAgeGroups || []);
  if (current.has(ageGroup)) {
    current.delete(ageGroup);
  } else {
    current.add(ageGroup);
  }
  await writeClubMemberPatch(uid, { assignedAgeGroups: Array.from(current) });
}

export async function toggleCoachFeatureAccess(uid, featureKey) {
  if (featureKey !== 'canViewSplitter' && featureKey !== 'canViewStats') return;
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const currentlyEnabled = user[featureKey] !== false;
  await writeClubMemberPatch(uid, { [featureKey]: !currentlyEnabled });
}

export async function toggleCoachStatus(uid) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const currentlyActive = !user.status || user.status === 'active';
  if (currentlyActive) {
    const check = canRemoveUser(appState.userProfile, user, appState.allClubUsers);
    if (!check.ok) throw new Error(check.reason);
  }
  const nextStatus = currentlyActive ? 'suspended' : 'active';
  await writeClubMemberPatch(uid, { status: nextStatus });
  return nextStatus;
}

export async function removeCoachProfile(uid) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  const check = canRemoveUser(appState.userProfile, user, appState.allClubUsers);
  if (!check.ok) {
    throw new Error(check.reason);
  }
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'users', uid));
  } else {
    const store = loadLocalStore();
    delete store.users[uid];
    saveLocalStore(store);
  }
}

// --- CLUB JOIN CODE & APPROVAL QUEUE (Milestone 13 & 14) ---

export async function setClubJoinCode({ code, active = true, defaultRole = 'coach' }) {
  const clubId = getActiveClubId();
  const cleanCode = normalizeJoinCode(code);
  if (!cleanCode || cleanCode.length < 4) {
    throw new Error('Join code must be at least 4 letters/numbers (e.g. STRAFFAN-2026).');
  }

  const oldCode = normalizeJoinCode(appState.club?.joinCode || '');
  const clubName = appState.club?.shortName || appState.club?.name || DEFAULT_CLUB_NAME;
  const now = new Date().toISOString();
  const joinCodeDoc = {
    code: cleanCode,
    clubId,
    clubName,
    active: Boolean(active),
    defaultRole: normalizeRole(defaultRole),
    updatedAt: now,
    updatedBy: appState.userProfile?.uid || 'local_coach_1'
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    // Deactivate old code if rotating to a new code
    if (oldCode && oldCode !== cleanCode) {
      try {
        await setDoc(doc(db, 'joinCodes', oldCode), { active: false, updatedAt: now }, { merge: true });
      } catch (_) {}
    }
    await setDoc(doc(db, 'joinCodes', cleanCode), joinCodeDoc, { merge: true });
    await setDoc(
      doc(db, 'clubs', clubId),
      {
        joinCode: cleanCode,
        joinCodeEnabled: Boolean(active),
        joinDefaultRole: normalizeRole(defaultRole)
      },
      { merge: true }
    );
  } else {
    const store = loadLocalStore();
    if (!store.joinCodes) store.joinCodes = {};
    if (oldCode && oldCode !== cleanCode && store.joinCodes[oldCode]) {
      store.joinCodes[oldCode].active = false;
    }
    store.joinCodes[cleanCode] = joinCodeDoc;
    if (store.clubs[clubId]) {
      store.clubs[clubId].joinCode = cleanCode;
      store.clubs[clubId].joinCodeEnabled = Boolean(active);
      store.clubs[clubId].joinDefaultRole = normalizeRole(defaultRole);
    }
    saveLocalStore(store);
  }
  return joinCodeDoc;
}

/**
 * Instant self-registration using an active Club Registration Code + signed-in Email/SSO.
 * Immediately creates the coach's active profile with 0 assigned teams (zero-trust isolation),
 * so they enter the club workspace right away and can request access to their specific team(s)
 * for a Club Admin or Age-Group Lead to approve.
 */
export async function joinClubWithCode({ joinCode, displayName = '', autoStartSubscriptions = true }) {
  const cleanCode = normalizeJoinCode(joinCode);
  if (!cleanCode) {
    throw new Error('Please enter a Club Registration Code.');
  }

  const firebaseUser = appState.currentUser;
  if (!firebaseUser) {
    throw new Error('Please sign in with Google or Email first.');
  }

  if (appState.mode !== 'firebase') {
    throw new Error('Club Registration Codes are used in Firebase Cloud mode.');
  }

  const { db } = getFirebaseServices();
  const codeSnap = await getDoc(doc(db, 'joinCodes', cleanCode));
  if (!codeSnap.exists()) {
    throw new Error(`Registration code "${cleanCode}" was not found. Double-check with your Club Admin.`);
  }
  const codeData = codeSnap.data();
  if (!codeData.active) {
    throw new Error(`Registration code "${cleanCode}" is currently paused. Ask your Club Admin for an active code or email invite.`);
  }

  const clubId = codeData.clubId;
  const clubName = codeData.clubName || clubId;
  const assignedRole = ['coach', 'viewer'].includes(codeData.defaultRole) ? codeData.defaultRole : 'coach';
  const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
  const cleanName = (displayName || firebaseUser.displayName || cleanEmail.split('@')[0] || 'Coach').trim();
  const now = new Date().toISOString();

  const newMembership = {
    clubId,
    clubName,
    role: assignedRole,
    status: 'active',
    assignedTeamIds: [],
    assignedAgeGroups: [],
    canViewSplitter: true,
    canViewStats: true
  };

  const userRef = doc(db, 'users', firebaseUser.uid);
  const existingSnap = await getDoc(userRef);

  if (existingSnap.exists()) {
    const existing = existingSnap.data();
    if (existing.clubMemberships && existing.clubMemberships[clubId]) {
      // Already a member of this club -> switch cleanly to it
      await switchActiveClub(clubId);
      return appState.userProfile;
    }
    const mergedMemberships = {
      ...buildSeededMembershipsForUser(existing),
      [clubId]: newMembership
    };
    const mergedClubIds = Array.from(
      new Set([...(existing.memberClubIds || [existing.clubId]), clubId])
    );
    const patch = {
      clubId,
      role: assignedRole,
      status: 'active',
      assignedTeamIds: [],
      assignedAgeGroups: [],
      canViewSplitter: true,
      canViewStats: true,
      joinedViaCode: cleanCode,
      clubMemberships: mergedMemberships,
      memberClubIds: mergedClubIds,
      updatedAt: now
    };
    await setDoc(userRef, patch, { merge: true });
    appState.userProfile = { ...existing, ...patch };
  } else {
    const freshProfile = {
      uid: firebaseUser.uid,
      email: cleanEmail,
      displayName: cleanName,
      role: assignedRole,
      status: 'active',
      clubId,
      assignedTeamIds: [],
      assignedAgeGroups: [],
      canViewSplitter: true,
      canViewStats: true,
      memberClubIds: [clubId],
      clubMemberships: {
        [clubId]: newMembership
      },
      joinedViaCode: cleanCode,
      createdAt: now,
      updatedAt: now
    };
    await setDoc(userRef, freshProfile);
    appState.userProfile = freshProfile;
  }

  clearAccessGateSubscriptions();
  resetClubRuntimeData();
  appState.pendingJoinRequest = null;
  appState.authDiagnosticError = null;
  appState.inviteEmailMismatch = null;
  appState.accessStatus = 'ready';
  appState.claimedInviteNotice = `✅ Profile created for ${clubName}! Request access to your team(s) below so your Admin or Age-Group Lead can unlock your squad.`;
  notifyAppState();

  if (autoStartSubscriptions) {
    startFirestoreSubscriptions(firebaseUser);
  }
  return appState.userProfile;
}

// Backward-compatible alias
export async function submitJoinCodeRequest(args) {
  return joinClubWithCode(args);
}

// --- TEAM ACCESS REQUESTS (COACH REQUESTS SPECIFIC TEAM; ADMIN OR AGE-GROUP LEAD APPROVES) ---

export async function requestTeamAccess({ teamId, note = '' }) {
  if (!teamId) throw new Error('Please select a team to request.');
  const profile = appState.userProfile;
  if (!profile) throw new Error('Sign in and join a club first.');
  const clubId = getActiveClubId();
  const team = (appState.allClubTeams || []).find(t => t.teamId === teamId);
  if (!team) throw new Error('Selected team was not found in this club.');

  if ((profile.assignedTeamIds || []).includes(teamId)) {
    throw new Error(`You already have access to ${team.name}.`);
  }

  const requestId = `${clubId}__${profile.uid}__${teamId}`;
  const reqDoc = {
    requestId,
    clubId,
    teamId,
    teamName: team.name,
    ageGroup: team.ageGroup || 'U10',
    uid: profile.uid,
    email: (profile.email || appState.currentUser?.email || '').trim().toLowerCase(),
    displayName: profile.displayName || appState.currentUser?.displayName || 'Coach',
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'teamRequests', requestId), reqDoc);
  } else {
    const store = loadLocalStore();
    if (!store.teamRequests) store.teamRequests = {};
    store.teamRequests[requestId] = reqDoc;
    saveLocalStore(store);
  }
  return reqDoc;
}

export async function cancelTeamAccessRequest(requestId) {
  if (!requestId) return;
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'teamRequests', requestId));
  } else {
    const store = loadLocalStore();
    if (store.teamRequests) {
      delete store.teamRequests[requestId];
      saveLocalStore(store);
    }
  }
}

export async function approveTeamAccessRequest(requestId) {
  const req = (appState.allClubTeamRequests || []).find(r => r.requestId === requestId);
  if (!req) throw new Error('Team access request not found.');
  if (!canApproveTeamRequest(appState.userProfile, req)) {
    throw new Error('Only a Club Admin or the Age-Group Lead for this age group can approve this team request.');
  }

  const clubId = req.clubId || getActiveClubId();
  const clubName = appState.club?.shortName || appState.club?.name || clubId;
  const now = new Date().toISOString();

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    const targetRef = doc(db, 'users', req.uid);
    const targetSnap = await getDoc(targetRef);
    if (!targetSnap.exists()) {
      throw new Error('Coach user profile no longer exists.');
    }
    const targetUser = targetSnap.data();
    const existingMemberships = buildSeededMembershipsForUser(targetUser);
    const prevClubEntry = existingMemberships[clubId] || {
      clubId,
      clubName,
      role: normalizeRole(targetUser.role || 'coach'),
      status: targetUser.status || 'active',
      assignedTeamIds: Array.isArray(targetUser.assignedTeamIds) ? [...targetUser.assignedTeamIds] : [],
      assignedAgeGroups: Array.isArray(targetUser.assignedAgeGroups) ? [...targetUser.assignedAgeGroups] : [],
      canViewSplitter: targetUser.canViewSplitter !== false,
      canViewStats: targetUser.canViewStats !== false
    };

    const nextClubTeams = Array.from(new Set([...(prevClubEntry.assignedTeamIds || []), req.teamId]));
    const nextMemberships = {
      ...existingMemberships,
      [clubId]: {
        ...prevClubEntry,
        assignedTeamIds: nextClubTeams
      }
    };
    const isUsersActiveClub = (targetUser.clubId || clubId) === clubId;
    const nextTopTeams = isUsersActiveClub
      ? Array.from(new Set([...(targetUser.assignedTeamIds || []), req.teamId]))
      : targetUser.assignedTeamIds || [];

    const userPatch = isUsersActiveClub
      ? {
          assignedTeamIds: nextTopTeams,
          clubMemberships: nextMemberships,
          approvedTeamRequestId: requestId,
          updatedAt: now
        }
      : {
          clubMemberships: nextMemberships,
          approvedTeamRequestId: requestId,
          updatedAt: now
        };

    // Update user profile FIRST while teamRequests/{requestId} is still `pending` (validated by Firestore rules!)
    await setDoc(targetRef, userPatch, { merge: true });
    await setDoc(
      doc(db, 'teamRequests', requestId),
      {
        status: 'approved',
        reviewedBy: appState.userProfile?.uid || 'local_coach_1',
        reviewedByName: appState.userProfile?.displayName || 'Admin',
        reviewedAt: now
      },
      { merge: true }
    );
  } else {
    const store = loadLocalStore();
    const target = store.users?.[req.uid];
    if (target) {
      target.assignedTeamIds = Array.from(new Set([...(target.assignedTeamIds || []), req.teamId]));
      if (target.clubMemberships?.[clubId]) {
        target.clubMemberships[clubId].assignedTeamIds = Array.from(
          new Set([...(target.clubMemberships[clubId].assignedTeamIds || []), req.teamId])
        );
      }
    }
    if (store.teamRequests?.[requestId]) {
      store.teamRequests[requestId].status = 'approved';
      store.teamRequests[requestId].reviewedAt = now;
    }
    saveLocalStore(store);
  }
  return req;
}

export async function rejectTeamAccessRequest(requestId) {
  const req = (appState.allClubTeamRequests || []).find(r => r.requestId === requestId);
  if (!req) return;
  if (!canApproveTeamRequest(appState.userProfile, req)) {
    throw new Error('Only a Club Admin or Age-Group Lead for this age group can decline this request.');
  }
  const now = new Date().toISOString();
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, 'teamRequests', requestId),
      {
        status: 'rejected',
        reviewedBy: appState.userProfile?.uid || 'local_coach_1',
        reviewedAt: now
      },
      { merge: true }
    );
  } else {
    const store = loadLocalStore();
    if (store.teamRequests?.[requestId]) {
      store.teamRequests[requestId].status = 'rejected';
      store.teamRequests[requestId].reviewedAt = now;
    }
    saveLocalStore(store);
  }
}

export async function cancelPendingJoinRequest(requestId) {
  if (!requestId) return;
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'joinRequests', requestId));
  }
  appState.pendingJoinRequest = null;
  appState.accessStatus = 'needs_onboarding';
  notifyAppState();
}

export async function approveJoinRequest({
  requestId,
  role = 'coach',
  assignedTeamIds = [],
  assignedAgeGroups = [],
  canViewSplitter = true,
  canViewStats = true
}) {
  const req = appState.allClubJoinRequests.find(r => r.requestId === requestId);
  if (!req) throw new Error('Join request not found.');

  const clubId = getActiveClubId();
  const safeRole = normalizeRole(role);
  const now = new Date().toISOString();

  const finalTeams =
    safeRole === 'admin'
      ? appState.allClubTeams.map(t => t.teamId)
      : assignedTeamIds.length > 0
      ? assignedTeamIds
      : safeRole === 'lead' && assignedAgeGroups.length > 0
      ? appState.allClubTeams
          .filter(t => assignedAgeGroups.includes(t.ageGroup))
          .map(t => t.teamId)
      : [];

  const finalAgeGroups =
    safeRole === 'lead'
      ? Array.from(new Set(assignedAgeGroups.filter(Boolean)))
      : [];

  const allowSplitter = safeRole === 'admin' ? true : canViewSplitter !== false;
  const allowStats = safeRole === 'admin' ? true : canViewStats !== false;

  const clubName = appState.club?.shortName || appState.club?.name || clubId;
  const dedupedTeams = Array.from(new Set(finalTeams));
  const membershipEntry = {
    clubId,
    clubName,
    role: safeRole,
    status: 'active',
    assignedTeamIds: dedupedTeams,
    assignedAgeGroups: finalAgeGroups,
    canViewSplitter: allowSplitter,
    canViewStats: allowStats
  };

  const newUserDoc = {
    uid: req.uid,
    email: req.email,
    displayName: req.displayName || req.email?.split('@')[0] || 'Coach',
    role: safeRole,
    status: 'active',
    clubId,
    assignedTeamIds: dedupedTeams,
    assignedAgeGroups: finalAgeGroups,
    canViewSplitter: allowSplitter,
    canViewStats: allowStats,
    memberClubIds: [clubId],
    clubMemberships: {
      [clubId]: membershipEntry
    },
    approvedBy: appState.userProfile?.uid || 'local_coach_1',
    createdAt: now,
    updatedAt: now
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    let existingUser = null;
    try {
      const existingSnap = await getDoc(doc(db, 'users', req.uid));
      if (existingSnap.exists()) existingUser = existingSnap.data();
    } catch (_) {}

    if (existingUser && existingUser.clubId && existingUser.clubId !== clubId) {
      // Multi-club user already active in another club -> add ONLY this club's membership entry
      const mergedMemberships = {
        ...buildSeededMembershipsForUser(existingUser),
        [clubId]: membershipEntry
      };
      const mergedClubIds = Array.from(
        new Set([...(existingUser.memberClubIds || [existingUser.clubId]), clubId])
      );
      await setDoc(
        doc(db, 'users', req.uid),
        {
          clubMemberships: mergedMemberships,
          memberClubIds: mergedClubIds,
          updatedAt: now
        },
        { merge: true }
      );
    } else {
      await setDoc(doc(db, 'users', req.uid), newUserDoc, { merge: true });
    }

    await setDoc(
      doc(db, 'joinRequests', requestId),
      {
        status: 'approved',
        assignedRole: safeRole,
        reviewedBy: appState.userProfile?.uid || 'local_coach_1',
        reviewedAt: now
      },
      { merge: true }
    );
  } else {
    const store = loadLocalStore();
    store.users[req.uid] = newUserDoc;
    if (store.joinRequests?.[requestId]) {
      store.joinRequests[requestId].status = 'approved';
      store.joinRequests[requestId].reviewedAt = now;
    }
    saveLocalStore(store);
  }
  return newUserDoc;
}

export async function rejectJoinRequest(requestId) {
  if (!requestId) return;
  const now = new Date().toISOString();
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(
      doc(db, 'joinRequests', requestId),
      {
        status: 'rejected',
        reviewedBy: appState.userProfile?.uid || 'local_coach_1',
        reviewedAt: now
      },
      { merge: true }
    );
  } else {
    const store = loadLocalStore();
    if (store.joinRequests?.[requestId]) {
      store.joinRequests[requestId].status = 'rejected';
      store.joinRequests[requestId].reviewedAt = now;
    }
    saveLocalStore(store);
  }
}

// --- MILESTONE 15: MULTI-CLUB SELF-ONBOARDING & CLUB SWITCHER ---

/**
 * Registers a brand-new isolated club and makes the signed-in user its founding Club Admin.
 * Works both for brand-new unattached users AND existing users adding a second club!
 */
export async function registerNewClub({
  clubName,
  shortName = '',
  firstTeamName = 'U10 White',
  ageGroup = 'U10',
  defaultFormation = '7v7',
  defaultPeriods = 4,
  defaultQtrMins = 12
}) {
  const cleanFull = (clubName || '').trim();
  if (!cleanFull || cleanFull.length < 2) {
    throw new Error('Please enter a Club Name (e.g. Maynooth Town FC).');
  }
  const cleanShort = (shortName || '').trim() || cleanFull;
  const cleanTeam = (firstTeamName || '').trim() || `${ageGroup || 'U10'} Squad`;
  const cleanAge = (ageGroup || 'U10').trim();
  const clubId = generateClubSlug(cleanShort);
  const teamSlug = cleanTeam.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'squad';
  const teamId = `${clubId}__${teamSlug}`;
  const joinCode = generateClubJoinCode(cleanShort);
  const now = new Date().toISOString();

  const uid = appState.currentUser?.uid || appState.userProfile?.uid || 'local_coach_1';
  const email = (appState.currentUser?.email || appState.userProfile?.email || 'admin@club.ie').trim().toLowerCase();
  const displayName = (appState.currentUser?.displayName || appState.userProfile?.displayName || email.split('@')[0] || 'Club Admin').trim();

  const newMembership = {
    clubId,
    clubName: cleanShort,
    role: 'admin',
    status: 'active',
    assignedTeamIds: [teamId],
    assignedAgeGroups: [cleanAge]
  };

  const clubDoc = {
    clubId,
    name: cleanFull,
    shortName: cleanShort,
    joinCode,
    joinCodeEnabled: true,
    joinDefaultRole: 'coach',
    createdBy: uid,
    createdAt: now
  };

  const joinCodeDoc = {
    code: joinCode,
    clubId,
    clubName: cleanShort,
    active: true,
    defaultRole: 'coach',
    updatedAt: now,
    updatedBy: uid
  };

  const teamDoc = {
    teamId,
    clubId,
    name: cleanTeam,
    ageGroup: cleanAge,
    defaultFormation: defaultFormation || '7v7',
    defaultPeriods: Number(defaultPeriods) || 4,
    defaultQtrMins: parseFloat(defaultQtrMins) || 12,
    coachIds: [uid]
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);

    // 1. Create or update users/{uid} FIRST while clubs/{clubId} does not exist yet (validates security rule)
    if (existingSnap.exists()) {
      const existing = existingSnap.data();
      const mergedMemberships = {
        ...buildSeededMembershipsForUser(existing),
        [clubId]: newMembership
      };
      const mergedClubIds = Array.from(
        new Set([...(existing.memberClubIds || [existing.clubId]), clubId])
      );
      await setDoc(
        userRef,
        {
          clubId,
          role: 'admin',
          status: 'active',
          assignedTeamIds: [teamId],
          assignedAgeGroups: [cleanAge],
          clubMemberships: mergedMemberships,
          memberClubIds: mergedClubIds,
          updatedAt: now
        },
        { merge: true }
      );
      appState.userProfile = {
        ...existing,
        clubId,
        role: 'admin',
        status: 'active',
        assignedTeamIds: [teamId],
        assignedAgeGroups: [cleanAge],
        clubMemberships: mergedMemberships,
        memberClubIds: mergedClubIds
      };
    } else {
      const freshProfile = {
        uid,
        email,
        displayName,
        role: 'admin',
        status: 'active',
        clubId,
        assignedTeamIds: [teamId],
        assignedAgeGroups: [cleanAge],
        memberClubIds: [clubId],
        clubMemberships: {
          [clubId]: newMembership
        },
        createdAt: now,
        updatedAt: now
      };
      await setDoc(userRef, freshProfile);
      appState.userProfile = freshProfile;
    }

    // 2. Create club, joinCode, and first team
    await setDoc(doc(db, 'clubs', clubId), { ...clubDoc, createdAt: serverTimestamp() });
    await setDoc(doc(db, 'joinCodes', joinCode), joinCodeDoc);
    await setDoc(doc(db, 'teams', teamId), teamDoc);

    clearAccessGateSubscriptions();
    resetClubRuntimeData();
    appState.selectedTeamId = teamId;
    localStorage.setItem('matchday_selected_team_v3', teamId);
    appState.accessStatus = 'ready';
    appState.pendingJoinRequest = null;
    appState.claimedInviteNotice = `🏟️ Welcome to ${cleanShort}! Your club Join Code is ${joinCode}.`;
    startFirestoreSubscriptions(appState.currentUser);
  } else {
    const store = loadLocalStore();
    if (!store.clubs) store.clubs = {};
    if (!store.joinCodes) store.joinCodes = {};
    if (!store.teams) store.teams = {};
    store.clubs[clubId] = clubDoc;
    store.joinCodes[joinCode] = joinCodeDoc;
    store.teams[teamId] = teamDoc;

    const existing = store.users[uid] || {};
    const mergedMemberships = {
      ...buildSeededMembershipsForUser(existing),
      [clubId]: newMembership
    };
    store.users[uid] = {
      ...existing,
      uid,
      email,
      displayName,
      clubId,
      role: 'admin',
      status: 'active',
      assignedTeamIds: [teamId],
      assignedAgeGroups: [cleanAge],
      clubMemberships: mergedMemberships,
      memberClubIds: Array.from(new Set([...(existing.memberClubIds || [DEFAULT_CLUB_ID]), clubId]))
    };
    appState.selectedTeamId = teamId;
    saveLocalStore(store);
  }

  return { club: clubDoc, team: teamDoc, joinCode };
}

/**
 * Switches an authenticated multi-club user's active club cleanly.
 */
export async function switchActiveClub(targetClubId) {
  if (!targetClubId || !appState.userProfile) return;
  if (appState.userProfile.clubId === targetClubId) return;

  const memberships = appState.userProfile.clubMemberships || {};
  const target = memberships[targetClubId];
  if (!target) {
    throw new Error('You do not have an active membership for that club.');
  }
  if (target.status && target.status !== 'active') {
    throw new Error('Your access to that club is currently suspended.');
  }

  const switchPatch = {
    clubId: targetClubId,
    role: normalizeRole(target.role || 'viewer'),
    status: target.status || 'active',
    assignedTeamIds: Array.isArray(target.assignedTeamIds) ? [...target.assignedTeamIds] : [],
    assignedAgeGroups: Array.isArray(target.assignedAgeGroups) ? [...target.assignedAgeGroups] : [],
    canViewSplitter: target.canViewSplitter !== false,
    canViewStats: target.canViewStats !== false,
    updatedAt: new Date().toISOString()
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await updateDoc(doc(db, 'users', appState.userProfile.uid), switchPatch);
    appState.userProfile = { ...appState.userProfile, ...switchPatch };
    resetClubRuntimeData();
    if (switchPatch.assignedTeamIds.length > 0) {
      appState.selectedTeamId = switchPatch.assignedTeamIds[0];
      localStorage.setItem('matchday_selected_team_v3', appState.selectedTeamId);
    }
    startFirestoreSubscriptions(appState.currentUser);
  } else {
    const store = loadLocalStore();
    const uid = appState.userProfile.uid;
    if (store.users[uid]) {
      store.users[uid] = { ...store.users[uid], ...switchPatch };
      if (switchPatch.assignedTeamIds.length > 0) {
        appState.selectedTeamId = switchPatch.assignedTeamIds[0];
      }
      saveLocalStore(store);
    }
  }
}

/**
 * Allows an already-signed-in user (who belongs to Club A) to accept a pending email invite to Club B.
 */
export async function claimAdditionalInvite(inviteId) {
  const inv = (appState.myPendingInvites || []).find(i => i.inviteId === inviteId);
  if (!inv) throw new Error('Pending invite not found.');
  if (!appState.currentUser || !appState.userProfile) {
    throw new Error('Sign in first to accept an invite.');
  }

  const now = new Date().toISOString();
  const claimedRole = normalizeRole(inv.role || 'coach');
  const claimedTeams = Array.isArray(inv.assignedTeamIds) ? [...inv.assignedTeamIds] : [];
  const claimedGroups = Array.isArray(inv.assignedAgeGroups) ? [...inv.assignedAgeGroups] : [];
  const claimedSplitter = claimedRole === 'admin' ? true : inv.canViewSplitter !== false;
  const claimedStats = claimedRole === 'admin' ? true : inv.canViewStats !== false;
  const newEntry = {
    clubId: inv.clubId,
    clubName: inv.clubName || inv.clubId,
    role: claimedRole,
    status: 'active',
    assignedTeamIds: claimedTeams,
    assignedAgeGroups: claimedGroups,
    canViewSplitter: claimedSplitter,
    canViewStats: claimedStats
  };

  const mergedMemberships = {
    ...buildSeededMembershipsForUser(appState.userProfile),
    [inv.clubId]: newEntry
  };
  const mergedClubIds = Array.from(
    new Set([...(appState.userProfile.memberClubIds || [appState.userProfile.clubId]), inv.clubId])
  );

  const patch = {
    clubId: inv.clubId,
    role: claimedRole,
    status: 'active',
    assignedTeamIds: claimedTeams,
    assignedAgeGroups: claimedGroups,
    canViewSplitter: claimedSplitter,
    canViewStats: claimedStats,
    claimedInviteId: inv.inviteId,
    clubMemberships: mergedMemberships,
    memberClubIds: mergedClubIds,
    updatedAt: now
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', appState.userProfile.uid), patch, { merge: true });
    try {
      await updateDoc(doc(db, 'invites', inv.inviteId), {
        status: 'accepted',
        claimedBy: appState.userProfile.uid,
        claimedAt: now
      });
    } catch (err) {
      console.warn('Could not mark additional invite accepted:', err);
    }
    appState.userProfile = { ...appState.userProfile, ...patch };
    appState.claimedInviteNotice = `✅ Joined ${inv.clubName || inv.clubId} as ${claimedRole.toUpperCase()}! Use the Club Switcher in the header anytime.`;
    resetClubRuntimeData();
    startFirestoreSubscriptions(appState.currentUser);
  }
}

export async function updateClubSettings({ name, shortName, joinCodeEnabled, logoDataUrl }) {
  const clubId = getActiveClubId();
  const patch = {};
  if (name !== undefined && name.trim()) patch.name = name.trim();
  if (shortName !== undefined && shortName.trim()) patch.shortName = shortName.trim();
  if (joinCodeEnabled !== undefined) patch.joinCodeEnabled = Boolean(joinCodeEnabled);
  if (logoDataUrl !== undefined) {
    if (typeof logoDataUrl === 'string' && logoDataUrl.length > 300000) {
      throw new Error('Logo image is too large after compression. Please try a simpler image.');
    }
    patch.logoDataUrl = logoDataUrl || '';
  }
  patch.updatedAt = new Date().toISOString();

  // Optimistic local state update so header logo appears immediately
  if (appState.club) {
    appState.club = { ...appState.club, ...patch };
    notifyAppState();
  }

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'clubs', clubId), patch, { merge: true });
    if ((joinCodeEnabled !== undefined || shortName !== undefined) && appState.club?.joinCode) {
      await setDoc(
        doc(db, 'joinCodes', normalizeJoinCode(appState.club.joinCode)),
        {
          active: joinCodeEnabled !== undefined ? Boolean(joinCodeEnabled) : appState.club.joinCodeEnabled !== false,
          clubName: patch.shortName || appState.club.shortName || DEFAULT_CLUB_NAME,
          updatedAt: patch.updatedAt
        },
        { merge: true }
      );
    }
  } else {
    const store = loadLocalStore();
    if (store.clubs[clubId]) {
      store.clubs[clubId] = { ...store.clubs[clubId], ...patch };
    }
    saveLocalStore(store);
  }
}

export async function createClubTeam({ name, ageGroup, defaultFormation = '7v7', defaultQtrMins = 12, defaultPeriods = 4 }) {
  const cleanName = name.trim();
  if (!cleanName) return;
  const clubId = getActiveClubId();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const teamId = clubId === DEFAULT_CLUB_ID ? slug : `${clubId}__${slug}`;

  const newTeam = {
    teamId,
    clubId,
    name: cleanName,
    ageGroup: (ageGroup || 'U10').trim(),
    defaultFormation,
    defaultQtrMins: parseFloat(defaultQtrMins) || 12,
    defaultPeriods: Number(defaultPeriods) || 4,
    coachIds: [appState.currentUser?.uid || 'local_coach_1']
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'teams', teamId), newTeam, { merge: true });
    // Club Admins automatically have access to all club teams without adding unrelated age groups to assignedTeamIds
  } else {
    const store = loadLocalStore();
    store.teams[teamId] = newTeam;
    saveLocalStore(store);
  }

  return newTeam;
}

export async function updateClubTeam(teamId, updates = {}) {
  if (!teamId) return;
  const patch = {
    ...updates,
    updatedAt: new Date().toISOString()
  };
  if (patch.defaultQtrMins !== undefined) {
    patch.defaultQtrMins = parseFloat(patch.defaultQtrMins) || 12;
  }
  if (patch.defaultPeriods !== undefined) {
    patch.defaultPeriods = Number(patch.defaultPeriods) || 4;
  }

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'teams', teamId), patch, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.teams[teamId]) {
      store.teams[teamId] = { ...store.teams[teamId], ...patch };
      saveLocalStore(store);
    }
  }
}

export async function deleteClubTeam(teamId) {
  if (!teamId) return;
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'teams', teamId));
  } else {
    const store = loadLocalStore();
    delete store.teams[teamId];
    saveLocalStore(store);
  }
}

/**
 * Milestone 14: End-of-Season Age-Group Promotion Helper (e.g. U10 -> U11)
 */
export async function promoteAgeGroupForNewSeason({
  fromAgeGroup,
  toAgeGroup,
  renameTeamPrefixes = true
}) {
  const fromAg = (fromAgeGroup || '').trim();
  const toAg = (toAgeGroup || '').trim();
  if (!fromAg || !toAg) throw new Error('Both source and target age groups are required.');
  if (fromAg === toAg) throw new Error('Target age group must be different from the current age group.');

  const affectedTeams = (appState.allClubTeams || []).filter(t => (t.ageGroup || '') === fromAg);
  const affectedPlayers = (appState.players || []).filter(p => (p.ageGroup || '') === fromAg);
  const affectedUsers = (appState.allClubUsers || []).filter(u =>
    Array.isArray(u.assignedAgeGroups) && u.assignedAgeGroups.includes(fromAg)
  );

  const prefixRegex = new RegExp(`^${fromAg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+|$)`, 'i');
  const now = new Date().toISOString();

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    for (const t of affectedTeams) {
      const nextName =
        renameTeamPrefixes && prefixRegex.test(t.name)
          ? t.name.replace(prefixRegex, `${toAg}$1`)
          : t.name;
      await setDoc(doc(db, 'teams', t.teamId), { ageGroup: toAg, name: nextName, updatedAt: now }, { merge: true });
    }
    for (const p of affectedPlayers) {
      await setDoc(doc(db, 'players', p.playerId), { ageGroup: toAg }, { merge: true });
    }
    for (const u of affectedUsers) {
      const nextGroups = Array.from(
        new Set((u.assignedAgeGroups || []).map(g => (g === fromAg ? toAg : g)))
      );
      await setDoc(doc(db, 'users', u.uid), { assignedAgeGroups: nextGroups, updatedAt: now }, { merge: true });
    }
  } else {
    const store = loadLocalStore();
    affectedTeams.forEach(t => {
      if (store.teams[t.teamId]) {
        store.teams[t.teamId].ageGroup = toAg;
        if (renameTeamPrefixes && prefixRegex.test(store.teams[t.teamId].name)) {
          store.teams[t.teamId].name = store.teams[t.teamId].name.replace(prefixRegex, `${toAg}$1`);
        }
      }
    });
    affectedPlayers.forEach(p => {
      if (store.players[p.playerId]) {
        store.players[p.playerId].ageGroup = toAg;
      }
    });
    affectedUsers.forEach(u => {
      if (store.users[u.uid]) {
        store.users[u.uid].assignedAgeGroups = Array.from(
          new Set((store.users[u.uid].assignedAgeGroups || []).map(g => (g === fromAg ? toAg : g)))
        );
      }
    });
    saveLocalStore(store);
  }

  return {
    teamsUpdated: affectedTeams.length,
    playersUpdated: affectedPlayers.length,
    leadsUpdated: affectedUsers.length
  };
}

/**
 * Milestone 8: Publish Age-Group Matchday Squad Split (e.g. 25 kids -> 3 teams for 3 coaches)
 */
export async function publishAgeGroupSquadSplit({
  dateStr,
  ageGroupTeams = [],
  ageGroupPlayers = [],
  assignmentsByPlayerId = {},
  oppositionByTeamId = {},
  autoGenerateLineups = true
}) {
  const { db } = getFirebaseServices();
  const isFirebase = appState.mode === 'firebase' && db;
  const store = isFirebase ? null : loadLocalStore();

  const allTeamIdsInAgeGroup = ageGroupTeams.map(t => t.teamId);

  // 1. Ensure any player assigned to a team this week has that team in `allowedTeamIds`
  for (const player of ageGroupPlayers) {
    const assignedTeamId = assignmentsByPlayerId[player.playerId];
    const currentAllowed = new Set(player.allowedTeamIds || [player.primaryTeamId]);
    // Share across all teams in the age group so the splitter works seamlessly week to week
    allTeamIdsInAgeGroup.forEach(tId => currentAllowed.add(tId));
    if (assignedTeamId && assignedTeamId !== 'OFF') {
      currentAllowed.add(assignedTeamId);
    }
    const updatedAllowed = Array.from(currentAllowed);
    if (updatedAllowed.length !== (player.allowedTeamIds || []).length) {
      player.allowedTeamIds = updatedAllowed;
      if (isFirebase) {
        await setDoc(
          doc(db, 'players', player.playerId),
          { allowedTeamIds: updatedAllowed },
          { merge: true }
        );
      } else if (store.players[player.playerId]) {
        store.players[player.playerId].allowedTeamIds = updatedAllowed;
      }
    }
  }

  // Build preferredGroup map by display name
  const preferredMap = {};
  ageGroupPlayers.forEach(p => {
    preferredMap[getPlayerDisplayName(p)] = p.preferredGroup || 'ANY';
  });

  // 2. For each team in the age group, update its Match doc & Period Lineup docs for `dateStr`
  for (const team of ageGroupTeams) {
    const tId = team.teamId;
    const matchId = getMatchId(tId, dateStr);
    const existingMatch = appState.allMatches[matchId] || {};
    const formation = existingMatch.formation || team.defaultFormation || '7v7';
    const periodCount = Number(existingMatch.periodCount) || Number(team.defaultPeriods) || 4;
    const defaultShape = getDefaultShapeForFormat(formation);
    const tacticalShape = existingMatch.tacticalShape || defaultShape;
    const qtrMins = parseFloat(existingMatch.qtrMins) || team.defaultQtrMins || 12;
    const opposition =
      oppositionByTeamId[tId] !== undefined
        ? oppositionByTeamId[tId].trim()
        : existingMatch.opposition || '';

    const assignedPlayers = ageGroupPlayers
      .filter(p => assignmentsByPlayerId[p.playerId] === tId)
      .map(p => getPlayerDisplayName(p));

    // Every other player in the age group (assigned to another team or marked OFF) is unavailable for THIS team today
    const unavailableForThisTeam = ageGroupPlayers
      .filter(p => assignmentsByPlayerId[p.playerId] !== tId)
      .map(p => getPlayerDisplayName(p));

    const matchDoc = {
      ...existingMatch,
      clubId: getActiveClubId(),
      matchId,
      teamId: tId,
      date: dateStr,
      opposition,
      qtrMins,
      periodCount,
      formation,
      tacticalShape,
      matchdaySquad: assignedPlayers,
      updatedAt: new Date().toISOString(),
      updatedBy: appState.currentUser?.uid || 'local_coach_1'
    };

    if (isFirebase) {
      await setDoc(doc(db, 'matches', matchId), matchDoc, { merge: true });
    } else {
      store.matches[matchId] = matchDoc;
    }

    const periods = periodCount === 2 ? [1, 2] : periodCount === 3 ? [1, 2, 3] : [1, 2, 3, 4];
    const teamSize = FORMAT_SIZES[formation] || 7;
    const tracking = {};
    assignedPlayers.forEach(pName => {
      tracking[pName] = { totalQtrs: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
    });

    for (const q of periods) {
      const lineupId = getLineupId(matchId, q);
      const existingLineupDoc = (appState.lineupsByMatch[matchId] || {})[q] || {};
      const qShape = existingLineupDoc.tacticalShape || tacticalShape;
      const activePositions = getPositionsForFormatAndShape(formation, qShape);

      let newLineup = { ...(existingLineupDoc.lineup || {}) };
      // Remove any player from existing lineup who is no longer assigned to this team today
      const assignedSet = new Set(assignedPlayers);
      Object.keys(newLineup).forEach(posId => {
        if (!assignedSet.has(newLineup[posId])) {
          delete newLineup[posId];
        }
      });

      // Auto-generate fair lineup if requested and team has enough assigned players
      if (autoGenerateLineups && assignedPlayers.length >= teamSize) {
        const sortedAvailable = [...assignedPlayers].sort((a, b) => {
          if (tracking[a].totalQtrs !== tracking[b].totalQtrs) {
            return tracking[a].totalQtrs - tracking[b].totalQtrs;
          }
          return Math.random() - 0.5;
        });

        const starters = sortedAvailable.slice(0, teamSize);
        newLineup = {};

        const specGKs = sortedAvailable
          .filter(p => preferredMap[p] === 'GK')
          .sort((a, b) => tracking[a].GK - tracking[b].GK);

        if (specGKs.length > 0) {
          const chosenGK = specGKs[0];
          if (!starters.includes(chosenGK)) {
            for (let i = starters.length - 1; i >= 0; i--) {
              if (preferredMap[starters[i]] !== 'GK') {
                starters[i] = chosenGK;
                break;
              }
            }
          }
          newLineup.GK = chosenGK;
          tracking[chosenGK].GK++;
        } else {
          starters.sort((a, b) => tracking[a].GK - tracking[b].GK);
          newLineup.GK = starters[0];
          tracking[starters[0]].GK++;
        }

        let remaining = starters.filter(p => p !== newLineup.GK);
        const zonePrio = (pName, target) => {
          const pref = preferredMap[pName] || 'ANY';
          return pref === target ? 0 : pref === 'ANY' ? 1 : 2;
        };

        ['ATT', 'DEF', 'MID'].forEach(groupName => {
          const slots = activePositions.filter(pos => pos.group === groupName);
          if (slots.length > 0) {
            remaining.sort((a, b) => {
              const d = zonePrio(a, groupName) - zonePrio(b, groupName);
              return d !== 0 ? d : tracking[a][groupName] - tracking[b][groupName];
            });
            slots.forEach((slot, idx) => {
              if (remaining[idx]) {
                newLineup[slot.id] = remaining[idx];
                tracking[remaining[idx]][groupName]++;
              }
            });
            remaining = remaining.slice(slots.length);
          }
        });

        starters.forEach(pName => {
          tracking[pName].totalQtrs++;
        });
      }

      const lineupDoc = {
        clubId: getActiveClubId(),
        lineupId,
        matchId,
        teamId: tId,
        date: dateStr,
        quarter: q,
        tacticalShape: qShape,
        lineup: newLineup,
        unavailablePlayers: unavailableForThisTeam,
        swaps: existingLineupDoc.swaps || []
      };

      if (isFirebase) {
        await setDoc(doc(db, 'lineups', lineupId), lineupDoc, { merge: true });
      } else {
        store.lineups[lineupId] = lineupDoc;
      }
    }
  }

  if (!isFirebase && store) {
    saveLocalStore(store);
  }
}

/**
 * Scans browser localStorage for MatchDay Ready Local Sandbox data (`matchday_club_store_v3`, etc.)
 * so any teams (e.g. U8 Green / U8 White), players, matches (e.g. 14 Nov vs Maynooth), and lineups
 * previously saved in Local Mode on this device can be restored to Cloud Firestore in 1 tap.
 */
export function findLocalSandboxDataToRecover() {
  try {
    const candidateKeys = [LOCAL_CLUB_STORE_KEY, 'matchday_club_store_v2', 'matchday_club_store_v1'];
    for (const key of candidateKeys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') continue;
      const teams = Object.values(parsed.teams || {}).filter(Boolean);
      const players = Object.values(parsed.players || {}).filter(Boolean);
      const matches = Object.values(parsed.matches || {}).filter(Boolean);
      const lineups = Object.values(parsed.lineups || {}).filter(Boolean);
      if (teams.length > 0 || players.length > 0 || matches.length > 0) {
        return {
          sourceKey: key,
          teams,
          players,
          matches,
          lineups,
          teamNames: teams.map(t => t.name).filter(Boolean),
          matchSummaries: matches.map(m => `${m.date || ''} ${m.opposition ? `vs ${m.opposition}` : ''}`.trim())
        };
      }
    }
  } catch (e) {
    console.warn('Local sandbox scan note:', e);
  }
  return null;
}

/**
 * Restores all teams, players, matches, and lineups from Local Sandbox storage (`matchday_club_store_v3`)
 * into the active Cloud Firestore club (`straffan_afc`), preserving all IDs, dates, oppositions, and swaps.
 */
export async function recoverLocalSandboxDataToCloud() {
  const found = findLocalSandboxDataToRecover();
  if (!found) {
    throw new Error('No Local Sandbox data was found in this browser.');
  }
  if (appState.mode !== 'firebase') {
    throw new Error('Sign in to Firebase Cloud mode first to upload local data.');
  }

  const { db } = getFirebaseServices();
  const clubId = getActiveClubId();
  const uid = appState.currentUser?.uid || appState.userProfile?.uid || 'admin';

  for (const t of found.teams) {
    if (!t.teamId) continue;
    await setDoc(
      doc(db, 'teams', t.teamId),
      { ...t, clubId, coachIds: Array.from(new Set([...(t.coachIds || []), uid])) },
      { merge: true }
    );
  }
  for (const p of found.players) {
    if (!p.playerId) continue;
    await setDoc(doc(db, 'players', p.playerId), { ...p, clubId }, { merge: true });
  }
  for (const m of found.matches) {
    if (!m.matchId) continue;
    await setDoc(doc(db, 'matches', m.matchId), { ...m, clubId }, { merge: true });
  }
  for (const l of found.lineups) {
    if (!l.lineupId) continue;
    await setDoc(doc(db, 'lineups', l.lineupId), { ...l, clubId }, { merge: true });
  }

  return {
    teamsRestored: found.teams.length,
    playersRestored: found.players.length,
    matchesRestored: found.matches.length,
    lineupsRestored: found.lineups.length,
    teamNames: found.teamNames
  };
}

/**
 * Scans all keys in browser localStorage for ANY `uFootballApp*` version (V1..V99 or unversioned)
 * and returns the latest valid payload `{ sourceKey, data }`.
 */
export function findLatestUFootballAppInLocalStorage() {
  const candidates = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    // Skip current v2/v3 multi-tenant club store keys
    if (key.startsWith('matchday_')) continue;

    const rank = extractUFootballVersionRank(key);
    const raw = localStorage.getItem(key);
    const parsed = parseUFootballPayloadFromString(raw);
    if (parsed && (Array.isArray(parsed.players) || parsed.matches)) {
      const matchCount = Object.keys(parsed.matches || {}).length;
      candidates.push({
        sourceKey: key,
        rank: rank >= 0 ? rank : 0,
        matchCount,
        data: parsed
      });
    }
  }

  if (candidates.length === 0) return null;

  // Sort by highest version rank first; break ties by most saved matches
  candidates.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return b.matchCount - a.matchCount;
  });

  return candidates[0];
}

/**
 * Imports a parsed legacy uFootballApp payload `{ players, matches, qtrMins, formation }`
 * into the currently selected team.
 */
export async function importLegacyPayloadObject(legacy, sourceLabel = 'uFootballApp') {
  if (!legacy || (!Array.isArray(legacy.players) && !legacy.matches)) {
    throw new Error('Invalid uFootballApp data structure.');
  }

  const team = getSelectedTeam();
  const existingNames = new Set(appState.players.map(p => getPlayerDisplayName(p).toLowerCase()));
  let addedPlayers = 0;

  // 1. Import players
  for (const pName of legacy.players || []) {
    if (pName && !existingNames.has(pName.trim().toLowerCase())) {
      await addClubPlayer({
        firstName: pName.trim(),
        lastName: '',
        primaryTeamId: team.teamId,
        sharedWithTeamIds: []
      });
      existingNames.add(pName.trim().toLowerCase());
      addedPlayers++;
    }
  }

  // 2. Import matches & quarters
  const matchesObj = legacy.matches || {};
  let importedMatches = 0;

  for (const [dateStr, mData] of Object.entries(matchesObj)) {
    if (!mData || typeof mData !== 'object') continue;
    const matchId = getMatchId(team.teamId, dateStr);
    const formation = legacy.formation || team.defaultFormation || '7v7';
    const matchDoc = {
      clubId: getActiveClubId(),
      matchId,
      teamId: team.teamId,
      date: dateStr,
      opposition: mData.opposition || '',
      qtrMins: parseFloat(legacy.qtrMins) || team.defaultQtrMins || 12,
      formation,
      tacticalShape: getDefaultShapeForFormat(formation),
      updatedAt: new Date().toISOString(),
      updatedBy: appState.currentUser?.uid || 'local_coach_1'
    };

    if (appState.mode === 'firebase') {
      const { db } = getFirebaseServices();
      await setDoc(doc(db, 'matches', matchId), matchDoc, { merge: true });
    } else {
      const store = loadLocalStore();
      store.matches[matchId] = matchDoc;
      saveLocalStore(store);
    }
    importedMatches++;

    for (const q of [1, 2, 3, 4]) {
      const qData = mData[q];
      if (!qData) continue;
      const lineupId = getLineupId(matchId, q);
      const lineupDoc = {
        clubId: getActiveClubId(),
        lineupId,
        matchId,
        teamId: team.teamId,
        date: dateStr,
        quarter: q,
        tacticalShape: getDefaultShapeForFormat(formation),
        lineup: qData.lineup || {},
        unavailablePlayers: qData.unavailable || qData.unavailablePlayers || [],
        swaps: qData.swaps || [],
        events: qData.events || []
      };

      if (appState.mode === 'firebase') {
        const { db } = getFirebaseServices();
        await setDoc(doc(db, 'lineups', lineupId), lineupDoc, { merge: true });
      } else {
        const store = loadLocalStore();
        store.lineups[lineupId] = lineupDoc;
        saveLocalStore(store);
      }
    }
  }

  return {
    sourceLabel,
    addedPlayers,
    totalPlayersInFile: (legacy.players || []).length,
    importedMatches
  };
}

/**
 * Migrate legacy uFootballApp data from LocalStorage (any version), or SheetDB if configured
 */
export async function importLegacyPrototypeData() {
  const detected = findLatestUFootballAppInLocalStorage();
  if (detected) {
    return await importLegacyPayloadObject(detected.data, detected.sourceKey);
  }

  // Also check if a SheetDB URL is stored in localStorage from the beta prototype
  const savedSheetDb = localStorage.getItem('sheetDbUrl');
  if (savedSheetDb) {
    const res = await fetch(`${savedSheetDb.replace(/\/$/, '')}/id/app_state`);
    if (res.ok) {
      const text = await res.text();
      const parsed = parseUFootballPayloadFromString(text);
      if (parsed) {
        return await importLegacyPayloadObject(parsed, 'SheetDB (app_state)');
      }
    }
  }

  return null;
}
