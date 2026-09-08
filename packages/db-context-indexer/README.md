# DB Context Indexer (`dbci`)

Zero-AI-API static-analysis scanner and indexing tool for TypeScript/JavaScript codebases. Detects database clients (**MongoDB**, **Firebase Firestore**, **Supabase**, **MySQL/PostgreSQL**) and links queries, cross-file imports, and function call chains into an SQLite index.

---

## Features

- **Multi-Database Detection**: Scans and parses client instantiations for MongoDB/Mongoose, Firebase Admin/Firestore, Supabase JS client, and MySQL/PG pools.
- **Cross-File Symbol Resolution**: Follows re-exported, renamed (`import { db as myDb }`), and destructured imports using `ts-morph` AST traversal.
- **Call-Graph DB Tagging**: Computes direct and transitive DB access across function call chains (BFS up to 10 levels deep).
- **Local XAMPP / Dev Detection**: Flags `localhost` and `127.0.0.1` database connection strings.
- **Pluggable SQLite Storage**: Pluggable driver supporting native `better-sqlite3` and pure WebAssembly `sql.js` (zero-C++ fallback).
- **Zero-AI & Fully Local**: Pure static AST analysis with 0 external network/AI API calls.

---

## Installation

```bash
npm install db-context-indexer
```

Or run via `npx`:

```bash
npx dbci scan
```

---

## CLI Usage

### `dbci scan`
Scans the current project directory, builds the AST index, appends `.dbci/` to `.gitignore`, and saves SQLite index to `.dbci/index.sqlite`.

```bash
dbci scan [--dir <path>]
```

### `dbci query`
Filter indexed database calls by DB type or collection/table name.

```bash
# Query by DB type
dbci query --db mongo

# Query by collection/table name
dbci query --table users
```

### `dbci trace <functionName>`
Trace direct and transitive database touches for a specific function, including call graph edges.

```bash
dbci trace getUser
```

### `dbci unresolved`
List all database calls that could not be statically resolved at parse time with file:line and reasons.

```bash
dbci unresolved
```

### `dbci export --json`
Dump full `IndexResult` payload as JSON.

```bash
dbci export --json > db-index.json
```

---

## Sample JSON Output Shape (`IndexResult`)

```json
{
  "clients": [
    {
      "id": "mongodb:client:src/db.ts:3:28:mongoClient",
      "file": "src/db.ts",
      "line": 3,
      "variableName": "mongoClient",
      "dbType": "mongodb",
      "initExpression": "new MongoClient('mongodb://localhost:27017')",
      "exportedAs": "db",
      "configSource": "literal"
    }
  ],
  "queries": [
    {
      "id": "mongodb:query:src/services/userService.ts:5:102:find",
      "file": "src/services/userService.ts",
      "line": 5,
      "enclosingFunction": "getUser",
      "enclosingClass": null,
      "dbType": "mongodb",
      "operation": "find",
      "target": "users",
      "clientRefId": "mongodb:client:src/db.ts:3:28:mongoClient",
      "resolved": true
    }
  ],
  "functions": [
    {
      "id": "src/controllers/apiController.ts:3:45:routeHandler",
      "name": "routeHandler",
      "file": "src/controllers/apiController.ts",
      "line": 3,
      "className": null,
      "touchesDb": [],
      "transitiveTouchesDb": ["mongodb"]
    }
  ],
  "edges": [
    {
      "callerId": "src/controllers/apiController.ts:3:45:routeHandler",
      "calleeId": "src/services/userService.ts:4:32:getUser",
      "file": "src/controllers/apiController.ts",
      "line": 4
    }
  ],
  "unresolved": []
}
```

---

## Known Limitations

- **Dynamic Query Targets**: Table/collection names computed dynamically at runtime (e.g. `db.collection(req.body.table)`) cannot be statically determined and are flagged in `unresolved[]`.
- **SQL String Interpolation**: SQL queries constructed using template strings with embedded variable expressions (e.g. `` `SELECT * FROM ${tableName}` ``) are logged as unresolved.
- **Dynamic Requires / `eval`**: `eval()` statements or dynamic `require(variable)` paths bypass static import graph tracking.
- **Frontend Folder Conventions**: Frontend/backend directory detection relies on path conventions (`src/app/`, `client/`, `frontend/`) plus missing Mongoose import — atypical folder structures (e.g. `apps/web/`, `packages/frontend/`) without explicit Mongoose imports may not be caught by this guard.
- **Native SQLite Driver (`better-sqlite3`)**: Native C++ driver mode is unverified on environments requiring manual compilation due to lack of VS C++ build tools during initial test run; default `'auto'` mode seamlessly uses WASM `sql.js` fallback.

---

## License

MIT
