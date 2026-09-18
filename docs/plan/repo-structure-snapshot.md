# AI Manager — Repository Structure & Dependency Snapshot

> **Purpose:** Read-only architectural reconnaissance of the entire codebase (directory trees, monorepo wiring, and shared dependency maps) to inform the new folder architecture design.  
> **Status:** Read-only reference document (No restructuring executed).  
> **Date:** 2026-09-18  

---

## 1. Full Directory Tree: `packages/ai-manager-web/src/`

```
packages/ai-manager-web/src/
├── api/
│   └── client.ts                          # Shared Axios/fetch API client with JWT interceptors
├── context/
│   ├── AuthContext.tsx                    # Global authentication state, user object, token storage
│   └── ThemeContext.tsx                   # Dark (Obsidian) / Light (Slate) theme token sync
├── hooks/
│   ├── useAdmin.ts                        # User administration and role update hooks
│   ├── useDashboard.ts                    # Dashboard metrics and recent activity hook
│   ├── useDbManager.ts                    # Multi-DB connection, query console, and schema hook
│   ├── useDiagrams.ts                     # Excalidraw CRUD and AI diagram generation hook
│   ├── useFlowAudit.ts                    # AST symbol lookup and call-graph traversal hook
│   ├── useGit.ts                          # Git commit history, branch switcher, and diff hook
│   ├── useGraphify.ts                     # Universal Graphify AST & living docs context hook
│   ├── useProjects.ts                     # Project registry, creation modal, and active selection hook
│   ├── useQa.ts                           # Rule-based schema diagnostics and Vitest runner hook
│   ├── useScreens.ts                      # Stitch screen layout specs and .fig export hook
│   └── useSettings.ts                     # Encrypted API key management and reveal/hide hook
├── pages/
│   ├── AdminPage.tsx                      # Admin User Management & System Stats (/admin)
│   ├── DashboardPage.tsx                  # Home dashboard overview (/dashboard)
│   ├── DbManagerPage.tsx                  # Multi-Database control plane & SQL/Mongo runner (/db-manager)
│   ├── DiagramsPage.tsx                   # Excalidraw Diagram Studio (/diagrams)
│   ├── GitViewPage.tsx                    # Git Lineage & Commit Visualizer (/git-view)
│   ├── LoginPage.tsx                      # User authentication login view (/login)
│   ├── OnboardingPage.tsx                 # [Flagged for cut] Static wireframe onboarding wizard (/onboarding)
│   ├── ProjectDetailPage.tsx             # [Flagged for merge] Interim project breadcrumb drill-in
│   ├── ProjectsPage.tsx                   # 3-Panel Vibe Coding Context Cockpit (/projects)
│   ├── QaPage.tsx                         # 4-Tab QA Diagnostics & AST Safety Studio (/qa)
│   ├── RegisterPage.tsx                   # User registration view (/register)
│   ├── ScreensPage.tsx                    # OpenPencil Design Studio mount (/screens)
│   └── SettingsPage.tsx                   # API key vault & system reset (/settings)
├── components/
│   ├── Layout.tsx                         # App-wide shell: Collapsible Sidebar, TopBar, theme toggle
│   ├── db/
│   │   └── ConnectDbModal.tsx             # Connect Database dialog (Postgres, Mongo, Redis, SQLite)
│   ├── git/
│   │   ├── BranchFlagBadge.tsx            # Green/Red/Yellow branch health status flags
│   │   ├── BranchHealthBoard.tsx          # Branch overview card grid
│   │   ├── CodeViewerPane.tsx             # Line-numbered syntax viewer at specific commit ref
│   │   ├── HierarchicalFileTree.tsx       # Expandable nested file & folder tree
│   │   └── MergeConflictStudio.tsx        # 3-way side-by-side diff & merge resolver
│   ├── graphify/
│   │   ├── ContextBundleDrawer.tsx        # 360° Context drawer (AST, DB touches, Living Docs, Lineage)
│   │   └── GraphVisualCanvas.tsx          # Interactive force-directed / DAG call-graph visualizer
│   ├── studio/                            # Sub-components for OpenPencil Screens Studio
│   │   ├── AiCommandBar.tsx               # Quick 'E' AI prompt floating overlay
│   │   ├── DocumentSettingsModal.tsx      # Document renaming & background surface settings
│   │   ├── LayersPanel.tsx                # OpenPencil scene tree hierarchy
│   │   ├── OpenPencilAiSettingsModal.tsx  # Groq/OpenAI/xAI provider configuration modal
│   │   ├── ProjectFilesModal.tsx          # Workspace disk ui/ browser
│   │   ├── PropertyInspector.tsx          # Right geometry, fills, strokes, and typography inspector
│   │   ├── sceneGraphUtils.ts             # Kiwi .fig binary & SceneGraph helper functions
│   │   ├── StudioMenuBar.tsx              # Top dropdown menus (File, View, Object, Text, Arrange)
│   │   └── TopTabsBar.tsx                 # Tab strip managing independent document SceneGraphs
│   ├── ui/                                # Shared atomic design primitives
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── icons.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── tabs.tsx
│   │   └── textarea.tsx
│   └── [Flagged Dead Code - 11 files]:
│       ├── AuthScreen.tsx                 # Unused prototype screen
│       ├── DashboardScreen.tsx            # Unused prototype screen
│       ├── DbManagerScreen.tsx            # Unused prototype screen
│       ├── DriveExpiredBanner.tsx         # Unused banner
│       ├── DriveUnlinkedBanner.tsx        # Unused banner
│       ├── FlowAuditorScreen.tsx          # Unused prototype screen
│       ├── GitVisualizerScreen.tsx        # Unused prototype screen
│       ├── ProjectHubScreen.tsx           # Unused prototype screen
│       ├── ProjectPickerScreen.tsx        # Unused prototype screen
│       ├── QaMaintenanceScreen.tsx        # Unused prototype screen
│       └── SettingsScreen.tsx             # Unused prototype screen
├── types/
│   └── excalidraw.d.ts                    # Type declarations for @excalidraw/excalidraw
├── App.tsx                                # Root routing orchestrator & unauthenticated route guards
├── index.css                              # TailwindCSS v4 @theme tokens (Obsidian dark / Slate light)
└── main.tsx                               # React DOM root entry point
```

