import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import initSqlJs from 'sql.js';
import { logActivity } from './dashboardRoutes.js';

export const qaRouter = Router();

const DBS_DIR = path.resolve(process.cwd(), '.ai-manager/dbs');
const ACTIVITY_FILE = path.resolve(process.cwd(), '.ai-manager/activity.json');

let SQL_PROMISE: ReturnType<typeof initSqlJs> | null = null;
async function getSqlInstance() {
  if (!SQL_PROMISE) {
    SQL_PROMISE = initSqlJs();
  }
  return await SQL_PROMISE;
}

function getProjectDbPath(projectId: string): { dbPath: string; exists: boolean } {
  const candidates = [
    path.resolve(`.ai-manager/dbs/${projectId}.sqlite`),
    path.resolve(`.tmp_projects/${projectId}/index.sqlite`)
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return { dbPath: candidate, exists: true };
  }

  if (projectId === 'sem-7-project' || projectId === 'monorepo' || projectId === 'db-context-indexer') {
    const rootCandidates = [
      path.resolve('.dbci/index.sqlite'),
      path.resolve('../../.dbci/index.sqlite')
    ];
    for (const c of rootCandidates) {
      if (fs.existsSync(c)) return { dbPath: c, exists: true };
    }
  }

  const defaultPath = path.resolve(process.cwd(), `.ai-manager/dbs/${projectId}.sqlite`);
  return { dbPath: defaultPath, exists: fs.existsSync(defaultPath) };
}

export interface QaDiagnosticIssue {
  id: string;
  code: 'NO_PRIMARY_KEY' | 'MISSING_COLUMN_TYPE' | 'EMPTY_TABLE' | 'ORPHAN_FOREIGN_KEY' | 'UNINDEXED_WORKSPACE';
  severity: 'critical' | 'warning' | 'minor';
  title: string;
  description: string;
  tableName?: string;
  columnName?: string;
  suggestion: string;
}

export interface TableSummaryItem {
  name: string;
  columnCount: number;
  rowCount: number;
}

export interface DiagnosticResult {
  projectId: string;
  indexed: boolean;
  dbPath?: string;
  issues: QaDiagnosticIssue[];
  tables: TableSummaryItem[];
  summary: {
    total: number;
    critical: number;
    warning: number;
    minor: number;
    tablesScanned: number;
    columnsScanned: number;
    healthScore: number;
  };
  systemHealth: {
    indexerEngine: string;
    groqApi: string;
    sqlJsRuntime: string;
    encryptionLayer: string;
  };
  scannedAt: string;
}

