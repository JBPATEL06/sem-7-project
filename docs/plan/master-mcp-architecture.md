# Master MCP Architecture & Service Consolidation Blueprint

## 1. Executive Summary & Vision
This architecture document defines the pivot of **AI Manager** into a unified, locally-hosted **Electron Desktop Application (`.exe`)** powering a **Single Master Model Context Protocol (MCP) Server** (`/mcp`).

Rather than requiring users to provide their own LLM API keys (BYOK), AI Manager operates as an intelligent, context-aware **Tool Provider**. The user connects their own existing AI subscription (Claude.ai Pro/Max, ChatGPT Plus/Team, Cursor, Windsurf, or Antigravity) directly to our local machine via a secure, authenticated **Cloudflare Named Tunnel**.

```
   ┌─────────────────────────────────────────────────────────┐
   │             User's External AI Client                   │
   │  (Claude.ai, ChatGPT, Antigravity, Cursor, Windsurf)    │
   └────────────────────────────┬────────────────────────────┘
                                │ HTTPS + Bearer Token Auth
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │            Cloudflare Named Tunnel                      │
   │      (Stable Public FQDN, e.g. https://mcp.domain.com)  │
   └────────────────────────────┬────────────────────────────┘
                                │ Local Port Forwarding
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              AI Manager Electron Application (.exe)           │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │    Local Express Engine with Master MCP Router (/mcp)   │  │
│  │          [Bearer-Token Auth & Session Management]       │  │
│  └──────┬───────────────┬──────────────┬─────────────┬─────┘  │
│         │               │              │             │        │
│         ▼               ▼              ▼             ▼        │
│   ┌───────────┐   ┌───────────┐  ┌───────────┐ ┌───────────┐  │
│   │ Context-  │   │    QA     │  │  draw.io  │ │ Supabase  │  │
│   │ Indexer & │   │Diagnostic │  │Remote MCP │ │Official   │  │
│   │ Graphify  │   │  Engine   │  │  Proxy    │ │MCP Proxy  │  │
│   └───────────┘   └───────────┘  └───────────┘ └───────────┘  │
│         │               │              │             │        │
│   [Local SQLite]  [ts-morph AST] [mcp.draw.io] [Supabase API] │
│                                                               │
│         ▼                                                     │
│   ┌───────────┐                                               │
│   │OpenPencil │                                               │
│   │Native MCP │                                               │
│   │(Port 7600)│                                               │
│   └───────────┘                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 2. Deployment Model: Local Electron .exe + Tunneled Master MCP

### 2.1 Electron Host Architecture
- Packaged as a single desktop installer/portable executable (`ai-manager.exe`) using `electron-builder`.
- **Main Process**:
  - Boots the local Node.js Express server on an internal port (default: `3000`).
  - Spawns and supervises the Cloudflare Tunnel daemon (`cloudflared`).
  - Launches the desktop BrowserWindow rendering the Vite frontend.
- **Renderer Process**:
  - Native desktop UI displaying system health, project workspace files, living architecture diagrams, and the **MCP Connector Dashboard** with live copyable connection snippets.

### 2.2 Bearer-Token Security Enforcement
- On first launch, AI Manager generates a cryptographically secure 256-bit bearer token (`aim_live_...`) stored securely in `.ai-manager/credentials.enc`.
- Every incoming request to `/mcp` is inspected by `mcpAuthMiddleware`:
  ```typescript
  export function mcpAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized: Missing or invalid Bearer token' },
        id: null
      });
    }
    const token = authHeader.slice(7).trim();
    if (!constantTimeTokenCheck(token, getMasterMcpToken())) {
      return res.status(403).json({
        jsonrpc: '2.0',
        error: { code: -32003, message: 'Forbidden: Invalid MCP access credentials' },
        id: null
      });
    }
    next();
  }
  ```
- Constant-time comparison (`crypto.timingSafeEqual`) prevents timing side-channel attacks.

### 2.3 Cloudflare Named Tunnel Integration
- **Why Named Tunnel?** Quick Tunnels (`trycloudflare.com`) assign random subdomains that break custom connector configurations on app restarts. Named Tunnels provide a permanent, immutable URL (e.g. `https://mcp.ai-manager.internal` or user custom domain).
- **Configuration (`.cloudflared/config.yml`)**:
  ```yaml
  tunnel: <TUNNEL_UUID>
  credentials-file: .cloudflared/<TUNNEL_UUID>.json

  ingress:
    - hostname: mcp.my-workspace.dev
      service: http://localhost:3000
    - service: http_status:404
  ```
