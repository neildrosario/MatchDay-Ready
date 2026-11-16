import {
  FORMATIONS,
  appState,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getQuarterLineupDoc,
  getSharedPlayerConflicts,
  selectTeam,
  selectDate,
  saveMatchMetadata,
  saveQuarterLineup
} from './db.js';

export function getActivePositions() {
  const match = getCurrentMatchDoc();
  return FORMATIONS[match.formation || '7v7'] || FORMATIONS['7v7'];
}

export function getTeamSize() {
  const match = getCurrentMatchDoc();
  const fmt = match.formation || '7v7';
  return fmt === '5v5' ? 5 : fmt === '6v6' ? 6 : 7;
}

export function renderHeaderAndMatchBar() {
  // Team selector dropdown
  const teamSelect = document.getElementById('teamSelector');
  if (teamSelect) {
    const teams = appState.teams.length > 0 ? appState.teams : appState.allClubTeams;
    teamSelect.innerHTML = teams
      .map(t => {
        const selected = t.teamId === appState.selectedTeamId ? 'selected' : '';
        return `<option value="${t.teamId}" ${selected}>🛡️ ${t.name} (${t.ageGroup})</option>`;
      })
      .join('');
  }

  const clubBadge = document.getElementById('clubTitleBadge');
  if (clubBadge && appState.club) {
    clubBadge.innerText = appState.club.shortName || 'Straffan AFC';
  }

  const match = getCurrentMatchDoc();
  const qtrInput = document.getElementById('qtrMins');
  if (qtrInput && document.activeElement !== qtrInput) {
    qtrInput.value = match.qtrMins ?? 12;
  }

  const fmtSelect = document.getElementById('formationSelect');
  if (fmtSelect) {
    fmtSelect.value = match.formation || '7v7';
  }

  const dateInput = document.getElementById('matchDate');
  if (dateInput && dateInput.value !== appState.selectedDate) {
    dateInput.value = appState.selectedDate;
  }

  const oppInput = document.getElementById('oppositionInput');
  if (oppInput && document.activeElement !== oppInput) {
    oppInput.value = match.opposition || '';
  }

  updateMatchHistoryDropdown();
}

export function updateMatchHistoryDropdown() {
  const select = document.getElementById('matchHistorySelect');
  if (!select) return;

  const savedMatches = Object.values(appState.matchesByTeam || {}).sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  let html = '<option value="">-- Jump to Saved Match --</option>';
  savedMatches.forEach(m => {
    const opp = m.opposition ? ` vs ${m.opposition}` : '';
    const selected = m.date === appState.selectedDate ? 'selected' : '';
    html += `<option value="${m.date}" ${selected}>📅 ${m.date}${opp}</option>`;
  });
  select.innerHTML = html;
}

export function setQuarter(q) {
  appState.currentQuarter = q;
  document.querySelectorAll('.q-btn').forEach((btn, idx) => {
    btn.className =
      idx + 1 === q
        ? 'q-btn py-2 rounded font-bold bg-emerald-600 text-white text-sm shadow'
        : 'q-btn py-2 rounded font-bold bg-slate-800 text-slate-300 text-sm';
  });
  renderPitch();
}

export async function onTeamSelectChange(teamId) {
  await selectTeam(teamId);
}

export function onDateInputChange(dateStr) {
  selectDate(dateStr);
}

export async function onConfigQtrMinsChange(val) {
  const qtrMins = parseFloat(val) || 12;
  await saveMatchMetadata({ qtrMins });
}

export async function onFormationChange(formation) {
  await saveMatchMetadata({ formation });
}

export async function onOppositionInputChange(opposition) {
  await saveMatchMetadata({ opposition: opposition.trim() });
}

export async function assignPlayer(posId, playerName) {
  const q = appState.currentQuarter;
  const qDoc = getQuarterLineupDoc(q);
  const lineup = { ...(qDoc.lineup || {}) };

  Object.keys(lineup).forEach(k => {
    if (lineup[k] === playerName) delete lineup[k];
  });
  if (playerName) {
    lineup[posId] = playerName;
  } else {
    delete lineup[posId];
  }

  await saveQuarterLineup(q, { lineup });
}

