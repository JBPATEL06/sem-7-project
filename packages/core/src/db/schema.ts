export const SCHEMA_SQL = `
-- Context Module Namespaced Tables
CREATE TABLE IF NOT EXISTS context_clients (
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

CREATE TABLE IF NOT EXISTS context_queries (
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

CREATE TABLE IF NOT EXISTS context_functions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  endLine INTEGER NOT NULL DEFAULT 0,
  className TEXT,
  touchesDb TEXT NOT NULL,
  transitiveTouchesDb TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_call_edges (
  callerId TEXT NOT NULL,
  calleeId TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  PRIMARY KEY (callerId, calleeId, file, line)
);

CREATE TABLE IF NOT EXISTS context_symbol_references (
  id TEXT PRIMARY KEY,
  declarationId TEXT NOT NULL,
  file TEXT NOT NULL,
  line INTEGER NOT NULL,
  refType TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS context_file_hashes (
  file TEXT PRIMARY KEY,
  contentHash TEXT NOT NULL,
  lastScanned TEXT NOT NULL
);

-- Discussion & Decision Rationale Layer
CREATE TABLE IF NOT EXISTS discussion_threads (
  id TEXT PRIMARY KEY,
  targetType TEXT NOT NULL, -- 'file' | 'function' | 'class' | 'query' | 'project'
  targetId TEXT NOT NULL,
  title TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL   -- 'user' | 'ai' | author name
);

CREATE TABLE IF NOT EXISTS discussion_entries (
  id TEXT PRIMARY KEY,
  threadId TEXT NOT NULL,
  author TEXT NOT NULL,     -- 'user' | 'ai'
  body TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  targetType TEXT NOT NULL, -- 'file' | 'function' | 'class' | 'query' | 'project'
  targetId TEXT NOT NULL,
  summary TEXT NOT NULL,
  rationale TEXT NOT NULL,
  decidedBy TEXT NOT NULL,
  decidedAt TEXT NOT NULL,
  supersedes TEXT           -- decisionId of overridden decision or NULL
);

-- Feature Planning Layer
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL,
  title TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL, -- 'draft' | 'in_progress' | 'completed' | 'blocked'
  createdBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  sourceThreadId TEXT,
  relatedDecisionId TEXT
);

CREATE TABLE IF NOT EXISTS plan_progress_log (
  id TEXT PRIMARY KEY,
  planId TEXT NOT NULL,
  stepIndex INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL, -- 'done' | 'failed' | 'in_progress'
  evidence TEXT,
  timestamp TEXT NOT NULL
);

-- AI Write Proposals Layer (Human-Approval Gated)
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,       -- 'code' | 'discussion' | 'decision' | 'plan' | 'issue'
  targetType TEXT NOT NULL, -- 'file' | 'function' | 'class' | 'query' | 'project'
  targetId TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,    -- JSON string payload
  proposedBy TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL,     -- 'pending' | 'approved' | 'rejected'
  reviewedBy TEXT,
  reviewedAt TEXT,
  rejectionReason TEXT
);

-- Legacy & Universal Backward Compatibility Views
CREATE VIEW IF NOT EXISTS clients AS SELECT * FROM context_clients;
CREATE VIEW IF NOT EXISTS queries AS SELECT * FROM context_queries;
CREATE VIEW IF NOT EXISTS functions AS SELECT * FROM context_functions;
CREATE VIEW IF NOT EXISTS call_edges AS SELECT * FROM context_call_edges;
CREATE VIEW IF NOT EXISTS symbol_references AS SELECT * FROM context_symbol_references;
CREATE VIEW IF NOT EXISTS file_hashes AS SELECT * FROM context_file_hashes;
CREATE VIEW IF NOT EXISTS threads AS SELECT * FROM discussion_threads;
CREATE VIEW IF NOT EXISTS entries AS SELECT * FROM discussion_entries;
CREATE VIEW IF NOT EXISTS decision_history AS SELECT * FROM decisions;
CREATE VIEW IF NOT EXISTS project_plans AS SELECT * FROM plans;
CREATE VIEW IF NOT EXISTS plan_logs AS SELECT * FROM plan_progress_log;
CREATE VIEW IF NOT EXISTS pending_proposals AS SELECT * FROM proposals WHERE status = 'pending';

-- Schema Manager Module Placeholder Tables
CREATE TABLE IF NOT EXISTS schema_snapshots (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,   -- 'firebase' | 'supabase' | 'mongo' | 'xampp'
  targetName TEXT NOT NULL,
  schemaJson TEXT NOT NULL,
  capturedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_drift_logs (
  id TEXT PRIMARY KEY,
  targetName TEXT NOT NULL,
  driftType TEXT NOT NULL,
  details TEXT NOT NULL,
  loggedAt TEXT NOT NULL
);

-- QA Tester Placeholder Tables
CREATE TABLE IF NOT EXISTS qa_test_scaffolds (
  id TEXT PRIMARY KEY,
  targetFunctionId TEXT NOT NULL,
  filePath TEXT NOT NULL,
  generatedCode TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_context_clients_dbType ON context_clients(dbType);
CREATE INDEX IF NOT EXISTS idx_context_clients_file ON context_clients(file);
CREATE INDEX IF NOT EXISTS idx_context_queries_dbType ON context_queries(dbType);
CREATE INDEX IF NOT EXISTS idx_context_queries_file ON context_queries(file);
CREATE INDEX IF NOT EXISTS idx_context_queries_enclosingFunction ON context_queries(enclosingFunction);
CREATE INDEX IF NOT EXISTS idx_context_functions_file ON context_functions(file);
CREATE INDEX IF NOT EXISTS idx_context_symbol_references_decl ON context_symbol_references(declarationId);
CREATE INDEX IF NOT EXISTS idx_context_symbol_references_file ON context_symbol_references(file);

CREATE INDEX IF NOT EXISTS idx_discussion_threads_target ON discussion_threads(targetType, targetId);
CREATE INDEX IF NOT EXISTS idx_discussion_entries_thread ON discussion_entries(threadId);
CREATE INDEX IF NOT EXISTS idx_decisions_target ON decisions(targetType, targetId);
CREATE INDEX IF NOT EXISTS idx_plans_project ON plans(projectId);
CREATE INDEX IF NOT EXISTS idx_plans_thread ON plans(sourceThreadId);
CREATE INDEX IF NOT EXISTS idx_plans_decision ON plans(relatedDecisionId);
CREATE INDEX IF NOT EXISTS idx_plan_logs_planId ON plan_progress_log(planId);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_target ON proposals(targetType, targetId);
`;


