import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import { GraphNode, GraphEdge, GraphStats, ProjectContextBundle } from '@ai-manager/core';
import { UniversalGraphResult } from '../core/graphifyBuilder.js';

export const GRAPHIFY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    label TEXT NOT NULL,
    file TEXT,
    line INTEGER,
    end_line INTEGER,
    metadata TEXT,
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY(source_id) REFERENCES graph_nodes(id) ON DELETE CASCADE,
    FOREIGN KEY(target_id) REFERENCES graph_nodes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS graph_bundle (
    project_id TEXT PRIMARY KEY,
    bundle_json TEXT NOT NULL,
    stats_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
  CREATE INDEX IF NOT EXISTS idx_graph_nodes_file ON graph_nodes(file);
  CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id);
  CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id);
  CREATE INDEX IF NOT EXISTS idx_graph_edges_type ON graph_edges(type);
`;

/**
 * Saves a Universal Graph Result directly into SQLite
 */
export async function saveGraphToSqlite(dbPath: string, graph: UniversalGraphResult, projectId: string = 'sem-7-project'): Promise<void> {
  const targetDir = path.dirname(dbPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database();

  db.run(GRAPHIFY_SCHEMA_SQL);

  // Insert Nodes
  const insertNodeStmt = db.prepare(`
    INSERT OR REPLACE INTO graph_nodes (id, type, label, file, line, end_line, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const node of graph.nodes) {
    insertNodeStmt.run([
      node.id,
      node.type,
      node.label,
      node.file || null,
      node.line || null,
      node.endLine || null,
      node.metadata ? JSON.stringify(node.metadata) : null,
      node.createdAt || new Date().toISOString(),
      node.updatedAt || new Date().toISOString()
    ]);
  }
  insertNodeStmt.free();

  // Insert Edges
  const insertEdgeStmt = db.prepare(`
    INSERT OR REPLACE INTO graph_edges (id, source_id, target_id, type, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const edge of graph.edges) {
    insertEdgeStmt.run([
      edge.id,
      edge.sourceId,
      edge.targetId,
      edge.type,
      edge.metadata ? JSON.stringify(edge.metadata) : null
    ]);
  }
  insertEdgeStmt.free();

  // Insert Context Bundle
  const insertBundleStmt = db.prepare(`
    INSERT OR REPLACE INTO graph_bundle (project_id, bundle_json, stats_json, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  insertBundleStmt.run([
    projectId,
    JSON.stringify(graph.bundle),
    JSON.stringify(graph.stats),
    new Date().toISOString()
  ]);
  insertBundleStmt.free();

  const binary = db.export();
  fs.writeFileSync(dbPath, Buffer.from(binary));
  db.close();
}

/**
 * Loads the Universal Context Graph from SQLite
 */
export async function loadGraphFromSqlite(dbPath: string, projectId: string = 'sem-7-project'): Promise<UniversalGraphResult | null> {
  if (!fs.existsSync(dbPath)) return null;

  try {
    const fileBuffer = fs.readFileSync(dbPath);
    const SQL = await initSqlJs();
    const db = new SQL.Database(fileBuffer);

    // Read nodes
    const nodeRows = db.exec("SELECT id, type, label, file, line, end_line, metadata, created_at, updated_at FROM graph_nodes");
    const nodes: GraphNode[] = [];

    if (nodeRows.length > 0 && nodeRows[0].values) {
      for (const row of nodeRows[0].values) {
        nodes.push({
          id: String(row[0]),
          type: row[1] as any,
          label: String(row[2]),
          file: row[3] ? String(row[3]) : undefined,
          line: row[4] !== null ? Number(row[4]) : undefined,
          endLine: row[5] !== null ? Number(row[5]) : undefined,
          metadata: row[6] ? JSON.parse(String(row[6])) : undefined,
          createdAt: row[7] ? String(row[7]) : undefined,
          updatedAt: row[8] ? String(row[8]) : undefined
        });
      }
    }

    // Read edges
    const edgeRows = db.exec("SELECT id, source_id, target_id, type, metadata FROM graph_edges");
    const edges: GraphEdge[] = [];

    if (edgeRows.length > 0 && edgeRows[0].values) {
      for (const row of edgeRows[0].values) {
        edges.push({
          id: String(row[0]),
          sourceId: String(row[1]),
          targetId: String(row[2]),
          type: row[3] as any,
          metadata: row[4] ? JSON.parse(String(row[4])) : undefined
        });
      }
    }

    // Read bundle & stats
    const bundleRows = db.exec("SELECT bundle_json, stats_json FROM graph_bundle LIMIT 1");
    let bundle: ProjectContextBundle = {
      projectId,
      timestamp: new Date().toISOString(),
      prd: { overview: '', valueProps: [], targetUsers: [], scopeBoundaries: [] },
      architecture: { techStack: [], keyDecisions: [], folderStructure: [] },
      plans: { nextUp: [], roadmap: [] },
      progress: { done: [], inProgress: [], broken: [] },
      issues: { openBugs: [], knownGaps: [] },
      qaHealth: { healthScore: 100, schemaIssuesCount: 0, astSafetyIssuesCount: 0, testsPassing: true },
      aiLineage: { recentAiEditsCount: 0, activeModels: [] }
    };

    let stats: GraphStats = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType: {
        file: 0, function: 0, route: 0, table: 0, prd_spec: 0, doc_section: 0,
        plan_item: 0, progress_item: 0, issue: 0, audit_finding: 0, test_suite: 0, ai_trace: 0
      },
      edgesByType: {
        IMPORTS: 0, CALLS: 0, TOUCHES_DB: 0, HANDLES_ROUTE: 0, IMPLEMENTS_SPEC: 0,
        DOCUMENTED_IN: 0, HAS_ISSUE: 0, PLANNED_BY: 0, STATUS_OF: 0, AUDITED_BY: 0,
        VERIFIED_BY: 0, MODIFIED_BY_AI: 0, AUTHORED_BY_USER: 0
      },
      dbTouchCount: 0,
      openIssuesCount: 0,
      auditFindingsCount: 0,
      aiTracesCount: 0,
      healthScore: 100
    };

    if (bundleRows.length > 0 && bundleRows[0].values && bundleRows[0].values.length > 0) {
      const row = bundleRows[0].values[0];
      if (row[0]) bundle = JSON.parse(String(row[0]));
      if (row[1]) stats = JSON.parse(String(row[1]));
    }

    db.close();
    return { nodes, edges, stats, bundle };
  } catch (err) {
    console.error('[graphifySqliteStore] Failed to load graph from SQLite:', err);
    return null;
  }
}
