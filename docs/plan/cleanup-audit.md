# AI Manager — Project Cleanup, Scope Reduction & MCP Consolidation Audit

> **Status:** Proposal for 3-Way Joint Review (User, Claude, Antigravity)  
> **Date:** 2026-09-18  
> **Prepared by:** Antigravity (Pair Programming Assistant)  
> **Relevant Skills Applied:** `planning-with-files`, `monorepo-architect`, `mcp-builder`, `clean-code`, `code_review`, `optimize_codebase`

---

## 1. Feature & Module Audit (Keep vs. Cut Matrix)

Every module currently in the repository with its operational status and recommendation:

| Feature / Module | Route / File Path | Current Status | Recommendation | Rationale |
|---|---|---|---|---|
| **Context Cockpit** | `/projects`<br>`ProjectsPage.tsx` | **Working (100%)** | **KEEP** | Central 3-panel living context workspace, AST call-graph viewer, schema inspector, and 1-click prompt context generator. Core differentiator of the platform. |
| **Universal Graphify SQLite Engine** | `/api/graphify/*`<br>`.dbci/graphify_<id>.sqlite` | **Working (100%)** | **KEEP** | Lightweight SQLite-backed multi-layer AST, DB schema, and living docs graph store. Replaces heavy external graph DBs (Neo4j). |
| **Database Manager** | `/db-manager`<br>`DbManagerPage.tsx` | **Working (100%)** | **KEEP** | Multi-dialect control plane (Postgres, MongoDB Atlas, Redis, SQLite WASM via `sql.js`) with live query runner and automated ER diagram sync. |
| **Diagram Studio** | `/diagrams`<br>`DiagramsPage.tsx` | **Working (100%)** | **KEEP** | Official `@excalidraw/excalidraw` 0.17.6 integration, native `.excalidraw` v2 schemas, AI diagram generation. |
| **OpenPencil Screens Studio** | `/screens`<br>`ScreensPage.tsx` | **Working (100%)** | **KEEP** | Official upstream OpenPencil web app mount (`localhost:1420`), headless Kiwi `.fig` binary export. Strictly follows the zero-custom-canvas rule. |
| **QA & Diagnostics Studio** | `/qa`<br>`QaPage.tsx` | **Working (100%)** | **KEEP** | Multi-dialect schema integrity audits, 1-click DDL remediation (`CREATE INDEX`), ts-morph AST query safety analysis, live Vitest test runner. |
| **Git Management Studio** | `/git-view`<br>`GitViewPage.tsx` | **Working (100%)** | **KEEP** | `simple-git` integration, branch switcher, commit diff inspector, repo status sync. |
| **Auth & RBAC** | `/login`, `/register`, `/admin`<br>`LoginPage.tsx`, `AdminPage.tsx` | **Working (100%)** | **KEEP** | Bcrypt password hashing, JWT sessions, MongoDB Atlas + local JSON fallback, user/admin role boundaries. |
| **Settings & Key Store** | `/settings`<br>`SettingsPage.tsx` | **Working (100%)** | **KEEP** | AES-256-GCM encrypted API key store (`.ai-manager/credentials.enc`), on-demand reveal/hide security. |
| **Onboarding Wizard** | `/onboarding`<br>`OnboardingPage.tsx` | **Partial / Unused** | **PROPOSE CUT** | Static mock onboarding screen left over from Day 1 wireframes. Unwired "Index repo" button. Can be removed or replaced with an inline "Create first project" modal. |
| **Project Detail Drill-in** | `/projects/:id`<br>`ProjectDetailPage.tsx` | **Partial / Duplicate** | **PROPOSE MERGE** | Created as an interim drill-in view before the 3-panel Context Cockpit was built. The Context Cockpit now inspects everything directly. Recommend consolidating into the Cockpit. |
| **Legacy `*Screen.tsx` Components (11 files)** | `src/components/*Screen.tsx`<br>`src/components/Drive*Banner.tsx` | **Dead Code (Unused)** | **PROPOSE IMMEDIATE CUT** | 11 unreferenced files (over 100 KB): `AuthScreen`, `DashboardScreen`, `DbManagerScreen`, `FlowAuditorScreen`, `GitVisualizerScreen`, `ProjectHubScreen`, `ProjectPickerScreen`, `QaMaintenanceScreen`, `SettingsScreen`, `DriveExpiredBanner`, `DriveUnlinkedBanner`. Completely superseded by `src/pages/`. |
| **Legacy Module & Context Endpoints** | `server/modules.ts`<br>`server/contextRoutes.ts` | **Dead Code (Unused)** | **PROPOSE CUT** | `/api/modules/hub`, `/api/modules/qa` and `/api/projects/:id/threads` look for stale `.tmp_projects/` and are not called by any active frontend page. |
| **Standalone Flow Audit Route** | `server/flowAuditRoutes.ts` | **Duplicate** | **PROPOSE MERGE** | `FlowAuditPage.tsx` was already removed from the frontend; its AST data is already served more cleanly by `graphifyRoutes.ts` and `qaRoutes.ts`. |

