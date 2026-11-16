import html2canvas from 'html2canvas';
import {
  appState,
  getSelectedTeam,
  getTeamPlayers,
  getPlayerDisplayName,
  getCurrentMatchDoc,
  getQuarterLineupDoc,
  getMatchPeriods,
  getPeriodLongLabel,
  getPeriodUnitLabel
} from './db.js';
import { getActivePositions } from './pitch.js';

export async function exportTeamSheet() {
  const team = getSelectedTeam();
  const match = getCurrentMatchDoc();
  const periods = getMatchPeriods(match);
  const periodCount = periods.length;
  const unitLabel = getPeriodUnitLabel(periodCount);
  const dateStr = appState.selectedDate;
  const clubName = appState.club?.shortName || 'Straffan AFC';
  const oppText = match.opposition ? ` vs ${match.opposition}` : '';

  const titleEl = document.getElementById('exportTitleText');
  const dateEl = document.getElementById('exportDateText');
  const fmtEl = document.getElementById('exportFormationText');
  const grid = document.getElementById('exportGrid');

  if (titleEl) titleEl.innerText = `${clubName} • ${team.name}${oppText}`;
  if (dateEl) {
    dateEl.innerText = `Date: ${dateStr} | Format: ${match.formation || '7v7'} (${match.qtrMins}${unitLabel})`;
  }

  const qShapes = periods.map(q => getQuarterLineupDoc(q).tacticalShape);
  const uniqueShapes = Array.from(new Set(qShapes));
  if (fmtEl) {
    fmtEl.innerText = `${match.formation || '7v7'} • ${uniqueShapes.join(' / ')}`;
  }

  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));

  if (grid) {
    grid.innerHTML = periods
      .map(q => {
        const qObj = getQuarterLineupDoc(q);
        const periodTitle = getPeriodLongLabel(q, periodCount);
        const qData = qObj.lineup || {};
        const unavailSet = new Set(qObj.unavailablePlayers || []);
        const assigned = new Set(Object.values(qData).filter(Boolean));
        const subs = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
        const unavailList = Array.from(unavailSet);
        const swaps = qObj.swaps || [];
        const events = qObj.events || [];

        // Get this specific quarter's active positions & rows
        const activePositions = getActivePositions(q);
        const rows = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        activePositions.forEach(pos => {
          if (!rows[pos.row]) rows[pos.row] = [];
          rows[pos.row].push(pos);
        });

        // Build mini tactical pitch graphic for this quarter's exact formation shape
        const miniPitchRowsHtml = [1, 2, 3, 4, 5]
          .filter(r => rows[r] && rows[r].length > 0)
          .map(r => {
            const pills = rows[r]
              .map(pos => {
                const pName = qData[pos.id] || '-';
                return `
                  <div class="flex-1 min-w-0 bg-slate-900/90 border border-white/25 rounded px-1 py-0.5 text-center">
                    <div class="text-[8px] font-bold ${pos.color} text-white rounded-sm px-1 leading-tight">${pos.label}</div>
                    <div class="text-[10px] font-semibold text-white truncate mt-0.5">${pName}</div>
                  </div>
                `;
              })
              .join('');
            return `<div class="flex justify-around items-center gap-1 w-full">${pills}</div>`;
          })
          .join('');

        return `
        <div class="bg-slate-800 rounded-lg p-3 border border-slate-700 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-center border-b border-slate-700 pb-1.5 mb-2">
              <span class="font-bold text-emerald-400 text-sm">${periodTitle}</span>
              <span class="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                📐 ${qObj.tacticalShape}
              </span>
            </div>

            <!-- Dynamic Mini Pitch reflecting Quarter Formation -->
            <div class="pitch-bg relative rounded-lg border-2 border-white/60 p-2 mb-2.5 space-y-1.5">
              ${miniPitchRowsHtml}
            </div>
          </div>

          <div>
            ${
              events.length > 0
                ? `<div class="text-[10px] text-emerald-300 mb-1.5 border-t border-slate-700 pt-1"><strong>⚽ Highlights:</strong> ${events
                    .map(ev => {
                      const icon =
                        ev.type === 'GOAL'
                          ? '⚽'
                          : ev.type === 'SAVE'
                          ? '🧤'
                          : ev.type === 'STAR'
                          ? '🌟'
                          : '📝';
                      const ast = ev.assist ? ` (👟 ${ev.assist})` : '';
                      const nt = ev.note ? ` [${ev.note}]` : '';
                      return `${icon} ${ev.player || ''}${ast}${nt}`;
                    })
                    .join(' • ')}</div>`
                : ''
            }
            ${
              swaps.length > 0
                ? `<div class="text-[10px] text-amber-300 mb-1.5 border-t border-slate-700 pt-1"><strong>🔄 Swaps:</strong> ${swaps
                    .map(s => s.text)
                    .join('; ')}</div>`
                : ''
            }
            <div class="text-[11px] text-slate-300 border-t border-slate-700 pt-1.5 space-y-0.5">
              <div><strong class="text-slate-400">Subs (${subs.length}):</strong> ${subs.join(', ') || 'None'}</div>
              ${
                unavailList.length > 0
                  ? `<div class="text-rose-300"><strong>Resting:</strong> ${unavailList.join(
                      ', '
                    )}</div>`
                  : ''
              }
            </div>
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