export async function toggleUnavailable(playerName) {
  const q = appState.currentQuarter;
  const qDoc = getQuarterLineupDoc(q);
  const unavail = [...(qDoc.unavailablePlayers || [])];
  const lineup = { ...(qDoc.lineup || {}) };

  const idx = unavail.indexOf(playerName);
  if (idx > -1) {
    unavail.splice(idx, 1);
  } else {
    unavail.push(playerName);
    Object.keys(lineup).forEach(posId => {
      if (lineup[posId] === playerName) delete lineup[posId];
    });
  }

  await saveQuarterLineup(q, { lineup, unavailablePlayers: unavail });
}

export function renderPitch() {
  renderHeaderAndMatchBar();

  const team = getSelectedTeam();
  const teamPlayers = getTeamPlayers(team.teamId);
  const playerNames = teamPlayers.map(p => getPlayerDisplayName(p));
  const sharedSet = new Set(
    teamPlayers.filter(p => p.primaryTeamId !== team.teamId).map(p => getPlayerDisplayName(p))
  );

  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = qObj.lineup || {};
  const unavailSet = new Set(qObj.unavailablePlayers || []);
  const assigned = new Set(Object.values(qData).filter(Boolean));
  const activePositions = getActivePositions();

  // 1. Render Real-Time Shared Player Conflict Warning Banner (Blueprint Section 4.2)
  const conflictBanner = document.getElementById('conflictWarningBanner');
  const conflictList = document.getElementById('conflictWarningList');
  const conflicts = getSharedPlayerConflicts(q);
  if (conflictBanner && conflictList) {
    if (conflicts.length > 0) {
      conflictBanner.classList.remove('hidden');
      conflictList.innerHTML = conflicts
        .map(
          c =>
            `<div>⚠️ <strong>${c.playerName}</strong> is also assigned to <strong>${c.otherTeamName}</strong> (${c.otherPosId}) in Q${c.quarter}.</div>`
        )
        .join('');
    } else {
      conflictBanner.classList.add('hidden');
      conflictList.innerHTML = '';
    }
  }

  // 2. Render Pitch Slots
  const slotsContainer = document.getElementById('pitchSlots');
  if (slotsContainer) {
    const rows = { 1: [], 2: [], 3: [], 4: [] };
    activePositions.forEach(pos => rows[pos.row].push(pos));

    let html = '';
    [1, 2, 3, 4].forEach(rowNum => {
      const rowPos = rows[rowNum];
      if (!rowPos || rowPos.length === 0) return;

      html += `<div class="flex justify-around items-center px-2 gap-2 w-full">`;
      rowPos.forEach(pos => {
        const currentVal = qData[pos.id] || '';
        const options = [`<option value="">-- ${pos.label} --</option>`];

        playerNames.forEach(pName => {
          if (unavailSet.has(pName)) return;
          const isTakenElsewhere = assigned.has(pName) && currentVal !== pName;
          const sharedTag = sharedSet.has(pName) ? ' 🔗' : '';
          const label = isTakenElsewhere ? `${pName}${sharedTag} (On Pitch)` : `${pName}${sharedTag}`;
          const selected = currentVal === pName ? 'selected' : '';
          options.push(`<option value="${pName.replace(/"/g, '&quot;')}" ${selected}>${label}</option>`);
        });

        html += `
          <div class="flex-1 text-center">
            <span class="text-[9px] font-bold px-1 py-0.5 rounded-t ${pos.color} text-white block">${pos.label}</span>
            <select data-pos-id="${pos.id}"
              class="pitch-slot-select w-full bg-slate-900/95 text-white font-semibold text-xs py-1.5 px-0.5 rounded-b border border-white/30 shadow">
              ${options.join('')}
            </select>
          </div>
        `;
      });
      html += `</div>`;
    });

    slotsContainer.innerHTML = html;
    slotsContainer.querySelectorAll('.pitch-slot-select').forEach(sel => {
      sel.addEventListener('change', e => {
        assignPlayer(sel.getAttribute('data-pos-id'), e.target.value);
      });
    });
  }

  // 3. Render Substitutes Bench
  const subs = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
  const benchEl = document.getElementById('subsBench');
  const subBadge = document.getElementById('subCountBadge');
  if (subBadge) subBadge.innerText = `${subs.length} available`;
  if (benchEl) {
    benchEl.innerHTML = subs.length
      ? subs
          .map(s => {
            const isShared = sharedSet.has(s);
            return `<span class="bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">${s}${
              isShared ? '<span class="text-[10px] text-sky-300" title="Shared Age-Group Player">🔗</span>' : ''
            }</span>`;
          })
          .join('')
      : `<span class="text-xs text-slate-500 italic">No subs on bench</span>`;
  }

  // 4. Render Unavailable / Resting Checkboxes
  const unavailContainer = document.getElementById('unavailableCheckboxes');
  const unavailBadge = document.getElementById('unavailableCountBadge');
  if (unavailBadge) unavailBadge.innerText = `${unavailSet.size} off`;
  if (unavailContainer) {
    unavailContainer.innerHTML = playerNames
      .map(p => {
        const isChecked = unavailSet.has(p) ? 'checked' : '';
        return `
          <label class="flex items-center gap-2 text-xs bg-slate-900/60 p-1.5 rounded border border-slate-700 cursor-pointer">
            <input type="checkbox" data-unavail-player="${p.replace(/"/g, '&quot;')}" ${isChecked} class="unavail-checkbox rounded bg-slate-800 border-slate-600 text-emerald-600 focus:ring-0">
            <span class="${isChecked ? 'line-through text-slate-500' : 'text-slate-300'}">${p}</span>
          </label>
        `;
      })
      .join('');

    unavailContainer.querySelectorAll('.unavail-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        toggleUnavailable(cb.getAttribute('data-unavail-player'));
      });
    });
  }

  // 5. Render Mid-Quarter Swaps Log
  const swapContainer = document.getElementById('swapLogContainer');
  const swapList = document.getElementById('swapLogList');
  if (swapContainer && swapList) {
    if (qObj.swaps && qObj.swaps.length > 0) {
      swapContainer.classList.remove('hidden');
      swapList.innerHTML = qObj.swaps
        .map(sw => `<div>• <strong>${sw.time}:</strong> ${sw.text}</div>`)
        .join('');
    } else {
      swapContainer.classList.add('hidden');
    }
  }
}

