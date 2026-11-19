# MatchDay Ready — Roadmap (Milestones 13+)

Milestones 1–16 are complete and documented in [RELEASE_NOTES.md](./RELEASE_NOTES.md).

---

## ✅ Completed Milestones (M13–M16)

### ✅ Milestone 13 (Phase 1): Access Control, 4-Role RBAC, Invites + Join Code & Firestore Hardening
- 4-role hierarchy (`admin`, `lead`, `coach`, `viewer`) enforced in [src/permissions.js](./src/permissions.js), UI views, and [firestore.rules](./firestore.rules).
- Removed silent auto-admin fallback for uninvited signups; added dedicated `invites`, `joinCodes`, and `joinRequests` collections.
- Stamped `clubId` onto all `matches` & `lineups` with safe legacy backfill, club-scoped all real-time Firestore listeners, enforced `viewer` read-only mode, and added Last-Admin safeguards.

### ✅ Milestone 14 (Phase 2): Dedicated Club Admin Dashboard & Club Crest Upload
- Dedicated admin-only **`🛡️ Admin`** tab in the fixed bottom navigation bar with 4 sub-tabs (**Staff**, **Teams**, **Club**, **Season**).
- Full Team CRUD, Join Code management (custom code, rotate, pause/enable, WhatsApp link), Pending Join Requests approval queue, Email Invites, Club Crest upload (top-right header + Share Sheet export), and End-of-Season Age-Group Rollover (`U10` → `U11`).

### ✅ Milestone 15 (Phase 3): Multi-Club Self-Onboarding & Club Switcher
- Club-neutral sign-in UI & dynamic per-club page title/branding.
- 3-path Club Hub onboarding (**Accept Email Invite** | **Join Existing Club via Join Code** | **Register New Isolated Club**).
- Multi-club memberships & live **Header Club Switcher** backed by zero-trust Firestore rules (`isValidClubSwitch`, `isValidNewClubAddition`, `isValidAdditionalInviteClaim`).

### ✅ Milestone 16: Pure Domain Engine Extraction, Automated Test Suite & Docs Sync
- Extracted pure football, stats, fairness rotation, squad splitter, conflict detection, and legacy importer logic into [src/engine.js](./src/engine.js).
- Added native Node unit tests (`npm test`) under `tests/` and wired `npm test` into GitHub Actions CI ([.github/workflows/firebase-hosting.yml](./.github/workflows/firebase-hosting.yml)).
- Synced [README.md](./README.md), [RELEASE_NOTES.md](./RELEASE_NOTES.md), and [ROADMAP.md](./ROADMAP.md).

---

## 🔮 Future Candidates (M17+)
- **Season & Fixture Calendar Management:** Season selector & archiving (`2026/27` vs `2027/28`), upcoming fixture schedule (Home/Away, kick-off time, venue), and match scoreline summaries.
- **Matchday Parent RSVP / Availability Check-In:** Shareable availability link (`In / Out / Maybe`) feeding directly into the Squad Splitter and Unavailable lists.
- **Season Analytics & Coach Exports:** Player season cards, visual playing-time fairness charts, top scorer / POTM leaderboards, and CSV/PDF season reports.