---

## 2. File Structure & Monorepo Optimization

### A. Current Structure Issues Found
1. **Accidental Directory in `packages/`**:
   - `packages/.dbci/` exists alongside root `.dbci/` and `packages/db-context-indexer/.dbci/`. 
   - *Fix:* Remove accidental `packages/.dbci`.
2. **Credential Exposure Risk**:
   - `atlas-credentials.env` sitting loose at repository root.
   - `packages/db-context-indexer/client_secret_....json` and `wengoogle secret.json` sitting in git-tracked tree.
   - *Fix:* Move sensitive keys into `.env` (gitignored) or `.ai-manager/credentials.enc` via existing AES-256 encryption. Purge plaintext JSON secret files.
3. **Loose Test Scripts & Dead Backups**:
   - `packages/ai-manager-web` root has 8 loose scripts (`testAuthMongo.js`, `testAuthMongo.ts`, `testBrokenMongoFallback.ts`, `testDiagrams.ts`, `testFallback.js`, `testGit.ts`, `testToolkit.js`, `testToolkit.ts`) and `.tmp_projects/`.
   - `packages/ai-manager-web/server` contains `testDbGapFixes.ts`.
   - Root `temp/screens_page_backup.tsx` (289 KB dead backup file).
   - Root `currentQAreport.txt` and `openpencil-ai-integration-plan.md`.
   - *Fix:* Delete compiled `.js` test artifacts and dead backups; move active test scripts cleanly into `tests/` or `scripts/`.
4. **Duplicate `claude_reply.txt` Files**:
   - Three separate `claude_reply.txt` files exist (at root, in `packages/ai-manager-web`, and in `packages/db-context-indexer`).
   - *Fix:* Retain single source of truth at repository root `d:/Projets/sem-7-project/claude_reply.txt` and delete the two package-level duplicates.

### B. Proposed Clean Monorepo Layout
```
sem-7-project/
├── .agents/skills/              # 80 local workspace skills
├── .ai-manager/                 # Local encrypted credentials & project dbs (gitignored)
├── .dbci/                       # SQLite AST & graph indexes
├── docs/
│   ├── architecture.md
│   ├── discussion.md
│   ├── index.md
│   ├── issues.md
│   ├── plans.md
│   ├── product.md
│   ├── progress.md
│   └── plan/
│       ├── cleanup-audit.md     # This audit document
│       └── savedprompt.md
├── diagrams/                    # Native .excalidraw files
├── ui/                          # Native .fig binary files (OpenPencil)
├── packages/
│   ├── ai-manager-web/          # Core web application & Express API server
│   │   ├── server/              # Express backend, drivers, and MCP service wrappers
│   │   ├── src/                 # React 18 frontend (pages, components, context, hooks)
│   │   ├── tests/               # Vitest automated test suites
│   │   └── scripts/             # Verified standalone execution scripts
│   ├── db-context-indexer/      # CLI scanner & AST indexing engine (DBCI)
│   ├── core/                    # Shared types & lightweight SQLite loaders
│   └── open-pencil/             # Upstream OpenPencil Skia WebGL engine (localhost:1420)
└── claude_reply.txt             # Single root Claude reply communication file
```

---

## 3. Git Branch Management & Cleanup

### A. Current Branch Inventory
- `main` (Remote HEAD default)
- `master` (Divergent duplicate of main)
- `coreWrokingDiagram` (Typo branch from Day 3 diagram milestone — already merged)
- `coreWrokingFigma` (Typo branch from Day 4 figma milestone — already merged)
- `coreWrokingGit` (Typo branch from Day 2 git milestone — already merged)
- `backup` (Stale local/remote backup)
- `feature/vibe-coding-context-management-system` (Active development branch)

### B. Proposed Branch Action Plan
1. **Unify Trunk**: Standardize on `main` as the sole primary branch. Fast-forward merge `master` into `main`, then delete local and remote `master`.
2. **Prune Stale Milestone Branches**:
   - Delete `coreWrokingDiagram`, `coreWrokingFigma`, `coreWrokingGit` (both local and `origin`).
   - Delete `backup` branch.
3. **Standardized Branch Strategy Going Forward**:
   - `main`: Always clean, buildable, deployable.
   - `feature/<name>`: For new capabilities (e.g. `feature/mcp-unified-chat`).
   - `fix/<name>`: For bug remediations.
   - Delete feature branches immediately after merging.

---

## 4. Open-Source vs. Custom Code Strategy

