import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import {
  getFirebaseServices,
  DEFAULT_CLUB_ID,
  DEFAULT_CLUB_FULL_NAME
} from './firebase.js';

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
        shortName: 'Straffan AFC',
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
        clubId: DEFAULT_CLUB_ID,
        assignedTeamIds: ['u10_white', 'u10_green']
      }
    },
    players: playersMap,
    matches: {},
    lineups: {}
  };
}

// Reactive application state shared across UI modules
export const appState = {
  mode: 'local', // 'firebase' | 'local'
  syncState: 'local', // 'synced' | 'syncing' | 'local' | 'error'
  currentUser: null, // Firebase auth user or local user profile
  userProfile: null, // Document from `users` collection
  club: null,
  teams: [], // Teams accessible to this user
  allClubTeams: [], // All teams in club (for shared player badges & admin)
  allClubUsers: [], // All coaches/admins in club (for Admin Coach Management 5B)
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
  const uid = appState.currentUser?.uid || 'local_coach_1';
  if (!store.users[uid]) {
    store.users[uid] = {
      uid,
      email: appState.currentUser?.email || 'neil@straffanafc.ie',
      displayName: appState.currentUser?.displayName || "Neil D'Rosario",
      role: 'admin',
      clubId: DEFAULT_CLUB_ID,
      assignedTeamIds: ['u10_white', 'u10_green']
    };
  }
  appState.userProfile = store.users[uid];
  appState.club = store.clubs[DEFAULT_CLUB_ID] || {
    clubId: DEFAULT_CLUB_ID,
    name: DEFAULT_CLUB_FULL_NAME
  };
  appState.allClubTeams = Object.values(store.teams);
  appState.allClubUsers = Object.values(store.users || {});
  appState.teams = appState.allClubTeams.filter(
    t =>
      appState.userProfile.role === 'admin' ||
      (appState.userProfile.assignedTeamIds || []).includes(t.teamId)
  );
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

// --- CLOUD FIRESTORE SEEDING & SUBSCRIPTIONS ---
export async function ensureUserAndClubSeeded(firebaseUser) {
  const { db, configured } = getFirebaseServices();
  if (!configured || !db || !firebaseUser) return;

  appState.syncState = 'syncing';
  notifyAppState();

  const clubRef = doc(db, 'clubs', DEFAULT_CLUB_ID);
  const clubSnap = await getDoc(clubRef);

  const userRef = doc(db, 'users', firebaseUser.uid);
  const u10WhiteRef = doc(db, 'teams', 'u10_white');
  const u10WhiteSnap = await getDoc(u10WhiteRef);

  if (!clubSnap.exists() || !u10WhiteSnap.exists()) {
    // Seed or migrate club initialization for Straffan AFC (U10 White & U10 Green for Neil D'Rosario)
    const seed = createInitialSeedData(
      firebaseUser.uid,
      firebaseUser.email || 'neil@straffanafc.ie',
      firebaseUser.displayName || "Neil D'Rosario"
    );

    await setDoc(clubRef, {
      ...seed.clubs[DEFAULT_CLUB_ID],
      createdAt: serverTimestamp()
    }, { merge: true });

    // Remove legacy u12_white / u12_blue if they were auto-seeded earlier
    try {
      await deleteDoc(doc(db, 'teams', 'u12_white'));
      await deleteDoc(doc(db, 'teams', 'u12_blue'));
    } catch (_) {}

    for (const team of Object.values(seed.teams)) {
      await setDoc(doc(db, 'teams', team.teamId), team);
    }

    for (const player of Object.values(seed.players)) {
      await setDoc(doc(db, 'players', player.playerId), player);
    }

    await setDoc(userRef, seed.users[firebaseUser.uid], { merge: true });
  } else {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      // Check if an Admin pre-authorized this coach by email
      const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
      let matchedInvite = null;
      if (cleanEmail) {
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('clubId', '==', DEFAULT_CLUB_ID))
        );
        usersSnap.docs.forEach(d => {
          const data = d.data();
          if (
            data.uid !== firebaseUser.uid &&
            (data.email || '').trim().toLowerCase() === cleanEmail
          ) {
            matchedInvite = { docId: d.id, ...data };
          }
        });
      }

      if (matchedInvite) {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || matchedInvite.email,
          displayName: firebaseUser.displayName || matchedInvite.displayName || 'Coach',
          role: matchedInvite.role || 'coach',
          clubId: DEFAULT_CLUB_ID,
          assignedTeamIds: matchedInvite.assignedTeamIds || ['u10_white']
        });
        if (matchedInvite.docId.startsWith('invite_')) {
          try {
            await deleteDoc(doc(db, 'users', matchedInvite.docId));
          } catch (_) {}
        }
      } else {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          email: firebaseUser.email || 'neil@straffanafc.ie',
          displayName: firebaseUser.displayName || "Neil D'Rosario",
          role: 'admin',
          clubId: DEFAULT_CLUB_ID,
          assignedTeamIds: ['u10_white', 'u10_green']
        });
      }
    }
  }
}

export function clearFirestoreSubscriptions() {
  activeUnsubscribes.forEach(unsub => {
    try {
      unsub();
    } catch (_) {}
  });
  activeUnsubscribes = [];
}

