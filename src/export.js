import html2canvas from 'html2canvas';
import {
  appState,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getQuarterLineupDoc
} from './db.js';
import { getActivePositions } from './pitch.js';

export async function exportTeamSheet() {
  const team = getSelectedTeam();
  const match = getCurrentMatchDoc();
  const dateStr = appState.selectedDate;
  const clubName = appState.club?.shortName || 'Straffan AFC';
  const oppText = match.opposition ? ` vs ${match.opposition}` : '';

  const titleEl = document.getElementById('exportTitleText');
  const dateEl = document.getElementById('exportDateText');
  const fmtEl = document.getElementById('exportFormationText');
  const grid = document.getElementById('exportGrid');

  if (titleEl) titleEl.innerText = `${clubName} • ${team.name}${oppText}`;
  if (dateEl) {
    dateEl.innerText = `Date: ${dateStr} | Format: ${match.formation || '7v7'} (${match.qtrMins}m/q)`;
  }
  if (fmtEl) fmtEl.innerText = `Formation: ${match.formation || '7v7'}`;

  const activePositions = getActivePositions();
  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));

  if (grid) {
    grid.innerHTML = [1, 2, 3, 4]
      .map(q => {
        const qObj = getQuarterLineupDoc(q);
        const qData = qObj.lineup || {};
        const unavailSet = new Set(qObj.unavailablePlayers || []);
        const assigned = new Set(Object.values(qData).filter(Boolean));
        const subs = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
        const unavailList = Array.from(unavailSet);
        const swaps = qObj.swaps || [];

        const gk = qData.GK || '-';
        const defs =
          activePositions
            .filter(p => p.group === 'DEF')
            .map(p => qData[p.id])
            .filter(Boolean)
            .join(', ') || '-';
        const mids =
          activePositions
            .filter(p => p.group === 'MID')
            .map(p => qData[p.id])
            .filter(Boolean)
            .join(', ') || '-';
        const att =
          activePositions
            .filter(p => p.group === 'ATT')
            .map(p => qData[p.id])
            .filter(Boolean)
            .join(', ') || '-';

        return `
        <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
          <div class="font-bold text-emerald-400 border-b border-slate-700 pb-1 mb-2">Quarter ${q}</div>
          <div class="text-xs space-y-1 mb-2">
            <div><span class="text-purple-400 font-bold w-10 inline-block">GK:</span> ${gk}</div>
            <div><span class="text-sky-400 font-bold w-10 inline-block">DEF:</span> ${defs}</div>
            <div><span class="text-amber-400 font-bold w-10 inline-block">MID:</span> ${mids}</div>
            <div><span class="text-rose-400 font-bold w-10 inline-block">ATT:</span> ${att}</div>
          </div>
          ${
            swaps.length > 0
              ? `<div class="text-[10px] text-amber-300 mb-1 border-t border-slate-700 pt-1"><strong>Swaps:</strong> ${swaps
                  .map(s => s.text)
                  .join('; ')}</div>`
              : ''
          }
          <div class="text-[11px] text-slate-400 border-t border-slate-700 pt-1 space-y-0.5">
            <div><strong>Subs:</strong> ${subs.join(', ') || 'None'}</div>
            ${
              unavailList.length > 0
                ? `<div class="text-rose-300"><strong>Resting This Week:</strong> ${unavailList.join(
                    ', '
                  )}</div>`
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  const card = document.getElementById('exportContainer');
  const canvas = await html2canvas(card, { backgroundColor: '#0f172a', scale: 2 });
  const link = document.createElement('a');
  const safeTeam = team.name.replace(/\s+/g, '');
  link.download = `TeamSheet-${safeTeam}-${dateStr}${match.opposition ? '-' + match.opposition : ''}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
