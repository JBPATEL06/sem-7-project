# Tier 1 + Tier 2 — Closed & Verified (Architecture Reference)

## Data storage model (current, corrected)
- **Projects, activity, credentials, SQLite dbs**: local-first, `.ai-manager/` folder (JSON + sql.js WASM files), unchanged.
- **Auth (users)**: MongoDB-backed (mongoose), with automatic fallback to local `.ai-manager/users.json` if `MONGODB_URI` is unreachable. This is the ONLY collection using Mongo — everything else stays local-first. (Earlier note said "zero MongoDB dependency" — that was true before the Auth pivot; now superseded.)

## Verified real systems
1. **Projects** — local-first JSON in `.ai-manager/projects.json`.
2. **DB Manager** — per-project isolated `.sqlite` files in `.ai-manager/dbs/`.
3. **Dashboard** — computed metrics from local files.
4. **Settings** — AES-256-GCM encrypted local storage `.ai-manager/credentials.enc`.
5. **Auth** — MongoDB-backed for users collection only, with local `.ai-manager/users.json` fallback.
