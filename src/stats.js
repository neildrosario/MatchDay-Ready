import {
  FORMATIONS,
  appState,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getMatchId,
  addClubPlayer,
  bulkAddClubPlayers,
  clearCurrentTeamPlayers,
  removeClubPlayer,
  togglePlayerSharedAccess,
  createClubTeam,
  inviteOrPreAuthorizeCoach,
  updateCoachRole,
  toggleCoachTeamAssignment,
  removeCoachProfile,
  importLegacyPrototypeData
} from './db.js';

export function renderStats() {
  const scopeSelect = document.getElementById('statsScope');
  const scope = scopeSelect ? scopeSelect.value : 'match';
  const currentTeam = getSelectedTeam();
  const teamPlayers = getTeamPlayers(currentTeam.teamId);

  const stats = {};
  teamPlayers.forEach(p => {
    const name = getPlayerDisplayName(p);
    stats[name] = {
      playerObj: p,
      TOTAL: 0,
      GK: 0,
      DEF: 0,
      MID: 0,
      ATT: 0
    };
  });

  const currentMatchId = getMatchId(currentTeam.teamId, appState.selectedDate);
  const matchIdsToCount =
    scope === 'match'
      ? [currentMatchId]
      : Object.keys(appState.matchesByTeam || {}).length > 0
      ? Object.keys(appState.matchesByTeam)
      : [currentMatchId];

  matchIdsToCount.forEach(mId => {
    const matchDoc = appState.matchesByTeam[mId] || getCurrentMatchDoc();
    const qtrMins = parseFloat(matchDoc.qtrMins) || currentTeam.defaultQtrMins || 12;
    const activePositions = FORMATIONS[matchDoc.formation || '7v7'] || FORMATIONS['7v7'];
    const posGroupMap = {};
    activePositions.forEach(pos => {
      posGroupMap[pos.id] = pos.group;
    });

    const quartersMap = appState.lineupsByMatch[mId] || {};
    [1, 2, 3, 4].forEach(q => {
      const qObj = quartersMap[q];
      if (!qObj) return;
      const qData = qObj.lineup || {};
      const swaps = qObj.swaps || [];

      activePositions.forEach(pos => {
        const pName = qData[pos.id];
        if (!pName) return;
        const group = pos.group;

        const involvedSwap = swaps.find(
          s => s.text && (s.text.includes(`at ${pos.id}`) || s.text.includes(`(${pos.id})`))
        );
        const mins = involvedSwap ? qtrMins / 2 : qtrMins;

        if (!stats[pName]) {
          stats[pName] = { playerObj: null, TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
        }
        stats[pName][group] += mins;
        stats[pName].TOTAL += mins;
      });

      // Also credit outgoing substituted players with their 50% first-half of the quarter
      swaps.forEach(sw => {
        if (!sw.text) return;
        const subMatch = sw.text.match(/^(.+) replaced (.+) at ([A-Z0-9]+)/);
        if (subMatch) {
          const outgoingPlayer = subMatch[2].trim();
          const posId = subMatch[3].trim();
          const group = posGroupMap[posId] || 'MID';
          const halfMins = qtrMins / 2;
          if (!stats[outgoingPlayer]) {
            stats[outgoingPlayer] = { playerObj: null, TOTAL: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
          }
          // Only credit if outgoingPlayer is not currently occupying that slot
          if (qData[posId] !== outgoingPlayer) {
            stats[outgoingPlayer][group] += halfMins;
            stats[outgoingPlayer].TOTAL += halfMins;
          }
        }
      });
    });
  });

  const tbody = document.getElementById('statsBody');
  if (tbody) {
    tbody.innerHTML = Object.entries(stats)
      .map(([pName, s]) => {
        const pObj = s.playerObj;
        const isPrimary = !pObj || pObj.primaryTeamId === currentTeam.teamId;
        const isShared = pObj && (pObj.allowedTeamIds || []).length > 1;
        return `
          <tr>
            <td class="p-2.5 font-semibold text-white">
              <div class="flex items-center gap-1.5">
                <span>${pName}</span>
                ${
                  !isPrimary
                    ? `<span class="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 py-0.5 rounded">Guest</span>`
                    : isShared
                    ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded">Shared 🔗</span>`
                    : ''
                }
              </div>
            </td>
            <td class="p-2 text-center font-bold text-emerald-400">${s.TOTAL}m</td>
            <td class="p-2 text-center text-slate-300">${s.GK}m</td>
            <td class="p-2 text-center text-slate-300">${s.DEF}m</td>
            <td class="p-2 text-center text-slate-300">${s.MID}m</td>
            <td class="p-2 text-center text-slate-300">${s.ATT}m</td>
            <td class="p-2 text-right">
              ${
                pObj
                  ? `<button data-remove-id="${pObj.playerId}" data-remove-name="${pName.replace(/"/g, '&quot;')}" class="remove-player-btn text-rose-400 hover:text-rose-300 font-bold px-1">✕</button>`
                  : ''
              }
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.remove-player-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-remove-id');
        const name = btn.getAttribute('data-remove-name');
        if (confirm(`Remove ${name} from the club roster?`)) {
          await removeClubPlayer(id);
        }
      });
    });
  }

  renderSharedRosterManager();
  renderAdminCoachesPanel();
}