---

## 2. Full Directory Tree: `packages/ai-manager-web/server/`

```
packages/ai-manager-web/server/
├── drivers/                               # Database client drivers
│   ├── mongoDriver.ts                     # MongoDB connection pool, collStats, and JSON query runner
│   ├── pgDriver.ts                        # PostgreSQL / Supabase pg.Pool and information_schema introspector
│   └── redisDriver.ts                     # Redis / Valkey ioredis client with SCAN-based key traversal
├── graphify/                              # Universal Graphify context services
│   └── graphifyService.ts                 # SQLite graph traversal, sub-graph extraction, prompt context bundler
├── models/                                # MongoDB Atlas Mongoose schemas
│   └── index.ts                           # User, Project, Diagram, Screen, ActivityLog, DbConnection models
├── qa/                                    # QA Diagnostics & Code Safety engines
│   ├── qaAstSafetyService.ts              # ts-morph AST scanner detecting unindexed queries & N+1 patterns
│   ├── qaDiagnosticsService.ts            # Multi-dialect rule engine (NO_PRIMARY_KEY, unindexed FKs)
│   └── qaTestRunnerService.ts             # Programmatic Vitest runner streaming test execution results
├── screens/                               # OpenPencil & Stitch Layout synthesis services
│   ├── mcpService.ts                      # Legacy MCP bridge prototype
│   ├── screenAiService.ts                 # Multi-provider LLM layout synthesizer (Groq, OpenAI, xAI)
│   ├── screenDiskService.ts               # Local disk workspace synchronization (ui/*.fig, ui/*.json)
│   └── screenTypes.ts                     # LayoutSpec, LayoutComponent, DesignTokens, AstPropertyDiff
├── utils/                                 # Shared server utilities
│   ├── encryption.ts                      # AES-256-GCM cipher (12-byte IV, 16-byte auth tag)
│   ├── IStore.ts                          # Generic key-value store interface
│   ├── JsonStore.ts                       # Atomic JSON disk persistence store
│   ├── logger.ts                          # Winston / console server logging utility
│   └── RuleEngine.ts                      # Diagnostic rules evaluation engine
├── adminRoutes.ts                         # User administration API (/api/admin/*)
├── auth.ts                                # Bcrypt auth, JWT generation, and route guard middlewares
├── dashboardRoutes.ts                     # Live workspace stats and activity feed (/api/dashboard/*)
├── dbRoutes.ts                            # Multi-DB endpoints, query runner, ER diagram sync (/api/db/*)
├── diagramRoutes.ts                       # Excalidraw persistence, AI synthesis, export (/api/diagrams/*)
├── figExporter.ts                         # Headless Kiwi container .fig binary encoder
├── gitRoutes.ts                           # Git timeline, branches, diffs, sync (/api/git/*)
├── graphifyRoutes.ts                      # Universal Graphify context endpoints (/api/graphify/*)
├── index.ts                               # Express app initialization, CORS, global error handlers
├── projects.ts                            # Project CRUD and local JSON/Mongo persistence (/api/projects/*)
├── qaRoutes.ts                            # QA diagnostics, test runner, DDL remediation (/api/qa/*)
├── screenRoutes.ts                        # Stitch layout generation, .fig export (/api/screens/*)
├── settingsRoutes.ts                      # AES-256 encrypted key management (/api/settings/*)
├── generateContextFig.ts                  # One-off .fig generator script for 3-panel UI
└── [Flagged Dead / Duplicate Files]:
    ├── contextRoutes.ts                   # Stale endpoints checking legacy .tmp_projects/
    ├── flowAuditRoutes.ts                 # Redundant with graphifyRoutes.ts
    ├── modules.ts                         # Mock hub stats for unused screens
    └── testDbGapFixes.ts                  # Loose test script in server folder
```

