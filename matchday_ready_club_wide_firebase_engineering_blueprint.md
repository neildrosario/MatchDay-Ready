# MatchDay Ready: Club-Wide Firebase Engineering Blueprint & Technical Specification

**Target Audience:** Antigravity (`agy`) AI Agent / Full-Stack Engineering Team  
**Project:** MatchDay Ready (Multi-Tenant Club Edition)  
**Current State:** Single-file Progressive Web App (`index.html`) using LocalStorage and SheetDB sync.  
**Future State:** Cloud-hosted, multi-tenant web application powered by **Firebase Authentication**, **Cloud Firestore**, and **Firebase Hosting**, supporting 30+ coaches, multiple teams, shared age-group rosters, and real-time collaborative matchday management.

---

## 1. Executive Summary & Architecture Overview

### 1.1 Objective
Convert the current single-file client-side `MatchDay Ready` PWA into a scalable, secure, multi-tenant club application. The system must support hierarchical club structures (Club $\rightarrow$ Age Groups $\rightarrow$ Teams $\rightarrow$ Coaches $\rightarrow$ Players $\rightarrow$ Matches) while preserving the core lightweight sideline features: 5v5/6v6/7v7 formations, fractional quarter lengths, 50/50 mid-quarter sub minute splits, and instant WhatsApp graphic exports (`html2canvas`).

### 1.2 High-Level Architecture
* **Frontend Hosting:** Firebase Hosting (CDN-backed static/SPA deployment with automated CI/CD via GitHub Actions).
* **Authentication:** Firebase Auth (Email/Password + Google Sign-In) enforcing Role-Based Access Control (RBAC).
* **Database Layer:** Cloud Firestore (NoSQL document database optimized for real-time listeners and offline persistence).
* **State Management:** Modular JavaScript (ES6 modules or lightweight Vite bundle) replacing monolithic script tags, maintaining real-time Firestore snapshots (`onSnapshot`) for instant co-coach updates.

---

## 2. Database Schema (Cloud Firestore Collections)

Firestore is a document-based database. To support 30+ coaches and shared players across teams without data race conditions, we use a normalized/denormalized hybrid schema structured under root collections.

### 2.1 Collection: `clubs`
Stores high-level club metadata.
```json
{
  "clubId": "straffan_afc",
  "name": "Straffan Association Football Club",
  "createdAt": "Timestamp"
}
```

### 2.2 Collection: `teams`
Represents individual squads (e.g., Straffan U12 White, Straffan U12 Blue).
```json
{
  "teamId": "u12_white",
  "clubId": "straffan_afc",
  "name": "U12 White",
  "ageGroup": "U12",
  "defaultFormation": "7v7",
  "defaultQtrMins": 12.5,
  "coachIds": ["coach_uid_1", "coach_uid_2"]
}
```

### 2.3 Collection: `users` (Coaches & Admins)
Maps authentication UIDs to club roles and team permissions.
```json
{
  "uid": "coach_uid_1",
  "email": "alex.coach@straffanafc.ie",
  "displayName": "Alex Coach",
  "role": "coach", // "admin", "coach", "viewer"
  "clubId": "straffan_afc",
  "assignedTeamIds": ["u12_white", "u12_blue"]
}
```

### 2.4 Collection: `players` (Club Master Roster)
Players belong to an age group/club rather than a single isolated team, enabling shared access across overlapping squads.
```json
{
  "playerId": "player_uuid_abc",
  "clubId": "straffan_afc",
  "ageGroup": "U12",
  "firstName": "Liam",
  "lastName": "O'Connor",
  "primaryTeamId": "u12_white",
  "allowedTeamIds": ["u12_white", "u12_blue"] // Shared player pool
}
```

### 2.5 Collection: `matches`
Stores matchday configurations, dates, and opposition details per team.
```json
{
  "matchId": "u12_white_2026_11_14",
  "teamId": "u12_white",
  "date": "2026-11-14",
  "opposition": "Kill Celtic",
  "qtrMins": 12.5,
  "formation": "7v7",
  "updatedAt": "Timestamp",
  "updatedBy": "coach_uid_1"
}
```

### 2.6 Collection: `lineups` (Sub-collection or Root Document)
Tracks quarter-by-quarter assignments, unavailability, and mid-quarter swaps.
```json
{
  "lineupId": "u12_white_2026_11_14_q1",
  "matchId": "u12_white_2026_11_14",
  "quarter": 1,
  "lineup": {
    "GK": "Liam O'Connor",
    "LD": "Noah Byrne",
    "RD": "Jack Ryan",
    "LM": "Harry Walsh",
    "CM": "Charlie Murphy",
    "RM": "Leo Kelly",
    "ATT": "Oscar Dunn"
  },
  "unavailablePlayers": ["Max Smith"],
  "swaps": [
    {
      "time": "Mid-Qtr",
      "text": "Sam Brown replaced Liam O'Connor at GK (50/50 min split)"
    }
  ]
}
```

