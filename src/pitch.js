import {
  FORMAT_SIZES,
  getDefaultShapeForFormat,
  getAvailableShapesForFormat,
  getPositionsForFormatAndShape,
  getMatchPeriods,
  getPeriodShortLabel,
  getPeriodLongLabel,
  getPeriodUnitLabel,
  appState,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getQuarterLineupDoc,
  getHistoricalSeasonFairnessSeed,
  getSharedPlayerConflicts,
  selectTeam,
  selectDate,
  saveMatchMetadata,
  saveQuarterLineup
} from './db.js';
import {
  remapLineupToNewPositions,
  generateFairPeriodLineups
} from './engine.js';
import { canEditTeam } from './permissions.js';

function canEditCurrentTeam() {
  if (appState.mode === 'local' && !appState.userProfile) return true;
  return canEditTeam(appState.userProfile, getSelectedTeam(), appState.allClubTeams);
}

const ROLE_BADGE_TEXT = {
  GK: '🧤GK',
  DEF: '🛡️DEF',
  MID: '⚙️MID',
  ATT: '⚡ATT'
};

export function getActivePositions(quarter = appState.currentQuarter) {
  const match = getCurrentMatchDoc();
  const qDoc = getQuarterLineupDoc(quarter);
  return getPositionsForFormatAndShape(match.formation || '7v7', qDoc.tacticalShape);
}

export function getTeamSize() {
  const match = getCurrentMatchDoc();
  return FORMAT_SIZES[match.formation || '7v7'] || 7;
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
    clubBadge.innerText = appState.club.shortName || appState.club.name || 'Club';
  }

  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const periodCount = periods.length;

  // Clamp currentQuarter if switching from 4 Quarters -> 2 Halves
  if (appState.currentQuarter > periodCount) {
    appState.currentQuarter = 1;
  }

  const qDoc = getQuarterLineupDoc(appState.currentQuarter);

  const qtrInput = document.getElementById('qtrMins');
  if (qtrInput && document.activeElement !== qtrInput) {
    qtrInput.value = match.qtrMins ?? 12;
  }

  const unitEl = document.getElementById('periodUnitLabel');
  if (unitEl) {
    unitEl.innerText = getPeriodUnitLabel(periodCount);
  }

  const periodSelect = document.getElementById('periodCountSelect');
  if (periodSelect) {
    periodSelect.value = String(periodCount);
  }

  const fmtSelect = document.getElementById('formationSelect');
  if (fmtSelect) {
    fmtSelect.value = match.formation || '7v7';
  }

  const curShort = getPeriodShortLabel(appState.currentQuarter, periodCount);
  const firstShort = getPeriodShortLabel(1, periodCount);
  const lastShort = getPeriodShortLabel(periodCount, periodCount);

  // Tactical Shape selector for the active period
  const shapeSelect = document.getElementById('tacticalShapeSelect');
  const shapeQuarterLabel = document.getElementById('tacticalShapeQuarterLabel');
  const applyBtn = document.getElementById('applyShapeAllBtn');
  if (shapeQuarterLabel) {
    shapeQuarterLabel.innerText = `${curShort} Formation:`;
  }
  if (applyBtn) {
    applyBtn.innerText = `Apply ${firstShort}–${lastShort}`;
  }
  if (shapeSelect) {
    const shapes = getAvailableShapesForFormat(match.formation || '7v7');
    shapeSelect.innerHTML = shapes
      .map(sh => {
        const selected = sh === qDoc.tacticalShape ? 'selected' : '';
        return `<option value="${sh}" ${selected}>📐 ${sh}</option>`;
      })
      .join('');
  }

  // Render dynamic Period Tabs (2 Halves H1-H2, 3 Thirds T1-T3, or 4 Quarters Q1-Q4)
  const tabsGrid = document.getElementById('periodTabsGrid');
  if (tabsGrid) {
    const colsClass =
      periodCount === 2 ? 'grid-cols-2' : periodCount === 3 ? 'grid-cols-3' : 'grid-cols-4';
    tabsGrid.className = `grid ${colsClass} gap-1.5 mb-1.5`;
    tabsGrid.innerHTML = periods
      .map(pNum => {
        const pLineup = getQuarterLineupDoc(pNum);
        const isCurrent = pNum === appState.currentQuarter;
        const label = getPeriodShortLabel(pNum, periodCount);
        const btnClass = isCurrent
          ? 'q-btn py-1 px-1 rounded font-bold bg-emerald-600 text-white text-[11px] shadow flex flex-col items-center leading-tight'
          : 'q-btn py-1 px-1 rounded font-bold bg-slate-800 text-slate-300 text-[11px] flex flex-col items-center leading-tight';
        return `<button onclick="setQuarter(${pNum})" id="qbtn-${pNum}" data-active="${
          isCurrent ? 'true' : 'false'
        }" class="${btnClass}">
          <span>${label}</span>
          <span class="text-[8.5px] font-normal leading-tight ${
            isCurrent ? 'text-emerald-100' : 'text-slate-400'
          }">${pLineup.tacticalShape}</span>
        </button>`;
      })
      .join('');
  }

  const dateInput = document.getElementById('matchDate');
  if (dateInput && dateInput.value !== appState.selectedDate) {
    dateInput.value = appState.selectedDate;
  }

  const oppInput = document.getElementById('oppositionInput');
  if (oppInput && document.activeElement !== oppInput) {
    oppInput.value = match.opposition || '';
  }

  const summaryTextEl = document.getElementById('matchDetailsSummaryText');
  if (summaryTextEl) {
    const dateLabel = appState.selectedDate || 'Match Date';
    const oppClean = (match.opposition || '').trim();
    summaryTextEl.innerText = oppClean ? `${dateLabel} · vs ${oppClean}` : `${dateLabel} · Match Details`;
  }

  // Enforce Read-Only Viewer controls on Match Header & Pitch Toolbars (Milestone 13)
  const editable = canEditCurrentTeam();
  [
    'periodCountSelect',
    'qtrMins',
    'formationSelect',
    'oppositionInput',
    'tacticalShapeSelect',
    'applyShapeAllBtn'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.disabled = !editable;
      el.classList.toggle('opacity-60', !editable);
      el.classList.toggle('cursor-not-allowed', !editable);
    }
  });

  ['pitchActionToolbar', 'copyPrevQtrBtn', 'resetSwapsBtn', 'addEventInlineBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', !editable);
  });

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
    html += `<option value="${m.date}" ${selected}>📅 ${m.date}${opp} (${m.formation || '7v7'})</option>`;
  });
  select.innerHTML = html;
}

