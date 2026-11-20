import {
  getPositionsForFormatAndShape,
  getMatchPeriods,
  appState,
  getActiveUserProfile,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getMatchId,
  addClubPlayer,
  updatePlayerPreferredGroup,
  bulkAddClubPlayers,
  clearCurrentTeamPlayers,
  removeClubPlayer,
  togglePlayerSharedAccess,
  createClubTeam,
  inviteOrPreAuthorizeCoach,
  revokeClubInvite,
  updateCoachRole,
  toggleCoachTeamAssignment,
  toggleCoachAgeGroupAssignment,
  toggleCoachStatus,
  removeCoachProfile,
  setClubJoinCode,
  generateClubJoinCode,
  approveJoinRequest,
  rejectJoinRequest,
  extractUFootballVersionRank,
  parseUFootballPayloadFromString,
  findLatestUFootballAppInLocalStorage,
  importLegacyPayloadObject,
  importLegacyPrototypeData
} from './db.js';
import { computePlayerStats } from './engine.js';
import {
  isClubAdmin,
  canEditTeam,
  canDeletePlayer,
  canCreateTeamInAgeGroup,
  getClubAgeGroups,
  getRoleMeta
} from './permissions.js';

export function renderStats() {
  const scopeSelect = document.getElementById('statsScope');
  const scope = scopeSelect ? scopeSelect.value : 'match';
  const currentTeam = getSelectedTeam();
  const teamPlayers = getTeamPlayers(currentTeam.teamId);

  const currentMatchId = getMatchId(currentTeam.teamId, appState.selectedDate);
  const matchIdsToCount =
    scope === 'match'
      ? [currentMatchId]
      : Object.keys(appState.matchesByTeam || {}).length > 0
      ? Object.keys(appState.matchesByTeam)
      : [currentMatchId];

  const stats = computePlayerStats({
    roster: teamPlayers.map(p => ({ name: getPlayerDisplayName(p), playerObj: p })),
    matchIds: matchIdsToCount,
    matchesMap: appState.matchesByTeam || {},
    lineupsByMatch: appState.lineupsByMatch || {},
    fallbackMatch: getCurrentMatchDoc(),
    defaultQtrMins: currentTeam.defaultQtrMins || 12
  });

  const tbody = document.getElementById('statsBody');
  const activeProfile = getActiveUserProfile();
  const canEditRoster = canEditTeam(activeProfile, currentTeam, appState.allClubTeams);

  const rosterCard = document.getElementById('squadRosterEditCard');
  if (rosterCard) rosterCard.classList.toggle('hidden', !canEditRoster);

  const sharedDrawer = document.getElementById('sharedRosterDrawer');
  if (sharedDrawer) sharedDrawer.classList.toggle('hidden', !canEditRoster);

  if (tbody) {
    tbody.innerHTML = Object.entries(stats)
      .map(([pName, s]) => {
        const pObj = s.playerObj;
        const isPrimary = !pObj || pObj.primaryTeamId === currentTeam.teamId;
        const isShared = pObj && (pObj.allowedTeamIds || []).length > 1;
        const pref = pObj?.preferredGroup || 'ANY';
        const allowDelete = pObj && canDeletePlayer(getActiveUserProfile(), pObj, appState.allClubTeams);
        return `
          <tr>
            <td class="p-2 font-semibold text-white">
              <div class="flex flex-wrap items-center gap-1">
                <span>${pName}</span>
                ${
                  !isPrimary
                    ? `<span class="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 py-0.5 rounded">Guest</span>`
                    : isShared
                    ? `<span class="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1 py-0.5 rounded">Shared 🔗</span>`
                    : ''
                }
                ${
                  s.GOALS > 0
                    ? `<span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded">⚽${s.GOALS}</span>`
                    : ''
                }
                ${
                  s.ASSISTS > 0
                    ? `<span class="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1 py-0.5 rounded">👟${s.ASSISTS}</span>`
                    : ''
                }
                ${
                  s.STARS > 0
                    ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded">🌟${s.STARS}</span>`
                    : ''
                }
                ${
                  (s.YELLOWS || 0) > 0
                    ? `<span class="text-[9px] bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1 py-0.5 rounded">🟨${s.YELLOWS}</span>`
                    : ''
                }
                ${
                  (s.REDS || 0) > 0
                    ? `<span class="text-[9px] bg-rose-600/30 text-rose-300 border border-rose-500/50 px-1 py-0.5 rounded">🟥${s.REDS}</span>`
                    : ''
                }
              </div>
              ${
                pObj
                  ? `<div class="mt-1">
                      <select data-pref-player="${pObj.playerId}" ${canEditRoster ? '' : 'disabled'} class="player-pref-select bg-slate-900 text-[10px] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-semibold ${canEditRoster ? '' : 'opacity-60 cursor-not-allowed'}">
                        <option value="ANY" ${pref === 'ANY' ? 'selected' : ''}>🔄 Any Pos</option>
                        <option value="GK" ${pref === 'GK' ? 'selected' : ''}>🧤 GK Specialist</option>
                        <option value="DEF" ${pref === 'DEF' ? 'selected' : ''}>🛡️ DEF Pref</option>
                        <option value="MID" ${pref === 'MID' ? 'selected' : ''}>⚙️ MID Pref</option>
                        <option value="ATT" ${pref === 'ATT' ? 'selected' : ''}>⚡ ATT Pref</option>
                      </select>
                    </div>`
                  : ''
              }
            </td>
            <td class="p-2 text-center font-bold text-emerald-400">${s.TOTAL}m</td>
            <td data-role="GK" data-nonzero="${s.GK > 0 ? 'true' : 'false'}" class="p-2 text-center text-slate-300">${s.GK}m</td>
            <td data-role="DEF" data-nonzero="${s.DEF > 0 ? 'true' : 'false'}" class="p-2 text-center text-slate-300">${s.DEF}m</td>
            <td data-role="MID" data-nonzero="${s.MID > 0 ? 'true' : 'false'}" class="p-2 text-center text-slate-300">${s.MID}m</td>
            <td data-role="ATT" data-nonzero="${s.ATT > 0 ? 'true' : 'false'}" class="p-2 text-center text-slate-300">${s.ATT}m</td>
            <td class="p-2 text-right">
              ${
                allowDelete
                  ? `<button data-remove-id="${pObj.playerId}" data-remove-name="${pName.replace(/"/g, '&quot;')}" class="remove-player-btn text-rose-400 hover:text-rose-300 font-bold px-1">✕</button>`
                  : ''
              }
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.player-pref-select').forEach(sel => {
      sel.addEventListener('change', async e => {
        const id = sel.getAttribute('data-pref-player');
        await updatePlayerPreferredGroup(id, e.target.value);
      });
    });

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
  const currentTeam = getSelectedTeam();
  if (!canEditTeam(getActiveUserProfile(), currentTeam, appState.allClubTeams)) {
    return alert('Read-only viewers cannot edit the squad roster.');
  }
  const input = document.getElementById('newPlayerName');
  const roleSelect = document.getElementById('newPlayerRoleSelect');
  const shareCheckbox = document.getElementById('shareAcrossAgeGroupCheckbox');
  if (!input) return;

  const full = input.value.trim();
  if (!full) return;

  const parts = full.split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  const preferredGroup = roleSelect ? roleSelect.value : 'ANY';

  let sharedIds = [];
  if (shareCheckbox && shareCheckbox.checked) {
    sharedIds = appState.allClubTeams
      .filter(t => t.ageGroup === currentTeam.ageGroup)
      .map(t => t.teamId);
  }

  await addClubPlayer({
    firstName,
    lastName,
    preferredGroup,
    primaryTeamId: currentTeam.teamId,
    sharedWithTeamIds: sharedIds
  });

  input.value = '';
  if (roleSelect) roleSelect.value = 'ANY';
}

