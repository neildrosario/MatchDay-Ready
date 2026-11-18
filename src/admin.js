import {
  appState,
  getSelectedTeam,
  getPlayerDisplayName,
  updateClubSettings,
  setClubJoinCode,
  generateClubJoinCode,
  normalizeJoinCode,
  createClubTeam,
  updateClubTeam,
  deleteClubTeam,
  inviteOrPreAuthorizeCoach,
  revokeClubInvite,
  updateCoachRole,
  toggleCoachTeamAssignment,
  toggleCoachAgeGroupAssignment,
  toggleCoachStatus,
  removeCoachProfile,
  approveJoinRequest,
  rejectJoinRequest,
  promoteAgeGroupForNewSeason
} from './db.js';
import {
  isClubAdmin,
  getClubAgeGroups,
  getRoleMeta
} from './permissions.js';

let activeAdminSection = 'people'; // 'overview' | 'people' | 'teams' | 'season'
let memberRoleFilter = 'all'; // 'all' | 'admin' | 'lead' | 'coach' | 'viewer' | 'suspended'
let memberSearchQuery = '';
let editingTeamId = null;

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function setAdminSubTab(tab) {
  activeAdminSection = tab;
  renderAdminDashboard();
}

export function setAdminMemberRoleFilter(filter) {
  memberRoleFilter = filter;
  renderAdminDashboard();
}

export function setAdminMemberSearch(q) {
  memberSearchQuery = (q || '').trim().toLowerCase();
  renderAdminDashboard();
  const input = document.getElementById('admMemberSearch');
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
}

export function renderAdminNavBadge() {
  const navBtn = document.getElementById('nav-admin');
  const openShortcut = document.getElementById('settingsOpenAdminBtn');
  const isAdmin = isClubAdmin(appState.userProfile);

  if (navBtn) {
    navBtn.classList.toggle('hidden', !isAdmin);
    if (isAdmin) {
      const pendingCount = (appState.allClubJoinRequests || []).filter(
        r => r.status === 'pending'
      ).length;
      const badge =
        pendingCount > 0
          ? `<span class="absolute top-1 right-2 bg-amber-400 text-slate-950 text-[9px] font-extrabold leading-none px-1.5 py-0.5 rounded-full shadow">${pendingCount}</span>`
          : '';
      navBtn.innerHTML = `<span class="text-base leading-none">🛡️</span><span>Admin</span>${badge}`;
    }
  }
  if (openShortcut) {
    openShortcut.classList.toggle('hidden', !isAdmin);
  }
  renderHeaderClubLogo();
}

export function renderHeaderClubLogo() {
  const btn = document.getElementById('headerClubLogoBtn');
  const img = document.getElementById('headerClubLogoImg');
  const placeholder = document.getElementById('headerClubLogoPlaceholder');
  if (!btn || !img || !placeholder) return;

  const logoUrl = appState.club?.logoDataUrl || '';
  const isAdmin = isClubAdmin(appState.userProfile);

  if (logoUrl) {
    btn.classList.remove('hidden');
    img.src = logoUrl;
    img.alt = `${appState.club?.shortName || 'Club'} Logo`;
    img.classList.remove('hidden');
    placeholder.classList.add('hidden');
    btn.title = isAdmin
      ? `${appState.club?.shortName || 'Club'} Logo (Tap to update in Admin)`
      : `${appState.club?.shortName || 'Club'} Logo`;
    btn.classList.toggle('cursor-pointer', isAdmin);
    btn.classList.toggle('cursor-default', !isAdmin);
  } else if (isAdmin) {
    btn.classList.remove('hidden');
    img.classList.add('hidden');
    placeholder.classList.remove('hidden');
    btn.title = 'Upload Club Logo';
    btn.classList.add('cursor-pointer');
    btn.classList.remove('cursor-default');
  } else {
    btn.classList.add('hidden');
  }
}

export function openClubLogoUpload() {
  if (!isClubAdmin(appState.userProfile)) return;
  activeAdminSection = 'overview';
  if (typeof window.switchView === 'function') {
    window.switchView('admin');
  } else {
    renderAdminDashboard();
  }
}

/**
 * Resizes an uploaded club crest/logo cleanly on a canvas (max 220x220px) so it syncs
 * instantaneously in Firestore, works offline, and renders cleanly in Share Sheet exports.
 */