export function setQuarter(q) {
  appState.currentQuarter = q;
  renderPitch();
  if (typeof window.renderMatchTimer === 'function') {
    window.renderMatchTimer();
  }
}

export async function onTeamSelectChange(teamId) {
  await selectTeam(teamId);
}

export function onDateInputChange(dateStr) {
  selectDate(dateStr);
}

export async function onConfigQtrMinsChange(val) {
  if (!canEditCurrentTeam()) return;
  const qtrMins = parseFloat(val) || 12;
  await saveMatchMetadata({ qtrMins });
}

export async function onPeriodCountChange(val) {
  if (!canEditCurrentTeam()) return;
  const periodCount = Number(val) || 4;
  if (appState.currentQuarter > periodCount) {
    appState.currentQuarter = 1;
  }
  // If switching to 2 Halves and qtrMins is still 12, keep coach's value or let them adjust
  await saveMatchMetadata({ periodCount });
}

export async function onFormationChange(formation) {
  if (!canEditCurrentTeam()) return;
  const defaultShape = getDefaultShapeForFormat(formation);
  await saveMatchMetadata({ formation, tacticalShape: defaultShape });

  // Remap existing lineups in all periods to the new format's default shape
  const newPositions = getPositionsForFormatAndShape(formation, defaultShape);
  for (const q of [1, 2, 3, 4]) {
    const qDoc = getQuarterLineupDoc(q);
    const hasPlayers = Object.keys(qDoc.lineup || {}).length > 0;
    if (hasPlayers || qDoc.tacticalShape) {
      const remapped = remapLineupToNewPositions(qDoc.lineup || {}, newPositions);
      await saveQuarterLineup(q, {
        tacticalShape: defaultShape,
        lineup: remapped
      });
    }
  }
}

export async function onTacticalShapeChange(newShape) {
  if (!canEditCurrentTeam()) return;
  const match = getCurrentMatchDoc();
  const q = appState.currentQuarter;
  const qDoc = getQuarterLineupDoc(q);
  const newPositions = getPositionsForFormatAndShape(match.formation || '7v7', newShape);
  const remappedLineup = remapLineupToNewPositions(qDoc.lineup || {}, newPositions);

  await saveQuarterLineup(q, {
    tacticalShape: newShape,
    lineup: remappedLineup
  });
}

