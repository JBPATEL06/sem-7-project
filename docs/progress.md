# Progress

## Done
- **UI Structure & Visual Layout**: All 11 Flowstep screens built and visually complete in `packages/ai-manager-web`:
  - `/onboarding` (Screen 1)
  - `/dashboard` (Screen 2)
  - `/projects` (Screen 3)
  - `/db-manager` (Screen 4 & Empty State Screen 10)
  - `/validator` (Screen 5)
  - `/qa` (Screen 6)
  - `/flow-audit` (Screen 7)
  - `/git-view` (Screen 8 & Empty State Screen 11)
  - `/settings` (Screen 9)
- **Flowstep Design Inconsistency Fixes**:
  - Tier B recommended badge positioned correctly inside Tier B card in `/onboarding`.
  - Replaced SVG paths with official Lucide `Github` icon in `/dashboard`.
  - Solid violet active segment styling for segmented toggles in `/settings`.
- **Verified Interaction Bug Fixes (Pass 1)**:
  - **Issue 1**: `/projects` project cards made inert (removed misleading `onClick` navigation to `/dashboard`).
  - **Issue 2**: `/settings` Theme toggle wired to `ThemeContext` + `localStorage` (`ai_manager_theme`) + `data-theme` CSS token syncing (persists across page reloads).
- **Priority Tier 1 — Real Project Management (Item 1 Completed & Verified)**:
  - Wired `POST /api/projects` and `GET /api/projects` backed exclusively by persistent local JSON storage (`packages/ai-manager-web/.ai-manager/projects.json`).
  - Purged all dead MongoDB scaffolding (`server/db.ts`, `server/models/`, `mongoose` dependencies).
  - Set unindexed status as default (`status: "Not indexed"`, `files: "—"`, `dbSize: "—"`, `metrics: "Not indexed"`). Zero fabricated numbers displayed.
  - Interactive "+ New Project" modal with form validation, dynamic card registration, and active project context binding.


- **Priority Tier 1 — DB Manager & Live SQLite Engine (Item 2 Completed & Verified)**:
  - Created `GET /api/db/schema` and `POST /api/db/query` backed by `sql.js` (WASM SQLite) with project database isolation (`.ai-manager/dbs/:id.sqlite`).
  - Implemented `useDbManager` hook handling active project database switching, dynamic schema loading, and SQL query execution.
  - Screen 10 Empty State truthfully displayed when a project is not indexed or has no database created.
  - Live query runner executes arbitrary SQL queries (e.g. `CREATE TABLE`, `INSERT`, `SELECT`), persists mutations back to SQLite disk files, calculates real execution time in ms, and updates the data grid with paginated results.
  - Added "+ Create Table" modal to create tables on the fly.
- **Priority Tier 1 — Real Dashboard Stats & Activity Stream (Item 3 Completed & Verified)**:
  - Created `GET /api/dashboard/stats` and `GET /api/dashboard/activity` calculating live project totals, total SQLite DB size on disk, connected workspace counts, and live system health.
  - Replaced all static stat card mock numbers and hardcoded activity items in `DashboardPage.tsx` with dynamic `useDashboard` hook state.
  - Connected action buttons ("New Project", "Run Indexer", "View Logs", and live refresh).
- **Priority Tier 1 — AES-256-GCM Settings Key Storage & Data Reset (Item 4 Completed & Verified — Tier 1 Closed)**:
  - Built `GET /api/settings/keys` (returning strictly masked metadata, zero plaintext values) and `GET /api/settings/keys/:keyType/reveal` (decrypting on-demand only upon explicit user trigger) powered by AES-256-GCM encryption with 12-byte random IV and 16-byte auth tag, saving encrypted secrets to `.ai-manager/credentials.enc`.
  - Built `POST /api/settings/reset` to safely delete project SQLite databases from `.ai-manager/dbs/` and restore clean unindexed states across all projects.
  - Rewrote `SettingsPage.tsx` with dynamic key configuration states (Groq, GitHub, OpenAI), interactive Update modals, Reveal/Hide decrypted key toggling, and Danger Zone reset action.
- **Priority Tier 2 — QA Diagnostics & Flow Auditor (Items 5 & 6 Completed & Verified)**:
  - Built `GET /api/qa/diagnostics`, `GET /api/qa/logs`, and `GET /api/qa/export-report` with local rule-based SQLite diagnostics (`NO_PRIMARY_KEY`, `ORPHAN_FOREIGN_KEY`, `EMPTY_TABLE`, `MISSING_COLUMN_TYPE`), dynamic health score calculation, server log stream, and real Markdown report export.
  - Rewrote `QaPage.tsx` with interactive "Run Health Check", "Re-scan Schema", and "Export QA Report" download actions.
  - Rewrote `FlowAuditPage.tsx` with honest pending state ("AST Parsing Pipeline Pending — Tier 2"), removing all fabricated step timelines and fake progress percentages.
- **Academic Milestone 1 — Auth System with Roles & Bcrypt (Section 1 Completed & Verified)**:
  - Built `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me`.
  - Implemented bcrypt password hashing (10 salt rounds), local `.ai-manager/users.json` persistence (gitignored), role-based access control (`user` and `admin`), and JWT sessions stored in `localStorage` (`ai_manager_token`).
  - Added automatic first-boot default admin account seeding (`admin@local.workspace`) with generated password output to server console.
  - Created `AuthContext` + `useAuth`, `/login` and `/register` views, TopBar user role badge/dropdown, and protected route guards across all application screens.
- **Academic Milestone 1 — Admin Side Panel & MongoDB Verification (Section 2 Completed)**:
  - Verified MongoDB Hybrid migration with live tests (fallback local JSON works, MONGODB_URI in gitignored .env).
  - Built `packages/ai-manager-web/src/pages/AdminPage.tsx` with dynamic Admin Overview stats and User Management data grid.
  - Wired Admin Page to the frontend routing with an `isAdmin` boundary check.
  - Linked `Layout.tsx` Admin sidebar route dynamically based on the user's role.
- **Cross-Session Memory**: Synchronized `ai-manager` project and technical audit in Kankali Context Hub.

## In Progress / Unwired Interactive Features (Mock/Static Only)
The following buttons and interactive controls render visually but are not yet wired to live backend services:
- `/onboarding`: "Index repository" button (static transition, no live repository cloning/indexing).
- `/validator`: "Validate", "Run Query", model selector, context file chips (static results, no live LLM/AST validation pipeline).
- `/git-view`: "Re-index Commits", "Sync Git History" (static commit graph and file tree).

## Broken / Known-Bad
- None currently failing.