async function runDiagnosticsForProject(projectId: string): Promise<DiagnosticResult> {
  const { dbPath, exists } = getProjectDbPath(projectId);
  const SQL = await getSqlInstance();

  // 1. Live System Components Health
  let sqlJsStatus = 'Operational';
  try {
    const testDb = new SQL.Database();
    testDb.run('SELECT 1;');
    testDb.close();
  } catch {
    sqlJsStatus = 'Degraded';
  }

  const groqKeyPresent = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);
  const groqStatus = groqKeyPresent ? 'Operational' : 'Not Configured (Key Required)';

  const credsPath = path.resolve(process.cwd(), '.ai-manager/credentials.enc');
  const encStatus = fs.existsSync(credsPath) ? 'AES-256-GCM Active' : 'Pending Setup';

  // If project database does not exist
  if (!exists) {
    return {
      projectId,
      indexed: false,
      issues: [
        {
          id: `issue_${projectId}_unindexed`,
          code: 'UNINDEXED_WORKSPACE',
          severity: 'warning',
          title: `Workspace '${projectId}' has no indexed SQLite schema`,
          description: `No active SQLite database file found at .ai-manager/dbs/${projectId}.sqlite.`,
          suggestion: 'Create tables in DB Manager or run DBCI scan once built.'
        }
      ],
      tables: [],
      summary: {
        total: 1,
        critical: 0,
        warning: 1,
        minor: 0,
        tablesScanned: 0,
        columnsScanned: 0,
        healthScore: 60
      },
      systemHealth: {
        indexerEngine: 'Pending Tier 2 (DBCI Scanner)',
        groqApi: groqStatus,
        sqlJsRuntime: sqlJsStatus,
        encryptionLayer: encStatus
      },
      scannedAt: new Date().toISOString()
    };
  }

  // 2. Load SQLite file buffer and introspect schema
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const masterRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const tableNames: string[] = masterRes.length > 0 ? masterRes[0].values.map((v) => String(v[0])) : [];

  const issues: QaDiagnosticIssue[] = [];
  const tableSummaries: TableSummaryItem[] = [];
  let totalColumnsScanned = 0;

  if (tableNames.length === 0) {
    issues.push({
      id: `issue_${projectId}_empty_db`,
      code: 'EMPTY_TABLE',
      severity: 'warning',
      title: 'Database contains no user tables',
      description: 'The SQLite database file exists but contains 0 tables.',
      suggestion: 'Create tables via DB Manager (+ Create Table modal) or load seed schema.'
    });
  }

  for (const tableName of tableNames) {
    const pragmaRes = db.exec(`PRAGMA table_info("${tableName}");`);
    const columns: Array<{ name: string; type: string; notNull: boolean; pk: boolean }> = [];

    if (pragmaRes.length > 0) {
      for (const row of pragmaRes[0].values) {
        totalColumnsScanned++;
        columns.push({
          name: String(row[1]),
          type: String(row[2] || '').trim(),
          notNull: Boolean(row[3]),
          pk: Boolean(row[5])
        });
      }
    }

    // Rule 1: Table has no Primary Key
    const hasPk = columns.some((c) => c.pk);
    if (!hasPk) {
      issues.push({
        id: `issue_${tableName}_no_pk`,
        code: 'NO_PRIMARY_KEY',
        severity: 'critical',
        tableName,
        title: `Table '${tableName}' has no PRIMARY KEY defined`,
        description: `All records in '${tableName}' lack a unique primary key identifier, which can cause duplicate rows and inefficient lookups.`,
        suggestion: `Add an 'id INTEGER PRIMARY KEY' column to table '${tableName}'.`
      });
    }

    // Rule 2: Missing or Ambiguous Column Types
    for (const col of columns) {
      const typeClean = col.type.toUpperCase();
      if (!col.type || typeClean === '' || typeClean === 'NONE' || typeClean === 'UNKNOWN' || typeClean === 'ANY') {
        issues.push({
          id: `issue_${tableName}_${col.name}_no_type`,
          code: 'MISSING_COLUMN_TYPE',
          severity: 'warning',
          tableName,
          columnName: col.name,
          title: `Column '${col.name}' in '${tableName}' has no data type declared`,
          description: `Column '${col.name}' was created without a defined SQLite data type affinity.`,
          suggestion: `Explicitly declare a data type (e.g. TEXT, INTEGER, REAL, BLOB).`
        });
      }

      // Rule 3: Orphaned Foreign-Key Column (e.g. user_id, order_id without matching users/orders table)
      const fkMatch = col.name.match(/^(.+?)(_id|Id)$/i);
      if (fkMatch && !col.pk) {
        const targetPrefix = fkMatch[1].toLowerCase();
        const matchingTable = tableNames.find((t) => {
          const tl = t.toLowerCase();
          return tl === targetPrefix || tl === `${targetPrefix}s` || tl === `${targetPrefix}es`;
        });

        if (!matchingTable) {
          issues.push({
            id: `issue_${tableName}_${col.name}_orphan_fk`,
            code: 'ORPHAN_FOREIGN_KEY',
            severity: 'warning',
            tableName,
            columnName: col.name,
            title: `Potential orphaned foreign key '${col.name}' in '${tableName}'`,
            description: `Column '${col.name}' follows foreign key convention but no matching table (e.g. '${targetPrefix}' or '${targetPrefix}s') exists in schema.`,
            suggestion: `Verify relationship or create the referenced table '${targetPrefix}s'.`
          });
        }
      }
    }

    // Rule 4: Empty table check
    let rowCount = 0;
    try {
      const countRes = db.exec(`SELECT COUNT(*) FROM "${tableName}";`);
      if (countRes.length > 0 && countRes[0].values.length > 0) {
        rowCount = Number(countRes[0].values[0][0]) || 0;
      }
    } catch {}

    if (rowCount === 0) {
      issues.push({
        id: `issue_${tableName}_empty`,
        code: 'EMPTY_TABLE',
        severity: 'minor',
        tableName,
        title: `Table '${tableName}' has 0 rows`,
        description: `Table schema is registered but contains no data records.`,
        suggestion: `Insert test fixtures or initial records.`
      });
    }

    tableSummaries.push({
      name: tableName,
      columnCount: columns.length,
      rowCount
    });
  }

  db.close();

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;

  const healthScore = Math.max(0, 100 - (criticalCount * 25) - (warningCount * 10) - (minorCount * 3));

  return {
    projectId,
    indexed: true,
    dbPath,
    issues,
    tables: tableSummaries,
    summary: {
      total: issues.length,
      critical: criticalCount,
      warning: warningCount,
      minor: minorCount,
      tablesScanned: tableNames.length,
      columnsScanned: totalColumnsScanned,
      healthScore
    },
    systemHealth: {
      indexerEngine: 'Pending Tier 2 (DBCI Scanner)',
      groqApi: groqStatus,
      sqlJsRuntime: sqlJsStatus,
      encryptionLayer: encStatus
    },
    scannedAt: new Date().toISOString()
  };
}