function resizeClubLogoFile(file, maxSize = 220) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select an image file (PNG, JPG, WebP, or SVG).'));
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Unsupported or corrupted image file.'));
      img.onload = () => {
        const w = img.naturalWidth || img.width || maxSize;
        const h = img.naturalHeight || img.height || maxSize;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Preserve transparency with PNG if compact, otherwise compress smoothly
        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > 180000) {
          const webpUrl = canvas.toDataURL('image/webp', 0.85);
          dataUrl = webpUrl.startsWith('data:image/webp')
            ? webpUrl
            : canvas.toDataURL('image/jpeg', 0.85);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function renderAdminDashboard() {
  renderAdminNavBadge();

  const viewEl = document.getElementById('view-admin');
  if (!viewEl) return;

  const isAdmin = isClubAdmin(appState.userProfile);
  if (!isAdmin) {
    viewEl.innerHTML = `
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center text-xs text-slate-400">
        🛡️ Club Admin permissions are required to view this dashboard.
      </div>
    `;
    return;
  }

  const teams = appState.allClubTeams || [];
  const players = appState.players || [];
  const users = appState.allClubUsers || [];
  const pendingInvites = (appState.allClubInvites || []).filter(i => i.status === 'pending');
  const pendingRequests = (appState.allClubJoinRequests || []).filter(r => r.status === 'pending');
  const ageGroups = getClubAgeGroups(teams);

  // Update sub-tab button styles
  ['people', 'teams', 'overview', 'season'].forEach(tab => {
    const btn = document.getElementById(`admin-subtab-${tab}`);
    if (!btn) return;
    const active = activeAdminSection === tab;
    btn.className = active
      ? 'flex-1 py-1.5 px-2 text-center font-bold text-[11px] rounded bg-purple-600 text-white shadow whitespace-nowrap'
      : 'flex-1 py-1.5 px-2 text-center font-semibold text-[11px] rounded bg-slate-900 text-slate-400 hover:text-slate-200 whitespace-nowrap';
  });

  // Update pending counter on People sub-tab
  const peopleTabBtn = document.getElementById('admin-subtab-people');
  if (peopleTabBtn) {
    peopleTabBtn.innerHTML =
      pendingRequests.length > 0
        ? `👥 Staff <span class="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1 rounded-full">${pendingRequests.length}</span>`
        : '👥 Staff';
  }

  const body = document.getElementById('adminDashboardBody');
  if (!body) return;

  if (activeAdminSection === 'overview') {
    renderOverviewSection(body, { teams, players, users, pendingInvites, pendingRequests });
  } else if (activeAdminSection === 'teams') {
    renderTeamsSection(body, { teams, players, users, ageGroups });
  } else if (activeAdminSection === 'season') {
    renderSeasonSection(body, { teams, players, users, ageGroups });
  } else {
    renderPeopleSection(body, { teams, users, pendingInvites, pendingRequests, ageGroups });
  }
}

function renderOverviewSection(container, { teams, players, users, pendingInvites, pendingRequests }) {
  const club = appState.club || {};
  const activeStaff = users.filter(u => !u.isInvite && (!u.status || u.status === 'active')).length;
  const totalMatches = Object.keys(appState.allMatches || {}).length;
  const joinCode = club.joinCode || 'Not Set';
  const joinEnabled = club.joinCodeEnabled !== false;

  container.innerHTML = `
    <!-- KPI Grid -->
    <div class="grid grid-cols-4 gap-2">
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
        <div class="text-lg font-extrabold text-emerald-400">${teams.length}</div>
        <div class="text-[10px] text-slate-400 font-semibold">Teams</div>
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
        <div class="text-lg font-extrabold text-sky-400">${players.length}</div>
        <div class="text-[10px] text-slate-400 font-semibold">Players</div>
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
        <div class="text-lg font-extrabold text-purple-400">${activeStaff}</div>
        <div class="text-[10px] text-slate-400 font-semibold">Staff</div>
      </div>
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-center">
        <div class="text-lg font-extrabold text-amber-400">${totalMatches}</div>
        <div class="text-[10px] text-slate-400 font-semibold">Matches</div>
      </div>
    </div>

    ${
      pendingRequests.length > 0 || pendingInvites.length > 0
        ? `<div class="bg-amber-950/30 border border-amber-500/40 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
            <span class="text-amber-200">
              ⏳ <strong>${pendingRequests.length}</strong> join request(s) &amp; <strong>${pendingInvites.length}</strong> pending email invite(s)
            </span>
            <button onclick="setAdminSubTab('people')" class="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded">Review</button>
          </div>`
        : ''
    }

    <!-- Club Identity & Settings -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-3 text-xs">
      <h4 class="font-bold text-emerald-400">🏟️ Club Profile &amp; Branding</h4>

      <!-- Club Crest / Logo Upload -->
      <div class="bg-slate-900/70 border border-slate-700 rounded-lg p-2.5 space-y-2">
        <div class="flex items-center gap-3">
          <div class="w-14 h-14 rounded-full border-2 ${
            club.logoDataUrl ? 'border-emerald-400/80 bg-white/95' : 'border-dashed border-slate-600 bg-slate-800'
          } p-1 shrink-0 flex items-center justify-center overflow-hidden shadow">
            ${
              club.logoDataUrl
                ? `<img src="${escapeHtml(club.logoDataUrl)}" alt="Club Logo" class="w-full h-full object-contain rounded-full">`
                : `<span class="text-xl text-slate-500">🛡️</span>`
            }
          </div>
          <div class="flex-1 min-w-0 space-y-1">
            <div class="font-bold text-white text-xs">Club Crest / Logo</div>
            <p class="text-[10px] text-slate-400 leading-snug">Appears in the top-right corner of the app for all coaches and on exported Share Sheets.</p>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-center py-1.5 px-2.5 rounded font-bold text-[11px] cursor-pointer shadow">
            <span>📤 ${club.logoDataUrl ? 'Change Club Logo' : 'Upload Club Logo'}</span>
            <input id="adminClubLogoFileInput" type="file" accept="image/*" class="hidden">
          </label>
          ${
            club.logoDataUrl
              ? `<button id="adminRemoveClubLogoBtn" class="bg-slate-700 hover:bg-rose-600/80 text-slate-200 px-2.5 py-1.5 rounded font-semibold text-[11px]">Remove</button>`
              : ''
          }
        </div>
        <div id="adminClubLogoStatus" class="hidden text-[10px] text-emerald-300 font-semibold"></div>
      </div>

      <div class="space-y-2">
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Full Club Name:</label>
          <input id="adminClubFullNameInput" type="text" value="${escapeHtml(club.name || '')}" class="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-600 text-white text-xs">
        </div>
        <div>
          <label class="block text-[10px] text-slate-400 mb-1">Short Header / Team Sheet Name:</label>
          <input id="adminClubShortNameInput" type="text" value="${escapeHtml(club.shortName || '')}" class="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-600 text-white text-xs">
        </div>
        <button id="adminSaveClubProfileBtn" class="w-full bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded font-bold text-xs">
          💾 Save Club Profile
        </button>
      </div>
    </div>

    <!-- Club Join Code Governance -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2.5 text-xs">
      <div class="flex items-center justify-between gap-2">
        <div>
          <h4 class="font-bold text-emerald-400">🔑 Club Join Code &amp; Approval Queue</h4>
          <p class="text-[10px] text-slate-400">New coaches entering this code wait in your approval queue before accessing club data.</p>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded border ${
          joinEnabled
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            : 'bg-slate-700 text-slate-400 border-slate-600'
        }">${joinEnabled ? 'ACTIVE' : 'PAUSED'}</span>
      </div>

      <div class="flex gap-1.5">
        <input id="adminCustomJoinCodeInput" type="text" value="${escapeHtml(joinCode)}" class="flex-1 bg-slate-950 font-mono uppercase tracking-wider font-extrabold text-emerald-300 px-2.5 py-1.5 rounded border border-emerald-500/40 text-xs">
        <button id="adminSaveCustomCodeBtn" class="bg-sky-600 hover:bg-sky-500 px-3 py-1.5 rounded font-bold text-[11px]">Save</button>
      </div>

      <div class="grid grid-cols-3 gap-1.5">
        <button onclick="handleCopyJoinCodeUI()" class="bg-emerald-600 hover:bg-emerald-500 py-1.5 rounded font-bold text-[11px]">📋 Copy Link</button>
        <button onclick="handleRotateJoinCodeUI()" class="bg-slate-700 hover:bg-slate-600 py-1.5 rounded font-semibold text-[11px]">🔄 Rotate</button>
        <button onclick="handleToggleJoinCodeActiveUI()" class="bg-slate-700 hover:bg-slate-600 py-1.5 rounded font-semibold text-[11px]">${joinEnabled ? '⏸ Disable' : '▶ Enable'}</button>
      </div>
    </div>
  `;

  container.querySelector('#adminClubLogoFileInput')?.addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const statusEl = container.querySelector('#adminClubLogoStatus');
    if (statusEl) {
      statusEl.innerText = 'Optimizing & uploading club logo...';
      statusEl.classList.remove('hidden');
    }
    try {
      const logoDataUrl = await resizeClubLogoFile(file, 220);
      await updateClubSettings({ logoDataUrl });
      renderHeaderClubLogo();
      renderAdminDashboard();
    } catch (err) {
      alert(err.message || 'Could not upload club logo.');
      if (statusEl) statusEl.classList.add('hidden');
    } finally {
      e.target.value = '';
    }
  });

  container.querySelector('#adminRemoveClubLogoBtn')?.addEventListener('click', async () => {
    if (!confirm('Remove the club logo from the header and exported team sheets?')) return;
    try {
      await updateClubSettings({ logoDataUrl: '' });
      renderHeaderClubLogo();
      renderAdminDashboard();
    } catch (err) {
      alert(err.message || 'Could not remove club logo.');
    }
  });

  container.querySelector('#adminSaveClubProfileBtn')?.addEventListener('click', async () => {
    const name = container.querySelector('#adminClubFullNameInput')?.value.trim();
    const shortName = container.querySelector('#adminClubShortNameInput')?.value.trim();
    if (!shortName) return alert('Short club name cannot be empty.');
    try {
      await updateClubSettings({ name: name || shortName, shortName });
      alert('✅ Club profile updated!');
    } catch (e) {
      alert(e.message || 'Could not update club profile.');
    }
  });

  container.querySelector('#adminSaveCustomCodeBtn')?.addEventListener('click', async () => {
    const raw = container.querySelector('#adminCustomJoinCodeInput')?.value || '';
    const clean = normalizeJoinCode(raw);
    if (!clean || clean.length < 4) {
      return alert('Join code must be at least 4 characters (letters/numbers/hyphens).');
    }
    try {
      await setClubJoinCode({
        code: clean,
        active: true,
        defaultRole: club.joinDefaultRole || 'coach'
      });
      alert(`🔑 Club Join Code saved: ${clean}`);
    } catch (e) {
      alert(e.message || 'Could not update join code.');
    }
  });
}

