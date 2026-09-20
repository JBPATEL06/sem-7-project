# AI Manager — Approved Monorepo & Feature Architecture

> **Author:** Claude (Architectural Design)  
> **Adopted:** 2026-09-18  
> **Status:** Approved Target Architecture Blueprint  

---

## Complete Blueprint

```
sem-7-project/
├── packages/
│   ├── ai-manager-web/
│   │   ├── src/
│   │   │   ├── features/                     ← One folder per KEEP feature
│   │   │   │   ├── cockpit/                  (Context Cockpit)
│   │   │   │   │   ├── pages/ProjectsPage.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   └── hooks/
│   │   │   │   ├── graphify/                 (Universal Graphify)
│   │   │   │   │   ├── components/
│   │   │   │   │   └── hooks/
│   │   │   │   ├── db-manager/
│   │   │   │   │   ├── pages/DbManagerPage.tsx
│   │   │   │   │   └── components/
│   │   │   │   ├── diagrams/
│   │   │   │   │   ├── pages/DiagramsPage.tsx
│   │   │   │   │   └── components/
│   │   │   │   ├── screens/                  (OpenPencil)
│   │   │   │   │   └── pages/ScreensPage.tsx
│   │   │   │   ├── qa/
│   │   │   │   │   ├── pages/QaPage.tsx
│   │   │   │   │   └── components/
│   │   │   │   ├── git/
│   │   │   │   │   ├── pages/GitViewPage.tsx
│   │   │   │   │   └── components/
│   │   │   │   ├── auth/
│   │   │   │   │   └── pages/{Login,Admin}Page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── pages/SettingsPage.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── pages/DashboardPage.tsx
│   │   │   │   └── chat/                     ← Unified Chat Interface
│   │   │   │       ├── pages/ChatPage.tsx
│   │   │   │       └── components/
│   │   │   ├── shared/                       ← Truly cross-feature only
│   │   │   │   ├── ui/                       (button, card, tabs, input, select, badge, icons, textarea)
│   │   │   │   ├── context/                  (AuthContext, ThemeContext)
│   │   │   │   ├── api/                      (client.ts)
│   │   │   │   └── types/                    (excalidraw.d.ts)
│   │   │   └── App.tsx / router
│   │   │
│   │   ├── server/
│   │   │   ├── modules/                       ← Mirrors frontend features exactly
│   │   │   │   ├── db/
│   │   │   │   │   ├── dbRoutes.ts
│   │   │   │   │   └── drivers/{pgDriver,mongoDriver,redisDriver}.ts
│   │   │   │   ├── diagrams/
│   │   │   │   │   └── diagramRoutes.ts
│   │   │   │   ├── screens/
│   │   │   │   │   ├── screenRoutes.ts
│   │   │   │   │   ├── screenAiService.ts
│   │   │   │   │   ├── screenDiskService.ts
│   │   │   │   │   └── screenTypes.ts
│   │   │   │   ├── qa/
│   │   │   │   │   ├── qaRoutes.ts
│   │   │   │   │   ├── qaDiagnosticsService.ts
│   │   │   │   │   ├── qaAstSafetyService.ts
│   │   │   │   │   └── qaTestRunnerService.ts
│   │   │   │   ├── git/
│   │   │   │   │   └── gitRoutes.ts
│   │   │   │   ├── graphify/
│   │   │   │   │   ├── graphifyRoutes.ts
│   │   │   │   │   └── graphifyService.ts
│   │   │   │   ├── auth/
│   │   │   │   │   └── auth.ts
│   │   │   │   ├── settings/
│   │   │   │   │   └── settingsRoutes.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── dashboardRoutes.ts
│   │   │   │   ├── projects/
│   │   │   │   │   └── projects.ts
│   │   │   │   └── admin/
│   │   │   │       └── adminRoutes.ts
│   │   │   │
│   │   │   ├── mcp/                          ← 5 MCP tool wrappers (one file each)
│   │   │   │   ├── dbTool.ts                 (wraps modules/db)
│   │   │   │   ├── diagramTool.ts            (wraps modules/diagrams)
│   │   │   │   ├── screenTool.ts             (wraps modules/screens)
│   │   │   │   ├── gitTool.ts                (wraps modules/git)
│   │   │   │   └── qaTool.ts                 (wraps modules/qa)
│   │   │   │
│   │   │   ├── chat/                          ← Chat Agent service
│   │   │   │   ├── chatRoutes.ts
│   │   │   │   └── agentService.ts            (dispatches to /mcp tools + context index)
│   │   │   │
│   │   │   ├── context-index/                 ← Topic/keyword context index (no heavy graph DB)
│   │   │   │   ├── indexBuilder.ts            (lightweight listing: path + 1-line summary)
│   │   │   │   └── indexReader.ts             (on-demand full-file loader when topic matches)
│   │   │   │
│   │   │   ├── models/                        (MongoDB Atlas schemas — unchanged)
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── middleware/                (requireAuth, requireAdmin, localOrAuth — from auth.ts)
│   │   │       └── utils/                     (encryption.ts, JsonStore.ts, IStore.ts, RuleEngine.ts, logger.ts)
│   │   │
│   │   └── (config files at root of ai-manager-web: package.json, vite.config, etc.)
│   │
│   ├── core/                                  (unchanged — shared types/logic across packages)
│   ├── db-context-indexer/                    (unchanged — dbci CLI package)
│   └── open-pencil/                           (unchanged — upstream)
│
├── .dbci/                                     (single root location — packages/.dbci/ duplicate removed)
├── diagrams/                                  (unchanged — .excalidraw scenes)
├── ui/                                        (unchanged — .fig archives)
├── docs/
│   └── plan/                                  (cleanup-audit.md, feature-map.md, repo-structure-snapshot.md, new-architecture-design.md)
└── .agents/skills/                             (unchanged)
```

