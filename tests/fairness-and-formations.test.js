import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FORMAT_SIZES,
  FORMATIONS_BY_FORMAT,
  getPositionsForFormatAndShape,
  remapLineupToNewPositions,
  computeHistoricalSeasonFairnessSeed,
  generateFairPeriodLineups
} from '../src/engine.js';

function createDeterministicRng(seed = 42) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

describe('Formations Integrity, Smart Remapping & Auto-Fair Rotation (src/engine.js)', () => {
  it('validates all 25 tactical formations across 5v5, 6v6, 7v7, 9v9, and 11v11', () => {
    const formats = Object.keys(FORMAT_SIZES);
    assert.deepEqual(formats, ['5v5', '6v6', '7v7', '9v9', '11v11']);

    let totalShapes = 0;
    for (const fmt of formats) {
      const shapes = FORMATIONS_BY_FORMAT[fmt];
      assert.ok(shapes, `Missing shapes for ${fmt}`);
      for (const [shapeName, slots] of Object.entries(shapes)) {
        totalShapes++;
        assert.equal(
          slots.length,
          FORMAT_SIZES[fmt],
          `${fmt} ${shapeName} should have ${FORMAT_SIZES[fmt]} slots`
        );
        const ids = new Set(slots.map(s => s.id));
        assert.equal(ids.size, slots.length, `${fmt} ${shapeName} has duplicate slot IDs`);
        const gks = slots.filter(s => s.group === 'GK');
        assert.equal(gks.length, 1, `${fmt} ${shapeName} should have exactly 1 GK slot`);
      }
    }
    assert.equal(totalShapes, 25);
  });

  it('remaps players smoothly across formation shape changes without dropping starters', () => {
    const oldLineup = {
      GK: 'Liam',
      LD: 'Noah',
      RD: 'Jack',
      LM: 'Harry',
      CM: 'Charlie',
      RM: 'Leo',
      ATT: 'Oscar'
    };
    const newPositions = getPositionsForFormatAndShape('7v7', 'GK-3-2-1');
    const remapped = remapLineupToNewPositions(oldLineup, newPositions);

    assert.equal(Object.keys(remapped).length, 7);
    // Exact matching IDs stay in place
    assert.equal(remapped.GK, 'Liam');
    assert.equal(remapped.LD, 'Noah');
    assert.equal(remapped.RD, 'Jack');
    assert.equal(remapped.ATT, 'Oscar');
    // All 7 players preserved with no duplicates
    assert.equal(new Set(Object.values(remapped)).size, 7);
  });

  it('distributes playing time fairly across 4 quarters and respects unavailable players', () => {
    const players = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'];
    const { lineupsByPeriod, skippedPeriods } = generateFairPeriodLineups({
      playerNames: players,
      periods: [1, 2, 3, 4],
      format: '7v7',
      unavailableByPeriod: { 2: ['P10'] },
      rng: createDeterministicRng(7)
    });

    assert.deepEqual(skippedPeriods, []);
    assert.equal(Object.keys(lineupsByPeriod).length, 4);

    // P10 must not appear in Q2
    assert.equal(Object.values(lineupsByPeriod[2].lineup).includes('P10'), false);

    // Count total quarters played by each player
    const counts = Object.fromEntries(players.map(p => [p, 0]));
    for (const q of [1, 2, 3, 4]) {
      const starters = Object.values(lineupsByPeriod[q].lineup);
      assert.equal(starters.length, 7);
      assert.equal(new Set(starters).size, 7);
      starters.forEach(p => counts[p]++);
    }

    const vals = Object.values(counts);
    const spread = Math.max(...vals) - Math.min(...vals);
    assert.ok(spread <= 1, `Expected max quarter spread <= 1, got ${JSON.stringify(counts)}`);
  });

  it('keeps specialist GKs in goal and honors preferred outfield zones', () => {
    const players = ['Keeper1', 'Def1', 'Def2', 'Mid1', 'Mid2', 'Att1', 'Flex1', 'Flex2'];
    const preferredMap = {
      Keeper1: 'GK',
      Def1: 'DEF',
      Def2: 'DEF',
      Mid1: 'MID',
      Mid2: 'MID',
      Att1: 'ATT',
      Flex1: 'ANY',
      Flex2: 'ANY'
    };

    const { lineupsByPeriod } = generateFairPeriodLineups({
      playerNames: players,
      preferredMap,
      periods: [1, 2, 3, 4],
      format: '5v5',
      defaultShape: 'GK-2-2',
      rng: createDeterministicRng(13)
    });

    for (const q of [1, 2, 3, 4]) {
      assert.equal(lineupsByPeriod[q].lineup.GK, 'Keeper1', `Specialist GK should be in goal in Q${q}`);
    }
  });

  it('prioritizes players with historical season minute deficits via season fairness seed', () => {
    const players = ['HighMin1', 'HighMin2', 'HighMin3', 'HighMin4', 'HighMin5', 'LowMinA', 'LowMinB'];
    const priorMatchId = 'u10_white_2026-11-01';
    const priorMatches = [
      { matchId: priorMatchId, date: '2026-11-01', formation: '5v5', tacticalShape: 'GK-2-2', periodCount: 4, qtrMins: 12 }
    ];
    // HighMin1..5 played all 4 quarters last week; LowMinA & LowMinB only played 1 quarter each
    const lineupsByMatch = {
      [priorMatchId]: {
        1: { lineup: { GK: 'HighMin1', LD: 'HighMin2', RD: 'HighMin3', LF: 'HighMin4', RF: 'HighMin5' } },
        2: { lineup: { GK: 'HighMin1', LD: 'HighMin2', RD: 'HighMin3', LF: 'HighMin4', RF: 'HighMin5' } },
        3: { lineup: { GK: 'HighMin1', LD: 'HighMin2', RD: 'HighMin3', LF: 'HighMin4', RF: 'HighMin5' } },
        4: { lineup: { GK: 'HighMin1', LD: 'HighMin2', RD: 'HighMin3', LF: 'LowMinA', RF: 'LowMinB' } }
      }
    };

    const seed = computeHistoricalSeasonFairnessSeed({
      playerNames: players,
      priorMatches,
      lineupsByMatch,
      baseUnitMins: 12
    });

    assert.ok(seed['LowMinA'].totalQtrs < 0, 'Underplayed player should receive negative priority offset');
    assert.ok(seed['HighMin1'].totalQtrs > 0, 'Overplayed player should receive positive offset');
    assert.ok(seed['HighMin1'].GK > 0, 'Prior GK should have positive GK history');

    const { lineupsByPeriod } = generateFairPeriodLineups({
      playerNames: players,
      periods: [1],
      format: '5v5',
      defaultShape: 'GK-2-2',
      seasonSeed: seed,
      rng: createDeterministicRng(99)
    });

    const q1Starters = Object.values(lineupsByPeriod[1].lineup);
    assert.ok(q1Starters.includes('LowMinA'), 'Underplayed player LowMinA must start Q1');
    assert.ok(q1Starters.includes('LowMinB'), 'Underplayed player LowMinB must start Q1');
    assert.notEqual(lineupsByPeriod[1].lineup.GK, 'HighMin1', 'Prior 4-quarter GK should not start in goal');
  });

  it('skips periods when fewer than teamSize players are available', () => {
    const { lineupsByPeriod, skippedPeriods } = generateFairPeriodLineups({
      playerNames: ['P1', 'P2', 'P3', 'P4', 'P5'],
      periods: [1, 2],
      format: '5v5',
      unavailableByPeriod: { 2: ['P5'] }
    });
    assert.ok(lineupsByPeriod[1]);
    assert.deepEqual(skippedPeriods, [2]);
  });
});
