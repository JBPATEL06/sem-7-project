# AI Manager — Data Dictionary

## Storage split (current, as of Day 3 + Mongo Atlas authorization)
- **MongoDB Atlas** (`cluster0.cgdh1pm.mongodb.net/ai_manager`): primary store for users + all application data.
- **sql.js (WASM SQLite)**: per-project database sandboxes ONLY — this is the actual "DB Manager" feature being demonstrated (user-created tables/rows inside a project), not internal app storage. File: `.ai-manager/dbs/:projectId.sqlite`.
- **`.ai-manager/credentials.enc`**: AES-256-GCM encrypted API keys (Groq, GitHub, OpenAI) — stays local, never in Mongo.
- **Legacy local JSON files**: pre-Mongo-Atlas fallback/original store. `users.json` is still the auth fallback if Mongo is unreachable.

## Collections (MongoDB Atlas — `server/models/index.ts`)
### `users`
Unique user accounts and authentication.
### `projects`
Stores project slug, name, description, status, file list, and metadata in MongoDB Atlas.
### `modules`
Stores modules with foreign key to projects in MongoDB Atlas.
### `diagrams`
Stores canvas diagrams and Excalidraw element trees in MongoDB Atlas.
### `branch_flags`
Stores git branch status and color flags in MongoDB Atlas.
### `activity_logs`
Stores audit trails and user activity in MongoDB Atlas.
### `settings`
Stores system configuration key-values in MongoDB Atlas.
### `db_connections`
Stores database connection profiles in MongoDB Atlas.