export async function handleCreateTeamUI() {
  const nameInput = document.getElementById('newTeamNameInput');
  const ageInput = document.getElementById('newTeamAgeInput');
  const fmtSelect = document.getElementById('newTeamFormatSelect');

  const name = nameInput?.value.trim();
  const ageGroup = ageInput?.value.trim() || 'U10';
  const defaultFormation = fmtSelect?.value || '7v7';

  if (!canCreateTeamInAgeGroup(getActiveUserProfile(), ageGroup)) {
    return alert('Only a Club Admin or Age-Group Lead for that age group can create teams.');
  }

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
  const modal = document.getElementById('betaImportModal');
  const statusEl = document.getElementById('betaDetectedLocalStatus');
  const localBtn = document.getElementById('betaImportLocalBtn');
  const detected = findLatestUFootballAppInLocalStorage();

  if (statusEl && localBtn) {
    if (detected) {
      const pCount = (detected.data.players || []).length;
      const mCount = Object.keys(detected.data.matches || {}).length;
      statusEl.innerHTML = `✅ Found <strong>${detected.sourceKey}</strong> in browser storage (${pCount} players, ${mCount} matches).`;
      statusEl.className = 'text-xs text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 p-2 rounded';
      localBtn.classList.remove('hidden');
    } else {
      statusEl.innerHTML = `ℹ️ No <code>uFootballApp*</code> key found in this domain's browser storage. Select your latest <strong>uFootballApp</strong> file below or import via SheetDB URL:`;
      statusEl.className = 'text-xs text-slate-300 bg-slate-900 p-2 rounded border border-slate-700';
      localBtn.classList.add('hidden');
    }
  }

  if (modal) {
    modal.classList.remove('hidden');
  } else if (detected) {
    const res = await importLegacyPrototypeData();
    if (res) {
      alert(
        `✅ Imported ${res.sourceLabel}: ${res.addedPlayers} new players and ${res.importedMatches} matches!`
      );
    }
  }
}

