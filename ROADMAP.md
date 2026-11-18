# MatchDay Ready — Roadmap (Milestones 13+)

Milestones 1–12 are complete and documented in [RELEASE_NOTES.md](./RELEASE_NOTES.md).

---

## Milestone 13 (Phase 1): Access Control, 4-Role RBAC, Invites + Join Code & Firestore Hardening
- **4-Role Hierarchy:**
  - `admin` — Club Admin (full club settings, teams, coaches, invites, join-code approvals, all age groups)
  - `lead` — Age-Group Lead (manages all teams, shared pool & Squad Splitter in assigned age group(s))
  - `coach` — Team Coach (matchday pitch, swaps, events, roster for assigned team(s))
  - `viewer` — Read-Only Viewer (views pitch, timer, stats & exports Share Sheet PNG without edit access)
- **Zero Auto-Admin Fallback & Strict Multi-Tenant Firestore Rules:**
  - Remove silent admin auto-creation for uninvited signups.
  - Dedicated `invites`, `joinCodes`, and `joinRequests` collections with strict Firestore Security Rules.
  - Prevent self-privilege escalation on `users/{uid}` and enforce club-scoped `isClubAdmin(clubId)`.
  - Stamp `clubId` on all `matches` and `lineups` documents (with automatic backfill for existing Straffan AFC data) and scope all real-time Firestore listeners by `clubId`.
- **Onboarding & Access Gate:**
  - Auto-claim matching pending email invites on sign-in.
  - Allow uninvited users to enter a **Club Join Code** to submit a join request and wait in a real-time approval gate (unlocking automatically upon Admin approval).
- **UI Permission Enforcement & Safeguards:**
  - Read-only mode for `viewer` across Pitch, Squad Splitter, and Squad & Stats.
  - Last-Admin protection preventing the final club admin from demoting or deleting themselves.
  - Bundle cleanup (remove unused duplicate logo asset).

---

## Milestone 14 (Phase 2): Dedicated Club Admin Dashboard
- Dedicated **`🛡️ Club Admin`** top-level tab (admin-only) with 4 panels:
  1. **Club Overview & Settings:** Edit club name/short name/crest, manage Join Code (copy, rotate, enable/disable), and live club KPIs.
  2. **Age Groups & Teams Manager:** Group teams by age group, edit team metadata (name, age group, format, periods, quarter mins), and safely archive/delete teams.
  3. **Coaches, Invites & Approval Queue:** Separate sections for Pending Join Requests (1-tap Approve with role/team/age-group picker or Reject), Pending Invites (1-click Copy WhatsApp Invite Link, edit, revoke), and Active Coaches (filter/search, role + team/age-group assignment, suspend/remove).
  4. **Club Shared Pool & Season Promotion:** Overview of shared players and end-of-season age-group rollover helper (`U10` → `U11`).

---

## Milestone 15 (Phase 3): Multi-Club Self-Onboarding & Club Switcher
- Neutralize remaining hardcoded default club strings in sign-in UI.
- Full 3-path Welcome/Onboarding flow: **Accept Invite** | **Join Existing Club via Code** | **Register New Club**.
- Multi-club switching for coaches who manage teams across more than one club, with per-club branding/crest.

---

## Future Candidates (M16+)
- **Season & Fixture Calendar Management:** Season archiving (`2026/27`), upcoming fixture schedule, and match scoreline summaries.
- **Matchday Parent RSVP / Availability Check-In:** Shareable availability link feeding directly into the Squad Splitter.
- **Season Analytics & Exports:** Player season cards, playing-time fairness charts, and CSV/PDF reports.
- **Automated Test Suite:** Unit tests for fairness rotation, 50/50 swaps, RBAC permissions, and squad splitting.
