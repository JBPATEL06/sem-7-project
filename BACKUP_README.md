# AI Manager — Pre-Cleanup Snapshot Backup

- **Backup Branch:** `backup/pre-cleanup-2026-09-18`
- **Date:** 2026-09-18
- **Base Commit:** `b9ef7ef` (`feat: implement 3-panel vibe coding context cockpit and openpencil fig engine`)
- **Purpose:** Full pre-cleanup preservation snapshot of the active AI Manager project state prior to any scope reduction, file structure refactoring, or branch pruning.

---

## Current Project State

### 1. Fully Working & Verified Modules
- **Context Cockpit (`/projects`)**: 3-panel living context workspace (`ProjectsPage.tsx`) integrating Forge Pipeline & Prompt History (Left), Living Architecture & Graphify Visualizer (Center), and Multi-Tab Inspector with Prisma/Mongoose schemas & 16 active REST endpoints (Right). Includes 1-click token-optimized AI prompt context generator.
- **Universal Graphify SQLite Engine (`/api/graphify`)**: Multi-layer AST tokenization, DB schemas, living docs, and AI trace lineage persisted in fast local SQLite (`.dbci/graphify_<projectId>.sqlite`).
- **Database Manager (`/db-manager`)**: Multi-dialect database control plane supporting PostgreSQL/Supabase, MongoDB Atlas/Community, Redis/Valkey, and SQLite WASM (`sql.js`). Includes live query runner, structured pagination, and automated ER diagram synchronization.
- **Diagram Studio (`/diagrams`)**: Embedded official `@excalidraw/excalidraw` 0.17.6 canvas with native `.excalidraw` v2 persistence to disk and MongoDB Atlas, along with AI diagram synthesis.
- **OpenPencil Screens Studio (`/screens`)**: Authentic upstream OpenPencil web app mounted at `http://localhost:1420` with Skia WebGL canvas, Kiwi `.fig` binary export (`ui/*.fig`), and Stitch AST layout generation. 100% OpenPencil, zero custom canvas hacks.
- **QA Diagnostics Studio (`/qa`)**: Multi-dialect schema integrity audits (`NO_PRIMARY_KEY`, unindexed foreign keys), 1-click DDL remediation, ts-morph AST query safety analysis, and programmatic Vitest test suite runner.
- **Git Management Studio (`/git-view`)**: Branch switcher, commit diff inspector, and repository status sync powered by `simple-git`.
- **Auth & RBAC**: Bcrypt password hashing, JWT sessions, MongoDB Atlas cloud persistence with local JSON fallback, and Admin panel (`/admin`).
- **Settings & Security**: AES-256-GCM encrypted API key vault (`.ai-manager/credentials.enc`) with on-demand reveal/hide security.

### 2. Pending / Scheduled Next Up
- **Unified Context-Aware Chat Interface (`/chat`)**: Claude-like single entry point with streaming responses.
- **MCP Service Layer**: Standardized MCP tool wrappers (`db_tool`, `diagram_tool`, `screen_tool`, `git_tool`, `qa_tool`) callable uniformly by central chat and in-page AI actions.
- **Scope & Folder Cleanup**: Deprecating 11 unreferenced legacy `*Screen.tsx` components, consolidating test scripts, and removing dead backups.

---

## Standalone Companion Backups
- `backup/figma-custom-canvas`: Preserves the custom React canvas implementation for Figma / screens studio prior to upstream OpenPencil integration.
- `main` / `master`: Canonical production branches.
