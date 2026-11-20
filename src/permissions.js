/**
 * Milestone 13: Centralized 4-Role RBAC & Access Control Helpers
 * Roles:
 * - admin  : Club Admin (full club settings, teams, coaches, invites, join requests, all teams)
 * - lead   : Age-Group Lead (manages all teams, shared pool & Squad Splitter in assigned age groups)
 * - coach  : Team Coach (full matchday, lineup, events & roster access for assigned teams)
 * - viewer : Read-Only Viewer (views pitch, timer, stats & Share Sheet export for assigned teams)
 */

export const ROLES = ['admin', 'lead', 'coach', 'viewer'];
export const PRIMARY_ADMIN_EMAIL = 'neildrosario@gmail.com';

export function isPrimaryAdminEmail(email) {
  return typeof email === 'string' && email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

export const ROLE_META = {
  admin: {
    key: 'admin',
    label: 'Club Admin',
    short: 'ADMIN',
    icon: '🛡️',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40'
  },
  lead: {
    key: 'lead',
    label: 'Age-Group Lead',
    short: 'LEAD',
    icon: '📋',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  coach: {
    key: 'coach',
    label: 'Team Coach',
    short: 'COACH',
    icon: '⚽',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  viewer: {
    key: 'viewer',
    label: 'Viewer (Read-Only)',
    short: 'VIEWER',
    icon: '👁️',
    badgeClass: 'bg-slate-600/40 text-slate-300 border-slate-500/40'
  }
};

export function normalizeRole(role) {
  return ROLES.includes(role) ? role : 'viewer';
}

export function getRoleMeta(role) {
  return ROLE_META[normalizeRole(role)];
}

export function isProfileActive(profile) {
  if (!profile) return false;
  return !profile.status || profile.status === 'active';
}

export function isClubAdmin(profile) {
  return isProfileActive(profile) && profile.role === 'admin';
}

export function isAgeGroupLead(profile, ageGroup = null) {
  if (!isProfileActive(profile) || profile.role !== 'lead') return false;
  if (!ageGroup) return true;
  const groups = Array.isArray(profile.assignedAgeGroups) ? profile.assignedAgeGroups : [];
  return groups.includes(ageGroup);
}

export function isViewer(profile) {
  return Boolean(profile) && normalizeRole(profile.role) === 'viewer';
}

export function canViewSplitterTab(profile) {
  if (!isProfileActive(profile)) return false;
  if (profile.role === 'admin') return true;
  return profile.canViewSplitter !== false;
}

export function canViewStatsTab(profile) {
  if (!isProfileActive(profile)) return false;
  if (profile.role === 'admin') return true;
  return profile.canViewStats !== false;
}

export function getClubAgeGroups(allClubTeams = []) {
  const set = new Set();
  (allClubTeams || []).forEach(t => {
    if (t && t.ageGroup) set.add(t.ageGroup.trim());
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function getAccessibleTeamsForProfile(profile, allClubTeams = []) {
  if (!profile || !isProfileActive(profile)) return [];
  const teams = allClubTeams || [];
  if (profile.role === 'admin') {
    return [...teams];
  }
  const assignedTeamIds = new Set(profile.assignedTeamIds || []);
  const assignedAgeGroups = new Set(profile.assignedAgeGroups || []);

  if (profile.role === 'lead') {
    return teams.filter(
      t => assignedAgeGroups.has(t.ageGroup) || assignedTeamIds.has(t.teamId)
    );
  }
  return teams.filter(t => assignedTeamIds.has(t.teamId));
}

function resolveTeamObj(teamOrId, allClubTeams = []) {
  if (!teamOrId) return null;
  if (typeof teamOrId === 'object') return teamOrId;
  return (allClubTeams || []).find(t => t.teamId === teamOrId) || { teamId: teamOrId };
}

export function canEditTeam(profile, teamOrId, allClubTeams = []) {
  if (!isProfileActive(profile)) return false;
  if (profile.role === 'viewer') return false;
  if (profile.role === 'admin') return true;

  const team = resolveTeamObj(teamOrId, allClubTeams);
  if (!team) return false;

  const assignedTeamIds = profile.assignedTeamIds || [];
  if (assignedTeamIds.includes(team.teamId)) return true;

  if (profile.role === 'lead' && team.ageGroup) {
    const groups = profile.assignedAgeGroups || [];
    if (groups.includes(team.ageGroup)) return true;
  }

  return false;
}

export function canDeletePlayer(profile, player, allClubTeams = []) {
  if (!isProfileActive(profile) || !player) return false;
  if (profile.role === 'viewer') return false;
  if (profile.role === 'admin') return true;
  if (profile.role === 'lead') {
    return (profile.assignedAgeGroups || []).includes(player.ageGroup);
  }
  if (profile.role === 'coach') {
    return (profile.assignedTeamIds || []).includes(player.primaryTeamId);
  }
  return false;
}

export function canCreateTeamInAgeGroup(profile, ageGroup = null) {
  if (!isProfileActive(profile)) return false;
  if (profile.role === 'admin') return true;
  if (profile.role === 'lead') {
    if (!ageGroup) return (profile.assignedAgeGroups || []).length > 0;
    return (profile.assignedAgeGroups || []).includes(ageGroup);
  }
  return false;
}

export function canRequestTeamAccess(profile) {
  if (!isProfileActive(profile)) return false;
  return profile.role !== 'admin';
}

export function canApproveTeamRequest(profile, teamRequest) {
  if (!isProfileActive(profile) || !teamRequest) return false;
  if (profile.clubId && teamRequest.clubId && profile.clubId !== teamRequest.clubId) {
    return false;
  }
  if (profile.role === 'admin') return true;
  if (profile.role === 'lead') {
    const groups = Array.isArray(profile.assignedAgeGroups) ? profile.assignedAgeGroups : [];
    return Boolean(teamRequest.ageGroup) && groups.includes(teamRequest.ageGroup);
  }
  return false;
}

export function getApprovableTeamRequests(profile, allTeamRequests = []) {
  if (!isProfileActive(profile)) return [];
  return (allTeamRequests || []).filter(
    r => r && r.status === 'pending' && canApproveTeamRequest(profile, r)
  );
}

/**
 * Allows a Club Admin to optionally switch their active UI view into Age-Group Lead mode
 * (e.g. seeing only their own U10 teams: U10 White & U10 Green) without losing real Admin
 * permissions in Firestore. Non-admins always receive their exact profile unchanged.
 */
export function getEffectiveUserProfile(profile, viewAsRole = 'admin', allClubTeams = []) {
  if (!profile || !isClubAdmin(profile) || viewAsRole !== 'lead') {
    return profile;
  }

  const teams = allClubTeams || [];
  let leadAgeGroups = Array.isArray(profile.assignedAgeGroups)
    ? profile.assignedAgeGroups.filter(Boolean)
    : [];

  if (leadAgeGroups.length === 0) {
    if (teams.some(t => t && t.ageGroup === 'U10')) {
      leadAgeGroups = ['U10'];
    } else if (teams.length > 0 && teams[0].ageGroup) {
      leadAgeGroups = [teams[0].ageGroup];
    }
  }

  const ageGroupSet = new Set(leadAgeGroups);
  const leadTeamIds = teams
    .filter(t => t && ageGroupSet.has(t.ageGroup))
    .map(t => t.teamId);

  return {
    ...profile,
    role: 'lead',
    actualRole: 'admin',
    isRolePreview: true,
    assignedAgeGroups: leadAgeGroups,
    assignedTeamIds: leadTeamIds
  };
}

export function canPublishSquadSplit(profile, ageGroup, allClubTeams = []) {
  if (!isProfileActive(profile)) return false;
  if (profile.role === 'viewer') return false;
  if (profile.role === 'admin') return true;
  if (profile.role === 'lead') {
    return (profile.assignedAgeGroups || []).includes(ageGroup);
  }
  if (profile.role === 'coach') {
    const ageTeams = (allClubTeams || []).filter(t => (t.ageGroup || 'U10') === ageGroup);
    if (ageTeams.length === 0) return false;
    const assigned = new Set(profile.assignedTeamIds || []);
    return ageTeams.every(t => assigned.has(t.teamId));
  }
  return false;
}

export function countActiveAdmins(allClubUsers = []) {
  return (allClubUsers || []).filter(
    u => u && !u.isInvite && u.role === 'admin' && (!u.status || u.status === 'active')
  ).length;
}

export function canModifyUserRole(currentProfile, targetUser, newRole, allClubUsers = []) {
  if (!isClubAdmin(currentProfile)) {
    return { ok: false, reason: 'Only Club Admins can change roles.' };
  }
  if (!ROLES.includes(newRole)) {
    return { ok: false, reason: `Invalid role: ${newRole}` };
  }
  if (
    targetUser &&
    targetUser.role === 'admin' &&
    newRole !== 'admin' &&
    !targetUser.isInvite
  ) {
    const adminCount = countActiveAdmins(allClubUsers);
    if (adminCount <= 1) {
      return {
        ok: false,
        reason: 'Cannot demote the last active Club Admin. Promote another admin first.'
      };
    }
  }
  return { ok: true };
}

export function canRemoveUser(currentProfile, targetUser, allClubUsers = []) {
  if (!isClubAdmin(currentProfile)) {
    return { ok: false, reason: 'Only Club Admins can remove members.' };
  }
  if (!targetUser) return { ok: false, reason: 'Member not found.' };
  if (targetUser.uid === currentProfile.uid) {
    return { ok: false, reason: 'You cannot remove your own active admin account.' };
  }
  if (targetUser.role === 'admin' && !targetUser.isInvite && countActiveAdmins(allClubUsers) <= 1) {
    return {
      ok: false,
      reason: 'Cannot remove the last active Club Admin.'
    };
  }
  return { ok: true };
}