// GET /api/qa/diagnostics — Run real local rule-based diagnostics against active project SQLite schema
qaRouter.get('/diagnostics', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const result = await runDiagnosticsForProject(projectId);

    res.status(200).json(result);
  } catch (err: any) {
    console.error('[qa/diagnostics] Error:', err);
    res.status(500).json({ error: `Failed to run diagnostics: ${err.message}` });
  }
});

// GET /api/qa/logs — Real system activity & query logs
qaRouter.get('/logs', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let activities: any[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      try {
        activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
      } catch {}
    }

    const logLines = activities.map((act) => {
      const time = act.timestamp ? new Date(act.timestamp).toLocaleTimeString() : '12:00:00';
      const level = act.status === 'warning' ? '[WARN]' : act.status === 'destructive' ? '[ERROR]' : '[INFO]';
      return `${level} ${time} [${act.projectName || 'system'}] — ${act.action}: ${act.detail}`;
    });

    if (logLines.length === 0) {
      logLines.push(`[INFO] ${new Date().toLocaleTimeString()} [system] — Express Server & sql.js WASM runtime operational`);
    }

    res.status(200).json({
      logs: logLines,
      total: logLines.length
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to load logs: ${err.message}` });
  }
});

// GET /api/qa/export-report — Generate and download real Markdown QA report
qaRouter.get('/export-report', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const diag = await runDiagnosticsForProject(projectId);

    let md = `# QA Diagnostic & Schema Health Report\n\n`;
    md += `- **Project:** \`${diag.projectId}\`\n`;
    md += `- **Generated At:** ${diag.scannedAt}\n`;
    md += `- **Database Path:** \`${diag.dbPath || 'No database initialized'}\`\n`;
    md += `- **Overall Health Score:** **${diag.summary.healthScore}%**\n`;
    md += `- **Issues Summary:** ${diag.summary.critical} Critical, ${diag.summary.warning} Warning, ${diag.summary.minor} Minor (${diag.summary.total} total)\n\n`;

    md += `## 1. System Runtimes\n\n`;
    md += `- **sql.js WASM Engine:** ${diag.systemHealth.sqlJsRuntime}\n`;
    md += `- **Groq LLM API:** ${diag.systemHealth.groqApi}\n`;
    md += `- **Encryption Layer:** ${diag.systemHealth.encryptionLayer}\n`;
    md += `- **AST Indexer:** ${diag.systemHealth.indexerEngine}\n\n`;

    md += `## 2. Diagnostic Issues Detected\n\n`;
    if (diag.issues.length === 0) {
      md += `✓ *No schema diagnostic issues detected. All tables have valid primary keys, explicit types, and relational integrity.*\n\n`;
    } else {
      diag.issues.forEach((issue, index) => {
        const severityBadge = issue.severity.toUpperCase();
        md += `### ${index + 1}. [${severityBadge}] ${issue.title}\n\n`;
        md += `- **Code:** \`${issue.code}\`\n`;
        if (issue.tableName) md += `- **Table:** \`${issue.tableName}\`\n`;
        if (issue.columnName) md += `- **Column:** \`${issue.columnName}\`\n`;
        md += `- **Description:** ${issue.description}\n`;
        md += `- **Recommendation:** *${issue.suggestion}*\n\n`;
      });
    }

    md += `## 3. Schema Inventory\n\n`;
    if (diag.tables.length === 0) {
      md += `*No tables registered.*\n`;
    } else {
      md += `| Table Name | Columns | Row Count |\n`;
      md += `|---|---|---|\n`;
      diag.tables.forEach((t) => {
        md += `| \`${t.name}\` | ${t.columnCount} | ${t.rowCount} |\n`;
      });
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="qa-report-${projectId}.md"`);
    res.send(md);
  } catch (err: any) {
    console.error('[qa/export-report] Error:', err);
    res.status(500).json({ error: `Failed to export QA report: ${err.message}` });
  }
});
