# Architecture

## Tech Stack
- Frontend: React 18, TypeScript, TailwindCSS v4, Vite, Lucide React
- Backend: Express, Node.js (via tsup bundle in packages/ai-manager-web/server)
- Local DB Engine: sql.js (WASM SQLite)
- Build System: Turborepo / npm workspaces

## Key Decisions
- Theme synchronization uses `ThemeContext` backed by `localStorage` (`ai_manager_theme`) and HTML `data-theme` attribute for instant, zero-flicker light/dark styling.
- `/projects` project cards are kept inert until real `/projects/:id` database context routing is connected.
- Pure local-first project registry: stored in `.ai-manager/projects.json` without external cloud DB dependencies.
- DB Manager isolation & direct execution: Each project has an isolated SQLite file (`.ai-manager/dbs/:projectId.sqlite`). SQL console executes queries (including destructive statements like `DROP TABLE` / `DELETE`) directly and persists mutations to the project's SQLite file without modal interruptions, contained within that project's sandbox.
- Local-First Credentials & Reveal Security: API keys are encrypted at rest with AES-256-GCM in `.ai-manager/credentials.enc`. The `GET /api/settings/keys/:keyType/reveal` endpoint decrypts on-demand on explicit user request; currently running without auth or rate-limiting in local-first development mode. Must be secured with session auth, CSRF tokens, and rate-limiting before any non-localhost or network exposure.
- Dual CSS custom property maps in `index.css` handle consistent Obsidian dark and slate light themes.

## Folder / File Map
- `packages/ai-manager-web/src/` — Web application frontend source
  - `components/` — Shared UI primitives (`Layout`, `Card`, `Badge`, `Button`, `Select`, `Tabs`, `Icons`)
  - `context/` — Global context providers (`ThemeContext.tsx`)
  - `pages/` — Route page implementations (`OnboardingPage`, `DashboardPage`, `ProjectsPage`, `DbManagerPage`, `ValidatorPage`, `QaPage`, `FlowAuditPage`, `GitViewPage`, `SettingsPage`)