export async function applyShapeToAllQuarters() {
  if (!canEditCurrentTeam()) return;
  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const currentQDoc = getQuarterLineupDoc(appState.currentQuarter);
  const targetShape = currentQDoc.tacticalShape;
  const newPositions = getPositionsForFormatAndShape(match.formation || '7v7', targetShape);

  await saveMatchMetadata({ tacticalShape: targetShape });
  for (const q of periods) {
    const qDoc = getQuarterLineupDoc(q);
    const remapped = remapLineupToNewPositions(qDoc.lineup || {}, newPositions);
    await saveQuarterLineup(q, {
      tacticalShape: targetShape,
      lineup: remapped
    });
  }
  const firstShort = getPeriodShortLabel(1, periods.length);
  const lastShort = getPeriodShortLabel(periods.length, periods.length);
  alert(`✅ Applied formation ${targetShape} across ${firstShort}–${lastShort}!`);
}

export async function onOppositionInputChange(opposition) {
  if (!canEditCurrentTeam()) return;
  await saveMatchMetadata({ opposition: opposition.trim() });
}

export async function assignPlayer(posId, playerName) {
  if (!canEditCurrentTeam()) return;
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
  if (!canEditCurrentTeam()) return;
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

  const match = getCurrentMatchDoc();
  const periodCount = getMatchPeriods(match).length;
  const team = getSelectedTeam();
  const teamPlayers = getTeamPlayers(team.teamId);
  const playerNames = teamPlayers.map(p => getPlayerDisplayName(p));
  const sharedSet = new Set(
    teamPlayers.filter(p => p.primaryTeamId !== team.teamId).map(p => getPlayerDisplayName(p))
  );
  const preferredMap = {};
  teamPlayers.forEach(p => {
    preferredMap[getPlayerDisplayName(p)] = p.preferredGroup || 'ANY';
  });

  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = qObj.lineup || {};
  const unavailSet = new Set(qObj.unavailablePlayers || []);
  const assigned = new Set(Object.values(qData).filter(Boolean));
  const activePositions = getActivePositions(q);

  // Adjust pitch container height dynamically for 9v9 / 11v11 or 5-row shapes
  const pitchContainer = document.getElementById('pitchContainer');
  if (pitchContainer) {
    const isLargePitch = match.formation === '9v9' || match.formation === '11v11';
    pitchContainer.className = `pitch-bg relative rounded-xl border-4 border-white/80 p-3 shadow-xl flex flex-col justify-between mb-3 ${
      isLargePitch ? 'h-[490px]' : 'h-[440px]'
    }`;
  }

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
            `<div>⚠️ <strong>${c.playerName}</strong> is also assigned to <strong>${
              c.otherTeamName
            }</strong> (${c.otherPosId}) in ${getPeriodShortLabel(c.quarter, periodCount)}.</div>`
        )
        .join('');
    } else {
      conflictBanner.classList.add('hidden');
      conflictList.innerHTML = '';
    }
  }

  // 2. Render Pitch Slots (supports up to 5 tactical lines, e.g., GK-4-2-3-1)
  const slotsContainer = document.getElementById('pitchSlots');
  if (slotsContainer) {
    const rows = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    activePositions.forEach(pos => {
      if (!rows[pos.row]) rows[pos.row] = [];
      rows[pos.row].push(pos);
    });

    let html = '';
    [1, 2, 3, 4, 5].forEach(rowNum => {
      const rowPos = rows[rowNum];
      if (!rowPos || rowPos.length === 0) return;

      const isDenseRow = rowPos.length >= 4;
      html += `<div class="flex justify-around items-center ${
        isDenseRow ? 'px-0.5 gap-1' : 'px-2 gap-2'
      } w-full">`;

      rowPos.forEach(pos => {
        const currentVal = qData[pos.id] || '';
        const options = [`<option value="">-- ${pos.label} --</option>`];

        playerNames.forEach(pName => {
          if (unavailSet.has(pName)) return;
          const isTakenElsewhere = assigned.has(pName) && currentVal !== pName;
          const pref = preferredMap[pName];
          const roleTag = pref && ROLE_BADGE_TEXT[pref] ? ` [${ROLE_BADGE_TEXT[pref]}]` : '';
          const sharedTag = sharedSet.has(pName) ? ' 🔗' : '';
          const label = isTakenElsewhere
            ? `${pName}${roleTag}${sharedTag} (On Pitch)`
            : `${pName}${roleTag}${sharedTag}`;
          const selected = currentVal === pName ? 'selected' : '';
          options.push(`<option value="${pName.replace(/"/g, '&quot;')}" ${selected}>${label}</option>`);
        });

        const editable = canEditCurrentTeam();
        html += `
          <div class="pitch-node flex-1 min-w-0 text-center" data-role="${pos.group}">
            <span class="pitch-node-badge text-[9px] font-bold px-1 py-0.5 rounded-t ${pos.color} text-white block truncate" data-role="${pos.group}">${pos.label}</span>
            <select data-pos-id="${pos.id}" ${editable ? '' : 'disabled'}
              class="pitch-slot-select w-full bg-slate-900/95 text-white font-semibold ${
                isDenseRow ? 'text-[10px] py-1' : 'text-xs py-1.5'
              } px-0.5 rounded-b border border-white/30 shadow truncate ${editable ? '' : 'opacity-80 cursor-not-allowed'}">
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

  // 3. Render Substitutes Bench (with Specialist Role Badges)
  const subs = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
  const benchEl = document.getElementById('subsBench');
  const subBadge = document.getElementById('subCountBadge');
  if (subBadge) subBadge.innerText = `${subs.length} available`;
  if (benchEl) {
    benchEl.innerHTML = subs.length
      ? subs
          .map(s => {
            const isShared = sharedSet.has(s);
            const pref = preferredMap[s];
            const roleTag =
              pref && ROLE_BADGE_TEXT[pref]
                ? `<span class="role-pill text-[9px] bg-slate-900/80 text-emerald-300 px-1 rounded" data-role="${pref}">${ROLE_BADGE_TEXT[pref]}</span>`
                : '';
            return `<span class="bg-slate-700 text-slate-200 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">${s}${roleTag}${
              isShared ? '<span class="text-[10px] text-sky-300" title="Shared Age-Group Player">🔗</span>' : ''
            }</span>`;
          })
          .join('')
      : `<span class="text-xs text-slate-500 italic">No subs on bench</span>`;
  }

  // 4. Render Unavailable / Resting Checkboxes
  const unavailContainer = document.getElementById('unavailableCheckboxes');
  const unavailBadge = document.getElementById('unavailableCountBadge');
  const editable = canEditCurrentTeam();
  if (unavailBadge) unavailBadge.innerText = `${unavailSet.size} off`;
  if (unavailContainer) {
    unavailContainer.innerHTML = playerNames
      .map(p => {
        const isChecked = unavailSet.has(p) ? 'checked' : '';
        return `
          <label class="flex items-center gap-2 text-xs bg-slate-900/60 p-1.5 rounded border border-slate-700 ${editable ? 'cursor-pointer' : 'opacity-70 cursor-not-allowed'}">
            <input type="checkbox" data-unavail-player="${p.replace(/"/g, '&quot;')}" ${isChecked} ${editable ? '' : 'disabled'} class="unavail-checkbox rounded bg-slate-800 border-slate-600 text-emerald-600 focus:ring-0">
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

  // 5. Render Mid-Period Swaps Log
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

  // 6. Render Match Events & Highlights Log across all periods (Milestone 12)
  const eventsContainer = document.getElementById('matchEventsContainer');
  const eventsList = document.getElementById('matchEventsList');
  if (eventsContainer && eventsList) {
    const allMatchEvents = [];
    const periods = getMatchPeriods(match);
    periods.forEach(pNum => {
      const pDoc = getQuarterLineupDoc(pNum);
      (pDoc.events || []).forEach(ev => {
        allMatchEvents.push({ ...ev, periodNum: pNum });
      });
    });

    if (allMatchEvents.length > 0) {
      eventsContainer.classList.remove('hidden');
      eventsList.innerHTML = allMatchEvents
        .map(ev => {
          const icon =
            ev.type === 'GOAL'
              ? '⚽'
              : ev.type === 'SAVE'
              ? '🧤'
              : ev.type === 'STAR'
              ? '🌟'
              : ev.type === 'YELLOW'
              ? '🟨'
              : ev.type === 'RED'
              ? '🟥'
              : '📝';
          const pLabel = getPeriodShortLabel(ev.periodNum, periodCount);
          const minText = ev.minute ? ` ${ev.minute}` : '';
          const assistText = ev.assist ? ` <span class="text-slate-400">(👟 Assist: ${ev.assist})</span>` : '';
          const noteText = ev.note ? ` <span class="text-slate-400">— ${ev.note}</span>` : '';
          const typeLabel =
            ev.type === 'GOAL'
              ? 'Goal'
              : ev.type === 'SAVE'
              ? 'Great Save'
              : ev.type === 'STAR'
              ? 'Effort Star'
              : ev.type === 'YELLOW'
              ? 'Yellow Card'
              : ev.type === 'RED'
              ? 'Red Card'
              : 'Note';

          return `
            <div class="flex items-center justify-between gap-2 bg-slate-900/60 px-2 py-1 rounded border border-slate-700/70">
              <div class="truncate">
                <span class="font-bold text-emerald-400">${pLabel}${minText}:</span>
                <span>${icon} <strong>${ev.player || typeLabel}</strong> (${typeLabel})${assistText}${noteText}</span>
              </div>
              ${
                editable
                  ? `<button data-del-ev-period="${ev.periodNum}" data-del-ev-id="${ev.id}" class="del-match-ev-btn text-rose-400 hover:text-rose-300 font-bold px-1">✕</button>`
                  : ''
              }
            </div>
          `;
        })
        .join('');

      eventsList.querySelectorAll('.del-match-ev-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          removeMatchEvent(
            Number(btn.getAttribute('data-del-ev-period')),
            btn.getAttribute('data-del-ev-id')
          );
        });
      });
    } else {
      eventsContainer.classList.add('hidden');
      eventsList.innerHTML = '';
    }
  }
}