export function closeBetaImportModal() {
  document.getElementById('betaImportModal')?.classList.add('hidden');
}

export async function handleConfirmLocalBetaImport() {
  try {
    const res = await importLegacyPrototypeData();
    if (!res) {
      return alert('No uFootballApp data found in browser storage.');
    }
    closeBetaImportModal();
    alert(
      `✅ Imported latest browser data (${res.sourceLabel}) into ${getSelectedTeam().name}: ${res.totalPlayersInFile} players (${res.addedPlayers} new) & ${res.importedMatches} matches!`
    );
  } catch (e) {
    alert(e.message || 'Error importing browser data.');
  }
}

export async function handleBetaFileSelect(event) {
  const files = Array.from(event?.target?.files || []);
  if (files.length === 0) return;

  // Sort selected files so the highest uFootballApp version rank or newest file modified date wins automatically
  const candidates = [];
  for (const file of files) {
    try {
      const text = await file.text();
      const parsed = parseUFootballPayloadFromString(text);
      if (parsed) {
        candidates.push({
          fileName: file.name,
          rank: extractUFootballVersionRank(file.name),
          lastModified: file.lastModified || 0,
          data: parsed
        });
      }
    } catch (_) {}
  }

  if (candidates.length === 0) {
    alert('Could not find valid uFootballApp player/match data in the selected file(s).');
    return;
  }

  candidates.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return b.lastModified - a.lastModified;
  });

  const latest = candidates[0];
  try {
    const res = await importLegacyPayloadObject(latest.data, latest.fileName);
    event.target.value = '';
    closeBetaImportModal();
    alert(
      `✅ Imported latest file "${res.sourceLabel}" into ${getSelectedTeam().name}: ${res.totalPlayersInFile} players (${res.addedPlayers} new) & ${res.importedMatches} matches!`
    );
  } catch (e) {
    alert(e.message || 'Failed to import file.');
  }
}