| Module | Current Implementation | Recommendation | Benefit |
|---|---|---|---|
| **Figma / Canvas Engine** | Upstream `@open-pencil/*` | **Keep OpenPencil** | Complies with project rule: 100% OpenPencil, zero custom canvas hacks. |
| **Diagram Canvas** | Official `@excalidraw/excalidraw` 0.17.6 | **Keep Excalidraw** | Official open-source React component; reliable vector/JSON export. |
| **MCP Implementation** | Custom Express endpoints + `@modelcontextprotocol/sdk` in dbci | **Adopt official `@modelcontextprotocol/sdk` for all tools** | Official SDK provides standardized JSON-RPC schemas, error envelopes, and seamless LLM agent tool-calling. |
| **Git Operations** | `simple-git` | **Keep simple-git** | Clean, mature Node wrapper around native git. |
| **AST Parsing** | `ts-morph` + TypeScript compiler API | **Keep ts-morph** | Industry standard for high-fidelity AST traversal and symbol extraction. |

---

## 5. MCP-ify All Services Architecture

Wrap all existing backend service capabilities into **5 Standard MCP Tools** that can be invoked identically by:
1. The **Central Unified Chat Interface (`/chat`)**.
2. **In-Page Embedded AI Actions** (e.g., "AI Query" button on DB page, "AI Generate" on Diagrams page).

### Tool Definitions & Action Maps

```
┌─────────────────────────────────────────────────────────────┐
│                   Unified AI Agent Layer                    │
│   (Central Chat Page /chat  +  In-Page AI Controls)         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   [Context Index Layer]                [MCP Tool Router]
  (Lightweight listing of               (Decides & dispatches
   docs, issues, sessions)                tool calls by intent)
                                                  │
         ┌───────────────┬────────────────┬───────┴───────┬──────────────┐
         ▼               ▼                ▼               ▼              ▼
     [db_tool]    [diagram_tool]    [screen_tool]     [git_tool]     [qa_tool]
         │               │                │               │              │
    re-uses:        re-uses:         re-uses:        re-uses:       re-uses:
    dbRoutes.ts   diagramRoutes.ts screenRoutes.ts   gitRoutes.ts   qaDiagnostics.ts
    PgDriver      Excalidraw Store OpenPencil Core   simple-git     qaAstSafety.ts
    MongoDriver                    figExporter.ts                   qaTestRunner.ts
    RedisDriver
    sql.js
```

1. **`db_tool`**:
   - `action: "query"` — Executes SQL or MongoDB JSON query with safety limits.
   - `action: "schema"` — Introspects tables, collections, columns, and foreign keys.
   - `action: "connections"` — Lists active database drivers and health status.
   - `action: "sync_er"` — Automatically generates an Excalidraw ER diagram from live schema.
2. **`diagram_tool`**:
   - `action: "create"` / `"update"` / `"delete"` — Manages `.excalidraw` diagram files.
   - `action: "generate_ai"` — Synthesizes architecture or flow diagrams via LLM into Excalidraw scenes.
3. **`screen_tool`**:
   - `action: "generate_stitch"` — Synthesizes OpenPencil AST layouts and writes native `.fig` binary.
   - `action: "modify_element"` — Targeted AST mutation on selected elements.
   - `action: "export_fig"` — Generates downloadable binary `.fig` Kiwi container.
4. **`git_tool`**:
   - `action: "status"` / `"branches"` / `"commits"` — Repository timeline and branch health.
   - `action: "diff"` / `"file_content"` — Code viewer at specific commit refs.
   - `action: "sync"` — Synchronizes with remote repository.
5. **`qa_tool`**:
   - `action: "audit_schema"` — Runs rule-based checks (`NO_PRIMARY_KEY`, unindexed FKs).
   - `action: "apply_remediation"` — Generates and executes DDL fix statements.
   - `action: "ast_safety"` — Scans codebase for N+1 queries and injection risks.
   - `action: "run_tests"` — Triggers programmatic Vitest test suite execution.

---

## 6. Three-Way Decision Checklist (User, Claude, Antigravity)

Please review and confirm:

- [ ] **Decision 1: Cut Legacy Screen Components?**  
  Approve deletion of the 11 unused `*Screen.tsx` files in `src/components/` and unused `server/modules.ts` + `contextRoutes.ts`.
- [ ] **Decision 2: Remove Onboarding & Merge Project Detail?**  
  Approve removing `/onboarding` and folding `/projects/:id` into the 3-panel Context Cockpit.
- [ ] **Decision 3: Git Branch Pruning?**  
  Approve merging `master` into `main`, deleting `master`, `coreWroking*`, and `backup` branches.
- [ ] **Decision 4: Secret & File Sprawl Cleanup?**  
  Approve moving loose `.env`/credential files into `.ai-manager/credentials.enc`, removing dead backups (`temp/screens_page_backup.tsx`), and cleaning loose scripts.
- [ ] **Decision 5: Approve MCP Tool Consolidation Architecture?**  
  Approve the 5-tool MCP wrapper architecture (`db_tool`, `diagram_tool`, `screen_tool`, `git_tool`, `qa_tool`) as the foundation for the `/chat` interface and in-page AI actions.