export function renderSharedRosterManager() {
  const container = document.getElementById('sharedRosterPoolList');
  if (!container) return;

  const currentTeam = getSelectedTeam();
  const sameAgePlayers = appState.players.filter(
    p => (p.ageGroup || 'U10') === (currentTeam.ageGroup || 'U10')
  );

  if (sameAgePlayers.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">No players in ${currentTeam.ageGroup} pool yet.</p>`;
    return;
  }

  container.innerHTML = sameAgePlayers
    .map(p => {
      const name = getPlayerDisplayName(p);
      const primaryTeamObj = appState.allClubTeams.find(t => t.teamId === p.primaryTeamId);
      const primaryTeamLabel = primaryTeamObj ? primaryTeamObj.name : p.primaryTeamId;
      const isPrimaryHere = p.primaryTeamId === currentTeam.teamId;
      const isAllowedHere = (p.allowedTeamIds || []).includes(currentTeam.teamId);

      return `
        <div class="flex items-center justify-between bg-slate-900/70 px-2.5 py-1.5 rounded border border-slate-700 text-xs">
          <div>
            <span class="font-semibold text-white">${name}</span>
            <span class="text-[10px] text-slate-400 ml-1">(${primaryTeamLabel})</span>
          </div>
          ${
            isPrimaryHere
              ? `<span class="text-[10px] text-emerald-400 font-semibold">Primary Squad</span>`
              : `<button data-share-player="${p.playerId}" class="toggle-share-btn px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isAllowedHere
                    ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                    : 'bg-slate-800 border-slate-600 text-slate-300'
                }">
                  ${isAllowedHere ? '✓ Shared with ' + currentTeam.name : '+ Share to ' + currentTeam.name}
                </button>`
          }
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.toggle-share-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const playerId = btn.getAttribute('data-share-player');
      await togglePlayerSharedAccess(playerId, currentTeam.teamId);
    });
  });
}

export async function handleAddPlayerUI() {
  const input = document.getElementById('newPlayerName');
  const shareCheckbox = document.getElementById('shareAcrossAgeGroupCheckbox');
  if (!input) return;

  const full = input.value.trim();
  if (!full) return;

  const parts = full.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  const currentTeam = getSelectedTeam();
  let sharedIds = [];
  if (shareCheckbox && shareCheckbox.checked) {
    sharedIds = appState.allClubTeams
      .filter(t => t.ageGroup === currentTeam.ageGroup)
      .map(t => t.teamId);
  }

  await addClubPlayer({
    firstName,
    lastName,
    primaryTeamId: currentTeam.teamId,
    sharedWithTeamIds: sharedIds
  });

  input.value = '';
}

export async function handleCreateTeamUI() {
  const nameInput = document.getElementById('newTeamNameInput');
  const ageInput = document.getElementById('newTeamAgeInput');
  const fmtSelect = document.getElementById('newTeamFormatSelect');

  const name = nameInput?.value.trim();
  const ageGroup = ageInput?.value.trim() || 'U10';
  const defaultFormation = fmtSelect?.value || '7v7';

  if (!name) return alert('Please enter a team name (e.g. U10 Blue or U12 White).');

  const created = await createClubTeam({
    name,
    ageGroup,
    defaultFormation,
    defaultQtrMins: 12
  });

  if (nameInput) nameInput.value = '';
  alert(`✅ Created team "${created.name}" (${created.ageGroup})!`);
}

export async function handleImportLegacyUI() {
  try {
    await importLegacyPrototypeData();
    alert('✅ Imported legacy prototype squad & match history into the selected team!');
  } catch (e) {
    alert(e.message || 'Could not import legacy data.');
  }
}

/**
 * Milestone 5C: Bulk Paste Players UI Handler
 */
export async function handleBulkAddPlayersUI() {
  const textarea = document.getElementById('bulkPlayersTextarea');
  const shareCheckbox = document.getElementById('shareAcrossAgeGroupCheckbox');
  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) {
    alert('Please paste one or more player names (separated by new lines or commas).');
    return;
  }

  const currentTeam = getSelectedTeam();
  let sharedIds = [];
  if (shareCheckbox && shareCheckbox.checked) {
    sharedIds = appState.allClubTeams
      .filter(t => t.ageGroup === currentTeam.ageGroup)
      .map(t => t.teamId);
  }

  const count = await bulkAddClubPlayers({
    rawText,
    primaryTeamId: currentTeam.teamId,
    sharedWithTeamIds: sharedIds
  });

  textarea.value = '';
  alert(`✅ Added ${count} player(s) to ${currentTeam.name}!`);
}

/**
 * Milestone 5C: Clear Current Team Primary Players UI Handler
 */
export async function handleClearTeamPlayersUI() {
  const currentTeam = getSelectedTeam();
  if (
    !confirm(
      `Clear all primary players currently listed in ${currentTeam.name}? (Use this to wipe sample names before pasting your real squad list).`
    )
  ) {
    return;
  }
  const removed = await clearCurrentTeamPlayers(currentTeam.teamId);
  alert(`🧹 Cleared ${removed} player(s) from ${currentTeam.name}.`);
}

/**
 * Milestone 5B: Club Admin — Render Coaches & Team Assignment Panel
 */
export function renderAdminCoachesPanel() {
  const adminSection = document.getElementById('adminCoachesSection');
  const listContainer = document.getElementById('adminCoachesList');
  const inviteTeamCheckboxes = document.getElementById('inviteCoachTeamCheckboxes');

  const isAdmin = !appState.userProfile || appState.userProfile.role === 'admin';
  if (adminSection) {
    adminSection.classList.toggle('hidden', !isAdmin);
  }
  if (!isAdmin) return;

  const teams = appState.allClubTeams || [];

  // Populate team checkboxes inside the Invite Coach form
  if (inviteTeamCheckboxes) {
    inviteTeamCheckboxes.innerHTML = teams
      .map(t => {
        const checked = t.teamId === appState.selectedTeamId ? 'checked' : '';
        return `
          <label class="flex items-center gap-1.5 text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-700 cursor-pointer">
            <input type="checkbox" value="${t.teamId}" ${checked} class="invite-team-cb rounded bg-slate-800 border-slate-600 text-emerald-500">
            <span>${t.name}</span>
          </label>
        `;
      })
      .join('');
  }

  if (!listContainer) return;
  const users = appState.allClubUsers || [];
  if (users.length === 0) {
    listContainer.innerHTML = `<p class="text-[11px] text-slate-400 italic">No coaches registered yet.</p>`;
    return;
  }

  listContainer.innerHTML = users
    .map(u => {
      const assignedSet = new Set(u.assignedTeamIds || []);
      const isSelf = u.uid === (appState.userProfile?.uid || 'local_coach_1');
      const teamPills = teams
        .map(t => {
          const hasTeam = assignedSet.has(t.teamId);
          return `
            <button data-coach-uid="${u.uid}" data-team-id="${t.teamId}"
              class="coach-team-toggle px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                hasTeam
                  ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }">
              ${hasTeam ? '✓ ' : '+ '}${t.name}
            </button>
          `;
        })
        .join('');

      return `
        <div class="bg-slate-900/80 p-2 rounded border border-slate-700 space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <div>
              <span class="font-bold text-white text-xs">${u.displayName || 'Coach'}</span>
              ${
                u.isInvite
                  ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded ml-1">Pre-Authorized</span>`
                  : ''
              }
              <div class="text-[10px] text-slate-400">${u.email || ''}</div>
            </div>
            <div class="flex items-center gap-1.5">
              <select data-role-uid="${u.uid}" class="coach-role-select bg-slate-800 text-white text-[10px] font-bold px-1.5 py-1 rounded border border-slate-600">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ADMIN</option>
                <option value="coach" ${u.role === 'coach' ? 'selected' : ''}>COACH</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>VIEWER</option>
              </select>
              ${
                !isSelf
                  ? `<button data-del-coach="${u.uid}" class="del-coach-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1" title="Remove Coach">✕</button>`
                  : ''
              }
            </div>
          </div>
          <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-800">
            ${teamPills}
          </div>
        </div>
      `;
    })
    .join('');

  listContainer.querySelectorAll('.coach-role-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      await updateCoachRole(sel.getAttribute('data-role-uid'), e.target.value);
    });
  });

  listContainer.querySelectorAll('.coach-team-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleCoachTeamAssignment(
        btn.getAttribute('data-coach-uid'),
        btn.getAttribute('data-team-id')
      );
    });
  });

  listContainer.querySelectorAll('.del-coach-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.getAttribute('data-del-coach');
      if (confirm('Remove this coach profile / invite?')) {
        await removeCoachProfile(uid);
      }
    });
  });
}

export async function handleInviteCoachUI() {
  const nameInput = document.getElementById('inviteCoachNameInput');
  const emailInput = document.getElementById('inviteCoachEmailInput');
  const roleSelect = document.getElementById('inviteCoachRoleSelect');

  const displayName = nameInput?.value.trim() || '';
  const email = emailInput?.value.trim() || '';
  const role = roleSelect?.value || 'coach';

  if (!email) {
    alert('Please enter the coach email address.');
    return;
  }

  const checkedTeams = Array.from(
    document.querySelectorAll('.invite-team-cb:checked')
  ).map(cb => cb.value);

  try {
    const doc = await inviteOrPreAuthorizeCoach({
      email,
      displayName,
      role,
      assignedTeamIds: checkedTeams
    });
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    alert(
      `✅ Pre-authorized ${doc.displayName} (${doc.email}) as ${doc.role.toUpperCase()}! When they sign in with that email, their team access will be applied automatically.`
    );
  } catch (e) {
    alert(e.message || 'Could not pre-authorize coach.');
  }
}
