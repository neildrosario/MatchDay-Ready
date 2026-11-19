import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLES,
  normalizeRole,
  getRoleMeta,
  isProfileActive,
  isClubAdmin,
  isAgeGroupLead,
  isViewer,
  canViewSplitterTab,
  canViewStatsTab,
  getClubAgeGroups,
  getAccessibleTeamsForProfile,
  canEditTeam,
  canDeletePlayer,
  canCreateTeamInAgeGroup,
  canPublishSquadSplit,
  countActiveAdmins,
  canModifyUserRole,
  canRemoveUser
} from '../src/permissions.js';

const TEAMS = [
  { teamId: 'u8_white', clubId: 'straffan_afc', name: 'U8 White', ageGroup: 'U8' },
  { teamId: 'u10_white', clubId: 'straffan_afc', name: 'U10 White', ageGroup: 'U10' },
  { teamId: 'u10_green', clubId: 'straffan_afc', name: 'U10 Green', ageGroup: 'U10' },
  { teamId: 'u12_blue', clubId: 'straffan_afc', name: 'U12 Blue', ageGroup: 'U12' }
];

const ADMIN = {
  uid: 'admin_1',
  role: 'admin',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: [],
  assignedAgeGroups: []
};

const ADMIN_2 = {
  uid: 'admin_2',
  role: 'admin',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: [],
  assignedAgeGroups: []
};

const LEAD_U10 = {
  uid: 'lead_u10',
  role: 'lead',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: [],
  assignedAgeGroups: ['U10']
};

const COACH_WHITE = {
  uid: 'coach_white',
  role: 'coach',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: ['u10_white'],
  assignedAgeGroups: []
};

const COACH_ALL_U10 = {
  uid: 'coach_both',
  role: 'coach',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: ['u10_white', 'u10_green'],
  assignedAgeGroups: []
};

const VIEWER_WHITE = {
  uid: 'viewer_1',
  role: 'viewer',
  status: 'active',
  clubId: 'straffan_afc',
  assignedTeamIds: ['u10_white'],
  assignedAgeGroups: []
};

const SUSPENDED_COACH = {
  uid: 'suspended_1',
  role: 'coach',
  status: 'suspended',
  clubId: 'straffan_afc',
  assignedTeamIds: ['u10_white']
};

