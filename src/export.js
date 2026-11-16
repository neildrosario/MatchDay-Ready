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
  getPeriodShortLabel,
  getPeriodUnitLabel
} from './db.js';
import { getActivePositions } from './pitch.js';

function getEventIcon(type) {
  if (type === 'GOAL') return '⚽';
  if (type === 'SAVE') return '🧤';
  if (type === 'STAR') return '🌟';
  if (type === 'YELLOW') return '🟨';
  if (type === 'RED') return '🟥';
  return '📝';
}

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
  const footerEl = document.getElementById('exportMatchFooter');

  if (titleEl) titleEl.innerText = `${clubName} • ${team.name}${oppText}`;
  if (dateEl) {
    const totalMins = (parseFloat(match.qtrMins) || 12) * periodCount;
    dateEl.innerText = `📅 Date: ${dateStr}   •   ⏱️ Duration: ${periodCount} × ${match.qtrMins}${unitLabel} (${totalMins} mins total)`;
  }

  const qShapes = periods.map(q => getQuarterLineupDoc(q).tacticalShape);
  const uniqueShapes = Array.from(new Set(qShapes));
  if (fmtEl) {
    fmtEl.innerText = `${match.formation || '7v7'} (${uniqueShapes.join(' / ')})`;
  }

  const playerNames = getTeamPlayers(team.teamId).map(p => getPlayerDisplayName(p));
  const allMatchEvents = [];

  if (grid) {
    grid.innerHTML = periods
      .map(q => {
        const qObj = getQuarterLineupDoc(q);
        const periodTitle = getPeriodLongLabel(q, periodCount);
        const periodShort = getPeriodShortLabel(q, periodCount);
        const qData = qObj.lineup || {};
        const unavailSet = new Set(qObj.unavailablePlayers || []);
        const assigned = new Set(Object.values(qData).filter(Boolean));
        const subs = playerNames.filter(p => !assigned.has(p) && !unavailSet.has(p));
        const unavailList = Array.from(unavailSet);
        const swaps = qObj.swaps || [];
        const events = qObj.events || [];

        events.forEach(ev => {
          allMatchEvents.push({ ...ev, periodShort });
        });

        const activePositions = getActivePositions(q);
        const rows = { 1: [], 2: [], 3: [], 4: [], 5: [] };
        activePositions.forEach(pos => {
          if (!rows[pos.row]) rows[pos.row] = [];
          rows[pos.row].push(pos);
        });

        // Build spacious, non-truncating mini tactical pitch rows
        const miniPitchRowsHtml = [1, 2, 3, 4, 5]
          .filter(r => rows[r] && rows[r].length > 0)
          .map(r => {
            const pills = rows[r]
              .map(pos => {
                const pName = qData[pos.id] || '—';
                return `
                  <div style="flex: 1 1 0%; min-width: 64px;" class="bg-slate-950/90 border border-white/30 rounded-md px-1.5 py-1.5 text-center shadow-sm">
                    <div class="text-[9px] font-extrabold ${pos.color} text-white rounded px-1.5 py-0.5 inline-block leading-normal mb-0.5">${pos.label}</div>
                    <div class="text-[11px] font-bold text-white leading-snug break-words">${pName}</div>
                  </div>
                `;
              })
              .join('');
            return `<div class="flex justify-center items-stretch gap-1.5 w-full">${pills}</div>`;
          })
          .join('');

        // Also build crisp positional group summary lines (GK, DEF, MID, ATT)
        const formatGroupLine = groupName => {
          const slots = activePositions.filter(p => p.group === groupName);
          if (slots.length === 0) return null;
          return slots
            .map(p => `${p.label}: <strong class="text-white">${qData[p.id] || '—'}</strong>`)
            .join('  •  ');
        };

        const gkLine = formatGroupLine('GK');
        const defLine = formatGroupLine('DEF');
        const midLine = formatGroupLine('MID');
        const attLine = formatGroupLine('ATT');

        return `
        <div class="bg-slate-900 rounded-xl p-4 border border-slate-700 flex flex-col justify-between shadow-lg">
          <div>
            <!-- Period Header -->
            <div class="flex justify-between items-center border-b border-slate-700/80 pb-2 mb-3">
              <span class="font-extrabold text-emerald-400 text-base leading-normal">${periodTitle}</span>
              <span class="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-md leading-normal">
                📐 ${qObj.tacticalShape}
              </span>
            </div>

            <!-- Spacious Visual Tactical Pitch -->
            <div class="pitch-bg relative rounded-lg border-2 border-white/60 p-3 mb-3 space-y-2">
              ${miniPitchRowsHtml}
            </div>

            <!-- Clean Positional List Breakdown (Zero Clipping) -->
            <div class="bg-slate-950/70 rounded-lg p-2.5 border border-slate-800 text-xs space-y-1.5 mb-3 leading-relaxed">
              ${attLine ? `<div><span class="text-rose-400 font-extrabold w-10 inline-block">ATT:</span> <span class="text-slate-300">${attLine}</span></div>` : ''}
              ${midLine ? `<div><span class="text-amber-400 font-extrabold w-10 inline-block">MID:</span> <span class="text-slate-300">${midLine}</span></div>` : ''}
              ${defLine ? `<div><span class="text-sky-400 font-extrabold w-10 inline-block">DEF:</span> <span class="text-slate-300">${defLine}</span></div>` : ''}
              ${gkLine ? `<div><span class="text-purple-400 font-extrabold w-10 inline-block">GK:</span> <span class="text-slate-300">${gkLine}</span></div>` : ''}
            </div>
          </div>

          <!-- Period Footer: Events, Swaps, Bench & Resting -->
          <div class="space-y-1.5 text-xs leading-relaxed border-t border-slate-800 pt-2.5">
            ${
              events.length > 0
                ? `<div class="bg-emerald-950/40 border border-emerald-500/30 rounded px-2 py-1 text-emerald-200">
                    <strong class="text-emerald-400">Highlights & Cards:</strong> ${events
                      .map(ev => {
                        const icon = getEventIcon(ev.type);
                        const min = ev.minute ? ` (${ev.minute})` : '';
                        const ast = ev.assist ? ` [👟 ${ev.assist}]` : '';
                        const nt = ev.note ? ` — ${ev.note}` : '';
                        return `${icon} <strong>${ev.player || ev.type}</strong>${min}${ast}${nt}`;
                      })
                      .join('  •  ')}
                  </div>`
                : ''
            }
            ${
              swaps.length > 0
                ? `<div class="bg-amber-950/40 border border-amber-500/30 rounded px-2 py-1 text-amber-200">
                    <strong class="text-amber-400">🔄 Mid-Period Swaps:</strong> ${swaps
                      .map(s => s.text)
                      .join('  •  ')}
                  </div>`
                : ''
            }
            <div class="text-slate-300">
              <strong class="text-slate-400">🪑 Substitutes (${subs.length}):</strong> ${
                subs.length > 0 ? subs.join(', ') : 'None'
              }
            </div>
            ${
              unavailList.length > 0
                ? `<div class="text-rose-300">
                    <strong>🚫 Resting / Off (${unavailList.length}):</strong> ${unavailList.join(', ')}
                  </div>`
                : ''
            }
          </div>
        </div>
      `;
      })
      .join('');
  }

  if (footerEl) {
    const coachName =
      appState.userProfile?.displayName ||
      appState.currentUser?.displayName ||
      "Neil D'Rosario";
    const summaryEventsText =
      allMatchEvents.length > 0
        ? `Match Events: ${allMatchEvents
            .map(e => `${getEventIcon(e.type)} ${e.player || ''} (${e.periodShort})`)
            .join(' • ')}`
        : 'Generated with MatchDay Ready • Fair Play & Tactical Rotator';

    footerEl.innerHTML = `
      <div><strong>Manager / Coach:</strong> ${coachName} (${clubName})</div>
      <div>${summaryEventsText}</div>
    `;
  }

  const card = document.getElementById('exportContainer');
  // Position cleanly in layout for accurate font & box measurement during capture
  const prevStyle = card.getAttribute('style') || '';
  card.style.position = 'fixed';
  card.style.left = '0px';
  card.style.top = '0px';
  card.style.zIndex = '-50';
  card.style.opacity = '1';

  await new Promise(r => setTimeout(r, 60));

  const canvas = await html2canvas(card, {
    backgroundColor: '#020617',
    scale: 2,
    width: card.offsetWidth,
    height: card.offsetHeight,
    windowWidth: Math.max(1024, card.offsetWidth + 100),
    scrollX: 0,
    scrollY: 0
  });

  card.setAttribute('style', prevStyle);

  const link = document.createElement('a');
  const safeTeam = team.name.replace(/\s+/g, '');
  link.download = `TeamSheet-${safeTeam}-${dateStr}${match.opposition ? '-' + match.opposition : ''}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
