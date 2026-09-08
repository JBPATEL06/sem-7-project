CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  variableName TEXT NOT NULL,
  dbType TEXT NOT NULL,
  initExpression TEXT NOT NULL,
  exportedAs TEXT,
  configSource TEXT NOT NULL,
  metadata TEXT
);

CREATE TABLE IF NOT EXISTS queries (
  id TEXT PRIMARY KEY,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  enclosingFunction TEXT,
  enclosingClass TEXT,
  dbType TEXT NOT NULL,
  operation TEXT NOT NULL,
  target TEXT,
  clientRefId TEXT,
  resolved INTEGER NOT NULL,
  unresolvedReason TEXT
);

CREATE TABLE IF NOT EXISTS functions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  endLine INTEGER NOT NULL DEFAULT 0,
  className TEXT,
  touchesDb TEXT NOT NULL,
  transitiveTouchesDb TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS call_edges (
  callerId TEXT NOT NULL,
  calleeId TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  PRIMARY KEY (callerId, calleeId, file, line)
);

CREATE TABLE IF NOT EXISTS symbol_references (
  id TEXT PRIMARY KEY,
  declarationId TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  refType TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS file_hashes (
  file TEXT PRIMARY KEY,
  contentHash TEXT NOT NULL,
  lastScanned TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_dbType ON clients(dbType);
CREATE INDEX IF NOT EXISTS idx_clients_file ON clients(file);
CREATE INDEX IF NOT EXISTS idx_queries_dbType ON queries(dbType);
CREATE INDEX IF NOT EXISTS idx_queries_file ON queries(file);
CREATE INDEX IF NOT EXISTS idx_queries_enclosingFunction ON queries(enclosingFunction);
CREATE INDEX IF NOT EXISTS idx_functions_file ON functions(file);
CREATE INDEX IF NOT EXISTS idx_symbol_references_decl ON symbol_references(declarationId);
CREATE INDEX IF NOT EXISTS idx_symbol_references_file ON symbol_references(file);