---

## 3. Root-Level Monorepo Structure

```
sem-7-project/
├── .agents/skills/                        # 80 curated agent skills with SKILL.md guides
├── .ai-manager/                           # Local credentials.enc and isolated project dbs (gitignored)
├── .dbci/                                 # Fast local SQLite AST and Graphify index databases
├── diagrams/                              # Native .excalidraw files (system_architecture, db_er_diagrams)
├── docker/                                # Docker compose environments
├── docs/                                  # Project documentation vault
│   ├── architecture.md                    # Structural decisions and tech stack
│   ├── discussion.md                      # Append-only chronological session history
│   ├── index.md                           # Master table of contents map
│   ├── issues.md                          # Active issues and resolved bug tracking
│   ├── plans.md                           # Project roadmap and milestone tracking
│   ├── product.md                         # Stable product definition and boundaries
│   ├── progress.md                        # Verified feature completion snapshot
│   ├── plan/                              # Cleanup, audit, and architecture planning
│   │   ├── cleanup-audit.md               # 3-Way cleanup and scope reduction proposal
│   │   ├── feature-map.md                 # Complete 14-module feature usage reference
│   │   └── repo-structure-snapshot.md     # This architectural reconnaissance document
│   └── plans/
│       └── savedprompt.md                 # Saved prompt specifications
├── packages/
│   ├── ai-manager-web/                    # Core web application (React 18 + Express API server)
│   ├── core/                              # Lightweight SQLite index loader & shared interfaces
│   │   └── src/
│   │       ├── auth/                      # CLI auth manager
│   │       ├── config/                    # Config manager
│   │       ├── db/                        # SQLite schema definitions
│   │       ├── instructions/              # Agent instruction doc generators
│   │       ├── storage/                   # SQLite store & Google Drive sync utilities
│   │       └── types/                     # Shared core AST types
│   ├── db-context-indexer/                # CLI AST scanner & static indexer (DBCI)
│   │   └── src/
│   │       ├── cli/                       # dbci command line interface
│   │       ├── core/                      # Index builder, graphify builder, project walker
│   │       ├── db/                        # SQLite store & Graphify SQLite store
│   │       ├── local-server/              # Local stdio/HTTP server
│   │       ├── mcp/                       # MCP server implementation (@modelcontextprotocol/sdk)
│   │       └── scanners/                  # AST scanners (mongo, firebase, supabase, mysql)
│   └── open-pencil/                       # Upstream OpenPencil Web App (localhost:1420)
│       └── src/                           # Vue 3 / Skia WebGL canvas editor
├── ui/                                    # Native .fig binary files (OpenPencil Figma archives)
├── package.json                           # Root monorepo configuration (npm workspaces)
├── package-lock.json                      # Monorepo lockfile
├── README.md                              # Root workspace readme
├── BACKUP_README.md                       # Documentation for pre-cleanup backup snapshot
├── README_FIGMA_CUSTOM_CANVAS_BACKUP.md   # Documentation for figma custom canvas backup
├── claude_reply.txt                       # Central communication log
├── .env                                   # Gitignored root environment variables
├── .gitignore                             # Monorepo gitignore rules
└── [Flagged for Cleanup]:
    ├── packages/.dbci/                    # Accidental duplicate directory in packages/
    ├── atlas-credentials.env              # Loose credentials file at root
    ├── currentQAreport.txt                # Loose report output at root
    ├── implementation_plan.md             # Loose implementation plan at root
    ├── openpencil-ai-integration-plan.md  # Loose plan at root
    └── temp/                              # Temporary folder with dead screens_page_backup.tsx
```