export function openSwapModal() {
  if (!canEditCurrentTeam()) return;
  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = qObj.lineup || {};
  const unavailSet = new Set(qObj.unavailablePlayers || []);
  const activePositions = getActivePositions(q);
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
  if (!canEditCurrentTeam()) return;
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

  swaps.push({ time: 'Mid-Period', text: swapDescription });
  await saveQuarterLineup(q, { lineup: qData, swaps });
  closeSwapModal();
}

export async function clearSwaps() {
  if (!canEditCurrentTeam()) return;
  const q = appState.currentQuarter;
  await saveQuarterLineup(q, { swaps: [] });
}

// --- MILESTONE 12: LIVE SIDELINE MATCH EVENTS (Goals, Assists, Saves, Effort Stars) ---
export function openEventModal() {
  if (!canEditCurrentTeam()) return;
  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const qData = qObj.lineup || {};
  const unavailSet = new Set(qObj.unavailablePlayers || []);
  const team = getSelectedTeam();
  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));

  const assigned = new Set(Object.values(qData).filter(Boolean));
  const onPitch = playerNames.filter(p => assigned.has(p));
  const onBench = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));

  const buildPlayerOptions = (placeholder = 'Select player...') => {
    let html = `<option value="">${placeholder}</option>`;
    if (onPitch.length > 0) {
      html += `<optgroup label="Currently on Pitch">`;
      onPitch.forEach(p => {
        html += `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`;
      });
      html += `</optgroup>`;
    }
    if (onBench.length > 0) {
      html += `<optgroup label="Substitutes Bench">`;
      onBench.forEach(p => {
        html += `<option value="${p.replace(/"/g, '&quot;')}">${p}</option>`;
      });
      html += `</optgroup>`;
    }
    return html;
  };

  const playerSel = document.getElementById('eventPlayerSelect');
  const assistSel = document.getElementById('eventAssistSelect');
  const noteInput = document.getElementById('eventNoteInput');
  const typeSel = document.getElementById('eventTypeSelect');

  if (playerSel) playerSel.innerHTML = buildPlayerOptions('Select player...');
  if (assistSel) assistSel.innerHTML = buildPlayerOptions('None / Unassisted');
  if (noteInput) noteInput.value = '';
  if (typeSel) typeSel.value = 'GOAL';

  onEventTypeSelectChange('GOAL');
  document.getElementById('eventModal')?.classList.remove('hidden');
}