function renderPeopleSection(container, { teams, users, pendingInvites, pendingRequests, ageGroups }) {
  const club = appState.club || {};
  const joinCode = club.joinCode || 'Not Set';
  const joinEnabled = club.joinCodeEnabled !== false;

  // Filter active/suspended members
  const filteredUsers = users.filter(u => {
    const isSuspended = u.status === 'suspended';
    if (memberRoleFilter === 'suspended' && !isSuspended) return false;
    if (memberRoleFilter !== 'all' && memberRoleFilter !== 'suspended' && u.role !== memberRoleFilter) {
      return false;
    }
    if (memberSearchQuery) {
      const hay = `${u.displayName || ''} ${u.email || ''} ${u.role || ''}`.toLowerCase();
      if (!hay.includes(memberSearchQuery)) return false;
    }
    return true;
  });

  const requestsHtml =
    pendingRequests.length === 0
      ? `<p class="text-[11px] text-slate-500 italic">No pending join requests right now.</p>`
      : pendingRequests
          .map(r => {
            const teamCbs = teams
              .map(
                t => `
                <label class="flex items-center gap-1 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 cursor-pointer">
                  <input type="checkbox" value="${t.teamId}" class="req-team-cb-${escapeHtml(r.requestId)} rounded bg-slate-800 border-slate-600 text-emerald-500">
                  <span>${escapeHtml(t.name)}</span>
                </label>`
              )
              .join('');
            const agCbs = ageGroups
              .map(
                ag => `
                <label class="flex items-center gap-1 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-sky-700/60 cursor-pointer">
                  <input type="checkbox" value="${escapeHtml(ag)}" class="req-ag-cb-${escapeHtml(r.requestId)} rounded bg-slate-800 border-slate-600 text-sky-500">
                  <span class="text-sky-300 font-semibold">${escapeHtml(ag)}</span>
                </label>`
              )
              .join('');

            return `
              <div class="bg-amber-950/30 border border-amber-500/40 rounded-lg p-2.5 space-y-2 text-xs">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <div class="font-bold text-amber-200 truncate">${escapeHtml(r.displayName || 'New Coach')}</div>
                    <div class="text-[10px] text-slate-300 truncate">${escapeHtml(r.email || '')}</div>
                    ${r.note ? `<div class="text-[10px] text-amber-300 italic mt-0.5">"${escapeHtml(r.note)}"</div>` : ''}
                  </div>
                  <span class="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">${escapeHtml(r.joinCode)}</span>
                </div>
                <div class="space-y-1.5 pt-1.5 border-t border-amber-500/20">
                  <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-400">Assign Role:</span>
                    <select data-admin-req-role="${escapeHtml(r.requestId)}" class="flex-1 bg-slate-900 text-white text-[11px] font-bold px-2 py-1 rounded border border-slate-600">
                      <option value="coach" selected>⚽ Team Coach</option>
                      <option value="lead">📋 Age-Group Lead</option>
                      <option value="viewer">👁️ Viewer (Read-Only)</option>
                      <option value="admin">🛡️ Club Admin</option>
                    </select>
                  </div>
                  <div class="flex flex-wrap gap-1">${teamCbs}</div>
                  ${agCbs ? `<div class="flex flex-wrap items-center gap-1"><span class="text-[9px] text-sky-400 font-bold">Lead Age Groups:</span>${agCbs}</div>` : ''}
                  <div class="flex gap-1.5 pt-1">
                    <button data-admin-approve="${escapeHtml(r.requestId)}" class="admin-approve-btn flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] py-1.5 rounded">✓ Approve Access</button>
                    <button data-admin-reject="${escapeHtml(r.requestId)}" class="admin-reject-btn bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-[11px] px-3 py-1.5 rounded">✕ Decline</button>
                  </div>
                </div>
              </div>
            `;
          })
          .join('');

  const invitesHtml =
    pendingInvites.length === 0
      ? `<p class="text-[11px] text-slate-500 italic">No pending email invites.</p>`
      : pendingInvites
          .map(inv => {
            const meta = getRoleMeta(inv.role);
            const scopeSummary =
              inv.role === 'admin'
                ? 'All club teams'
                : inv.role === 'lead'
                ? `Age groups: ${(inv.assignedAgeGroups || []).join(', ') || 'None'}`
                : `${(inv.assignedTeamIds || []).length} team(s)`;
            return `
              <div class="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-2 rounded border border-slate-700 text-xs">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-white truncate">${escapeHtml(inv.displayName || inv.email)}</span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded border ${meta.badgeClass} font-bold">${meta.short}</span>
                  </div>
                  <div class="text-[10px] text-slate-400 truncate">${escapeHtml(inv.email)} • ${escapeHtml(scopeSummary)}</div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button data-admin-copy-inv="${escapeHtml(inv.inviteId)}" class="admin-copy-inv-btn text-[10px] bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-600 px-2 py-1 rounded font-semibold">📋 Copy</button>
                  <button data-admin-revoke-inv="${escapeHtml(inv.inviteId)}" class="admin-revoke-inv-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1.5">✕</button>
                </div>
              </div>
            `;
          })
          .join('');

  const membersHtml =
    filteredUsers.length === 0
      ? `<p class="text-[11px] text-slate-500 italic">No club members match this filter.</p>`
      : filteredUsers
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
                  <button data-adm-uid="${escapeHtml(u.uid)}" data-adm-tid="${escapeHtml(t.teamId)}"
                    class="adm-team-pill px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      hasTeam
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }">
                    ${hasTeam ? '✓ ' : '+ '}${escapeHtml(t.name)}
                  </button>`;
              })
              .join('');

            const agPills =
              u.role === 'lead'
                ? `<div class="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-800">
                    <span class="text-[9px] text-sky-400 font-bold uppercase">Lead Age Groups:</span>
                    ${ageGroups
                      .map(ag => {
                        const hasAg = assignedGroupsSet.has(ag);
                        return `
                          <button data-adm-luid="${escapeHtml(u.uid)}" data-adm-ag="${escapeHtml(ag)}"
                            class="adm-ag-pill px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              hasAg
                                ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }">
                            ${hasAg ? '✓ ' : '+ '}${escapeHtml(ag)}
                          </button>`;
                      })
                      .join('')}
                  </div>`
                : '';

            return `
              <div class="bg-slate-900/80 p-2.5 rounded-lg border ${
                isSuspended ? 'border-rose-500/40 opacity-65' : 'border-slate-700'
              } space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-bold text-white text-xs truncate">${escapeHtml(u.displayName || 'Coach')}</span>
                      <span class="text-[9px] px-1.5 py-0.5 rounded border ${meta.badgeClass} font-bold">${meta.short}</span>
                      ${isSelf ? `<span class="text-[9px] text-emerald-400 font-semibold">(You)</span>` : ''}
                      ${isSuspended ? `<span class="text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1 rounded font-bold">SUSPENDED</span>` : ''}
                    </div>
                    <div class="text-[10px] text-slate-400 truncate">${escapeHtml(u.email || '')}</div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <select data-adm-role-uid="${escapeHtml(u.uid)}" class="adm-role-select bg-slate-800 text-white text-[10px] font-bold px-1.5 py-1 rounded border border-slate-600">
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ADMIN</option>
                      <option value="lead" ${u.role === 'lead' ? 'selected' : ''}>LEAD</option>
                      <option value="coach" ${u.role === 'coach' ? 'selected' : ''}>COACH</option>
                      <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>VIEWER</option>
                    </select>
                    ${
                      !isSelf
                        ? `<button data-adm-suspend="${escapeHtml(u.uid)}" class="adm-suspend-btn text-[10px] px-1.5 py-1 rounded border ${
                            isSuspended
                              ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                              : 'bg-slate-800 border-slate-600 text-amber-300'
                          }" title="${isSuspended ? 'Reactivate' : 'Suspend'}">${isSuspended ? '↻' : '⏸'}</button>
                          <button data-adm-del="${escapeHtml(u.uid)}" class="adm-del-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1" title="Remove">✕</button>`
                        : ''
                    }
                  </div>
                </div>
                ${agPills}
                ${
                  u.role !== 'admin'
                    ? `<div class="flex flex-wrap gap-1 pt-1.5 border-t border-slate-800">${teamPills}</div>`
                    : `<div class="text-[10px] text-purple-300/80 pt-1 border-t border-slate-800">Full access across all ${teams.length} club teams</div>`
                }
              </div>
            `;
          })
          .join('');

  const inviteTeamCbs = teams
    .map(
      t => `
      <label class="flex items-center gap-1 text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-700 cursor-pointer">
        <input type="checkbox" value="${escapeHtml(t.teamId)}" ${
          t.teamId === appState.selectedTeamId ? 'checked' : ''
        } class="adm-inv-team-cb rounded bg-slate-800 border-slate-600 text-emerald-500">
        <span>${escapeHtml(t.name)}</span>
      </label>`
    )
    .join('');

  const inviteAgCbs = ageGroups
    .map(
      ag => `
      <label class="flex items-center gap-1 text-[11px] bg-slate-900 px-2 py-1 rounded border border-sky-700/60 cursor-pointer">
        <input type="checkbox" value="${escapeHtml(ag)}" class="adm-inv-ag-cb rounded bg-slate-800 border-slate-600 text-sky-500">
        <span class="text-sky-300 font-semibold">${escapeHtml(ag)}</span>
      </label>`
    )
    .join('');

  const filterPill = (key, label) => {
    const active = memberRoleFilter === key;
    return `<button onclick="setAdminMemberRoleFilter('${key}')" class="px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      active
        ? 'bg-purple-600 border-purple-400 text-white'
        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
    }">${label}</button>`;
  };

  container.innerHTML = `
    <!-- Quick Join Code Strip -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
      <div class="min-w-0">
        <div class="text-[10px] text-slate-400 font-semibold">🔑 Club Join Code ${joinEnabled ? '' : '(Paused)'}</div>
        <div class="font-mono font-extrabold text-emerald-300 text-xs">${escapeHtml(joinCode)}</div>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button onclick="handleCopyJoinCodeUI()" class="bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1 rounded font-bold text-[10px]">📋 WhatsApp Link</button>
        <button onclick="setAdminSubTab('overview')" class="bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded font-semibold text-[10px]">Manage</button>
      </div>
    </div>

    <!-- Pending Join Requests -->
    <div class="bg-slate-800 border ${pendingRequests.length > 0 ? 'border-amber-500/50' : 'border-slate-700'} rounded-lg p-3 space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-amber-400">⏳ Approval Queue (${pendingRequests.length})</h4>
      </div>
      <div class="space-y-2">${requestsHtml}</div>
    </div>

    <!-- Invite Coach by Email -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 text-xs">
      <h4 class="font-bold text-emerald-400">✉️ Invite &amp; Pre-Authorize by Email</h4>
      <div class="grid grid-cols-2 gap-1.5">
        <input id="admInvName" type="text" placeholder="Coach Name" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-xs text-white">
        <select id="admInvRole" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-xs text-white font-bold">
          <option value="coach" selected>⚽ Team Coach</option>
          <option value="lead">📋 Age-Group Lead</option>
          <option value="viewer">👁️ Viewer (Read-Only)</option>
          <option value="admin">🛡️ Club Admin</option>
        </select>
      </div>
      <input id="admInvEmail" type="email" placeholder="coach@straffanafc.ie" class="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-600 text-xs text-white">
      <div>
        <div class="text-[10px] text-slate-400 mb-1">Assign Teams:</div>
        <div class="flex flex-wrap gap-1.5">${inviteTeamCbs}</div>
      </div>
      ${
        inviteAgCbs
          ? `<div>
              <div class="text-[10px] text-sky-400 mb-1">Age Groups (for Age-Group Lead):</div>
              <div class="flex flex-wrap gap-1.5">${inviteAgCbs}</div>
            </div>`
          : ''
      }
      <button id="admSendInviteBtn" class="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded font-bold text-xs shadow">
        + Pre-Authorize Coach &amp; Create Invite
      </button>
    </div>

    <!-- Pending Email Invites -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
      <h4 class="text-xs font-bold text-slate-300">📨 Pending Email Invites (${pendingInvites.length})</h4>
      <div class="space-y-1.5">${invitesHtml}</div>
    </div>

    <!-- Active Club Directory -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2.5">
      <div class="flex items-center justify-between gap-2">
        <h4 class="text-xs font-bold text-white">👥 Club Members (${users.length})</h4>
      </div>
      <input id="admMemberSearch" type="text" value="${escapeHtml(memberSearchQuery)}" oninput="setAdminMemberSearch(this.value)" placeholder="Search by name or email..." class="w-full bg-slate-900 px-2.5 py-1.5 rounded border border-slate-700 text-xs text-white">
      <div class="flex flex-wrap gap-1">
        ${filterPill('all', 'All')}
        ${filterPill('admin', '🛡️ Admin')}
        ${filterPill('lead', '📋 Lead')}
        ${filterPill('coach', '⚽ Coach')}
        ${filterPill('viewer', '👁️ Viewer')}
        ${filterPill('suspended', '⏸ Suspended')}
      </div>
      <div class="space-y-2">${membersHtml}</div>
    </div>
  `;

  // Bind Join Request Approve / Reject
  container.querySelectorAll('.admin-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-admin-approve');
      const roleSel = container.querySelector(`[data-admin-req-role="${reqId}"]`);
      const role = roleSel ? roleSel.value : 'coach';
      const checkedTeams = Array.from(container.querySelectorAll(`.req-team-cb-${CSS.escape(reqId)}:checked`)).map(
        cb => cb.value
      );
      const checkedAgs = Array.from(container.querySelectorAll(`.req-ag-cb-${CSS.escape(reqId)}:checked`)).map(
        cb => cb.value
      );

      const fallbackTeams = checkedTeams.length > 0 ? checkedTeams : [appState.selectedTeamId].filter(Boolean);
      const fallbackAgs = checkedAgs.length > 0 ? checkedAgs : [getSelectedTeam()?.ageGroup].filter(Boolean);

      try {
        await approveJoinRequest({
          requestId: reqId,
          role,
          assignedTeamIds: role === 'coach' || role === 'viewer' ? fallbackTeams : checkedTeams,
          assignedAgeGroups: role === 'lead' ? fallbackAgs : []
        });
        alert(`✅ Approved as ${getRoleMeta(role).label}! Their phone will unlock automatically.`);
      } catch (e) {
        alert(e.message || 'Could not approve request.');
      }
    });
  });

  container.querySelectorAll('.admin-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reqId = btn.getAttribute('data-admin-reject');
      if (confirm('Decline this join request?')) {
        await rejectJoinRequest(reqId);
      }
    });
  });

  // Bind Send Invite
  container.querySelector('#admSendInviteBtn')?.addEventListener('click', async () => {
    const displayName = container.querySelector('#admInvName')?.value.trim() || '';
    const email = container.querySelector('#admInvEmail')?.value.trim() || '';
    const role = container.querySelector('#admInvRole')?.value || 'coach';
    if (!email) return alert('Please enter the coach email address.');

    const assignedTeamIds = Array.from(container.querySelectorAll('.adm-inv-team-cb:checked')).map(cb => cb.value);
    const assignedAgeGroups = Array.from(container.querySelectorAll('.adm-inv-ag-cb:checked')).map(cb => cb.value);

    if (role === 'lead' && assignedAgeGroups.length === 0 && ageGroups.length > 0) {
      assignedAgeGroups.push(getSelectedTeam()?.ageGroup || ageGroups[0]);
    }

    try {
      const inv = await inviteOrPreAuthorizeCoach({
        email,
        displayName,
        role,
        assignedTeamIds,
        assignedAgeGroups
      });
      alert(`✅ Invite ready for ${inv.displayName} (${inv.email}) as ${getRoleMeta(inv.role).label}!`);
    } catch (e) {
      alert(e.message || 'Could not create invite.');
    }
  });

  // Bind Pending Invites actions
  container.querySelectorAll('.admin-copy-inv-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const inv = (appState.allClubInvites || []).find(i => i.inviteId === btn.getAttribute('data-admin-copy-inv'));
      if (!inv) return;
      const clubName = appState.club?.shortName || 'MatchDay Ready';
      const msg = `⚽ You've been invited to *${clubName}* on MatchDay Ready as *${getRoleMeta(inv.role).label}*!\n\nOpen: ${window.location.origin}\nSign in with: *${inv.email}*`;
      try {
        await navigator.clipboard.writeText(msg);
        alert('📋 WhatsApp invite message copied!');
      } catch (_) {
        prompt('Copy invite message:', msg);
      }
    });
  });

  container.querySelectorAll('.admin-revoke-inv-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-admin-revoke-inv');
      if (confirm('Revoke this pending invite?')) {
        await revokeClubInvite(id);
      }
    });
  });

  // Bind Active Members actions
  container.querySelectorAll('.adm-role-select').forEach(sel => {
    sel.addEventListener('change', async e => {
      try {
        await updateCoachRole(sel.getAttribute('data-adm-role-uid'), e.target.value);
      } catch (err) {
        alert(err.message || 'Could not change role.');
        renderAdminDashboard();
      }
    });
  });

  container.querySelectorAll('.adm-team-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleCoachTeamAssignment(btn.getAttribute('data-adm-uid'), btn.getAttribute('data-adm-tid'));
    });
  });

  container.querySelectorAll('.adm-ag-pill').forEach(btn => {
    btn.addEventListener('click', async () => {
      await toggleCoachAgeGroupAssignment(btn.getAttribute('data-adm-luid'), btn.getAttribute('data-adm-ag'));
    });
  });

  container.querySelectorAll('.adm-suspend-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await toggleCoachStatus(btn.getAttribute('data-adm-suspend'));
      } catch (err) {
        alert(err.message || 'Could not update member status.');
      }
    });
  });

  container.querySelectorAll('.adm-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.getAttribute('data-adm-del');
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

function renderTeamsSection(container, { teams, players, users, ageGroups }) {
  const groupedHtml =
    ageGroups.length === 0
      ? `<p class="text-xs text-slate-400 italic">No teams yet. Create your first team below.</p>`
      : ageGroups
          .map(ag => {
            const agTeams = teams.filter(t => (t.ageGroup || 'U10') === ag);
            const agLeads = users.filter(
              u => u.role === 'lead' && (u.assignedAgeGroups || []).includes(ag)
            );
            const teamRows = agTeams
              .map(t => {
                const pCount = players.filter(p => p.primaryTeamId === t.teamId).length;
                const cCount = users.filter(
                  u =>
                    u.role === 'admin' ||
                    (u.assignedTeamIds || []).includes(t.teamId) ||
                    (u.role === 'lead' && (u.assignedAgeGroups || []).includes(t.ageGroup))
                ).length;
                const isEditing = editingTeamId === t.teamId;

                if (isEditing) {
                  return `
                    <div class="bg-slate-900 p-2.5 rounded border border-sky-500/50 space-y-2 text-xs">
                      <div class="grid grid-cols-2 gap-1.5">
                        <input id="editTeamName-${escapeHtml(t.teamId)}" type="text" value="${escapeHtml(t.name)}" class="bg-slate-800 px-2 py-1 rounded border border-slate-600 text-white font-semibold">
                        <input id="editTeamAge-${escapeHtml(t.teamId)}" type="text" value="${escapeHtml(t.ageGroup || 'U10')}" class="bg-slate-800 px-2 py-1 rounded border border-slate-600 text-white text-center font-semibold">
                      </div>
                      <div class="grid grid-cols-3 gap-1.5">
                        <select id="editTeamFmt-${escapeHtml(t.teamId)}" class="bg-slate-800 px-1.5 py-1 rounded border border-slate-600 text-white text-[11px]">
                          ${['5v5', '6v6', '7v7', '9v9', '11v11']
                            .map(f => `<option value="${f}" ${t.defaultFormation === f ? 'selected' : ''}>${f}</option>`)
                            .join('')}
                        </select>
                        <select id="editTeamPer-${escapeHtml(t.teamId)}" class="bg-slate-800 px-1.5 py-1 rounded border border-slate-600 text-white text-[11px]">
                          <option value="4" ${(Number(t.defaultPeriods) || 4) === 4 ? 'selected' : ''}>4 Qtrs</option>
                          <option value="3" ${Number(t.defaultPeriods) === 3 ? 'selected' : ''}>3 Thirds</option>
                          <option value="2" ${Number(t.defaultPeriods) === 2 ? 'selected' : ''}>2 Halves</option>
                        </select>
                        <input id="editTeamMins-${escapeHtml(t.teamId)}" type="number" step="0.5" min="5" max="45" value="${t.defaultQtrMins || 12}" class="bg-slate-800 px-2 py-1 rounded border border-slate-600 text-white text-center text-[11px]">
                      </div>
                      <div class="flex gap-1.5">
                        <button data-save-team="${escapeHtml(t.teamId)}" class="adm-save-team-btn flex-1 bg-emerald-600 hover:bg-emerald-500 py-1 rounded font-bold text-[11px]">💾 Save</button>
                        <button class="adm-cancel-edit-team bg-slate-700 px-3 py-1 rounded text-[11px]">Cancel</button>
                      </div>
                    </div>
                  `;
                }

                return `
                  <div class="flex items-center justify-between gap-2 bg-slate-900/80 px-2.5 py-2 rounded border border-slate-700 text-xs">
                    <div class="min-w-0">
                      <div class="font-bold text-white truncate">🛡️ ${escapeHtml(t.name)}</div>
                      <div class="text-[10px] text-slate-400">
                        ${escapeHtml(t.defaultFormation || '7v7')} • ${t.defaultQtrMins || 12}m • ${pCount} primary players • ${cCount} staff
                      </div>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                      <button data-edit-team="${escapeHtml(t.teamId)}" class="adm-edit-team-btn bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-600 px-2 py-1 rounded text-[10px] font-semibold">✏️ Edit</button>
                      <button data-del-team="${escapeHtml(t.teamId)}" data-del-team-name="${escapeHtml(t.name)}" data-del-team-pcount="${pCount}" class="adm-del-team-btn text-rose-400 hover:text-rose-300 font-bold text-xs px-1">✕</button>
                    </div>
                  </div>
                `;
              })
              .join('');

            return `
              <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-emerald-400 text-xs">📂 Age Group: ${escapeHtml(ag)} (${agTeams.length} team${agTeams.length === 1 ? '' : 's'})</span>
                  ${
                    agLeads.length > 0
                      ? `<span class="text-[10px] text-sky-300">Lead: ${escapeHtml(agLeads.map(l => l.displayName).join(', '))}</span>`
                      : `<span class="text-[10px] text-slate-500">No Age Lead</span>`
                  }
                </div>
                <div class="space-y-1.5">${teamRows}</div>
              </div>
            `;
          })
          .join('');

  container.innerHTML = `
    <!-- Create New Team Form -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 text-xs">
      <h4 class="font-bold text-emerald-400">➕ Create New Club Team</h4>
      <div class="grid grid-cols-3 gap-1.5">
        <input id="admNewTeamName" type="text" placeholder="e.g. U10 Blue" class="col-span-2 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-600 text-white">
        <input id="admNewTeamAge" type="text" value="U10" placeholder="U10" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white text-center font-semibold">
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <select id="admNewTeamFmt" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white text-[11px]">
          <option value="5v5">5v5</option>
          <option value="6v6">6v6</option>
          <option value="7v7" selected>7v7</option>
          <option value="9v9">9v9</option>
          <option value="11v11">11v11</option>
        </select>
        <select id="admNewTeamPer" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white text-[11px]">
          <option value="4" selected>4 Qtrs</option>
          <option value="3">3 Thirds</option>
          <option value="2">2 Halves</option>
        </select>
        <input id="admNewTeamMins" type="number" step="0.5" min="5" max="45" value="12" class="bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white text-center text-[11px]" title="Default Period Minutes">
      </div>
      <button id="admCreateTeamBtn" class="w-full bg-sky-600 hover:bg-sky-500 py-2 rounded font-bold text-xs shadow">+ Add Team to Club</button>
    </div>

    ${groupedHtml}
  `;

  container.querySelector('#admCreateTeamBtn')?.addEventListener('click', async () => {
    const name = container.querySelector('#admNewTeamName')?.value.trim();
    const ageGroup = container.querySelector('#admNewTeamAge')?.value.trim() || 'U10';
    const defaultFormation = container.querySelector('#admNewTeamFmt')?.value || '7v7';
    const defaultPeriods = Number(container.querySelector('#admNewTeamPer')?.value) || 4;
    const defaultQtrMins = parseFloat(container.querySelector('#admNewTeamMins')?.value) || 12;
    if (!name) return alert('Enter a team name (e.g. U10 Blue).');
    const created = await createClubTeam({
      name,
      ageGroup,
      defaultFormation,
      defaultQtrMins,
      defaultPeriods
    });
    alert(`✅ Created team "${created.name}" (${created.ageGroup})!`);
  });

  container.querySelectorAll('.adm-edit-team-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      editingTeamId = btn.getAttribute('data-edit-team');
      renderAdminDashboard();
    });
  });

  container.querySelectorAll('.adm-cancel-edit-team').forEach(btn => {
    btn.addEventListener('click', () => {
      editingTeamId = null;
      renderAdminDashboard();
    });
  });

  container.querySelectorAll('.adm-save-team-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tId = btn.getAttribute('data-save-team');
      const name = container.querySelector(`#editTeamName-${CSS.escape(tId)}`)?.value.trim();
      const ageGroup = container.querySelector(`#editTeamAge-${CSS.escape(tId)}`)?.value.trim() || 'U10';
      const defaultFormation = container.querySelector(`#editTeamFmt-${CSS.escape(tId)}`)?.value || '7v7';
      const defaultPeriods = Number(container.querySelector(`#editTeamPer-${CSS.escape(tId)}`)?.value) || 4;
      const defaultQtrMins = parseFloat(container.querySelector(`#editTeamMins-${CSS.escape(tId)}`)?.value) || 12;
      if (!name) return alert('Team name cannot be empty.');
      await updateClubTeam(tId, { name, ageGroup, defaultFormation, defaultPeriods, defaultQtrMins });
      editingTeamId = null;
      renderAdminDashboard();
    });
  });

  container.querySelectorAll('.adm-del-team-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tId = btn.getAttribute('data-del-team');
      const name = btn.getAttribute('data-del-team-name');
      const pCount = Number(btn.getAttribute('data-del-team-pcount')) || 0;
      const warn = pCount > 0 ? `\n\nNote: ${pCount} primary player(s) are linked to this team (they will remain in the club roster).` : '';
      if (confirm(`Delete team "${name}"?${warn}`)) {
        await deleteClubTeam(tId);
      }
    });
  });
}