---

## 4. Shared Reused Code & Dependency Map (The 10 "KEEP" Features)

| # | Feature (KEEP) | Shared UI Components | Shared Hooks & Client | Shared Server Utils & Middleware | Cross-Package / External Dependencies |
|---|---|---|---|---|---|
| **1** | **Context Cockpit** (`ProjectsPage.tsx`) | `ui/{badge,button,card,tabs,input,icons}`<br>`graphify/GraphVisualCanvas`<br>`graphify/ContextBundleDrawer` | `hooks/useProjects`<br>`hooks/useGraphify`<br>`api/client.ts` | `server/projects.ts`<br>`server/graphifyRoutes.ts`<br>`auth.ts` (`localOrAuth`) | `@ai-manager/core` (`loadIndexFromSqlite`)<br>SQLite `.dbci/graphify_<id>.sqlite` |
| **2** | **Graphify Context Engine** | Used directly inside Context Cockpit | `hooks/useGraphify` | `server/graphify/graphifyService.ts`<br>`server/graphifyRoutes.ts` | `@ai-manager/db-context-indexer`<br>`ts-morph` AST parser<br>`sql.js` WASM |
| **3** | **Multi-DB Manager** (`DbManagerPage.tsx`) | `ui/{badge,button,card,select,tabs,input,textarea}`<br>`db/ConnectDbModal` | `hooks/useDbManager`<br>`api/client.ts` | `server/dbRoutes.ts`<br>`server/drivers/{pg,mongo,redis}`<br>`utils/encryption.ts` | `pg` (Postgres pool)<br>`mongoose` (MongoDB)<br>`ioredis` (Redis SCAN)<br>`sql.js` (SQLite WASM)<br>Diagram Studio (syncs ER diagrams) |
| **4** | **Diagram Studio** (`DiagramsPage.tsx`) | `ui/{badge,button,card,select,icons}` | `hooks/useDiagrams`<br>`api/client.ts` | `server/diagramRoutes.ts`<br>`utils/JsonStore.ts`<br>`utils/IStore.ts` | `@excalidraw/excalidraw` 0.17.6<br>MongoDB Atlas `Diagram` model<br>`diagrams/*.excalidraw` |
| **5** | **OpenPencil Studio** (`ScreensPage.tsx`) | `studio/{AiCommandBar,StudioMenuBar,PropertyInspector,LayersPanel,TopTabsBar,...}` | `hooks/useScreens`<br>`api/client.ts` | `server/screenRoutes.ts`<br>`server/screens/screenAiService`<br>`server/figExporter.ts` | `@open-pencil/core`<br>`@open-pencil/fig`<br>`@open-pencil/kiwi`<br>`packages/open-pencil/` (localhost:1420) |
| **6** | **QA Diagnostics** (`QaPage.tsx`) | `ui/{badge,button,card,tabs}` | `hooks/useQa`<br>`api/client.ts` | `server/qaRoutes.ts`<br>`server/qa/{qaDiagnostics,qaAstSafety,qaTestRunner}`<br>`utils/logger.ts`, `RuleEngine.ts` | `vitest` (programmatic runner)<br>`ts-morph` (code query scanner)<br>`server/dbRoutes.ts` (schema rules) |
| **7** | **Git Management** (`GitViewPage.tsx`) | `ui/{badge,button,card,tabs}`<br>`git/{BranchFlagBadge,CodeViewerPane,HierarchicalFileTree,MergeConflictStudio,...}` | `hooks/useGit`<br>`api/client.ts` | `server/gitRoutes.ts`<br>`auth.ts` (`localOrAuth`) | `simple-git`<br>Local `.git` repository |
| **8** | **Auth & RBAC** (`Login/AdminPage.tsx`) | `ui/{badge,button,card,input}` | `context/AuthContext` (`useAuth`)<br>`hooks/useAdmin`<br>`api/client.ts` | `server/auth.ts`<br>`server/adminRoutes.ts`<br>`server/models/index.ts` | `bcrypt`<br>`jsonwebtoken`<br>MongoDB Atlas `User` collection |
| **9** | **Settings & Key Vault** (`SettingsPage.tsx`) | `ui/{badge,button,card,input,tabs}` | `hooks/useSettings`<br>`api/client.ts` | `server/settingsRoutes.ts`<br>`utils/encryption.ts` | AES-256-GCM cipher<br>`.ai-manager/credentials.enc`<br>Powers Groq/OpenAI in `screenAiService` |
| **10** | **Dashboard Overview** (`DashboardPage.tsx`) | `ui/{badge,button,card,icons}` | `hooks/useDashboard`<br>`api/client.ts` | `server/dashboardRoutes.ts`<br>`server/projects.ts` | Aggregates DB sizes from `.ai-manager/dbs/`<br>Activity logs from `.ai-manager/activity.json` |

