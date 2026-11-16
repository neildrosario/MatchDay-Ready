# MatchDay Ready — Club-Wide Edition (Straffan AFC)

Multi-tenant football matchday manager, formation planner, fair-time rotator, and real-time shared age-group roster tracker built with **Vite + Tailwind CSS + Firebase v10 (Authentication, Cloud Firestore & Hosting)**.

---

## ✨ Key Features

- **Multi-Tenant Club Hierarchy (`Straffan AFC` Default Seed):**
  - Supports `clubs` $\rightarrow$ `teams` (`U12 White`, `U12 Blue`, etc.) $\rightarrow$ `users` (Coaches & Admins) $\rightarrow$ `players` $\rightarrow$ `matches` $\rightarrow$ `lineups`.
- **Shared Age-Group Player Pool & Real-Time Conflict Detection:**
  - Share players across sibling teams in the same age group (`allowedTeamIds`).
  - Real-time `onSnapshot` listeners detect if a shared player is assigned to another team on the same date & quarter and display a live warning banner (`⚠️ Liam O. is also assigned to U12 Blue (GK) in Q1`).
- **Sideline Matchday Essentials:**
  - `5v5`, `6v6`, and `7v7` formations with fractional quarter minutes (e.g. `12.5m/q`).
  - **Auto-Fair Squad** generator balancing total game time and positional rotation (`GK`, `DEF`, `MID`, `ATT`).
  - **Mid-Quarter Substitution / Swap** modal with accurate 50/50 minutes splitting for both incoming and outgoing players.
  - **Resting / Unavailable This Week** checkboxes per quarter.
  - **1-Click WhatsApp PNG Team Sheet Export** (`html2canvas`) with Club & Team branding.
- **Dual-Mode Operation (Firebase Cloud + Local Multi-Tenant Sandbox):**
  - Works out-of-the-box in **Local Club Mode** for testing and offline demos, and switches seamlessly to **Firebase Auth + Cloud Firestore** either via `.env` variables or by pasting your Firebase Web App config directly into the in-app **⚙️ Club & Firebase Cloud Settings** panel.
  - Includes a **📥 Import Beta Data** button to migrate existing `uFootballAppV7` data from the single-file prototype (`legacy-prototype.html`).

---

## 🚀 Quick Start (Local Development)

```bash
npm install
npm run dev
```

To build for production (`dist/`):
```bash
npm run build
```

---

## 🔥 Connecting Your Firebase Project

### Option A: Paste Directly in the App UI (Fastest)
1. In the [Firebase Console](https://console.firebase.google.com/), create a project (e.g., `matchday-ready-straffan`).
2. Enable **Authentication** $\rightarrow$ Sign-in method $\rightarrow$ **Email/Password** (and optionally **Google**).
3. Enable **Cloud Firestore** (Start in production mode, then paste the contents of [`firestore.rules`](./firestore.rules) in the **Rules** tab).
4. Go to **Project Settings** $\rightarrow$ **General** $\rightarrow$ **Your apps** $\rightarrow$ **Web app (`</>`)** and copy the `firebaseConfig` object.
5. Open MatchDay Ready, expand **⚙️ Club & Firebase Cloud Settings**, paste the `firebaseConfig`, and click **Save & Connect Firebase**.

### Option B: Environment Variables (`.env`)
Copy `.env.example` to `.env` and fill in your Firebase Web App credentials:
```bash
cp .env.example .env
```

### Deploying Firestore Security Rules & Hosting via CLI
```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy --only firestore:rules,firestore:indexes,hosting
```