export function startFirestoreSubscriptions(firebaseUser) {
  clearFirestoreSubscriptions();
  const { db, configured } = getFirebaseServices();
  if (!configured || !db || !firebaseUser) return;

  appState.mode = 'firebase';
  appState.syncState = 'syncing';
  notifyAppState();

  const clubId = DEFAULT_CLUB_ID;

  // 1. Subscribe to Club document
  activeUnsubscribes.push(
    onSnapshot(doc(db, 'clubs', clubId), snap => {
      if (snap.exists()) {
        appState.club = snap.data();
        notifyAppState();
      }
    })
  );

  // 2. Subscribe to User profile & Club Users (for Admin Coach Management)
  activeUnsubscribes.push(
    onSnapshot(doc(db, 'users', firebaseUser.uid), snap => {
      if (snap.exists()) {
        appState.userProfile = snap.data();
        filterAccessibleTeams();
        notifyAppState();
      }
    })
  );

  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'users'), where('clubId', '==', clubId)),
      snap => {
        appState.allClubUsers = snap.docs.map(d => d.data());
        notifyAppState();
      }
    )
  );

  // 3. Subscribe to Club Teams
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

  // 4. Subscribe to Club Players
  activeUnsubscribes.push(
    onSnapshot(
      query(collection(db, 'players'), where('clubId', '==', clubId)),
      snap => {
        appState.players = snap.docs.map(d => d.data());
        notifyAppState();
      }
    )
  );

  // 5. Subscribe to Matches & Lineups
  activeUnsubscribes.push(
    onSnapshot(collection(db, 'matches'), snap => {
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
    })
  );

  activeUnsubscribes.push(
    onSnapshot(collection(db, 'lineups'), snap => {
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
    })
  );
}

function filterAccessibleTeams() {
  if (!appState.userProfile) {
    appState.teams = appState.allClubTeams;
    return;
  }
  const { role, assignedTeamIds = [] } = appState.userProfile;
  if (role === 'admin') {
    appState.teams = [...appState.allClubTeams];
  } else {
    appState.teams = appState.allClubTeams.filter(t =>
      assignedTeamIds.includes(t.teamId)
    );
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
  const updatedMatch = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: appState.currentUser?.uid || 'local_coach_1'
  };

  // Optimistic update
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
  const updatedLineup = {
    ...currentQ,
    ...updates,
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

  const displayName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;
  const playerId = `player_${Date.now()}_${cleanFirst.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const allowed = Array.from(new Set([primaryTeamId || team.teamId, ...sharedWithTeamIds]));

  const newPlayer = {
    playerId,
    clubId: DEFAULT_CLUB_ID,
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
 * Milestone 5B: Club Admin — Pre-authorize or invite a coach by email and assign teams/role
 */
export async function inviteOrPreAuthorizeCoach({
  email,
  displayName,
  role = 'coach',
  assignedTeamIds = []
}) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Coach email is required.');

  const cleanName =
    (displayName || '').trim() || cleanEmail.split('@')[0];
  const uid = `invite_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`;
  const defaultTeams =
    assignedTeamIds.length > 0 ? assignedTeamIds : [appState.selectedTeamId];

  const coachDoc = {
    uid,
    email: cleanEmail,
    displayName: cleanName,
    role,
    clubId: DEFAULT_CLUB_ID,
    assignedTeamIds: defaultTeams,
    isInvite: true
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), coachDoc, { merge: true });
  } else {
    const store = loadLocalStore();
    store.users[uid] = coachDoc;
    saveLocalStore(store);
  }
  return coachDoc;
}

export async function updateCoachRole(uid, newRole) {
  const user = appState.allClubUsers.find(u => u.uid === uid);
  if (!user) return;
  const updated = { ...user, role: newRole };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid] = updated;
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
    await setDoc(doc(db, 'users', uid), { assignedTeamIds }, { merge: true });
  } else {
    const store = loadLocalStore();
    if (store.users[uid]) {
      store.users[uid].assignedTeamIds = assignedTeamIds;
      saveLocalStore(store);
    }
  }
}

export async function removeCoachProfile(uid) {
  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await deleteDoc(doc(db, 'users', uid));
  } else {
    const store = loadLocalStore();
    delete store.users[uid];
    saveLocalStore(store);
  }
}

export async function createClubTeam({ name, ageGroup, defaultFormation = '7v7', defaultQtrMins = 12 }) {
  const cleanName = name.trim();
  if (!cleanName) return;
  const teamId = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const newTeam = {
    teamId,
    clubId: DEFAULT_CLUB_ID,
    name: cleanName,
    ageGroup: (ageGroup || 'U10').trim(),
    defaultFormation,
    defaultQtrMins: parseFloat(defaultQtrMins) || 12,
    coachIds: [appState.currentUser?.uid || 'local_coach_1']
  };

  if (appState.mode === 'firebase') {
    const { db } = getFirebaseServices();
    await setDoc(doc(db, 'teams', teamId), newTeam, { merge: true });
    if (appState.userProfile) {
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
    if (store.users[uid]) {
      store.users[uid].assignedTeamIds = Array.from(
        new Set([...(store.users[uid].assignedTeamIds || []), teamId])
      );
    }
    saveLocalStore(store);
  }

  return newTeam;
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