export function closeEventModal() {
  document.getElementById('eventModal')?.classList.add('hidden');
}

export function onEventTypeSelectChange(typeVal) {
  const assistWrap = document.getElementById('eventAssistWrapper');
  if (assistWrap) {
    assistWrap.classList.toggle('hidden', typeVal !== 'GOAL');
  }
}

export async function executeLogEvent() {
  if (!canEditCurrentTeam()) return;
  const type = document.getElementById('eventTypeSelect')?.value || 'GOAL';
  const player = document.getElementById('eventPlayerSelect')?.value || '';
  const assist = type === 'GOAL' ? document.getElementById('eventAssistSelect')?.value || '' : '';
  const note = document.getElementById('eventNoteInput')?.value.trim() || '';

  if (type !== 'NOTE' && !player) {
    return alert('Please select a player for this highlight.');
  }
  if (type === 'NOTE' && !note && !player) {
    return alert('Please enter a note or select a player.');
  }

  const q = appState.currentQuarter;
  const qObj = getQuarterLineupDoc(q);
  const events = [...(qObj.events || [])];
  const minute =
    typeof window.getCurrentMatchMinuteString === 'function'
      ? window.getCurrentMatchMinuteString()
      : '';

  events.push({
    id: `ev_${Date.now()}`,
    type,
    player,
    assist: assist && assist !== player ? assist : '',
    note,
    minute
  });

  await saveQuarterLineup(q, { events });
  closeEventModal();
}

