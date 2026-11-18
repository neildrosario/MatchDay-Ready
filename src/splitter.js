import {
  appState,
  getSelectedTeam,
  getPlayerDisplayName,
  getMatchId,
  createClubTeam,
  publishAgeGroupSquadSplit
} from './db.js';
import {
  canPublishSquadSplit,
  canCreateTeamInAgeGroup
} from './permissions.js';

// Draft state keyed by `${ageGroup}_${dateStr}` so switching tabs keeps the draft
const splitterDrafts = {};

const ROLE_TAG = {
  GK: '🧤GK',
  DEF: '🛡️DEF',
  MID: '⚙️MID',
  ATT: '⚡ATT'
};

function getDraftKey() {
  const team = getSelectedTeam();
  return `${team.ageGroup || 'U10'}_${appState.selectedDate}`;
}

export function getAgeGroupContext() {
  const currentTeam = getSelectedTeam();
  const ageGroup = currentTeam.ageGroup || 'U10';
  const teams = (appState.allClubTeams || []).filter(
    t => (t.ageGroup || 'U10') === ageGroup
  );
  const players = (appState.players || [])
    .filter(p => (p.ageGroup || 'U10') === ageGroup)
    .sort((a, b) => getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b)));

  return { ageGroup, teams, players };
}

function ensureDraftInitialized() {
  const key = getDraftKey();
  const { teams, players } = getAgeGroupContext();
  const dateStr = appState.selectedDate;

  if (!splitterDrafts[key]) {
    splitterDrafts[key] = {
      assignments: {}, // { [playerId]: teamId | 'OFF' }
      oppositions: {} // { [teamId]: string }
    };
  }

  const draft = splitterDrafts[key];

  // Hydrate oppositions from saved matches
  teams.forEach(t => {
    const mId = getMatchId(t.teamId, dateStr);
    const savedMatch = appState.allMatches?.[mId] || appState.matchesByTeam?.[mId];
    if (draft.oppositions[t.teamId] === undefined) {
      draft.oppositions[t.teamId] = savedMatch?.opposition || '';
    }
  });

  // Check if any team on this date already has a published `matchdaySquad`
  const publishedSquadByName = {};
  teams.forEach(t => {
    const mId = getMatchId(t.teamId, dateStr);
    const savedMatch = appState.allMatches?.[mId] || appState.matchesByTeam?.[mId];
    if (Array.isArray(savedMatch?.matchdaySquad)) {
      savedMatch.matchdaySquad.forEach(pName => {
        publishedSquadByName[pName] = t.teamId;
      });
    }
  });

  const hasPublishedSplit = Object.keys(publishedSquadByName).length > 0;
  const validTeamIds = new Set(teams.map(t => t.teamId));
  const fallbackTeamId = teams[0]?.teamId || 'u10_white';

  players.forEach(p => {
    const existingAssign = draft.assignments[p.playerId];
    if (existingAssign && (existingAssign === 'OFF' || validTeamIds.has(existingAssign))) {
      return;
    }
    const pName = getPlayerDisplayName(p);
    if (hasPublishedSplit) {
      draft.assignments[p.playerId] = publishedSquadByName[pName] || 'OFF';
    } else {
      draft.assignments[p.playerId] = validTeamIds.has(p.primaryTeamId)
        ? p.primaryTeamId
        : fallbackTeamId;
    }
  });

  return draft;
}

export function setPlayerSplitAssignment(playerId, targetTeamIdOrOff) {
  const draft = ensureDraftInitialized();
  draft.assignments[playerId] = targetTeamIdOrOff;
  renderSquadSplitter();
}

export function setTeamSplitOpposition(teamId, value) {
  const draft = ensureDraftInitialized();
  draft.oppositions[teamId] = value;
}

/**
 * 🪄 Auto-Split Available Kids Evenly across all teams in the age group
 * Balances specialist roles (🧤 GK, 🛡️ DEF, ⚙️ MID, ⚡ ATT) first, then distributes evenly.
 */