- **Lifecycle Management**:
  - The Electron main process launches `cloudflared tunnel run <TUNNEL_NAME>`.
  - Electron IPC continuously checks tunnel connectivity and sends health status (`ONLINE` / `CONNECTING` / `OFFLINE`) to the UI.

---

## 3. Service-by-Service Consolidation & Tool Roster

### 3.1 Database: Migration to Supabase
- **Removal**:
  - Purge `server/modules/db/drivers/` (`pgDriver.ts`, `mongoDriver.ts`, `redisDriver.ts`).
  - Purge custom query execution endpoints and manual connection pool managers.
- **Official Supabase MCP Proxy**:
  - Connects to official `@supabase/mcp-server-supabase` or Supabase Management API via MCP protocol.
  - Exposes standard database management tools directly to the AI:
    - `supabase_execute_sql`: Run queries and DDL migrations.
    - `supabase_list_tables`: Inspect table schemas and foreign key constraints.
    - `supabase_get_schema`: Retrieve complete relational schema definitions.
    - `supabase_generate_types`: Generate TypeScript interfaces from database tables.

### 3.2 Diagrams: Full Migration to draw.io
- **Removal**:
  - Remove `@excalidraw/excalidraw` and Excalidraw-specific canvas handlers.
  - Remove `server/modules/diagrams/diagramRoutes.ts` manual shape builders.
- **Remote draw.io MCP Proxy**:
  - Proxies to the official hosted draw.io MCP server at `https://mcp.draw.io/mcp`.
  - Zero local install or heavy canvas libraries required.
  - Exposes:
    - `drawio_display_diagram`: Renders Mermaid or XML diagrams with client-side ELK layout and libavoid routing.
    - `drawio_search_shapes`: Searches 10,000+ architectural stencils (AWS, GCP, Azure, Kubernetes, Cisco).

### 3.3 Screens / UI Design: Native OpenPencil MCP
- **Current State Audit**:
  - OpenPencil has an authentic, official `@open-pencil/mcp` package (`packages/open-pencil/packages/mcp`).
  - It exposes native MCP tools directly over stdio and HTTP/WebSocket (port 7600):
    - `list_documents`: Inspect open designs, tabs, artboards, and layers.
    - `open_file` / `save_file`: Open and persist native `.fig` binary files.
    - `canvas_insert_node`, `canvas_modify_node`, `canvas_delete_node`: Manipulate layout nodes.
- **Master MCP Routing**:
  - Our Master MCP forwards `openpencil_*` tool calls directly to the OpenPencil local RPC bridge on port 7600.
  - Eliminates custom wrapper layers.

### 3.4 QA & Diagnostics: Custom In-House AST Engine
- **Strategy**:
  - Keep custom AST inspection engine (`server/modules/qa/qaAstSafetyService.ts`, `qaDiagnosticsService.ts`, `qaTestRunnerService.ts`).
  - Wrap as first-class Master MCP tools:
    - `qa_audit_codebase`: Performs ts-morph AST analysis detecting N+1 queries, unindexed filters, and SQL injection risks.
    - `qa_check_schema_health`: Verifies missing primary keys, unindexed foreign keys, and empty tables.
    - `qa_run_tests`: Executes the live Vitest test runner across packages and returns structured assertion results.
    - `qa_apply_remediation`: Applies recommended schema indexes and code patches.
- **Future Complement**: Playwright MCP (`@playwright/mcp`) can be plugged in alongside for browser-level E2E validation.

### 3.5 Context Management: Proprietary Universal Graphify & Context-Index
- **Strategy**:
  - Fully custom, high-value proprietary system.
  - Exposes two-tier progressive disclosure MCP tools:
    - `context_get_summary`: Returns a token-efficient directory map and high-level architectural summary of the codebase (<1,000 tokens).
    - `context_read_file`: Reads targeted file contents with exact line numbers on demand.
    - `graphify_get_context`: Extracts 360° linked context combining code functions, database tables, and documentation markdown.
    - `graphify_impact_analysis`: Computes blast radius of proposed file changes.

---