---

## Migration Execution Plan

To execute this restructuring safely without breaking existing builds or tests:

### Phase 1: Dead Code Pruning & Workspace Root Cleanup
- Remove accidental `packages/.dbci/`.
- Remove 11 unused `*Screen.tsx` components in `src/components/`.
- Remove unused `server/modules.ts` and `server/contextRoutes.ts`.
- Delete `temp/screens_page_backup.tsx`.
- Move loose test scripts from `packages/ai-manager-web` root into `tests/`.

### Phase 2: Frontend Restructuring (`src/features/` & `src/shared/`)
- Create `src/features/` with subfolders for each feature (`cockpit/`, `db-manager/`, `diagrams/`, `screens/`, `qa/`, `git/`, `auth/`, `settings/`, `dashboard/`, `chat/`).
- Move pages, feature components, and feature hooks into their respective feature folders.
- Create `src/shared/` and move `ui/`, `context/`, `api/`, `types/`, and `Layout.tsx`.
- Update import paths in `App.tsx`, pages, and components.
- Run `npx tsc --noEmit` and Vitest to verify zero build or lint regressions.

### Phase 3: Server Restructuring (`server/modules/`, `server/shared/`, `server/mcp/`)
- Create `server/modules/` matching frontend features.
- Move routes, drivers, and services into their respective module subdirectories.
- Extract middlewares (`requireAuth`, `requireAdmin`, `localOrAuth`) into `server/shared/middleware/`.
- Move `encryption.ts`, `JsonStore.ts`, `IStore.ts`, `RuleEngine.ts`, `logger.ts` into `server/shared/utils/`.
- Update `server/index.ts` route mountings.
- Verify backend build with `npm run build` and test execution.

### Phase 4: MCP Wrappers, Context Index & Chat Scaffold
- Create `server/mcp/` with `dbTool.ts`, `diagramTool.ts`, `screenTool.ts`, `gitTool.ts`, `qaTool.ts`.
- Create `server/context-index/` with `indexBuilder.ts` and `indexReader.ts`.
- Create `server/chat/` with `chatRoutes.ts` and `agentService.ts`.
- Create `src/features/chat/` with `ChatPage.tsx`.
- End-to-end verification.
