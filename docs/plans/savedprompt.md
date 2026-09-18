# Prompt: AI Manager — Unified Context-Aware Chat + MCP Service Layer

I am developing the AI Manager monorepo (`packages/ai-manager-web`), which already has modular tools for database management, diagrams, UI/screen design, Git management, and QA/AST audit.

I need two things: (1) a unified chat interface, and (2) every service exposed as an MCP tool with in-page AI actions.

---

### 1. Context Management — Correction (replace any earlier "graph DB" instruction)

Do NOT use a vector DB and do NOT introduce Neo4j or any external graph database. Use this pattern instead (same as how Claude manages memory):

- **Index layer (always loaded, cheap):** A lightweight listing of all context files — chat sessions, docs, issues, PRDs — with only a path + one-line summary each. This should cost only a few hundred tokens even with 100+ files.
- **On-demand read (selective):** Only when the user's current prompt matches a listing entry's topic, load that specific file's full content. Never load everything into context at once.
- **No embeddings, no semantic similarity search.** Matching is topic/keyword-based against the listing, not vector search. This keeps token usage low and retrieval exact rather than fuzzy.
- Store: chat history (session files), docs, PRDs, issues (open/resolved status), code audit results, progress notes — each as its own file/record, indexed by the listing layer.

---

### 2. MCP-ify Every Existing Service

Wrap each existing backend service as an MCP tool so the chat AI can call them the same way Claude calls tools — decided by intent, not dumped upfront:

- `db_tool` — query/schema/connections (Postgres, Mongo, Redis, SQLite)
- `diagram_tool` — create, edit, delete Excalidraw diagrams
- `figma_tool` / screen design tool — create, edit, delete UI screens
- `git_tool` — branches, commits, diffs, sync
- `qa_tool` — run tests, AST flow audit, report issues

The chat AI should decide which tool(s) to call based on the user's prompt — e.g. "delete the login screen diagram" → calls `diagram_tool` with a delete action, not a generic text response.

---

### 3. Unified Chat Interface (Claude-like)

- Clean chat page/drawer in `packages/ai-manager-web`, streaming responses.
- Full access to all MCP tools above.
- Must feel like one continuous assistant with full project awareness — never like a disconnected external AI with no memory of prior sessions or current state.
- Visual feedback for tool calls (collapsible pill showing tool name, action, status).

### 4. In-Page AI Actions (every service page, not just chat)

Every existing service page must ALSO have its own embedded AI control, not just the central chat:

- **Diagram page:** AI option to create, edit, or delete existing diagrams directly on that page (not only via chat).
- **Figma/Screen design page:** same — AI can create, edit, or delete UI screens/components in place.
- **DB page:** AI option to run queries, modify schema, or manage connections directly from the DB UI.
- **QA page:** AI option to trigger test runs, fix flagged issues, or re-audit directly from the QA UI.
- **GitHub/Git page:** AI option to create branches, commit, or resolve diffs directly from the Git UI.

Each page's AI action should use the SAME underlying MCP tool as the central chat — no duplicate logic, just a local entry point into the same tool.

---

### 5. Deliverables
1. MCP tool wrappers for db, diagram, screen/figma, git, qa services.
2. Context index + on-demand file loader (chat/docs/issues/progress).
3. Central chat page (`/chat`) using the MCP tools.
4. Embedded AI control added to each existing service page, wired to the same MCP tools.
5. Test coverage for tool dispatch and context retrieval scoping.