## 4. Package Size Comparison (Pre-Implementation Estimates vs Current Baseline)

> [!NOTE]
> **Measurement Notice**: The "After" figures below are **Pre-Implementation Estimates**. Actual measured disk footprints (`node_modules`) and production client bundle sizes (`npm run build`) will be audited and reported with real numbers immediately after the removal of `@excalidraw/excalidraw` and DB drivers.

### Current Measured Baseline (Pre-Migration)
- `packages/ai-manager-web/node_modules`: **99.84 MB**
- Monorepo Root `node_modules`: **404.93 MB**
- Production Build Output (`dist/`): **16.07 MB**

### Estimated Post-Consolidation Savings

| Component | Before (Custom Scaffolding) | Estimated After (Master MCP & Proxied) | Net Reduction (Est.) |
|---|---|---|---|
| **Excalidraw Engine** (`@excalidraw/excalidraw`) | ~18.5 MB `node_modules`<br>~2.8 MB Client Bundle | **0 MB** (Remote draw.io MCP proxy) | **-100%** |
| **Database Drivers** (`mongoose`, `ioredis`, `pg`) | ~24.2 MB `node_modules` | **~2.1 MB** (Supabase JS client / MCP SDK) | **-91%** |
| **Custom Canvas Code** | ~4,200 lines TSX/TS | **0 lines** (Native OpenPencil + draw.io) | **-100%** |
| **ai-manager-web `node_modules` Size** | 99.84 MB (Measured) | **~55–60 MB (Estimated)** | **~-40%** |
| **Frontend Production Bundle (`dist/`)** | 16.07 MB (Measured) | **~10–12 MB (Estimated)** | **~-30%** |

---

## 5. Supabase Migration Plan & Auth Scope

### 5.1 Auth Scope Decision: Data Tables Only vs Supabase Auth

There are two distinct architectural pathways for the Supabase migration:

- **Option A (Recommended for Local Desktop .exe): DATA TABLES ONLY**:
  - Keep our existing custom bcrypt (10 salt rounds) + JWT Auth & RBAC (`user` / `admin`) as-is, along with local `.ai-manager/users.json` fallback.
  - Supabase is used **exclusively for data persistence**: `projects`, `activity_logs`, `settings`, and workspace metadata.
  - **Why Option A?**: Guarantees the Electron desktop app functions **offline**. Users can open the desktop app, view local projects, run the local AST indexer, and view diagrams even without internet connectivity.
  - Foreign keys in Supabase schema link to a dedicated `public.users(id)` table instead of `auth.users(id)`.

- **Option B: Full Supabase Auth Migration**:
  - Migrate all user registration, password hashing, sessions, and roles to Supabase GoTrue (`auth.users`).
  - Foreign keys directly reference `auth.users(id)` with Supabase Row-Level Security (RLS) policies evaluated via JWT claims (`auth.uid()`).
  - **Trade-off**: Requires active internet connectivity to log in or authenticate in the desktop application.

### 5.2 Migration Steps
1. **Step 1: Supabase Project Provisioning**: Hosted project or local instance (`npx supabase init`).
2. **Step 2: Relational Schema DDL Generation**:
   ```sql
   -- Option A: Custom users table preserving local RBAC
   CREATE TABLE public.users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     role TEXT DEFAULT 'user',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE public.projects (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
     slug TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     root_dir TEXT NOT NULL,
     status TEXT DEFAULT 'Not indexed',
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE public.activity_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     project_id TEXT NOT NULL,
     project_name TEXT NOT NULL,
     user_id UUID REFERENCES public.users(id),
     action TEXT NOT NULL,
     detail TEXT,
     status TEXT DEFAULT 'info',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
   ```
3. **Step 3: Data Transfer Pipeline**:
   - `scripts/migrateToSupabase.ts` reads local SQLite/JSON (`projects.json`, `activity.json`, `users.json`) and upserts records into Supabase PostgreSQL using the service role key.
4. **Step 4: Driver Deprecation**:
   - Remove `server/modules/db/drivers/` and replace `server/modules/db/index.ts` with Supabase MCP integration.

---

## 6. draw.io MCP Verification (Raw Server Details)

