# MatchDay Ready — Multi-Club Football Squad & Match Manager (v2.0)

**Live Production URL:** [https://matchday-ready.web.app](https://matchday-ready.web.app)

A multi-tenant, mobile-first Progressive Web App (PWA) for grassroots and youth football clubs—built with **Vite + Tailwind CSS + Firebase v10 (Authentication, Cloud Firestore & Hosting)**. Supports club-wide squads from **U7 Mini-Soccer (`5v5`, `6v6`, `7v7`)** to **Youth & Senior (`9v9`, `11v11`)** with real-time co-coach sync, 4-role access control, automated fair rotation, live match timer, and instant WhatsApp Team Sheet PNG exports.

---

## ✨ Key Features

- **Multi-Club Self-Onboarding & Live Club Switcher:**
  - Any coach or club coordinator can **Accept an Email Invite**, **Join an Existing Club via Join Code** (with Admin approval queue), or **Register a Brand-New Isolated Club** in seconds.
  - Coaches managing teams across multiple clubs get a 1-tap **Header Club Switcher** and per-club branding/crest.
- **4-Role Access Control (RBAC) & Zero-Trust Firestore Rules:**
  - `admin` (**Club Admin**): Full club profile & crest upload, teams CRUD, invites, join-code approvals, role management (with Last-Admin protection), and end-of-season age-group rollover.
  - `lead` (**Age-Group Lead**): Manages all sibling teams, shared roster pool, and Matchday Squad Splitter for their assigned age group(s).
  - `coach` (**Team Coach**): Full matchday pitch, swaps, events, timer, and roster control for assigned team(s).
  - `viewer` (**Read-Only Viewer**): Views lineups, timer, stats, and exports Share Sheet PNGs with editing locked in both UI and Firestore rules.
- **Dedicated `🛡️ Admin` Dashboard & Fixed Bottom Navigation:**
  - Mobile app-style fixed bottom navigation bar (**Pitch**, **Splitter**, **Stats**, **Admin**) with safe-area support and pending join-request badge counter.
  - Upload a custom **Club Logo / Crest** in `🛡️ Admin → 🏟️ Club`—displayed in the top-right header for all coaches and on exported Share Sheet PNGs.
- **Tactical Formations (`5v5`–`11v11`) & Match Period Modes:**
  - **25 tactical formations** across `5v5`, `6v6`, `7v7`, `9v9`, and `11v11` with per-period shape switching and smart player remapping.
  - Supports **4 Quarters**, **3 Thirds**, or **2 Halves** with fractional period lengths (e.g., `12.5m`).
- **Fair Playing Time, Specialist Roles & Season Memory:**
  - Tag **🧤 GK Specialists** and preferred zones (`DEF`, `MID`, `ATT`).
  - **🪄 Auto-Fair Squad** balances playing time across the match and optionally factors in **Season-to-Date minutes** from prior match dates.
  - **🔄 Mid-Period Substitution / Swap** modal credits both incoming and outgoing players with an exact **50/50 minutes split**.
- **Age-Group Matchday Squad Splitter & Live Conflict Detection:**
  - Divide a shared age-group pool (e.g., 25 kids $\rightarrow$ 3 teams) evenly by role (`GK`, `DEF`, `MID`, `ATT`), publish lineups to sibling coaches in 1 tap, and copy formatted WhatsApp announcements.
  - Real-time `onSnapshot` listeners warn immediately if a shared player is selected on two club teams on the same date & period.
- **Sideline Match Timer, Live Highlights & WhatsApp PNG Export:**
  - Pocket-safe timestamp match timer with **50% mid-period sub alerts** (audio + haptic) and **🔆 Keep Screen Awake** (Wake Lock API).
  - Log **⚽ Goals**, **👟 Assists**, **🧤 Saves**, **🌟 Effort Stars**, **🟨/🟥 Cards**, and **📝 Coach Notes** stamped with live match minutes.
  - 1-click **📸 Share Sheet** PNG export (`html2canvas`) featuring visual mini-pitches, period highlights, and club crest.
- **Dual-Mode Operation & Legacy Beta Importer:**
  - Works offline out of the box in **Local Sandbox Mode** (and with Firestore IndexedDB offline cache when signed in).
  - Imports legacy `uFootballApp` data from browser storage, `.json`/`.html` files, or SheetDB URLs.

---

## 🚀 Quick Start (Local Development & Testing)

```bash
npm install
npm test        # Run automated unit tests (RBAC, 50/50 swaps, fairness, splitter, importer)
npm run dev     # Start local Vite dev server
npm run build   # Build production bundle into dist/
```

---

## 🔥 Connecting Your Firebase Project & Deploying

### Option A: Environment Variables (`.env`)
Copy `.env.example` to `.env` and populate your Firebase Web App credentials:
```bash
cp .env.example .env
```

### Option B: Paste Config Directly in the App UI
Open MatchDay Ready, expand **⚙️ Club & Firebase Cloud Settings**, paste your Firebase Web App `firebaseConfig` object, and click **Save & Connect Firebase**.

### Deploying Rules, Indexes & Hosting via Firebase CLI
```bash
firebase login
firebase use matchday-ready
npm test && npm run build
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

### Automated CI/CD (GitHub Actions)
Every push to `main` triggers [.github/workflows/firebase-hosting.yml](./.github/workflows/firebase-hosting.yml), which installs dependencies, runs `npm test`, builds `dist/`, and deploys to Firebase Hosting.

---

## 📚 Documentation
- [RELEASE_NOTES.md](./RELEASE_NOTES.md) — Detailed milestone-by-milestone changelog (Milestones 1–16)
- [ROADMAP.md](./ROADMAP.md) — Completed phases & upcoming Milestone 17+ candidates
- [firestore.rules](./firestore.rules) — Hardened multi-tenant Cloud Firestore security rules
