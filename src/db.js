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
  isClubAdmin,
  isProfileActive,
  canModifyUserRole,
  canRemoveUser,
  normalizeRole
} from './permissions.js';

export const FORMAT_SIZES = {
  '5v5': 5,
  '6v6': 6,
  '7v7': 7,
  '9v9': 9,
  '11v11': 11
};

export const FORMATIONS_BY_FORMAT = {
  '5v5': {
    'GK-2-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 3 }
    ],
    'GK-1-2-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-1-3': [
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 1 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 1 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 1 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 3 }
    ],
    'GK-3-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 2 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 3 }
    ]
  },
  '6v6': {
    'GK-2-2-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'CM1', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM2', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-1-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-2-1-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-1-3-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ]
  },
  '7v7': {
    'GK-2-3-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-2-1': [
      { id: 'ATT', label: 'ATT', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-2-1-3': [
      { id: 'LW', label: 'LW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RW', label: 'RW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-2-2-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-1-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ]
  },
  '9v9': {
    'GK-3-3-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-2-3': [
      { id: 'LW', label: 'LW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RW', label: 'RW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-4-1': [
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-2-4-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-4-3-1': [
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LB', label: 'LB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RB', label: 'RB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-2-3-3': [
      { id: 'LW', label: 'LW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RW', label: 'RW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LD', label: 'LD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RD', label: 'RD', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ]
  },
  '11v11': {
    'GK-4-3-3': [
      { id: 'LW', label: 'LW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RW', label: 'RW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LB', label: 'LB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RB', label: 'RB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-4-4-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LB', label: 'LB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RB', label: 'RB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-4-2-3-1': [
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LAM', label: 'LAM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CAM', label: 'CAM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RAM', label: 'RAM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCDM', label: 'LCDM', group: 'MID', color: 'bg-amber-700', row: 3 },
      { id: 'RCDM', label: 'RCDM', group: 'MID', color: 'bg-amber-700', row: 3 },
      { id: 'LB', label: 'LB', group: 'DEF', color: 'bg-sky-600', row: 4 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 4 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 4 },
      { id: 'RB', label: 'RB', group: 'DEF', color: 'bg-sky-600', row: 4 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 5 }
    ],
    'GK-3-5-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LWB', label: 'LWB', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RWB', label: 'RWB', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-3-4-3': [
      { id: 'LW', label: 'LW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'ST', label: 'ST', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RW', label: 'RW', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LM', label: 'LM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RM', label: 'RM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ],
    'GK-5-3-2': [
      { id: 'LF', label: 'LF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'RF', label: 'RF', group: 'ATT', color: 'bg-rose-600', row: 1 },
      { id: 'LCM', label: 'LCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'CM', label: 'CM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'RCM', label: 'RCM', group: 'MID', color: 'bg-amber-600', row: 2 },
      { id: 'LWB', label: 'LWB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'LCB', label: 'LCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'CB', label: 'CB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RCB', label: 'RCB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'RWB', label: 'RWB', group: 'DEF', color: 'bg-sky-600', row: 3 },
      { id: 'GK', label: 'GK', group: 'GK', color: 'bg-purple-600', row: 4 }
    ]
  }
};

export function getDefaultShapeForFormat(format = '7v7') {
  const shapes = FORMATIONS_BY_FORMAT[format] || FORMATIONS_BY_FORMAT['7v7'];
  return Object.keys(shapes)[0];
}

export function getAvailableShapesForFormat(format = '7v7') {
  const shapes = FORMATIONS_BY_FORMAT[format] || FORMATIONS_BY_FORMAT['7v7'];
  return Object.keys(shapes);
}

export function getPositionsForFormatAndShape(format = '7v7', shape = null) {
  const shapes = FORMATIONS_BY_FORMAT[format] || FORMATIONS_BY_FORMAT['7v7'];
  const resolvedShape = shape && shapes[shape] ? shape : Object.keys(shapes)[0];
  return shapes[resolvedShape];
}

// Legacy alias for any module expecting FORMATIONS[format]
export const FORMATIONS = {
  '5v5': FORMATIONS_BY_FORMAT['5v5']['GK-2-2'],
  '6v6': FORMATIONS_BY_FORMAT['6v6']['GK-2-2-1'],
  '7v7': FORMATIONS_BY_FORMAT['7v7']['GK-2-3-1'],
  '9v9': FORMATIONS_BY_FORMAT['9v9']['GK-3-3-2'],
  '11v11': FORMATIONS_BY_FORMAT['11v11']['GK-4-3-3']
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
        assignedAgeGroups: ['U10']
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
  claimedInviteNotice: null, // Banner notice shown after auto-claiming an email invite
  currentUser: null, // Firebase auth user or local user profile
  userProfile: null, // Document from `users` collection
  club: null,
  teams: [], // Teams accessible to this user
  allClubTeams: [], // All teams in club (for shared player badges & admin)
  allClubUsers: [], // All coaches/leads/viewers/admins in club
  allClubInvites: [], // Pending/accepted email invites for club (Admin only)
  allClubJoinRequests: [], // Pending/reviewed join-code requests (Admin only)
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

export function normalizeJoinCode(raw = '') {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export function generateClubJoinCode(clubShortName = 'CLUB') {
  const prefix =
    String(clubShortName || 'CLUB')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'CLUB';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${suffix}`;
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
      assignedAgeGroups: ['U10']
    };
  }
  appState.userProfile = store.users[uid];
  appState.club = store.clubs[DEFAULT_CLUB_ID] || {
    clubId: DEFAULT_CLUB_ID,
    name: DEFAULT_CLUB_FULL_NAME,
    shortName: DEFAULT_CLUB_NAME,
    joinCode: 'STRAFFAN-2026',
    joinCodeEnabled: true
  };
  appState.allClubTeams = Object.values(store.teams || {});
  appState.allClubUsers = Object.values(store.users || {});
  appState.allClubInvites = Object.values(store.invites || {});
  appState.allClubJoinRequests = Object.values(store.joinRequests || {});
  appState.teams = getAccessibleTeamsForProfile(appState.userProfile, appState.allClubTeams);

  if (appState.teams.length > 0 && !appState.teams.some(t => t.teamId === appState.selectedTeamId)) {
    appState.selectedTeamId = appState.teams[0].teamId;
  }

  appState.players = Object.values(store.players || {});
  appState.allMatches = { ...(store.matches || {}) };
  appState.matchesByTeam = {};
  Object.values(store.matches || {}).forEach(m => {
    if (m.teamId === appState.selectedTeamId) {
      appState.matchesByTeam[m.matchId] = m;
    }
  });

  appState.lineupsByMatch = {};
  appState.sameDateLineupsAllTeams = [];
  Object.values(store.lineups || {}).forEach(l => {
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
  appState.players = [];
  appState.allMatches = {};
  appState.matchesByTeam = {};
  appState.lineupsByMatch = {};
  appState.sameDateLineupsAllTeams = [];
}

/**
 * Watches `users/{uid}` and `joinRequests` while an uninvited user is on the Access Gate,
 * so the moment a Club Admin approves them (or sends an invite), the app unlocks live!
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
          startFirestoreSubscriptions(firebaseUser);
        } else {
          appState.accessStatus = 'suspended';
          notifyAppState();
        }
      }
    })
  );

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
 * 1. Existing `users/{uid}` profile -> Active or Suspended
 * 2. Pending email match in `invites` -> Auto-claim with exact Admin-assigned role & teams
 * 3. Brand-new empty Firestore (no default club yet) -> Bootstrap founding Admin
 * 4. Otherwise -> Route to Access Gate (Enter Join Code / Wait for Admin Approval) — NEVER auto-admin!
 */
export async function ensureUserAndClubSeeded(firebaseUser) {
  const { db, configured } = getFirebaseServices();
  if (!configured || !db || !firebaseUser) return { accessStatus: 'needs_onboarding' };

  appState.mode = 'firebase';
  appState.syncState = 'syncing';
  appState.accessStatus = 'loading';
  appState.claimedInviteNotice = null;
  notifyAppState();

  const userRef = doc(db, 'users', firebaseUser.uid);

  // 1. Check existing user profile first
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const profile = userSnap.data();
    appState.userProfile = profile;
    if (!isProfileActive(profile)) {
      resetClubRuntimeData();
      appState.accessStatus = 'suspended';
      appState.syncState = 'synced';
      notifyAppState();
      startAccessGateWatcher(firebaseUser);
      return { accessStatus: 'suspended', userProfile: profile };
    }
    appState.accessStatus = 'ready';
    notifyAppState();
    return { accessStatus: 'ready', userProfile: profile };
  }

  // 2. Check dedicated `invites` collection for a pending email invite
  const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
  if (cleanEmail) {
    try {
      const inviteSnap = await getDocs(
        query(collection(db, 'invites'), where('email', '==', cleanEmail))
      );
      const pendingInvites = inviteSnap.docs
        .map(d => ({ inviteId: d.id, ...d.data() }))
        .filter(inv => inv.status === 'pending');

      if (pendingInvites.length > 0) {
        const inv = pendingInvites[0];
        const newProfile = {
          uid: firebaseUser.uid,
          email: cleanEmail,
          displayName: firebaseUser.displayName || inv.displayName || cleanEmail.split('@')[0],
          role: normalizeRole(inv.role || 'coach'),
          status: 'active',
          clubId: inv.clubId,
          assignedTeamIds: Array.isArray(inv.assignedTeamIds) ? inv.assignedTeamIds : [],
          assignedAgeGroups: Array.isArray(inv.assignedAgeGroups) ? inv.assignedAgeGroups : [],
          claimedInviteId: inv.inviteId,
          createdAt: new Date().toISOString()
        };

        await setDoc(userRef, newProfile);
        try {
          await updateDoc(doc(db, 'invites', inv.inviteId), {
            status: 'accepted',
            claimedBy: firebaseUser.uid,
            claimedAt: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Could not mark invite as accepted:', err);
        }

        appState.userProfile = newProfile;
        appState.accessStatus = 'ready';
        appState.claimedInviteNotice = `Welcome to ${inv.clubName || 'your club'}! Your invite as ${newProfile.role.toUpperCase()} has been activated.`;
        notifyAppState();
        return { accessStatus: 'ready', userProfile: newProfile, claimedInvite: inv };
      }
    } catch (err) {
      console.warn('Invite lookup error:', err);
    }
  }

  // 3. Check if default club needs initial first-ever bootstrap (empty Firebase project only)
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
      firebaseUser.displayName || "Neil D'Rosario"
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

  // 4. Club exists & user has no profile or invite -> Check pending joinRequests & show Access Gate
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
      appState.userProfile = profile;

      if (!isProfileActive(profile)) {
        clearFirestoreSubscriptions();
        resetClubRuntimeData();
        appState.accessStatus = 'suspended';
        notifyAppState();
        startAccessGateWatcher(firebaseUser);
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

  // 3. Subscribe to Club Users (club-scoped)
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'users'), where('clubId', '==', clubId)),
      snap => {
        appState.allClubUsers = snap.docs.map(d => d.data());
        notifyAppState();
      }
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
  if (!appState.userProfile) {
    appState.teams = [];
    return;
  }
  appState.teams = getAccessibleTeamsForProfile(appState.userProfile, appState.allClubTeams);
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
  return (
    appState.teams.find(t => t.teamId === appState.selectedTeamId) ||
    appState.allClubTeams.find(t => t.teamId === appState.selectedTeamId) || {
      teamId: 'u10_white',
      clubId: DEFAULT_CLUB_ID,
      name: 'U10 White',
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
  const count = Number(match?.periodCount) || 4;
  if (count === 2) return [1, 2];
  if (count === 3) return [1, 2, 3];
  return [1, 2, 3, 4];
}

export function getPeriodShortLabel(pNum, periodCount = 4) {
  const c = Number(periodCount) || 4;
  if (c === 2) return `H${pNum}`;
  if (c === 3) return `T${pNum}`;
  return `Q${pNum}`;
}

export function getPeriodLongLabel(pNum, periodCount = 4) {
  const c = Number(periodCount) || 4;
  if (c === 2) return `Half ${pNum}`;
  if (c === 3) return `Third ${pNum}`;
  return `Quarter ${pNum}`;
}

export function getPeriodUnitLabel(periodCount = 4) {
  const c = Number(periodCount) || 4;
  if (c === 2) return 'm/h';
  if (c === 3) return 'm/t';
  return 'm/q';
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

  const rawStats = {};
  playerNames.forEach(pName => {
    rawStats[pName] = { TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0, matchesPlayed: 0 };
  });

  const allTeamMatches = Object.values(appState.allMatches || {}).filter(
    m => m.teamId === teamId && m.date && m.date !== excludeDateStr
  );

  allTeamMatches.forEach(mDoc => {
    const qtrMins = parseFloat(mDoc.qtrMins) || 12;
    const format = mDoc.formation || '7v7';
    const periods = getMatchPeriods(mDoc);
    const quartersMap = appState.lineupsByMatch[mDoc.matchId] || {};
    const playedThisMatch = new Set();

    periods.forEach(q => {
      const qObj = quartersMap[q];
      if (!qObj) return;
      const qData = qObj.lineup || {};
      const swaps = qObj.swaps || [];
      const activePositions = getPositionsForFormatAndShape(
        format,
        qObj.tacticalShape || mDoc.tacticalShape
      );
      const posGroupMap = {};
      activePositions.forEach(pos => {
        posGroupMap[pos.id] = pos.group;
      });

      activePositions.forEach(pos => {
        const pName = qData[pos.id];
        if (!pName) return;
        const involvedSwap = swaps.find(
          s => s.text && (s.text.includes(`at ${pos.id}`) || s.text.includes(`(${pos.id})`))
        );
        const mins = involvedSwap ? qtrMins / 2 : qtrMins;
        if (!rawStats[pName]) {
          rawStats[pName] = { TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0, matchesPlayed: 0 };
        }
        rawStats[pName][pos.group] += mins;
        rawStats[pName].TOTAL += mins;
        playedThisMatch.add(pName);
      });

      swaps.forEach(sw => {
        if (!sw.text) return;
        const subMatch = sw.text.match(/^(.+) replaced (.+) at ([A-Z0-9]+)/);
        if (subMatch) {
          const outgoingPlayer = subMatch[2].trim();
          const posId = subMatch[3].trim();
          const group = posGroupMap[posId] || 'MID';
          const halfMins = qtrMins / 2;
          if (!rawStats[outgoingPlayer]) {
            rawStats[outgoingPlayer] = { TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0, matchesPlayed: 0 };
          }
          if (qData[posId] !== outgoingPlayer) {
            rawStats[outgoingPlayer][group] += halfMins;
            rawStats[outgoingPlayer].TOTAL += halfMins;
            playedThisMatch.add(outgoingPlayer);
          }
        }
      });
    });

    playedThisMatch.forEach(pName => {
      if (rawStats[pName]) rawStats[pName].matchesPlayed++;
    });
  });

  // Compute average historical total minutes among players who have appeared in at least 1 prior match
  const activeHistPlayers = Object.values(rawStats).filter(s => s.TOTAL > 0);
  const avgHistTotal =
    activeHistPlayers.length > 0
      ? activeHistPlayers.reduce((sum, s) => sum + s.TOTAL, 0) / activeHistPlayers.length
      : 0;

  const seed = {};
  playerNames.forEach(pName => {
    const s = rawStats[pName] || { TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
    // Normalize offset so a player who played less than average starts with a negative offset (higher priority!)
    let offsetPeriods = 0;
    if (s.TOTAL > 0 && avgHistTotal > 0) {
      offsetPeriods = Math.max(-1.5, Math.min(1.5, (s.TOTAL - avgHistTotal) / baseUnitMins));
    }
    seed[pName] = {
      totalQtrs: Number(offsetPeriods.toFixed(2)),
      GK: Number((s.GK / baseUnitMins).toFixed(2)),
      DEF: Number((s.DEF / baseUnitMins).toFixed(2)),
      MID: Number((s.MID / baseUnitMins).toFixed(2)),
      ATT: Number((s.ATT / baseUnitMins).toFixed(2)),
      rawTotalMins: s.TOTAL
    };
  });

  return seed;
}

/**
 * Real-Time Shared Player Conflict Detection (Blueprint Section 4)
 * Returns an array of conflicts if a player assigned to the current team in `quarter`
 * is simultaneously assigned to another club team on the same date & quarter.
 */
export function getSharedPlayerConflicts(quarter = appState.currentQuarter) {
  const currentTeam = getSelectedTeam();
  const currentQDoc = getQuarterLineupDoc(quarter);
  const currentAssignedPlayers = new Set(
    Object.values(currentQDoc.lineup || {}).filter(Boolean)
  );
  if (currentAssignedPlayers.size === 0) return [];

  const conflicts = [];
  appState.sameDateLineupsAllTeams.forEach(otherLineup => {
    if (
      otherLineup.quarter === quarter &&
      otherLineup.date === appState.selectedDate &&
      otherLineup.teamId &&
      otherLineup.teamId !== currentTeam.teamId
    ) {
      const otherTeam = appState.allClubTeams.find(t => t.teamId === otherLineup.teamId);
      const otherTeamName = otherTeam ? otherTeam.name : otherLineup.teamId;
      Object.entries(otherLineup.lineup || {}).forEach(([posId, playerName]) => {
        if (playerName && currentAssignedPlayers.has(playerName)) {
          conflicts.push({
            playerName,
            otherTeamName,
            otherPosId: posId,
            quarter
          });
        }
      });
    }
  });
  return conflicts;
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
  assignedAgeGroups = []
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

  const inviteDoc = {
    inviteId,
    clubId,
    clubName,
    email: cleanEmail,
    displayName: cleanName,
    role: safeRole,
    assignedTeamIds: Array.from(new Set(defaultTeams)),
    assignedAgeGroups: cleanAgeGroups,
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

export async function updateCoachRole(uid, newRole) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const check = canModifyUserRole(appState.userProfile, user, newRole, appState.allClubUsers);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  const safeRole = normalizeRole(newRole);
  const patch = {
    role: safeRole,
    updatedAt: new Date().toISOString()
  };
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

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), patch, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid] = { ...store.users[uid], ...patch };
      saveLocalStore(store);
    }
  }
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
  const assignedTeamIds = Array.from(current);

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), { assignedTeamIds, updatedAt: new Date().toISOString() }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid].assignedTeamIds = assignedTeamIds;
      saveLocalStore(store);
    }
  }
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
  const assignedAgeGroups = Array.from(current);

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), { assignedAgeGroups, updatedAt: new Date().toISOString() }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid].assignedAgeGroups = assignedAgeGroups;
      saveLocalStore(store);
    }
  }
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

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), { status: nextStatus, updatedAt: new Date().toISOString() }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid].status = nextStatus;
      saveLocalStore(store);
    }
  }
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

export async function submitJoinCodeRequest({ joinCode, displayName = '', note = '' }) {
  const cleanCode = normalizeJoinCode(joinCode);
  if (!cleanCode) {
    throw new Error('Please enter a Club Join Code.');
  }

  const firebaseUser = appState.currentUser;
  if (!firebaseUser) {
    throw new Error('Please sign in first.');
  }

  if (appState.mode !== 'firebase') {
    throw new Error('Join codes are used in Firebase Cloud mode.');
  }

  const { db } = getFirebaseServices();
  const codeSnap = await getDoc(doc(db, 'joinCodes', cleanCode));
  if (!codeSnap.exists()) {
    throw new Error(`Join code "${cleanCode}" was not found. Double-check with your Club Admin.`);
  }
  const codeData = codeSnap.data();
  if (!codeData.active) {
    throw new Error(`Join code "${cleanCode}" is currently disabled. Ask your Club Admin for an active code or email invite.`);
  }

  const requestId = `${codeData.clubId}__${firebaseUser.uid}`;
  const reqDoc = {
    requestId,
    clubId: codeData.clubId,
    clubName: codeData.clubName || 'Club',
    uid: firebaseUser.uid,
    email: (firebaseUser.email || '').trim().toLowerCase(),
    displayName: (displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Coach').trim(),
    joinCode: cleanCode,
    requestedRole: codeData.defaultRole || 'coach',
    note: (note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'joinRequests', requestId), reqDoc);
  appState.pendingJoinRequest = reqDoc;
  appState.accessStatus = 'pending_approval';
  notifyAppState();
  return reqDoc;
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
  assignedAgeGroups = []
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

  const newUserDoc = {
    uid: req.uid,
    email: req.email,
    displayName: req.displayName || req.email?.split('@')[0] || 'Coach',
    role: safeRole,
    status: 'active',
    clubId,
    assignedTeamIds: Array.from(new Set(finalTeams)),
    assignedAgeGroups: finalAgeGroups,
    approvedBy: appState.userProfile?.uid || 'local_coach_1',
    createdAt: now,
    updatedAt: now
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', req.uid), newUserDoc, { merge: true });
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
    // Only Club Admins update their own assignedTeamIds; Age-Group Leads get access via assignedAgeGroups
    if (appState.userProfile && isClubAdmin(appState.userProfile)) {
      const assigned = Array.from(new Set([...(appState.userProfile.assignedTeamIds || []), teamId]));
      await setDoc(
        doc(db, 'users', appState.userProfile.uid),
        { assignedTeamIds: assigned },
        { merge: true }
      );
    }
  } else {
    const store = loadLocalStore();
    store.teams[teamId] = newTeam;
    const uid = appState.userProfile?.uid || 'local_coach_1';
    if (store.users[uid] && isClubAdmin(store.users[uid])) {
      store.users[uid].assignedTeamIds = Array.from(
        new Set([...(store.users[uid].assignedTeamIds || []), teamId])
      );
    }
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
 * Extract numeric version rank from any key or filename like `uFootballAppV4`, `uFootballApp_v2.json`, `uFootballApp`
 */
export function extractUFootballVersionRank(name = '') {
  const match = String(name).match(/uFootballApp[_\-\s]*v?(\d+)/i);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  if (/uFootballApp/i.test(name)) {
    return 0;
  }
  return -1;
}

/**
 * Parse a uFootballApp state payload from raw JSON, SheetDB response array, or HTML file
 */
export function parseUFootballPayloadFromString(rawText = '') {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;

  // 1. Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    // Handle SheetDB array format: [{ id: 'app_state', data: '{"players":...}' }]
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
      const inner = typeof parsed[0].data === 'string' ? JSON.parse(parsed[0].data) : parsed[0].data;
      if (inner && Array.isArray(inner.players)) return inner;
    }
    // Handle wrapped { data: '{"players":...}' }
    if (parsed && typeof parsed.data === 'string') {
      const inner = JSON.parse(parsed.data);
      if (inner && Array.isArray(inner.players)) return inner;
    }
    if (parsed && (Array.isArray(parsed.players) || typeof parsed.matches === 'object')) {
      return parsed;
    }
  } catch (_) {}

  // 2. If user selected an .html or .js file, extract any embedded JSON state or players array
  const playersMatch = trimmed.match(/players\s*:\s*\[([^\]]+)\]/);
  if (playersMatch) {
    const names = playersMatch[1]
      .split(',')
      .map(s => s.replace(/['"`]/g, '').trim())
      .filter(Boolean);
    if (names.length > 0) {
      return { players: names, matches: {} };
    }
  }

  return null;
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