describe('4-Role RBAC & Access Control (src/permissions.js)', () => {
  it('defines the 4 supported roles and normalizes unknown roles safely to viewer', () => {
    assert.deepEqual(ROLES, ['admin', 'lead', 'coach', 'viewer']);
    assert.equal(normalizeRole('admin'), 'admin');
    assert.equal(normalizeRole('lead'), 'lead');
    assert.equal(normalizeRole('coach'), 'coach');
    assert.equal(normalizeRole('viewer'), 'viewer');
    assert.equal(normalizeRole('superadmin'), 'viewer');
    assert.equal(normalizeRole(undefined), 'viewer');
    assert.equal(getRoleMeta('lead').short, 'LEAD');
    assert.equal(getRoleMeta('unknown').short, 'VIEWER');
  });

  it('evaluates active, admin, age-group lead, and viewer flags accurately', () => {
    assert.equal(isProfileActive(ADMIN), true);
    assert.equal(isProfileActive({ uid: 'legacy', role: 'coach' }), true);
    assert.equal(isProfileActive(SUSPENDED_COACH), false);
    assert.equal(isProfileActive(null), false);

    assert.equal(isClubAdmin(ADMIN), true);
    assert.equal(isClubAdmin(LEAD_U10), false);
    assert.equal(isClubAdmin({ ...ADMIN, status: 'suspended' }), false);

    assert.equal(isAgeGroupLead(LEAD_U10), true);
    assert.equal(isAgeGroupLead(LEAD_U10, 'U10'), true);
    assert.equal(isAgeGroupLead(LEAD_U10, 'U12'), false);
    assert.equal(isAgeGroupLead(COACH_WHITE, 'U10'), false);

    assert.equal(isViewer(VIEWER_WHITE), true);
    assert.equal(isViewer(COACH_WHITE), false);
  });

  it('sorts club age groups naturally (U8 before U10 before U12)', () => {
    assert.deepEqual(getClubAgeGroups(TEAMS), ['U8', 'U10', 'U12']);
  });

  it('filters accessible teams per role and blocks suspended users', () => {
    assert.equal(getAccessibleTeamsForProfile(ADMIN, TEAMS).length, 4);
    assert.deepEqual(
      getAccessibleTeamsForProfile(LEAD_U10, TEAMS).map(t => t.teamId),
      ['u10_white', 'u10_green']
    );
    assert.deepEqual(
      getAccessibleTeamsForProfile(COACH_WHITE, TEAMS).map(t => t.teamId),
      ['u10_white']
    );
    assert.deepEqual(
      getAccessibleTeamsForProfile(VIEWER_WHITE, TEAMS).map(t => t.teamId),
      ['u10_white']
    );
    assert.deepEqual(getAccessibleTeamsForProfile(SUSPENDED_COACH, TEAMS), []);
  });

  it('enforces team edit rights and strictly blocks viewers & suspended accounts', () => {
    assert.equal(canEditTeam(ADMIN, 'u12_blue', TEAMS), true);
    assert.equal(canEditTeam(LEAD_U10, 'u10_green', TEAMS), true);
    assert.equal(canEditTeam(LEAD_U10, 'u12_blue', TEAMS), false);
    assert.equal(canEditTeam(COACH_WHITE, 'u10_white', TEAMS), true);
    assert.equal(canEditTeam(COACH_WHITE, 'u10_green', TEAMS), false);
    assert.equal(canEditTeam(VIEWER_WHITE, 'u10_white', TEAMS), false);
    assert.equal(canEditTeam(SUSPENDED_COACH, 'u10_white', TEAMS), false);
  });

  it('enforces player deletion, team creation, and Squad Splitter publish rules', () => {
    const u10GreenPlayer = { playerId: 'p1', primaryTeamId: 'u10_green', ageGroup: 'U10' };
    assert.equal(canDeletePlayer(ADMIN, u10GreenPlayer, TEAMS), true);
    assert.equal(canDeletePlayer(LEAD_U10, u10GreenPlayer, TEAMS), true);
    assert.equal(canDeletePlayer(COACH_WHITE, u10GreenPlayer, TEAMS), false);
    assert.equal(canDeletePlayer(COACH_ALL_U10, u10GreenPlayer, TEAMS), true);
    assert.equal(canDeletePlayer(VIEWER_WHITE, u10GreenPlayer, TEAMS), false);

    assert.equal(canCreateTeamInAgeGroup(ADMIN, 'U12'), true);
    assert.equal(canCreateTeamInAgeGroup(LEAD_U10, 'U10'), true);
    assert.equal(canCreateTeamInAgeGroup(LEAD_U10, 'U12'), false);
    assert.equal(canCreateTeamInAgeGroup(COACH_WHITE, 'U10'), false);
    assert.equal(canCreateTeamInAgeGroup(VIEWER_WHITE, 'U10'), false);

    assert.equal(canPublishSquadSplit(ADMIN, 'U10', TEAMS), true);
    assert.equal(canPublishSquadSplit(LEAD_U10, 'U10', TEAMS), true);
    assert.equal(canPublishSquadSplit(LEAD_U10, 'U12', TEAMS), false);
    assert.equal(canPublishSquadSplit(COACH_WHITE, 'U10', TEAMS), false);
    assert.equal(canPublishSquadSplit(COACH_ALL_U10, 'U10', TEAMS), true);
    assert.equal(canPublishSquadSplit(VIEWER_WHITE, 'U10', TEAMS), false);
  });

  it('protects the last active Club Admin from demotion, self-removal, or deletion', () => {
    const singleAdminRoster = [ADMIN, LEAD_U10, COACH_WHITE, VIEWER_WHITE];
    assert.equal(countActiveAdmins(singleAdminRoster), 1);

    // Cannot demote the last admin
    assert.equal(canModifyUserRole(ADMIN, ADMIN, 'coach', singleAdminRoster).ok, false);
    // Non-admin cannot modify roles
    assert.equal(canModifyUserRole(LEAD_U10, COACH_WHITE, 'admin', singleAdminRoster).ok, false);
    // Admin can promote another coach
    assert.equal(canModifyUserRole(ADMIN, COACH_WHITE, 'lead', singleAdminRoster).ok, true);
    // Admin cannot remove themselves
    assert.equal(canRemoveUser(ADMIN, ADMIN, singleAdminRoster).ok, false);

    // With 2 active admins, demoting one is allowed, and removing the other is allowed
    const twoAdminRoster = [ADMIN, ADMIN_2, COACH_WHITE];
    assert.equal(countActiveAdmins(twoAdminRoster), 2);
    assert.equal(canModifyUserRole(ADMIN, ADMIN_2, 'lead', twoAdminRoster).ok, true);
    assert.equal(canRemoveUser(ADMIN, ADMIN_2, twoAdminRoster).ok, true);
    // Still cannot remove self
    assert.equal(canRemoveUser(ADMIN, ADMIN, twoAdminRoster).ok, false);
  });

  it('controls Splitter and Stats tab visibility per staff member (default ON for all coaches)', () => {
    // Default ON when flags are omitted (legacy / standard coaches)
    assert.equal(canViewSplitterTab(COACH_WHITE), true);
    assert.equal(canViewStatsTab(COACH_WHITE), true);
    assert.equal(canViewSplitterTab(VIEWER_WHITE), true);
    assert.equal(canViewStatsTab(VIEWER_WHITE), true);

    // Explicit false hides respective tabs for non-admin staff
    const restrictedCoach = { ...COACH_WHITE, canViewSplitter: false, canViewStats: false };
    assert.equal(canViewSplitterTab(restrictedCoach), false);
    assert.equal(canViewStatsTab(restrictedCoach), false);

    const pitchAndStatsOnly = { ...COACH_WHITE, canViewSplitter: false, canViewStats: true };
    assert.equal(canViewSplitterTab(pitchAndStatsOnly), false);
    assert.equal(canViewStatsTab(pitchAndStatsOnly), true);

    // Active admins always retain full access
    assert.equal(canViewSplitterTab({ ...ADMIN, canViewSplitter: false }), true);
    assert.equal(canViewStatsTab({ ...ADMIN, canViewStats: false }), true);

    // Suspended or null profiles are blocked
    assert.equal(canViewSplitterTab(SUSPENDED_COACH), false);
    assert.equal(canViewStatsTab(SUSPENDED_COACH), false);
    assert.equal(canViewSplitterTab(null), false);
    assert.equal(canViewStatsTab(null), false);
  });
});