export function autoSplitAgeGroupPlayers() {
  const { teams, players } = getAgeGroupContext();
  if (teams.length === 0) return;

  const draft = ensureDraftInitialized();
  const availablePlayers = players.filter(p => draft.assignments[p.playerId] !== 'OFF');

  if (availablePlayers.length === 0) {
    alert('All players are currently marked Off/Unavailable. Mark players available first.');
    return;
  }

  // Group players by preferredGroup so GKs, DEFs, MIDs, ATTs, and ANYs are distributed evenly across teams
  const roleOrder = ['GK', 'DEF', 'MID', 'ATT', 'ANY'];
  const sortedForDeal = [...availablePlayers].sort((a, b) => {
    const rA = roleOrder.indexOf(a.preferredGroup || 'ANY');
    const rB = roleOrder.indexOf(b.preferredGroup || 'ANY');
    if (rA !== rB) return rA - rB;
    return Math.random() - 0.5;
  });

  const teamCounts = {};
  teams.forEach(t => {
    teamCounts[t.teamId] = 0;
  });

  sortedForDeal.forEach(player => {
    // Pick the team with the fewest players so far (preferring player's primaryTeamId on a tie)
    const sortedTeams = [...teams].sort((tA, tB) => {
      const diff = teamCounts[tA.teamId] - teamCounts[tB.teamId];
      if (diff !== 0) return diff;
      if (player.primaryTeamId === tA.teamId) return -1;
      if (player.primaryTeamId === tB.teamId) return 1;
      return 0;
    });

    const chosenTeamId = sortedTeams[0].teamId;
    draft.assignments[player.playerId] = chosenTeamId;
    teamCounts[chosenTeamId]++;
  });

  renderSquadSplitter();
}

export function resetSplitterToPrimary() {
  const { teams, players } = getAgeGroupContext();
  const draft = ensureDraftInitialized();
  const validTeamIds = new Set(teams.map(t => t.teamId));
  const fallbackTeamId = teams[0]?.teamId || 'u10_white';

  players.forEach(p => {
    draft.assignments[p.playerId] = validTeamIds.has(p.primaryTeamId)
      ? p.primaryTeamId
      : fallbackTeamId;
  });

  renderSquadSplitter();
}

export async function handleQuickAddAgeGroupTeam() {
  const input = document.getElementById('splitterNewTeamInput');
  const { ageGroup } = getAgeGroupContext();
  if (!canCreateTeamInAgeGroup(appState.userProfile, ageGroup)) {
    return alert('Only a Club Admin or Age-Group Lead for this age group can add new teams.');
  }
  const currentTeam = getSelectedTeam();
  const rawName = input?.value.trim();

  if (!rawName) {
    alert(`Enter a team name (e.g. "${ageGroup} Blue" or "${ageGroup} Red").`);
    return;
  }

  await createClubTeam({
    name: rawName,
    ageGroup,
    defaultFormation: currentTeam.defaultFormation || '7v7',
    defaultQtrMins: currentTeam.defaultQtrMins || 12
  });

  if (input) input.value = '';
  renderSquadSplitter();
}

export async function handlePublishSquadSplit() {
  const { ageGroup, teams, players } = getAgeGroupContext();
  if (!canPublishSquadSplit(appState.userProfile, ageGroup, appState.allClubTeams)) {
    return alert(
      `Only a Club Admin, ${ageGroup} Age-Group Lead, or coach assigned to all ${ageGroup} teams can publish a squad split.`
    );
  }
  const draft = ensureDraftInitialized();
  const autoGenCheckbox = document.getElementById('splitterAutoGenLineupsCheckbox');
  const autoGenerateLineups = autoGenCheckbox ? autoGenCheckbox.checked : true;

  const summaryLines = teams.map(t => {
    const count = players.filter(p => draft.assignments[p.playerId] === t.teamId).length;
    return `• ${t.name}: ${count} players`;
  });
  const offCount = players.filter(p => draft.assignments[p.playerId] === 'OFF').length;

  if (
    !confirm(
      `Publish ${ageGroup} Matchday Squads for ${appState.selectedDate}?\n\n${summaryLines.join(
        '\n'
      )}\n• Resting/Off: ${offCount} players\n\nEach team's coach will immediately see only their assigned players for this date${
        autoGenerateLineups ? ' and have fair starting lineups pre-generated!' : '.'
      }`
    )
  ) {
    return;
  }

  await publishAgeGroupSquadSplit({
    dateStr: appState.selectedDate,
    ageGroupTeams: teams,
    ageGroupPlayers: players,
    assignmentsByPlayerId: draft.assignments,
    oppositionByTeamId: draft.oppositions,
    autoGenerateLineups
  });

  alert(
    `🚀 Published ${ageGroup} Matchday Squads across ${teams.length} teams for ${appState.selectedDate}!`
  );
}

