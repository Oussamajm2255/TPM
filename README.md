# TPM Audit — Web App

Full-stack-ready React application for managing TPM audits across projects, lines and machines, with a deterministic yearly planning engine.

## Quick start

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173.

### Demo accounts (password: `maintenance2026**`)

| Role        | Username   |
|-------------|------------|
| Admin       | `Abdelsal` |
| Manager     | `manager`  |
| Technician  | `marwen` (or `sami`, `saif`, `nabil`, …) |

## First-run flow

1. Sign in as **admin** or **manager**.
2. Go to **Planning → Générer planning 2026**.
3. The engine distributes 1 audit per working day per technician, rotating lines fairly across all projects.
4. Click a day or planning cell → go to **Nouvel audit**, fill the check-list, save.
5. Technicians see only their own audits and planning slots.

## Architecture

```
src/
├── data/                   JSON seeds (projects, checklist, users)
├── services/               Single abstraction boundary — swap for REST/GraphQL later
│   ├── dataClient.js       get/set/patch on a localStorage-backed "DB"
│   ├── authService.js
│   ├── projectService.js
│   ├── auditService.js
│   ├── userService.js
│   └── planningService.js
├── store/useAppStore.js    Zustand store (selectors, actions)
├── hooks/usePermissions.js Role → action matrix
├── utils/
│   ├── dateUtils.js
│   └── planningEngine.js   Deterministic distribution algorithm
├── components/
│   ├── layout/             AppLayout, Sidebar, Header
│   ├── common/             Modal, Badge, EmptyState
│   ├── audit/              ChecklistRenderer
│   └── planning/           CalendarMonth / Week / Day, PlanCell
├── pages/                  Login, Dashboard, Projects, Audits, NewAudit, Planning, Users
└── router/AppRouter.jsx    Guarded routes (auth + permission)
```

### Data flow

> Excel files are **reference only**. At build time we extracted them to JSON seeds in `src/data/`. The app never reads Excel at runtime.

```
 ┌───────────┐   ┌──────────────┐   ┌────────────┐   ┌───────────────┐
 │ JSON seed │ → │ dataClient   │ ← │ services/* │ ← │ store actions │
 └───────────┘   │ (localStorage)│   └────────────┘   └───────────────┘
                 └──────────────┘                              ↑
                                                        React components
```

To switch to a real backend: keep the same service signatures, replace each `dataClient.get/set/patch` call with `fetch('/api/...')`. No component or page changes required.

## Planning algorithm (summary)

Implemented in [`utils/planningEngine.js`](src/utils/planningEngine.js). For every working day of 2026 (Mon–Fri by default):

- **R1** – Each technician is assigned at most **1 audit per day**.
- **R2** – Lines rotate via a modular offset `(dayIdx * N) % L` so every line is visited before any repeats.
- **R3** – Technician rotation shifts each day to avoid fixed pairings → **balanced workload** (delta ≤ 1).
- **R4** – A cooldown (default 7 days) prevents the same technician from revisiting the same line too often.
- **R5** – Deterministic: same input → same output (seeded shuffle).

**Unplanned audits** (`insertUnplanned`): if the technician is already booked that day, the existing audit is pushed to their next free working day — the unplanned one always wins the slot.

## Data models

```jsonc
// projects.json
{ "id": "P1", "name": "SEAT", "lines": [
  { "id": "P1-L1", "name": "CAV 1", "machines": [ { "id": "P1-L1-M1", "code": "1158" } ] }
]}

// users.json
{ "id": "U1", "username": "Abdelsal", "role": "admin", "password": "…", "active": true }

// checklist.json
{ "title": "...", "header_fields": [...], "items": [{ "id":"Q1", "label":"...", "weight":1 }], "action_fields":[...] }

// audits (created at runtime)
{ "id":"A1", "date":"2026-01-05", "projectId":"P1", "lineId":"P1-L1", "machineId":"P1-L1-M1",
  "technicianId":"U2", "auditeur":"Marwen", "answers":{"Q1":"yes",…}, "score":82, "actions":[…] }

// planning entries
{ "id":"PL42", "date":"2026-01-05", "technicianId":"U2", "projectId":"P1", "lineId":"P1-L1",
  "status":"scheduled", "unplanned":false }
```

## Roles

| Action                | admin | manager | technician |
|-----------------------|:-----:|:-------:|:----------:|
| View dashboard        | ✅    | ✅      | ✅         |
| View projects         | ✅    | ✅      | ✅         |
| Manage projects       | ✅    |         |            |
| Create audit          | ✅    | ✅      | ✅         |
| Delete audit          | ✅    | ✅      |            |
| Generate planning     | ✅    | ✅      |            |
| Add unplanned audit   | ✅    | ✅      |            |
| View users            | ✅    |         |            |
| Manage users          | ✅    |         |            |

Technicians only see their own audits / planning entries automatically (store-level scoping).

## Persistence

All state is stored under `localStorage` key `tpm-audit:db:v1`. Import/export helpers are available in [`services/dataClient.js`](src/services/dataClient.js) (`exportDB()`, `importDB()`). To reset the app to seed data, run in the console:

```js
localStorage.removeItem('tpm-audit:db:v1'); location.reload();
```

## Assumptions made

- **Maintenance Manager** was not present in the source Excel; a `manager` user was added with the same default password so the role is testable.
- Working days default to Monday–Friday; configurable via `settings.workingDays` (array of `getDay()` values).
- Planning year is 2026; change via `settings.planningYear` in the data client settings.
- Score formula: answered "Oui" / (total weighted items minus N/A). Simple, adjustable in `auditService.computeScore`.

## Future backend migration checklist

1. Expose REST routes mirroring `dataClient` verbs: `GET /projects`, `PUT /projects`, `POST /audits`, etc.
2. Replace the bodies of methods in `services/dataClient.js` with `fetch` calls.
3. Move `authService` to token-based auth (store JWT instead of `userId`).
4. Optionally move the planning engine to the server: same pure function, import from shared package.