export async function removeMatchEvent(periodNum, eventId) {
  if (!canEditCurrentTeam()) return;
  const qObj = getQuarterLineupDoc(periodNum);
  const updated = (qObj.events || []).filter(e => e.id !== eventId);
  await saveQuarterLineup(periodNum, { events: updated });
}

export async function autoGenerateMatch() {
  if (!canEditCurrentTeam()) return;
  const team = getSelectedTeam();
  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const periodCount = periods.length;
  const teamSize = getTeamSize();
  const teamPlayers = getTeamPlayers(team.teamId);
  const playerNames = teamPlayers.map(p => getPlayerDisplayName(p));

  const preferredMap = {};
  teamPlayers.forEach(p => {
    preferredMap[getPlayerDisplayName(p)] = p.preferredGroup || 'ANY';
  });

  if (playerNames.length < teamSize) {
    alert(
      `You need at least ${teamSize} players in ${team.name} to auto-generate a ${match.formation} lineup (currently have ${playerNames.length}).`
    );
    return;
  }

  const useSeasonFairness =
    document.getElementById('seasonFairnessCheckbox')?.checked !== false;
  const seasonSeed = useSeasonFairness
    ? getHistoricalSeasonFairnessSeed(team.teamId, appState.selectedDate)
    : {};

  const periodWord =
    periodCount === 2 ? '2 Halves' : periodCount === 3 ? '3 Thirds' : '4 Quarters';
  const fairnessLabel = useSeasonFairness
    ? 'Balancing with Season-to-Date minutes & specialist roles'
    : 'Balancing within this match only';
  if (
    !confirm(
      `Automatically schedule fair playing time and position rotation across ${periodWord} for ${team.name} (${match.formation})?\n\n• Mode: ${fairnessLabel}`
    )
  ) {
    return;
  }

  const shapeByPeriod = {};
  const unavailableByPeriod = {};
  periods.forEach(q => {
    const qObj = getQuarterLineupDoc(q);
    shapeByPeriod[q] = qObj.tacticalShape;
    unavailableByPeriod[q] = qObj.unavailablePlayers || [];
  });

  const { lineupsByPeriod, skippedPeriods } = generateFairPeriodLineups({
    playerNames,
    preferredMap,
    periods,
    format: match.formation || '7v7',
    shapeByPeriod,
    defaultShape: match.tacticalShape,
    unavailableByPeriod,
    seasonSeed
  });

  for (const q of periods) {
    if (skippedPeriods.includes(q)) {
      alert(
        `Warning: ${getPeriodLongLabel(q, periodCount)} has fewer than ${teamSize} available players. Skipping auto-fill.`
      );
      continue;
    }
    const generated = lineupsByPeriod[q];
    if (!generated) continue;
    await saveQuarterLineup(q, {
      tacticalShape: generated.tacticalShape,
      lineup: generated.lineup,
      unavailablePlayers: unavailableByPeriod[q] || [],
      swaps: []
    });
  }

  alert(`✨ Auto-fair lineup generated across ${periodWord} for ${team.name}!`);
}

export async function copyPreviousQuarter() {
  if (!canEditCurrentTeam()) return;
  const q = appState.currentQuarter;
  if (q === 1) return alert('Select Period 2, 3, or 4 to copy from the previous period.');
  const prevQ = getQuarterLineupDoc(q - 1);
  await saveQuarterLineup(q, {
    tacticalShape: prevQ.tacticalShape,
    lineup: { ...(prevQ.lineup || {}) },
    unavailablePlayers: [...(prevQ.unavailablePlayers || [])],
    swaps: []
  });
}