export async function handleBetaSheetDbOrJsonImport() {
  const input = document.getElementById('betaSheetDbOrJsonInput')?.value.trim() || '';
  if (!input) {
    return alert('Please paste your Beta SheetDB URL or raw uFootballApp JSON.');
  }

  try {
    let parsed = null;
    let label = 'Pasted JSON';

    if (/^https?:\/\//i.test(input)) {
      const cleanUrl = input.replace(/\/$/, '');
      const fetchUrl = cleanUrl.includes('/id/app_state')
        ? cleanUrl
        : `${cleanUrl}/id/app_state`;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        // Fallback to base SheetDB URL if /id/app_state wasn't used
        const resFallback = await fetch(cleanUrl);
        if (!resFallback.ok) throw new Error('Could not fetch from SheetDB URL.');
        parsed = parseUFootballPayloadFromString(await resFallback.text());
      } else {
        parsed = parseUFootballPayloadFromString(await res.text());
      }
      label = 'SheetDB Cloud';
    } else {
      parsed = parseUFootballPayloadFromString(input);
    }

    if (!parsed) {
      throw new Error('Could not parse valid uFootballApp players/matches from the input.');
    }

    const result = await importLegacyPayloadObject(parsed, label);
    closeBetaImportModal();
    alert(
      `✅ Imported from ${result.sourceLabel} into ${getSelectedTeam().name}: ${result.totalPlayersInFile} players (${result.addedPlayers} new) & ${result.importedMatches} matches!`
    );
  } catch (e) {
    alert(e.message || 'Import failed.');
  }
}

/**
 * Milestone 5C: Bulk Paste Players UI Handler
 */