function renderSeasonSection(container, { teams, players, ageGroups }) {
  const sharedPlayers = players.filter(p => (p.allowedTeamIds || []).length > 1);

  const sharedListHtml =
    sharedPlayers.length === 0
      ? `<p class="text-[11px] text-slate-500 italic">No players are currently shared across multiple teams.</p>`
      : sharedPlayers
          .slice(0, 30)
          .map(p => {
            const teamNames = (p.allowedTeamIds || [])
              .map(tid => teams.find(t => t.teamId === tid)?.name || tid)
              .join(' • ');
            return `
              <div class="flex items-center justify-between gap-2 bg-slate-900/70 px-2.5 py-1.5 rounded border border-slate-700 text-[11px]">
                <span class="font-semibold text-white truncate">${escapeHtml(getPlayerDisplayName(p))} <span class="text-[10px] text-slate-400">(${escapeHtml(p.ageGroup || '')})</span></span>
                <span class="text-[10px] text-sky-300 truncate">${escapeHtml(teamNames)}</span>
              </div>
            `;
          })
          .join('');

  const agOptions = ageGroups
    .map(ag => `<option value="${escapeHtml(ag)}">${escapeHtml(ag)}</option>`)
    .join('');

  const suggestNextAg = ag => {
    const m = String(ag || '').match(/^([A-Za-z]+)(\d+)$/);
    return m ? `${m[1]}${Number(m[2]) + 1}` : 'U11';
  };
  const firstAg = ageGroups[0] || 'U10';

  container.innerHTML = `
    <!-- End-of-Season Age Group Promotion -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2.5 text-xs">
      <div>
        <h4 class="font-bold text-emerald-400">🎓 End-of-Season Age-Group Rollover</h4>
        <p class="text-[10px] text-slate-400 mt-0.5">Promote all teams, players, and Age-Group Leads from one age group to the next (e.g. U10 → U11) in one step.</p>
      </div>
      ${
        ageGroups.length === 0
          ? `<p class="text-[11px] text-slate-500 italic">Add teams first to use age-group rollover.</p>`
          : `<div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Current Age Group:</label>
                <select id="admPromoteFrom" class="w-full bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white font-bold">${agOptions}</select>
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 mb-1">Promote To:</label>
                <input id="admPromoteTo" type="text" value="${escapeHtml(suggestNextAg(firstAg))}" class="w-full bg-slate-900 px-2 py-1.5 rounded border border-slate-600 text-white font-bold text-center">
              </div>
            </div>
            <label class="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
              <input id="admPromoteRenameCb" type="checkbox" checked class="rounded bg-slate-900 border-slate-600 text-emerald-500">
              <span>Also rename team prefixes (e.g. "U10 White" → "U11 White")</span>
            </label>
            <button id="admPromoteBtn" class="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-bold text-xs shadow">
              🎓 Promote Age Group for New Season
            </button>`
      }
    </div>

    <!-- Club Shared Player Pool Overview -->
    <div class="bg-slate-800 border border-slate-700 rounded-lg p-3 space-y-2 text-xs">
      <h4 class="font-bold text-sky-300">🔗 Club-Wide Shared Players (${sharedPlayers.length})</h4>
      <div class="space-y-1 max-h-60 overflow-y-auto">${sharedListHtml}</div>
    </div>
  `;

  const fromSel = container.querySelector('#admPromoteFrom');
  const toInput = container.querySelector('#admPromoteTo');
  fromSel?.addEventListener('change', () => {
    if (toInput) toInput.value = suggestNextAg(fromSel.value);
  });

  container.querySelector('#admPromoteBtn')?.addEventListener('click', async () => {
    const fromAgeGroup = fromSel?.value;
    const toAgeGroup = toInput?.value.trim();
    const renameTeamPrefixes = Boolean(container.querySelector('#admPromoteRenameCb')?.checked);
    if (!fromAgeGroup || !toAgeGroup) return alert('Select both age groups.');

    const tCount = teams.filter(t => t.ageGroup === fromAgeGroup).length;
    const pCount = players.filter(p => p.ageGroup === fromAgeGroup).length;
    if (
      !confirm(
        `Promote ${fromAgeGroup} → ${toAgeGroup}?\n\n• ${tCount} team(s)\n• ${pCount} player(s)\n• Assigned Age-Group Leads\n\nContinue?`
      )
    ) {
      return;
    }

    try {
      const res = await promoteAgeGroupForNewSeason({
        fromAgeGroup,
        toAgeGroup,
        renameTeamPrefixes
      });
      alert(
        `🎓 Promoted ${fromAgeGroup} → ${toAgeGroup}!\nUpdated ${res.teamsUpdated} team(s), ${res.playersUpdated} player(s), and ${res.leadsUpdated} Age-Group Lead(s).`
      );
    } catch (e) {
      alert(e.message || 'Could not promote age group.');
    }
  });
}