export async function copySquadSplitWhatsApp() {
  const { ageGroup, teams, players } = getAgeGroupContext();
  const draft = ensureDraftInitialized();
  const clubName = appState.club?.shortName || appState.club?.name || 'Club';

  const lines = [`⚽ *${clubName} ${ageGroup} — Matchday Squads (${appState.selectedDate})*`, ''];
  teams.forEach(t => {
    const assigned = players
      .filter(p => draft.assignments[p.playerId] === t.teamId)
      .map(p => getPlayerDisplayName(p));
    const opp = draft.oppositions[t.teamId] ? ` vs ${draft.oppositions[t.teamId]}` : '';
    lines.push(`🛡️ *${t.name}${opp} (${assigned.length}):*`);
    lines.push(assigned.length > 0 ? assigned.join(', ') : '_No players assigned_');
    lines.push('');
  });

  const offPlayers = players
    .filter(p => draft.assignments[p.playerId] === 'OFF')
    .map(p => getPlayerDisplayName(p));
  if (offPlayers.length > 0) {
    lines.push(`🚫 *Unavailable / Resting (${offPlayers.length}):* ${offPlayers.join(', ')}`);
  }

  const text = lines.join('\n').trim();
  try {
    await navigator.clipboard.writeText(text);
    alert('📋 Copied Matchday Squad Split to clipboard for WhatsApp!');
  } catch (_) {
    prompt('Copy your WhatsApp Squad Summary below:', text);
  }
}