export async function handleBulkAddPlayersUI() {
  const currentTeam = getSelectedTeam();
  if (!canEditTeam(getActiveUserProfile(), currentTeam, appState.allClubTeams)) {
    return alert('Read-only viewers cannot import players.');
  }
  const textarea = document.getElementById('bulkPlayersTextarea');
  const shareCheckbox = document.getElementById('shareAcrossAgeGroupCheckbox');
  if (!textarea) return;

  const rawText = textarea.value.trim();
  if (!rawText) {
    alert('Please paste one or more player names (separated by new lines or commas).');
    return;
  }

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
  if (!canEditTeam(getActiveUserProfile(), currentTeam, appState.allClubTeams)) {
    return alert('Read-only viewers cannot clear players.');
  }
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
 * Milestone 13: Club Admin — Render Coaches, 4-Role Permissions, Pending Invites, Join Code & Approval Queue
 */
export function renderAdminCoachesPanel() {
  const adminSection = document.getElementById('adminCoachesSection');
  const addTeamSection = document.getElementById('settingsAddTeamSection');
  const listContainer = document.getElementById('adminCoachesList');
  const invitesContainer = document.getElementById('adminPendingInvitesList');
  const requestsContainer = document.getElementById('adminJoinRequestsList');
  const inviteTeamCheckboxes = document.getElementById('inviteCoachTeamCheckboxes');
  const inviteAgeGroupCheckboxes = document.getElementById('inviteCoachAgeGroupCheckboxes');
  const joinCodeBadge = document.getElementById('adminJoinCodeDisplay');
  const joinCodeToggleBtn = document.getElementById('adminJoinCodeToggleBtn');

  const activeProfile = getActiveUserProfile();
  const isAdmin = isClubAdmin(activeProfile);
  const canCreateTeam = canCreateTeamInAgeGroup(activeProfile);

  if (addTeamSection) {
    addTeamSection.classList.toggle('hidden', !canCreateTeam);
  }
  if (adminSection) {
    adminSection.classList.toggle('hidden', !isAdmin);
  }
  if (!isAdmin) return;

  const teams = appState.allClubTeams || [];
  const ageGroups = getClubAgeGroups(teams);

  // Join Code Card
  const currentJoinCode = appState.club?.joinCode || 'Not Set';
  const joinCodeEnabled = appState.club?.joinCodeEnabled !== false;
  if (joinCodeBadge) {
    joinCodeBadge.innerText = currentJoinCode;
    joinCodeBadge.className = joinCodeEnabled
      ? 'font-mono font-extrabold text-xs text-emerald-300 bg-slate-950 px-2 py-1 rounded border border-emerald-500/40'
      : 'font-mono font-extrabold text-xs text-slate-400 line-through bg-slate-950 px-2 py-1 rounded border border-slate-700';
  }
  if (joinCodeToggleBtn) {
    joinCodeToggleBtn.innerText = joinCodeEnabled ? 'Disable' : 'Enable';
  }

  // Populate team checkboxes inside Invite Coach form
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

  // Populate age-group checkboxes for Age-Group Lead role
  if (inviteAgeGroupCheckboxes) {
    inviteAgeGroupCheckboxes.innerHTML = ageGroups
      .map(ag => {
        return `
          <label class="flex items-center gap-1.5 text-[11px] bg-slate-900 px-2 py-1 rounded border border-sky-700/60 cursor-pointer">
            <input type="checkbox" value="${ag}" class="invite-agegroup-cb rounded bg-slate-800 border-slate-600 text-sky-500">
            <span class="text-sky-300 font-semibold">${ag}</span>
          </label>
        `;
      })
      .join('');
  }

  // 1. Pending Join-Code Requests (Approval Queue)
  if (requestsContainer) {
    const pendingReqs = (appState.allClubJoinRequests || []).filter(r => r.status === 'pending');
    if (pendingReqs.length === 0) {
      requestsContainer.innerHTML = `<p class="text-[10px] text-slate-500 italic">No pending join requests.</p>`;
    } else {
      requestsContainer.innerHTML = pendingReqs
        .map(r => {
          return `
            <div class="bg-amber-950/30 p-2 rounded border border-amber-500/40 space-y-1.5">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-bold text-amber-200 text-xs">${r.displayName || 'New Coach'}</div>
                  <div class="text-[10px] text-slate-300">${r.email || ''}</div>
                  ${r.note ? `<div class="text-[10px] text-amber-300/90 italic mt-0.5">"${r.note}"</div>` : ''}
                </div>
                <span class="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">${r.joinCode}</span>
              </div>
              <div class="flex items-center gap-1.5 pt-1 border-t border-amber-500/20">
                <select data-req-role="${r.requestId}" class="req-role-select bg-slate-900 text-white text-[10px] font-bold px-1.5 py-1 rounded border border-slate-600">
                  <option value="coach" selected>Coach</option>
                  <option value="lead">Age-Group Lead</option>
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                </select>
                <button data-approve-req="${r.requestId}" class="approve-req-btn flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold py-1 px-2 rounded">✓ Approve</button>
                <button data-reject-req="${r.requestId}" class="reject-req-btn bg-rose-600/80 hover:bg-rose-500 text-white text-[10px] font-bold py-1 px-2 rounded">✕ Reject</button>
              </div>
            </div>
          `;
        })
        .join('');

      requestsContainer.querySelectorAll('.approve-req-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const reqId = btn.getAttribute('data-approve-req');
          const roleSel = requestsContainer.querySelector(`[data-req-role="${reqId}"]`);
          const role = roleSel ? roleSel.value : 'coach';
          const defaultTeam = appState.selectedTeamId ? [appState.selectedTeamId] : [];
          const defaultAge = getSelectedTeam()?.ageGroup ? [getSelectedTeam().ageGroup] : [];
          try {
            await approveJoinRequest({
              requestId: reqId,
              role,
              assignedTeamIds: role === 'coach' || role === 'viewer' ? defaultTeam : [],
              assignedAgeGroups: role === 'lead' ? defaultAge : []
            });
            alert(`✅ Approved! They now have ${role.toUpperCase()} access — you can fine-tune their team/age-group pills below.`);
          } catch (e) {
            alert(e.message || 'Could not approve request.');
          }
        });
      });

      requestsContainer.querySelectorAll('.reject-req-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const reqId = btn.getAttribute('data-reject-req');
          if (confirm('Reject this join request?')) {
            await rejectJoinRequest(reqId);
          }
        });
      });
    }
  }

  // 2. Pending Email Invites
  if (invitesContainer) {
    const pendingInvites = (appState.allClubInvites || []).filter(inv => inv.status === 'pending');
    if (pendingInvites.length === 0) {
      invitesContainer.innerHTML = `<p class="text-[10px] text-slate-500 italic">No pending email invites.</p>`;
    } else {
      invitesContainer.innerHTML = pendingInvites
        .map(inv => {
          const meta = getRoleMeta(inv.role);
          return `
            <div class="flex items-center justify-between gap-2 bg-slate-900/70 px-2 py-1.5 rounded border border-slate-700">
              <div class="min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="font-bold text-white text-[11px] truncate">${inv.displayName || inv.email}</span>
                  <span class="text-[9px] px-1 py-0.5 rounded border ${meta.badgeClass} font-bold">${meta.short}</span>
                </div>
                <div class="text-[10px] text-slate-400 truncate">${inv.email}</div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button data-copy-invite="${inv.inviteId}" class="copy-invite-btn text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 px-1.5 py-0.5 rounded font-semibold" title="Copy WhatsApp Invite Message">📋</button>
                <button data-revoke-invite="${inv.inviteId}" class="revoke-invite-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1" title="Revoke Invite">✕</button>
              </div>
            </div>
          `;
        })
        .join('');

      invitesContainer.querySelectorAll('.copy-invite-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const inv = (appState.allClubInvites || []).find(i => i.inviteId === btn.getAttribute('data-copy-invite'));
          if (!inv) return;
          const clubName = appState.club?.shortName || 'MatchDay Ready';
          const url = window.location.origin;
          const msg = `⚽ You've been invited to *${clubName}* on MatchDay Ready as *${getRoleMeta(inv.role).label}*!\n\nSign in here using *${inv.email}*:\n${url}`;
          try {
            await navigator.clipboard.writeText(msg);
            alert('📋 Invite message copied to clipboard for WhatsApp!');
          } catch (_) {
            prompt('Copy this invite message:', msg);
          }
        });
      });

      invitesContainer.querySelectorAll('.revoke-invite-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-revoke-invite');
          if (confirm('Revoke this pending invite?')) {
            await revokeClubInvite(id);
          }
        });
      });
    }
  }

  // 3. Active Club Members (with 4 roles, Team pills, Age-Group pills for Leads, Suspend & Last-Admin Guard)
  if (!listContainer) return;
  const users = appState.allClubUsers || [];
  if (users.length === 0) {
    listContainer.innerHTML = `<p class="text-[11px] text-slate-400 italic">No coaches registered yet.</p>`;
    return;
  }

  listContainer.innerHTML = users
    .map(u => {
      const assignedSet = new Set(u.assignedTeamIds || []);
      const assignedGroupsSet = new Set(u.assignedAgeGroups || []);
      const isSelf = u.uid === (appState.userProfile?.uid || 'local_coach_1');
      const isSuspended = u.status === 'suspended';
      const meta = getRoleMeta(u.role);

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

      const ageGroupPills =
        u.role === 'lead'
          ? `<div class="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-800/80">
              <span class="text-[9px] text-sky-400 font-bold uppercase mr-0.5">Lead Age Groups:</span>
              ${ageGroups
                .map(ag => {
                  const hasAg = assignedGroupsSet.has(ag);
                  return `
                    <button data-lead-uid="${u.uid}" data-lead-ag="${ag}"
                      class="coach-ag-toggle px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        hasAg
                          ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }">
                      ${hasAg ? '✓ ' : '+ '}${ag}
                    </button>
                  `;
                })
                .join('')}
            </div>`
          : '';

      return `
        <div class="bg-slate-900/80 p-2 rounded border ${isSuspended ? 'border-rose-500/40 opacity-65' : 'border-slate-700'} space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-1 flex-wrap">
                <span class="font-bold text-white text-xs truncate">${u.displayName || 'Coach'}</span>
                <span class="text-[9px] px-1 py-0.5 rounded border ${meta.badgeClass} font-bold">${meta.short}</span>
                ${
                  u.isInvite
                    ? `<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.5 rounded">Legacy Invite</span>`
                    : ''
                }
                ${
                  isSuspended
                    ? `<span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 py-0.5 rounded font-bold">SUSPENDED</span>`
                    : ''
                }
              </div>
              <div class="text-[10px] text-slate-400 truncate">${u.email || ''}</div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <select data-role-uid="${u.uid}" class="coach-role-select bg-slate-800 text-white text-[10px] font-bold px-1.5 py-1 rounded border border-slate-600">
                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ADMIN</option>
                <option value="lead" ${u.role === 'lead' ? 'selected' : ''}>LEAD</option>
                <option value="coach" ${u.role === 'coach' ? 'selected' : ''}>COACH</option>
                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>VIEWER</option>
              </select>
              ${
                !isSelf
                  ? `<button data-suspend-coach="${u.uid}" class="suspend-coach-btn text-[10px] px-1.5 py-0.5 rounded border ${
                      isSuspended
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border-slate-600 text-amber-300'
                    }" title="${isSuspended ? 'Reactivate Coach' : 'Suspend Access'}">${isSuspended ? '↻' : '⏸'}</button>
                    <button data-del-coach="${u.uid}" class="del-coach-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1" title="Remove Member">✕</button>`
                  : ''
              }
            </div>
          </div>
          ${ageGroupPills}
          <div class="flex flex-wrap gap-1 pt-1 border-t border-slate-800">
            ${teamPills}
          </div>
        </div>
      `;
    })
    .join('');

  listContainer.querySelectorAll('.coach-role-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      try {
        await updateCoachRole(sel.getAttribute('data-role-uid'), e.target.value);
      } catch (err) {
        alert(err.message || 'Could not update role.');
        renderAdminCoachesPanel();
      }
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

  listContainer.querySelectorAll('.coach-ag-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleCoachAgeGroupAssignment(
        btn.getAttribute('data-lead-uid'),
        btn.getAttribute('data-lead-ag')
      );
    });
  });

  listContainer.querySelectorAll('.suspend-coach-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await toggleCoachStatus(btn.getAttribute('data-suspend-coach'));
      } catch (err) {
        alert(err.message || 'Could not update status.');
      }
    });
  });

  listContainer.querySelectorAll('.del-coach-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.getAttribute('data-del-coach');
      if (confirm('Remove this member from the club?')) {
        try {
          await removeCoachProfile(uid);
        } catch (err) {
          alert(err.message || 'Could not remove member.');
        }
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

  const checkedAgeGroups = Array.from(
    document.querySelectorAll('.invite-agegroup-cb:checked')
  ).map(cb => cb.value);

  try {
    const invite = await inviteOrPreAuthorizeCoach({
      email,
      displayName,
      role,
      assignedTeamIds: checkedTeams,
      assignedAgeGroups: checkedAgeGroups
    });
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    alert(
      `✅ Invited ${invite.displayName} (${invite.email}) as ${getRoleMeta(invite.role).label}! When they sign in with that email, their access will activate automatically.`
    );
  } catch (e) {
    alert(e.message || 'Could not invite coach.');
  }
}

export async function handleCopyJoinCodeUI() {
  const code = appState.club?.joinCode;
  if (!code) return alert('No join code configured yet.');
  const clubName = appState.club?.shortName || 'MatchDay Ready';
  const link = `${window.location.origin}/?code=${encodeURIComponent(code)}`;
  const text = `⚽ Join *${clubName}* on MatchDay Ready!\n\n1. Open: ${link}\n2. Sign in with Google or register with your email\n3. Club Registration Code: *${code}*\n4. Request access to your team(s) so your Admin or Age-Group Lead can unlock your squad!`;
  try {
    await navigator.clipboard.writeText(text);
    alert(`📋 Copied Club Registration Code (${code}) & link for WhatsApp!`);
  } catch (_) {
    prompt('Copy your Club Registration Code message:', text);
  }
}

export async function handleRotateJoinCodeUI() {
  if (!confirm('Generate a new Club Join Code? The old code will stop working immediately.')) return;
  const newCode = generateClubJoinCode(appState.club?.shortName || 'CLUB');
  try {
    await setClubJoinCode({
      code: newCode,
      active: true,
      defaultRole: appState.club?.joinDefaultRole || 'coach'
    });
    alert(`🔑 New Club Join Code active: ${newCode}`);
  } catch (e) {
    alert(e.message || 'Could not rotate join code.');
  }
}

export async function handleToggleJoinCodeActiveUI() {
  const currentCode = appState.club?.joinCode || generateClubJoinCode(appState.club?.shortName || 'CLUB');
  const nextActive = appState.club?.joinCodeEnabled === false;
  try {
    await setClubJoinCode({
      code: currentCode,
      active: nextActive,
      defaultRole: appState.club?.joinDefaultRole || 'coach'
    });
  } catch (e) {
    alert(e.message || 'Could not update join code status.');
  }
}