---

## 3. Authentication & Role-Based Access Control (RBAC)

### 3.1 Authentication Flow
1. Coach navigates to the app URL (`https://matchdayready.web.app`).
2. If unauthenticated, they are presented with a clean Firebase UI login modal (Email/Password or Google Auth).
3. Upon successful login, the app queries the `users` collection using their Firebase `uid` to load their permissions and assigned teams.

### 3.2 Firestore Security Rules (`firestore.rules`)
Enforce robust multi-tenant data isolation so coaches can only read/write data for teams they are assigned to:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user document
    function getUserData() {
      return request.auth != null ? get(/databases/$(database)/documents/users/$(request.auth.uid)).data : null;
    }
    
    function isClubMember(clubId) {
      return request.auth != null && getUserData().clubId == clubId;
    }
    
    function isAssignedTeam(teamId) {
      return request.auth != null && (getUserData().role == 'admin' || teamId in getUserData().assignedTeamIds);
    }

    match /clubs/{clubId} {
      allow read: if isClubMember(clubId);
    }

    match /teams/{teamId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (getUserData().role == 'admin' || resource.data.teamId in getUserData().assignedTeamIds);
    }

    match /players/{playerId} {
      allow read, write: if request.auth != null && isClubMember(resource.data.clubId);
    }

    match /matches/{matchId} {
      allow read, write: if request.auth != null && isAssignedTeam(resource.data.teamId);
    }

    match /lineups/{lineupId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 4. Real-Time Shared Roster & Conflict Resolution

### 4.1 Shared Player Problem
When Co-Coach A (U12 White) and Co-Coach B (U12 Blue) share players in the same age group, a player might be selected for both teams at the exact same hour on matchday.

### 4.2 Real-Time Mitigation Strategy
1. **Firestore Real-Time Listeners (`onSnapshot`):** Instead of one-time fetches, co-coaches subscribe to team and match documents. If Coach A assigns "Liam" to U12 White Q1, Coach B's app instantly receives an update.
2. **Conflict Warning Banner:** If a shared player is assigned to two different active matches on the same date/quarter, the app displays a non-blocking warning badge: *"⚠️ Liam is also assigned to U12 Blue at this time."*
3. **Optimistic UI Updates:** Local UI updates immediately while Firebase writes in the background, ensuring zero latency on the sideline.

---

## 5. Step-by-Step Migration Plan (`agy` Execution Roadmap)

* **Phase 1: Project Scaffolding & Firebase Initialization**
  * Initialize Firebase project via Firebase CLI (`firebase init auth, firestore, hosting`).
  * Split the monolithic `index.html` into modular source files (`src/firebase.js`, `src/auth.js`, `src/pitch.js`, `src/stats.js`, `src/export.js`).
* **Phase 2: Authentication & Team Selector Integration**
  * Replace LocalStorage state initialization with Firebase Auth state observer (`onAuthStateChanged`).
  * Add a team selection header dropdown populated from the coach's assigned teams.
* **Phase 3: Firestore Data Layer Replacement**
  * Replace SheetDB REST fetch/post functions with Firestore SDK queries (`getDocs`, `setDoc`, `onSnapshot`).
  * Migrate LocalStorage backup/restore to export/import JSON directly from Firestore collections.
* **Phase 4: CI/CD & Production Deployment**
  * Configure GitHub Actions workflow to automatically build and deploy to Firebase Hosting on every git push to `main`.

---

## 6. Ready-to-Execute Engineering Prompt for Antigravity (`agy`)

Copy and paste the prompt below directly into your Antigravity (`agy`) workspace terminal to execute the transformation:

```markdown
@agy Please execute the conversion of our MatchDay Ready single-file HTML app into a modular, production-ready Firebase application following the technical specification above. 

Key instructions for you to implement:
1. Initialize the project structure with Vite + Tailwind CSS + Firebase SDK v10 modular imports.
2. Create `src/firebase.js` configured with environment variables for Firebase Auth, Firestore, and Analytics.
3. Build an authentication wrapper (`src/auth.js`) supporting Email/Password login and session persistence.
4. Refactor the matchday pitch manager (`src/pitch.js`) and stats calculator (`src/stats.js`) to read and write from Firestore collections (`teams`, `players`, `matches`, `lineups`) using real-time `onSnapshot` listeners.
5. Retain all existing features: 5v5/6v6/7v7 formations, fractional quarter inputs (e.g. 12.5m), 50/50 mid-quarter sub minute-splitting, "Resting This Week" toggles, opposition text input, and `html2canvas` WhatsApp image export.
6. Provide the complete `firebase.json`, `firestore.rules`, and a deployment README.
```