export function openSwapModal() {
  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = qObj.lineup || {};
  const unavailSet = new Set(qObj.unavailablePlayers || []);
  const activePositions = getActivePositions();
  const team = getSelectedTeam();
  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));

  const selA = document.getElementById('swapPlayerA');
  const selB = document.getElementById('swapPlayerB');

  let htmlA = '<option value="">Select player on pitch...</option>';
  activePositions.forEach(pos => {
    if (qData[pos.id]) {
      htmlA += `<option value="${pos.id}">${qData[pos.id]} (${pos.label})</option>`;
    }
  });
  selA.innerHTML = htmlA;

  const assigned = new Set(Object.values(qData).filter(Boolean));
  let htmlB = '<option value="">Select incoming sub or position...</option>';

  const bench = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
  if (bench.length > 0) {
    htmlB += `<optgroup label="Available Substitutes">`;
    bench.forEach(b => {
      htmlB += `<option value="sub_${b.replace(/"/g, '&quot;')}">Sub: ${b}</option>`;
    });
    htmlB += `</optgroup>`;
  }

  htmlB += `<optgroup label="Players on Pitch">`;
  activePositions.forEach(pos => {
    if (qData[pos.id]) {
      htmlB += `<option value="pos_${pos.id}">${qData[pos.id]} (${pos.label})</option>`;
    }
  });
  htmlB += `</optgroup>`;
  selB.innerHTML = htmlB;

  document.getElementById('swapModal').classList.remove('hidden');
}

export function closeSwapModal() {
  document.getElementById('swapModal').classList.add('hidden');
}

export async function executeSwap() {
  const posAId = document.getElementById('swapPlayerA').value;
  const targetB = document.getElementById('swapPlayerB').value;
  if (!posAId || !targetB) return alert('Please select both players for the swap.');

  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = { ...(qObj.lineup || {}) };
  const swaps = [...(qObj.swaps || [])];
  const playerA = qData[posAId];

  let swapDescription = '';
  if (targetB.startsWith('sub_')) {
    const subName = targetB.replace('sub_', '');
    qData[posAId] = subName;
    swapDescription = `${subName} replaced ${playerA} at ${posAId} (50/50 min split)`;
  } else if (targetB.startsWith('pos_')) {
    const posBId = targetB.replace('pos_', '');
    const playerB = qData[posBId];
    qData[posAId] = playerB;
    qData[posBId] = playerA;
    swapDescription = `Swapped positions: ${playerA} (${posAId}) ⇄ ${playerB} (${posBId})`;
  }

  swaps.push({ time: 'Mid-Qtr', text: swapDescription });
  await saveQuarterLineup(q, { lineup: qData, swaps });
  closeSwapModal();
}