export function renderSquadSplitter() {
  const container = document.getElementById('view-splitter');
  if (!container) return;

  const { ageGroup, teams, players } = getAgeGroupContext();
  const draft = ensureDraftInitialized();
  const canPublish = canPublishSquadSplit(appState.userProfile, ageGroup, appState.allClubTeams);
  const canAddTeam = canCreateTeamInAgeGroup(appState.userProfile, ageGroup);

  const permBanner = document.getElementById('splitterPermissionBanner');
  if (permBanner) {
    permBanner.classList.toggle('hidden', canPublish);
    if (!canPublish) {
      permBanner.innerText = `👁️ View-only for Squad Splitter: only a Club Admin or ${ageGroup} Age-Group Lead (or a coach assigned to all ${ageGroup} teams) can publish splits.`;
    }
  }
  const addTeamRow = document.getElementById('splitterAddTeamRow');
  if (addTeamRow) addTeamRow.classList.toggle('hidden', !canAddTeam);
  const publishBtn = document.getElementById('splitterPublishBtn');
  if (publishBtn) {
    publishBtn.disabled = !canPublish;
    publishBtn.classList.toggle('opacity-50', !canPublish);
    publishBtn.classList.toggle('cursor-not-allowed', !canPublish);
  }

  const headerTitle = document.getElementById('splitterAgeGroupTitle');
  const subtitleEl = document.getElementById('splitterSubtitle');
  if (headerTitle) {
    headerTitle.innerText = `📋 ${ageGroup} Matchday Squad Splitter (${players.length} Players → ${teams.length} Teams)`;
  }
  if (subtitleEl) {
    const availCount = players.filter(p => draft.assignments[p.playerId] !== 'OFF').length;
    const offCount = players.length - availCount;
    subtitleEl.innerText = `Date: ${appState.selectedDate} • ${availCount} Available • ${offCount} Off/Away`;
  }

  // 1. Render Team Summary Cards (with Opposition input & assigned player pills)
  const cardsContainer = document.getElementById('splitterTeamCards');
  if (cardsContainer) {
    cardsContainer.innerHTML = teams
      .map(t => {
        const assignedPlayers = players.filter(p => draft.assignments[p.playerId] === t.teamId);
        const oppVal = (draft.oppositions[t.teamId] || '').replace(/"/g, '&quot;');
        const pills =
          assignedPlayers.length > 0
            ? assignedPlayers
                .map(p => {
                  const name = getPlayerDisplayName(p);
                  const role = p.preferredGroup && ROLE_TAG[p.preferredGroup] ? ` ${ROLE_TAG[p.preferredGroup]}` : '';
                  return `<span class="bg-slate-900 text-slate-200 border border-slate-700 px-2 py-0.5 rounded-full text-[11px] font-medium">${name}${role}</span>`;
                })
                .join('')
            : `<span class="text-[11px] text-slate-500 italic">Tap players below or click Auto-Split</span>`;

        return `
          <div class="bg-slate-800 rounded-lg p-2.5 border border-slate-700 space-y-2">
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="font-bold text-emerald-400 text-xs">🛡️ ${t.name}</span>
                <span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                  ${assignedPlayers.length} kids
                </span>
              </div>
              <input type="text" data-split-opp-team="${t.teamId}" value="${oppVal}" placeholder="Opposition (e.g. Kill)"
                class="split-opp-input bg-slate-900 text-white px-2 py-1 rounded border border-slate-600 text-[11px] w-36 font-semibold">
            </div>
            <div class="flex flex-wrap gap-1">${pills}</div>
          </div>
        `;
      })
      .join('');

    cardsContainer.querySelectorAll('.split-opp-input').forEach(inp => {
      inp.addEventListener('input', e => {
        setTeamSplitOpposition(inp.getAttribute('data-split-opp-team'), e.target.value);
      });
    });
  }

  // 2. Render Player Roll-Call & 1-Tap Team Selector Rows
  const rollCallContainer = document.getElementById('splitterPlayerRollCall');
  if (rollCallContainer) {
    if (players.length === 0) {
      rollCallContainer.innerHTML = `<p class="text-xs text-slate-400 italic p-2">No players in ${ageGroup} yet. Add or bulk-paste players in the Squad & Stats tab.</p>`;
      return;
    }

    rollCallContainer.innerHTML = players
      .map(p => {
        const name = getPlayerDisplayName(p);
        const currentAssign = draft.assignments[p.playerId] || 'OFF';
        const isOff = currentAssign === 'OFF';
        const roleBadge =
          p.preferredGroup && ROLE_TAG[p.preferredGroup]
            ? `<span class="text-[9px] bg-slate-800 text-emerald-300 px-1 py-0.5 rounded border border-slate-700">${ROLE_TAG[p.preferredGroup]}</span>`
            : '';

        const teamBtns = teams
          .map(t => {
            const shortName = t.name.replace(new RegExp(`^${ageGroup}\\s*`, 'i'), '').trim() || t.name;
            const active = currentAssign === t.teamId;
            return `
              <button data-split-player="${p.playerId}" data-split-target="${t.teamId}"
                class="split-assign-btn px-2 py-1 rounded text-[10px] font-bold border transition ${
                  active
                    ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }">
                ${shortName}
              </button>
            `;
          })
          .join('');

        return `
          <div class="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-1.5 rounded border ${
            isOff ? 'border-rose-500/30 opacity-60' : 'border-slate-700/80'
          }">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="text-xs font-semibold truncate ${
                isOff ? 'line-through text-slate-500' : 'text-white'
              }">${name}</span>
              ${roleBadge}
            </div>
            <div class="flex items-center gap-1 shrink-0">
              ${teamBtns}
              <button data-split-player="${p.playerId}" data-split-target="OFF"
                class="split-assign-btn px-2 py-1 rounded text-[10px] font-bold border transition ${
                  isOff
                    ? 'bg-rose-600 border-rose-400 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-rose-300'
                }">
                🚫 Off
              </button>
            </div>
          </div>
        `;
      })
      .join('');

    rollCallContainer.querySelectorAll('.split-assign-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setPlayerSplitAssignment(
          btn.getAttribute('data-split-player'),
          btn.getAttribute('data-split-target')
        );
      });
    });
  }
}
