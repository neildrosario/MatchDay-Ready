/**
 * Pure, framework-agnostic football domain engines for MatchDay Ready.
 * Zero DOM or Firebase dependencies — shared by UI modules and automated unit tests.
 */

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

export const FORMATIONS = {
  '5v5': FORMATIONS_BY_FORMAT['5v5']['GK-2-2'],
  '6v6': FORMATIONS_BY_FORMAT['6v6']['GK-2-2-1'],
  '7v7': FORMATIONS_BY_FORMAT['7v7']['GK-2-3-1'],
  '9v9': FORMATIONS_BY_FORMAT['9v9']['GK-3-3-2'],
  '11v11': FORMATIONS_BY_FORMAT['11v11']['GK-4-3-3']
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

export function getMatchPeriodsForCount(periodCount = 4) {
  const count = Number(periodCount) || 4;
  if (count === 2) return [1, 2];
  if (count === 3) return [1, 2, 3];
  return [1, 2, 3, 4];
}

export function getPeriodShortLabel(pNum, periodCount = 4) {
  const count = Number(periodCount) || 4;
  if (count === 2) return `H${pNum}`;
  if (count === 3) return `T${pNum}`;
  return `Q${pNum}`;
}

export function getPeriodLongLabel(pNum, periodCount = 4) {
  const count = Number(periodCount) || 4;
  if (count === 2) return `Half ${pNum}`;
  if (count === 3) return `Third ${pNum}`;
  return `Quarter ${pNum}`;
}

export function getPeriodUnitLabel(periodCount = 4) {
  const count = Number(periodCount) || 4;
  if (count === 2) return 'm/h';
  if (count === 3) return 'm/t';
  return 'm/q';
}

/**
 * Intelligently remaps an existing lineup object from a previous formation shape
 * into `newPositions` so switching formations mid-match never drops players off the pitch.
 */
export function remapLineupToNewPositions(oldLineup = {}, newPositions = []) {
  const newLineup = {};
  const usedPlayers = new Set();
  const remainingPlayers = [];

  newPositions.forEach(pos => {
    const existingPlayer = oldLineup[pos.id];
    if (existingPlayer && !usedPlayers.has(existingPlayer)) {
      newLineup[pos.id] = existingPlayer;
      usedPlayers.add(existingPlayer);
    }
  });

  Object.values(oldLineup).forEach(pName => {
    if (pName && !usedPlayers.has(pName)) {
      remainingPlayers.push(pName);
      usedPlayers.add(pName);
    }
  });

  newPositions.forEach(pos => {
    if (!newLineup[pos.id] && remainingPlayers.length > 0) {
      newLineup[pos.id] = remainingPlayers.shift();
    }
  });

  return newLineup;
}

function createEmptyStatRow(playerObj = null) {
  return {
    playerObj,
    TOTAL: 0,
    GK: 0,
    DEF: 0,
    MID: 0,
    ATT: 0,
    GOALS: 0,
    ASSISTS: 0,
    STARS: 0,
    YELLOWS: 0,
    REDS: 0
  };
}

/**
 * Computes total minutes, positional minutes (with accurate 50/50 mid-period swap splits),
 * and match event tallies (Goals, Assists, Saves/Stars, Yellow/Red cards).
 */
export function computePlayerStats({
  roster = [],
  matchIds = [],
  matchesMap = {},
  lineupsByMatch = {},
  fallbackMatch = { formation: '7v7', qtrMins: 12, periodCount: 4 },
  defaultQtrMins = 12
}) {
  const stats = {};
  roster.forEach(entry => {
    const name = typeof entry === 'string' ? entry : entry.name;
    const playerObj = typeof entry === 'string' ? null : entry.playerObj || null;
    if (name) {
      stats[name] = createEmptyStatRow(playerObj);
    }
  });

  matchIds.forEach(mId => {
    const matchDoc = matchesMap[mId] || fallbackMatch;
    const qtrMins = parseFloat(matchDoc.qtrMins) || defaultQtrMins || 12;
    const format = matchDoc.formation || '7v7';
    const periods = getMatchPeriodsForCount(matchDoc.periodCount || 4);
    const quartersMap = lineupsByMatch[mId] || {};

    periods.forEach(q => {
      const qObj = quartersMap[q];
      if (!qObj) return;
      const qData = qObj.lineup || {};
      const swaps = qObj.swaps || [];

      const activePositions = getPositionsForFormatAndShape(
        format,
        qObj.tacticalShape || matchDoc.tacticalShape
      );
      const posGroupMap = {};
      activePositions.forEach(pos => {
        posGroupMap[pos.id] = pos.group;
      });

      // 1. Credit on-pitch finishers (50% if slot had a mid-period swap, otherwise 100%)
      activePositions.forEach(pos => {
        const pName = qData[pos.id];
        if (!pName) return;
        const group = pos.group;
        const involvedSwap = swaps.find(
          s => s.text && (s.text.includes(`at ${pos.id}`) || s.text.includes(`(${pos.id})`))
        );
        const mins = involvedSwap ? qtrMins / 2 : qtrMins;

        if (!stats[pName]) stats[pName] = createEmptyStatRow(null);
        stats[pName][group] += mins;
        stats[pName].TOTAL += mins;
      });

      // 2. Tally Match Events (Goals, Assists, Saves, Effort Stars, Yellow/Red Cards)
      (qObj.events || []).forEach(ev => {
        if (ev.player) {
          if (!stats[ev.player]) stats[ev.player] = createEmptyStatRow(null);
          if (ev.type === 'GOAL') stats[ev.player].GOALS++;
          else if (ev.type === 'SAVE' || ev.type === 'STAR') stats[ev.player].STARS++;
          else if (ev.type === 'YELLOW') stats[ev.player].YELLOWS++;
          else if (ev.type === 'RED') stats[ev.player].REDS++;
        }
        if (ev.assist) {
          if (!stats[ev.assist]) stats[ev.assist] = createEmptyStatRow(null);
          stats[ev.assist].ASSISTS++;
        }
      });

      // 3. Credit outgoing substituted players with their 50% first-half minutes
      swaps.forEach(sw => {
        if (!sw.text) return;
        const subMatch = sw.text.match(/^(.+) replaced (.+) at ([A-Z0-9]+)/);
        if (subMatch) {
          const outgoingPlayer = subMatch[2].trim();
          const posId = subMatch[3].trim();
          const group = posGroupMap[posId] || 'MID';
          const halfMins = qtrMins / 2;
          if (!stats[outgoingPlayer]) stats[outgoingPlayer] = createEmptyStatRow(null);
          if (qData[posId] !== outgoingPlayer) {
            stats[outgoingPlayer][group] += halfMins;
            stats[outgoingPlayer].TOTAL += halfMins;
          }
        }
      });
    });
  });

  return stats;
}

/**
 * Computes season-to-date fairness seed offsets from prior matches so players who received
 * fewer minutes (or played GK) in prior weeks are prioritized in today's Auto-Fair rotation.
 */
export function computeHistoricalSeasonFairnessSeed({
  playerNames = [],
  priorMatches = [],
  lineupsByMatch = {},
  baseUnitMins = 12
}) {
  const matchesMap = {};
  const matchIds = [];
  priorMatches.forEach(m => {
    if (m && m.matchId) {
      matchesMap[m.matchId] = m;
      matchIds.push(m.matchId);
    }
  });

  const rawStats = computePlayerStats({
    roster: playerNames,
    matchIds,
    matchesMap,
    lineupsByMatch,
    defaultQtrMins: baseUnitMins
  });

  const activeHistPlayers = Object.values(rawStats).filter(s => s.TOTAL > 0);
  const avgHistTotal =
    activeHistPlayers.length > 0
      ? activeHistPlayers.reduce((sum, s) => sum + s.TOTAL, 0) / activeHistPlayers.length
      : 0;

  const seed = {};
  playerNames.forEach(pName => {
    const s = rawStats[pName] || createEmptyStatRow(null);
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
 * Pure Auto-Fair Lineup Rotation Engine (Milestones 4, 7 & 11).
 * Returns `{ lineupsByPeriod, skippedPeriods, tracking }`.
 */
export function generateFairPeriodLineups({
  playerNames = [],
  preferredMap = {},
  periods = [1, 2, 3, 4],
  format = '7v7',
  shapeByPeriod = {},
  defaultShape = null,
  unavailableByPeriod = {},
  seasonSeed = {},
  rng = Math.random
}) {
  const teamSize = FORMAT_SIZES[format] || 7;
  const tracking = {};
  playerNames.forEach(p => {
    const hist = seasonSeed[p] || { totalQtrs: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
    tracking[p] = {
      totalQtrs: hist.totalQtrs || 0,
      GK: hist.GK || 0,
      DEF: hist.DEF || 0,
      MID: hist.MID || 0,
      ATT: hist.ATT || 0
    };
  });

  const lineupsByPeriod = {};
  const skippedPeriods = [];

  for (const q of periods) {
    const shape = shapeByPeriod[q] || defaultShape || getDefaultShapeForFormat(format);
    const activePositions = getPositionsForFormatAndShape(format, shape);
    const unavailSet = new Set(unavailableByPeriod[q] || []);
    const availablePlayers = playerNames.filter(p => !unavailSet.has(p));

    if (availablePlayers.length < teamSize) {
      skippedPeriods.push(q);
      continue;
    }

    availablePlayers.sort((a, b) => {
      if (tracking[a].totalQtrs !== tracking[b].totalQtrs) {
        return tracking[a].totalQtrs - tracking[b].totalQtrs;
      }
      return rng() - 0.5;
    });

    const startingPlayers = availablePlayers.slice(0, teamSize);
    const newLineup = {};

    const availableSpecGKs = availablePlayers
      .filter(p => preferredMap[p] === 'GK')
      .sort((a, b) => tracking[a].GK - tracking[b].GK || tracking[a].totalQtrs - tracking[b].totalQtrs);

    if (availableSpecGKs.length > 0) {
      const chosenGK = availableSpecGKs[0];
      if (!startingPlayers.includes(chosenGK)) {
        for (let i = startingPlayers.length - 1; i >= 0; i--) {
          if (preferredMap[startingPlayers[i]] !== 'GK') {
            startingPlayers[i] = chosenGK;
            break;
          }
        }
      }
      newLineup.GK = chosenGK;
      tracking[chosenGK].GK++;
    } else {
      startingPlayers.sort((a, b) => tracking[a].GK - tracking[b].GK);
      newLineup.GK = startingPlayers[0];
      tracking[startingPlayers[0]].GK++;
    }

    let remaining = startingPlayers.filter(p => p !== newLineup.GK);

    const zonePriority = (pName, targetZone) => {
      const pref = preferredMap[pName] || 'ANY';
      if (pref === targetZone) return 0;
      if (pref === 'ANY') return 1;
      return 2;
    };

    ['ATT', 'DEF', 'MID'].forEach(groupName => {
      const slots = activePositions.filter(p => p.group === groupName);
      if (slots.length > 0) {
        remaining.sort((a, b) => {
          const prioDiff = zonePriority(a, groupName) - zonePriority(b, groupName);
          if (prioDiff !== 0) return prioDiff;
          return tracking[a][groupName] - tracking[b][groupName];
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

    startingPlayers.forEach(p => {
      tracking[p].totalQtrs++;
    });

    lineupsByPeriod[q] = {
      tacticalShape: shape,
      lineup: newLineup
    };
  }

  return { lineupsByPeriod, skippedPeriods, tracking };
}

/**
 * Pure Age-Group Matchday Squad Splitter Engine (Milestone 8).
 * Balances specialist roles (GK, DEF, MID, ATT) first, then distributes evenly across teams.
 */
export function computeAutoSplitAssignments({
  teams = [],
  players = [],
  currentAssignments = {},
  rng = Math.random
}) {
  const nextAssignments = { ...currentAssignments };
  if (teams.length === 0) return nextAssignments;

  const availablePlayers = players.filter(p => nextAssignments[p.playerId] !== 'OFF');
  if (availablePlayers.length === 0) return nextAssignments;

  const roleOrder = ['GK', 'DEF', 'MID', 'ATT', 'ANY'];
  const sortedForDeal = [...availablePlayers].sort((a, b) => {
    const rA = roleOrder.indexOf(a.preferredGroup || 'ANY');
    const rB = roleOrder.indexOf(b.preferredGroup || 'ANY');
    if (rA !== rB) return rA - rB;
    return rng() - 0.5;
  });

  const teamCounts = {};
  teams.forEach(t => {
    teamCounts[t.teamId] = 0;
  });

  sortedForDeal.forEach(player => {
    const sortedTeams = [...teams].sort((tA, tB) => {
      const diff = teamCounts[tA.teamId] - teamCounts[tB.teamId];
      if (diff !== 0) return diff;
      if (player.primaryTeamId === tA.teamId) return -1;
      if (player.primaryTeamId === tB.teamId) return 1;
      return 0;
    });

    const chosenTeamId = sortedTeams[0].teamId;
    nextAssignments[player.playerId] = chosenTeamId;
    teamCounts[chosenTeamId]++;
  });

  return nextAssignments;
}

/**
 * Pure Shared Age-Group Player Conflict Detector (Milestone 3).
 */
export function detectSharedPlayerConflicts({
  currentTeamId,
  currentLineup = {},
  dateStr,
  quarter,
  sameDateLineupsAllTeams = [],
  allClubTeams = []
}) {
  const currentAssignedPlayers = new Set(Object.values(currentLineup || {}).filter(Boolean));
  if (currentAssignedPlayers.size === 0) return [];

  const conflicts = [];
  sameDateLineupsAllTeams.forEach(otherLineup => {
    if (
      otherLineup.quarter === quarter &&
      otherLineup.date === dateStr &&
      otherLineup.teamId &&
      otherLineup.teamId !== currentTeamId
    ) {
      const otherTeam = allClubTeams.find(t => t.teamId === otherLineup.teamId);
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

export function normalizeJoinCode(raw = '') {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '');
}

export function generateClubJoinCode(clubShortName = 'CLUB', rng = Math.random) {
  const prefix =
    String(clubShortName || 'CLUB')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8) || 'CLUB';
  const suffix = Math.floor(1000 + rng() * 9000);
  return `${prefix}-${suffix}`;
}

export function generateClubSlug(clubName = 'club', rng = Math.random) {
  const base =
    String(clubName || 'club')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 28) || 'club';
  const suffix = Math.floor(1000 + rng() * 9000);
  return `${base}_${suffix}`;
}

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

export function parseUFootballPayloadFromString(rawText = '') {
  const trimmed = (rawText || '').trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].data) {
      const inner = typeof parsed[0].data === 'string' ? JSON.parse(parsed[0].data) : parsed[0].data;
      if (inner && Array.isArray(inner.players)) return inner;
    }
    if (parsed && typeof parsed.data === 'string') {
      const inner = JSON.parse(parsed.data);
      if (inner && Array.isArray(inner.players)) return inner;
    }
    if (parsed && (Array.isArray(parsed.players) || typeof parsed.matches === 'object')) {
      return parsed;
    }
  } catch (_) {}

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