export async function clearSwaps() {
  const q = appState.currentQuarter;
  await saveQuarterLineup(q, { swaps: [] });
}

export async function autoGenerateMatch() {
  const team = getSelectedTeam();
  const match = getCurrentMatchDoc();
  const teamSize = getTeamSize();
  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));

  if (playerNames.length < teamSize) {
    alert(
      `You need at least ${teamSize} players in ${team.name} to auto-generate a ${match.formation} lineup.`
    );
    return;
  }
  if (
    !confirm(
      `Automatically schedule fair playing time and position rotation across all 4 quarters for ${team.name} (${match.formation})?`
    )
  ) {
    return;
  }

  const tracking = {};
  playerNames.forEach(p => {
    tracking[p] = { totalQtrs: 0, GK: 0, DEF: 0, MID: 0, ATT: 0 };
  });

  const activePositions = getActivePositions();

  for (const q of [1, 2, 3, 4]) {
    const qObj = getQuarterLineupDoc(q);
    const unavailSet = new Set(qObj.unavailablePlayers || []);
    const availablePlayers = playerNames.filter(p => !unavailSet.has(p));

    if (availablePlayers.length < teamSize) {
      alert(`Warning: Quarter ${q} has fewer than ${teamSize} available players. Skipping auto-fill.`);
      continue;
    }

    availablePlayers.sort((a, b) => {
      if (tracking[a].totalQtrs !== tracking[b].totalQtrs) {
        return tracking[a].totalQtrs - tracking[b].totalQtrs;
      }
      return Math.random() - 0.5;
    });

    const startingPlayers = availablePlayers.slice(0, teamSize);
    const newLineup = {};

    // Assign GK
    startingPlayers.sort((a, b) => tracking[a].GK - tracking[b].GK);
    newLineup.GK = startingPlayers[0];
    tracking[startingPlayers[0]].GK++;

    let remaining = startingPlayers.filter(p => p !== newLineup.GK);

    // Assign ATT if formation has ATT
    const hasAtt = activePositions.some(p => p.id === 'ATT');
    if (hasAtt) {
      remaining.sort((a, b) => tracking[a].ATT - tracking[b].ATT);
      newLineup.ATT = remaining[0];
      tracking[remaining[0]].ATT++;
      remaining = remaining.filter(p => p !== newLineup.ATT);
    }

    // Assign DEF (LD, RD)
    const defSlots = activePositions.filter(p => p.group === 'DEF');
    if (defSlots.length > 0) {
      remaining.sort((a, b) => tracking[a].DEF - tracking[b].DEF);
      if (defSlots[0] && remaining[0]) {
        newLineup[defSlots[0].id] = remaining[0];
        tracking[remaining[0]].DEF++;
      }
      if (defSlots[1] && remaining[1]) {
        newLineup[defSlots[1].id] = remaining[1];
        tracking[remaining[1]].DEF++;
      }
      remaining = remaining.slice(defSlots.length);
    }

    // Assign MID
    const midSlots = activePositions.filter(p => p.group === 'MID');
    midSlots.forEach((slot, idx) => {
      if (remaining[idx]) {
        newLineup[slot.id] = remaining[idx];
        tracking[remaining[idx]].MID++;
      }
    });

    startingPlayers.forEach(p => {
      tracking[p].totalQtrs++;
    });

    await saveQuarterLineup(q, {
      lineup: newLineup,
      unavailablePlayers: qObj.unavailablePlayers || [],
      swaps: []
    });
  }

  alert(`✨ Auto-fair lineup generated for ${team.name}!`);
}

export async function copyPreviousQuarter() {
  const q = appState.currentQuarter;
  if (q === 1) return alert('Select Q2, Q3, or Q4 to copy from the previous quarter.');
  const prevQ = getQuarterLineupDoc(q - 1);
  await saveQuarterLineup(q, {
    lineup: { ...(prevQ.lineup || {}) },
    unavailablePlayers: [...(prevQ.unavailablePlayers || [])],
    swaps: []
  });
}