---

## 5. Current `package.json` Workspaces Configuration

### Root `package.json`
```json
{
  "name": "sem-7-project",
  "version": "0.2.0",
  "private": true,
  "description": "AI Manager Platform — Monorepo of code context, schema management, design validation, QA testing, API testing, and Git tools",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "dev": "npm --workspace=@ai-manager/web run dev",
    "server": "npm --workspace=@ai-manager/web run server",
    "start": "npm --workspace=@ai-manager/web run server"
  },
  "devDependencies": {
    "typescript": "^5.5.3",
    "vitest": "^2.0.2"
  }
}
```

### Monorepo Packages Mapping
- **`packages/ai-manager-web`**: Package Name `@ai-manager/web`
  - Depends on `@ai-manager/core: "*"`
  - Depends on `@open-pencil/fig`, `@open-pencil/kiwi`, `@open-pencil/scene-graph`
  - Runs Express server (`tsx watch server/index.ts`) and Vite (`vite`) concurrently.
- **`packages/core`**: Package Name `@ai-manager/core`
  - Independent lightweight shared library exporting types, schema loaders, and config managers.
- **`packages/db-context-indexer`**: Package Name `@ai-manager/db-context-indexer`
  - Depends on `@ai-manager/core: "*"`
  - CLI binary `dbci`, AST compiler, and `@modelcontextprotocol/sdk` MCP server.
- **`packages/open-pencil`**: Package Name `@open-pencil/app`
  - Standalone upstream WebGL Skia graphics application running on port 1420.
