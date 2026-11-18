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
  const clubLogoWrap = document.getElementById('exportClubLogoWrap');
  const clubLogoImg = document.getElementById('exportClubLogoImg');

  if (clubLogoWrap && clubLogoImg) {
    const logoUrl = appState.club?.logoDataUrl || '';
    if (logoUrl) {
      clubLogoImg.src = logoUrl;
      clubLogoWrap.classList.remove('hidden');
    } else {
      clubLogoWrap.classList.add('hidden');
    }
  }

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

        // Build visual pitch rows with html2canvas-calibrated optical center alignment
        // Note: html2canvas shifts baseline text down by ~3px inside boxes; using slightly larger bottom padding
        // than top padding centers text dead-center vertically in the rendered PNG.
        const miniPitchRowsHtml = [1, 2, 3, 4, 5]
          .filter(r => rows[r] && rows[r].length > 0)
          .map(r => {
            const pills = rows[r]
              .map(pos => {
                const pName = qData[pos.id] || '—';
                return `
                  <div style="flex: 1 1 0%; min-width: 66px;" class="rounded-lg border-2 border-white/80 shadow-md overflow-hidden bg-white text-slate-900 text-center">
                    <div style="padding-top: 2px; padding-bottom: 6px; line-height: 1.1;" class="text-[10px] font-extrabold uppercase tracking-wider ${pos.color} text-white text-center block w-full">
                      ${pos.label}
                    </div>
                    <div style="padding: 4px 4px 8px 4px; line-height: 1.15;" class="text-[11px] font-extrabold text-slate-900 text-center break-words bg-white w-full">
                      ${pName}
                    </div>
                  </div>
                `;
              })
              .join('');
            return `<div class="relative z-10 flex justify-center items-center gap-2 w-full">${pills}</div>`;
          })
          .join('');

        return `
        <div class="pitch-bg relative rounded-xl p-4 border-4 border-white/90 flex flex-col justify-between shadow-xl">
          <!-- Subtle Pitch Markings inside each Quarter Pitch -->
          <div class="absolute inset-x-0 top-1/2 border-t-2 border-white/30 pointer-events-none"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30 pointer-events-none"></div>

          <div class="relative z-10">
            <!-- Period Header Banner -->
            <div class="bg-slate-900/90 border border-white/40 rounded-lg px-3 py-1.5 flex justify-between items-center mb-3 shadow">
              <span style="padding-bottom: 3px; line-height: 1.1;" class="font-extrabold text-emerald-300 text-base">${periodTitle}</span>
              <span style="padding: 2px 10px 6px 10px; line-height: 1.1;" class="text-xs font-extrabold bg-emerald-600 text-white border border-white/40 rounded-md text-center">
                📐 ${qObj.tacticalShape}
              </span>
            </div>

            <!-- Spacious Green Tactical Pitch Slots -->
            <div class="py-1 mb-3 space-y-2.5">
              ${miniPitchRowsHtml}
            </div>
          </div>

          <!-- High-Contrast Period Footer Box: Bench, Swaps, Highlights & Resting -->
          <div class="relative z-10 bg-slate-900/95 border border-white/40 rounded-lg p-2.5 space-y-1.5 text-xs leading-relaxed shadow">
            ${
              events.length > 0
                ? `<div class="bg-emerald-900/60 border border-emerald-400/40 rounded px-2 py-1 text-emerald-100">
                    <strong class="text-emerald-300">Highlights & Cards:</strong> ${events
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
                ? `<div class="bg-amber-900/60 border border-amber-400/40 rounded px-2 py-1 text-amber-100">
                    <strong class="text-amber-300">🔄 Mid-Period Swaps:</strong> ${swaps
                      .map(s => s.text)
                      .join('  •  ')}
                  </div>`
                : ''
            }
            <div class="text-white">
              <strong class="text-emerald-300">🪑 Substitutes (${subs.length}):</strong> ${
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
        ? `Match Highlights: ${allMatchEvents
            .map(e => `${getEventIcon(e.type)} ${e.player || ''} (${e.periodShort})`)
            .join(' • ')}`
        : 'Generated with MatchDay Ready • Fair Play & Tactical Rotator';

    footerEl.innerHTML = `
      <div style="padding-bottom: 2px;"><strong>Manager / Coach:</strong> ${coachName} (${clubName})</div>
      <div style="padding-bottom: 2px;">${summaryEventsText}</div>
    `;
  }

  const card = document.getElementById('exportContainer');
  const prevStyle = card.getAttribute('style') || '';
  card.style.position = 'fixed';
  card.style.left = '0px';
  card.style.top = '0px';
  card.style.zIndex = '-50';
  card.style.opacity = '1';

  await new Promise(r => setTimeout(r, 60));

  const canvas = await html2canvas(card, {
    backgroundColor: '#15803d',
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
