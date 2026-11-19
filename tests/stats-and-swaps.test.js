import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePlayerStats,
  getMatchPeriodsForCount,
  getPeriodShortLabel,
  getPeriodLongLabel,
  getPeriodUnitLabel
} from '../src/engine.js';

describe('Period Modes, 50/50 Mid-Period Swaps & Match Events Stats (src/engine.js)', () => {
  it('formats labels and period lists for Quarters, Thirds, and Halves', () => {
    assert.deepEqual(getMatchPeriodsForCount(4), [1, 2, 3, 4]);
    assert.deepEqual(getMatchPeriodsForCount(3), [1, 2, 3]);
    assert.deepEqual(getMatchPeriodsForCount(2), [1, 2]);

    assert.equal(getPeriodShortLabel(2, 4), 'Q2');
    assert.equal(getPeriodShortLabel(2, 3), 'T2');
    assert.equal(getPeriodShortLabel(2, 2), 'H2');

    assert.equal(getPeriodLongLabel(1, 4), 'Quarter 1');
    assert.equal(getPeriodLongLabel(3, 3), 'Third 3');
    assert.equal(getPeriodLongLabel(2, 2), 'Half 2');

    assert.equal(getPeriodUnitLabel(4), 'm/q');
    assert.equal(getPeriodUnitLabel(3), 'm/t');
    assert.equal(getPeriodUnitLabel(2), 'm/h');
  });

  it('splits minutes 50/50 accurately between outgoing and incoming players on mid-period sub', () => {
    const matchId = 'u10_white_2026-11-14';
    const matchesMap = {
      [matchId]: {
        matchId,
        formation: '5v5',
        tacticalShape: 'GK-2-2',
        periodCount: 4,
        qtrMins: 12.5
      }
    };
    const lineupsByMatch = {
      [matchId]: {
        1: {
          quarter: 1,
          tacticalShape: 'GK-2-2',
          // Sam B. finished Q1 at GK after replacing Liam O. midway through Q1
          lineup: {
            GK: 'Sam B.',
            LD: 'Noah B.',
            RD: 'Jack R.',
            LF: 'Harry W.',
            RF: 'Leo K.'
          },
          swaps: [
            {
              time: 'Mid-Period',
              text: 'Sam B. replaced Liam O. at GK (50/50 min split)'
            }
          ],
          events: []
        }
      }
    };

    const stats = computePlayerStats({
      roster: ['Liam O.', 'Sam B.', 'Noah B.', 'Jack R.', 'Harry W.', 'Leo K.'],
      matchIds: [matchId],
      matchesMap,
      lineupsByMatch
    });

    assert.equal(stats['Sam B.'].GK, 6.25);
    assert.equal(stats['Sam B.'].TOTAL, 6.25);
    assert.equal(stats['Liam O.'].GK, 6.25);
    assert.equal(stats['Liam O.'].TOTAL, 6.25);
    assert.equal(stats['Noah B.'].DEF, 12.5);
    assert.equal(stats['Noah B.'].TOTAL, 12.5);
    assert.equal(stats['Harry W.'].ATT, 12.5);
  });

  it('tallies goals, assists, saves, effort stars, and yellow/red cards across multiple matches', () => {
    const m1 = 'u10_white_2026-11-07';
    const m2 = 'u10_white_2026-11-14';
    const matchesMap = {
      [m1]: { matchId: m1, formation: '7v7', tacticalShape: 'GK-2-3-1', periodCount: 2, qtrMins: 20 },
      [m2]: { matchId: m2, formation: '7v7', tacticalShape: 'GK-2-3-1', periodCount: 2, qtrMins: 20 }
    };
    const lineupsByMatch = {
      [m1]: {
        1: {
          quarter: 1,
          lineup: { GK: 'Liam O.', ATT: 'Oscar D.', CM: 'Noah B.' },
          swaps: [],
          events: [
            { id: 'e1', type: 'GOAL', player: 'Oscar D.', assist: 'Noah B.' },
            { id: 'e2', type: 'SAVE', player: 'Liam O.' },
            { id: 'e3', type: 'YELLOW', player: 'Noah B.' }
          ]
        }
      },
      [m2]: {
        2: {
          quarter: 2,
          lineup: { ATT: 'Oscar D.', CM: 'Guest Player' },
          swaps: [],
          events: [
            { id: 'e4', type: 'GOAL', player: 'Oscar D.', assist: 'Guest Player' },
            { id: 'e5', type: 'STAR', player: 'Liam O.' },
            { id: 'e6', type: 'RED', player: 'Guest Player' }
          ]
        }
      }
    };

    const stats = computePlayerStats({
      roster: ['Liam O.', 'Oscar D.', 'Noah B.'],
      matchIds: [m1, m2],
      matchesMap,
      lineupsByMatch
    });

    assert.equal(stats['Oscar D.'].TOTAL, 40);
    assert.equal(stats['Oscar D.'].ATT, 40);
    assert.equal(stats['Oscar D.'].GOALS, 2);
    assert.equal(stats['Noah B.'].ASSISTS, 1);
    assert.equal(stats['Noah B.'].YELLOWS, 1);
    assert.equal(stats['Liam O.'].STARS, 2); // 1 SAVE + 1 STAR
    // Guest player dynamically added with full zero-initialized fields
    assert.equal(stats['Guest Player'].MID, 20);
    assert.equal(stats['Guest Player'].ASSISTS, 1);
    assert.equal(stats['Guest Player'].REDS, 1);
    assert.equal(stats['Guest Player'].YELLOWS, 0);
  });
});