### 6.1 Server Identity
- **Endpoint**: `https://mcp.draw.io/mcp`
- **Transport**: Streamable HTTP with `mcp-session-id` session header
- **Implementation**: Official `jgraph/drawio-mcp` (Server Info: `name: "drawio-mcp-app", version: "1.0.0"`)
- **Raw JSON Artifact**: Saved in repository at `drawio_tools_raw.json` (62,148 bytes).

### 6.2 Raw Tool Definitions
1. **`create_diagram`**:
   - **Title**: Create Diagram
   - **Capabilities**: Accepts either draw.io XML (mxGraphModel) or Mermaid.js syntax.
   - **Supported Mermaid Types**: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram, gantt, pie, gitGraph, mindmap, timeline, quadrantChart, C4Context, architecture-beta, packet-beta, kanban, etc.
   - **Layout Passes**:
     - `postLayout: "elk"`: Optional Eclipse Layout Kernel hierarchical flow pass.
     - `routing: "libavoid"`: Obstacle-avoiding orthogonal edge routing pass that keeps vertices fixed and routes wires cleanly around boxes.
     - `direction`: "vertical" | "horizontal" for XML flows.
2. **`search_shapes`**:
   - **Title**: Search Shapes
   - **Description**: Searches 10,000+ built-in stencils across AWS, GCP, Azure, Kubernetes, Cisco, Rack, P&ID, electrical, and BPMN icon libraries, returning ready-to-use style strings.

---

## 7. OpenPencil MCP Audit Findings
- Package: `packages/open-pencil/packages/mcp`
- Standard: Native `@modelcontextprotocol/server` implementation.
- Transports:
  - **Stdio**: `dist/stdio.mjs`
  - **HTTP + WebSocket**: Port `7600` via Hono server
- Native Tools:
  - `list_documents`, `save_file`, `open_file`, plus core canvas manipulation tools.
- Finding: OpenPencil is **100% MCP compliant**. Our Master MCP can route directly to its local RPC endpoint without maintaining duplicate wrapper code.

---

## 8. QA & Testing MCP Research Summary
- **Playwright MCP (`@playwright/mcp`)**:
  - Official Microsoft package allowing LLMs to interact with headless browsers via the accessibility tree.
  - High suitability for complementary E2E UI verification.
- **In-House AST Engine (`ts-morph`)**:
  - No open-source MCP currently duplicates our exact N+1 query detection, SQLite/Postgres schema integrity rules, and live Vitest test runner.
  - **Decision**: Retain our custom QA logic and expose it via `qa_*` tools in the Master MCP.

---

## 9. Cloudflare Named Tunnel Setup & Domain Requirements

### 9.1 Domain Prerequisites for Named Tunnel
- A **Named Tunnel** (`cloudflared tunnel create <NAME>`) requires an active domain hosted on Cloudflare DNS.
- **Current Status**:
  - If a domain is already registered on Cloudflare (e.g. `yourdomain.com`), we create a CNAME record: `mcp.yourdomain.com` pointing to `<TUNNEL_UUID>.cfargotunnel.com`.
  - If NO domain is currently owned on Cloudflare:
    - **Path 1**: Purchase or transfer a custom domain to Cloudflare Registrar (~$8–$10/year) to get a permanent, branded Named Tunnel URL.
    - **Path 2 (Zero-Cost Dev/Demo Fallback)**: Use Cloudflare **Quick Tunnel** (`cloudflared tunnel --url http://localhost:3000`), which generates a free, instant public HTTPS URL (`https://*.trycloudflare.com`) with zero domain purchase or signup required. The app UI displays the active URL dynamically on startup.

### 9.2 Named Tunnel Setup Commands
```bash
# 1. Login to Cloudflare account (authenticates browser session)
cloudflared tunnel login

# 2. Create the named tunnel
cloudflared tunnel create ai-manager-desktop

# 3. Associate tunnel with your owned domain DNS
cloudflared tunnel route dns ai-manager-desktop mcp.<your-domain>.com

# 4. Run the tunnel pointing to local Express Master MCP port
cloudflared tunnel run --url http://localhost:3000 ai-manager-desktop
```

### 9.3 Custom Connector Configuration (Claude.ai / ChatGPT)
- **Server URL**: `https://mcp.<your-domain>.com/mcp` (or active trycloudflare URL)
- **Authentication**: Bearer Token
- **Token**: `<aim_live_token_from_desktop_ui>` (auto-generated 256-bit secret)
