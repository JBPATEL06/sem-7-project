# Session Handoff & State Lock Documentation

**Date**: September 21, 2026  
**Repository Branch**: `main`  
**Current Working Directory**: `e:\sem-7-project`  

---

## 1. Verified Working State (Empirically Proven in Current Session)

The following components are fully implemented, verified with live runtime tests, terminal outputs, and browser screenshots:

1. **PGlite Per-Project Isolation**:
   - Located in [pgliteDriver.ts](file:///e:/sem-7-project/packages/ai-manager-web/server/modules/db/drivers/pgliteDriver.ts).
   - Data stored in isolated folders per project: `pglite_data/<projectId>/`.
   - Dynamic instance registry `pgliteInstances` uses `Map<string, PGlite>()` keyed by sanitized `projectId`. Multiple open projects do not share database instances.

2. **Supabase Studio UI & Local `postgres-meta`**:
   - Upstream clones: `packages/postgres-meta` (`origin https://github.com/supabase/postgres-meta.git`, commit `f380cc5`) and `packages/supabase-repo` (`origin https://github.com/supabase/supabase.git`, commit `e3c677f`).
   - Local `postgres-meta` REST service running at `http://localhost:1337` (`USE_PGLITE=true`) returning live schema introspection (`200 OK` on `GET /tables`).
   - Embedded Supabase Studio UI in [DbManagerPage.tsx](file:///e:/sem-7-project/packages/ai-manager-web/src/features/db-manager/pages/DbManagerPage.tsx) (`http://localhost:8082`).

3. **draw.io Authentic Editor UI**:
   - Embedded upstream draw.io editor UI (`http://localhost:8085/index.html?dev=1&embed=1&proto=json`) in [DiagramsPage.tsx](file:///e:/sem-7-project/packages/ai-manager-web/src/features/diagrams/pages/DiagramsPage.tsx). Excalidraw UI removed.
   - Communicates via `postMessage` protocol events (`init`, `load`, `autosave`, `change`, `save`).

4. **Crash-Safe Auto-Save & 5-Version Backups**:
   - Implemented in [atomicPersistence.ts](file:///e:/sem-7-project/packages/ai-manager-web/server/shared/utils/atomicPersistence.ts).
   - Atomic writes: Writes data to `.tmp/` file before calling atomic `fs.renameSync`. Prevents corrupted 0-byte files on sudden process crash/kill.
   - Versioned backups: Retains up to 5 latest timestamped `.bak` files in `.backups/` before overwriting.
   - Verified 100% passing in `tests/test_crash_safety.ts`.

5. **MCP Tools Integration**:
   - 38 OpenPencil native tools (`openpencil_native`), 5 draw.io wrapper tools (`drawio_local_wrapper`), 3 Git tools (`git_native`), and 3 PGlite tools (`pglite_native`) registered in `/api/mcp`.

---

## 2. Explicitly NOT Done Yet (Approved Plan for Future Session)

The following 4 items have been planned and approved in `implementation_plan.md`, but **NONE HAVE BEEN IMPLEMENTED AS OF THIS HANDOFF**:

1. **Unified Dev Service Orchestrator (`scripts/dev.js`)**:
   - Single command `npm run dev` launching all 7 services concurrently (Express `:3000`, Vite `:5173`, OpenPencil `:1420`, draw.io `:8085`, postgres-meta `:1337`, Supabase Studio `:8082`, Git UI `:3030`).
   - *Status*: **Not started**.

2. **Settings Page — "Connect Your AI" Section**:
   - Exposing live Ngrok tunnel URL, Master MCP bearer token (with mask/reveal toggle), and ready-to-paste `mcpServers` JSON config block.
   - *Status*: **Not started**.

3. **Real Semgrep Static Analysis in QA Diagnostics**:
   - Integrating local Semgrep CLI / MCP (`semgrepService.ts`, `POST /api/qa/semgrep-scan`) and adding a "Security & Code Quality Scan" tab in `QaPage.tsx`.
   - *Status*: **Not started**.

4. **GitHub-Style Git UI (Gitea / Forgejo)**:
   - Cloning `go-gitea/gitea` to `packages/gitea-repo`, running local Git web server at `:3030`, and embedding in `GitLineagePage.tsx`.
   - *Status*: **Not started**.

---

## 3. Known Outstanding Technical Debt & Unconfirmed Items

- **Git Lineage JSON Parsing Error**: The legacy Git visualizer page had an unresolved JSON parsing error when displaying commit diffs.
- **BYOK Backend Direct Reads**: Verify whether direct API key reading in `screenAiService.ts` and `settingsRoutes.ts` was fully refactored to centralized credential manager.
- **Dependency Cleanup**: Verify whether `@excalidraw/excalidraw` can be pruned from `packages/ai-manager-web/package.json` since draw.io is now the active editor.

---

## 4. CRITICAL RULES & LESSONS FOR NEXT AI AGENT SESSION

> [!CAUTION]
> **1. STRICT VERIFICATION STANDARD**:
> - NEVER claim any feature, clone, build, or bugfix is "done" or "verified" without providing REAL terminal outputs, REAL `git remote -v` + `git log` proof, and REAL screenshots.
> - Summaries from previous sessions MUST be empirically re-verified before making claims.
>
> **2. BRANCH DIVERGENCE WARNING**:
> - This project previously suffered from severe branch divergence where modularization work existed on a unmerged feature branch for a long time.
> - ALWAYS run `git branch --show-current` and `git status` at the beginning of the session. Ensure you are working directly on `main` and that the working tree is clean.
