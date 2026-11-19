import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAutoSplitAssignments,
  detectSharedPlayerConflicts,
  normalizeJoinCode,
  generateClubJoinCode,
  generateClubSlug,
  extractUFootballVersionRank,
  parseUFootballPayloadFromString
} from '../src/engine.js';

function createDeterministicRng(seed = 101) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

describe('Squad Splitter, Conflict Detection, Join Codes & Legacy Importer (src/engine.js)', () => {
  it('splits 25 kids (1 OFF -> 24 available) evenly across 3 teams with 1 specialist GK per team', () => {
    const teams = [
      { teamId: 'u10_white', name: 'U10 White' },
      { teamId: 'u10_green', name: 'U10 Green' },
      { teamId: 'u10_blue', name: 'U10 Blue' }
    ];

    const players = [];
    for (let i = 1; i <= 3; i++) {
      players.push({ playerId: `gk_${i}`, preferredGroup: 'GK', primaryTeamId: teams[i - 1].teamId });
    }
    for (let i = 1; i <= 6; i++) {
      players.push({ playerId: `def_${i}`, preferredGroup: 'DEF', primaryTeamId: teams[i % 3].teamId });
    }
    for (let i = 1; i <= 6; i++) {
      players.push({ playerId: `mid_${i}`, preferredGroup: 'MID', primaryTeamId: teams[i % 3].teamId });
    }
    for (let i = 1; i <= 6; i++) {
      players.push({ playerId: `att_${i}`, preferredGroup: 'ATT', primaryTeamId: teams[i % 3].teamId });
    }
    for (let i = 1; i <= 4; i++) {
      players.push({ playerId: `any_${i}`, preferredGroup: 'ANY', primaryTeamId: teams[i % 3].teamId });
    }

    const result = computeAutoSplitAssignments({
      teams,
      players,
      currentAssignments: { any_4: 'OFF' },
      rng: createDeterministicRng(21)
    });

    assert.equal(result.any_4, 'OFF', 'OFF player must remain OFF');

    const countsByTeam = { u10_white: 0, u10_green: 0, u10_blue: 0 };
    const gksByTeam = { u10_white: 0, u10_green: 0, u10_blue: 0 };

    players.forEach(p => {
      const assigned = result[p.playerId];
      if (assigned === 'OFF') return;
      countsByTeam[assigned]++;
      if (p.preferredGroup === 'GK') gksByTeam[assigned]++;
    });

    assert.deepEqual(countsByTeam, { u10_white: 8, u10_green: 8, u10_blue: 8 });
    assert.deepEqual(gksByTeam, { u10_white: 1, u10_green: 1, u10_blue: 1 });
  });

  it('detects real-time shared player conflicts on same date & period only', () => {
    const conflicts = detectSharedPlayerConflicts({
      currentTeamId: 'u10_white',
      currentLineup: { GK: 'Liam O.', ATT: 'Noah B.' },
      dateStr: '2026-11-14',
      quarter: 1,
      allClubTeams: [
        { teamId: 'u10_white', name: 'U10 White' },
        { teamId: 'u10_green', name: 'U10 Green' }
      ],
      sameDateLineupsAllTeams: [
        // Same team -> ignored
        { teamId: 'u10_white', date: '2026-11-14', quarter: 1, lineup: { GK: 'Liam O.' } },
        // Different quarter -> ignored
        { teamId: 'u10_green', date: '2026-11-14', quarter: 2, lineup: { ATT: 'Noah B.' } },
        // Sibling team same date & quarter -> CONFLICT!
        { teamId: 'u10_green', date: '2026-11-14', quarter: 1, lineup: { LD: 'Liam O.' } }
      ]
    });

    assert.equal(conflicts.length, 1);
    assert.deepEqual(conflicts[0], {
      playerName: 'Liam O.',
      otherTeamName: 'U10 Green',
      otherPosId: 'LD',
      quarter: 1
    });
  });

  it('normalizes join codes and generates clean club codes and slugs', () => {
    assert.equal(normalizeJoinCode(' straffan-2026! '), 'STRAFFAN-2026');
    assert.equal(normalizeJoinCode('u10 blue#1'), 'U10BLUE1');

    const code = generateClubJoinCode('Maynooth Town FC', () => 0.5);
    assert.equal(code, 'MAYNOOTH-5500');

    const slug = generateClubSlug('Maynooth Town FC!', () => 0.25);
    assert.equal(slug, 'maynooth_town_fc_3250');
  });

  it('ranks uFootballApp versions and parses raw JSON, SheetDB arrays, and HTML files', () => {
    assert.equal(extractUFootballVersionRank('uFootballAppV12'), 12);
    assert.equal(extractUFootballVersionRank('uFootballApp_v4.json'), 4);
    assert.equal(extractUFootballVersionRank('uFootballApp'), 0);
    assert.equal(extractUFootballVersionRank('unrelated_key'), -1);

    const direct = parseUFootballPayloadFromString(
      JSON.stringify({ players: ['Liam', 'Noah'], matches: {} })
    );
    assert.deepEqual(direct.players, ['Liam', 'Noah']);

    const sheetDb = parseUFootballPayloadFromString(
      JSON.stringify([{ id: 'app_state', data: JSON.stringify({ players: ['Jack', 'Leo'], matches: {} }) }])
    );
    assert.deepEqual(sheetDb.players, ['Jack', 'Leo']);

    const htmlEmbedded = parseUFootballPayloadFromString(
      `<script>const state = { players: ['Cian', 'Rory', 'Finn'] };</script>`
    );
    assert.deepEqual(htmlEmbedded.players, ['Cian', 'Rory', 'Finn']);

    assert.equal(parseUFootballPayloadFromString(''), null);
  });
});
