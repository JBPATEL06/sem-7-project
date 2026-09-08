import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import initSqlJs from 'sql.js';

export const dbRouter = Router();

let SQL_PROMISE: ReturnType<typeof initSqlJs> | null = null;

async function getSqlInstance() {
  if (!SQL_PROMISE) {
    SQL_PROMISE = initSqlJs();
  }
  return await SQL_PROMISE;
}

function getProjectDbPath(projectId: string): { dbPath: string; exists: boolean } {
  const projectSpecificCandidates = [
    path.resolve(`.ai-manager/dbs/${projectId}.sqlite`),
    path.resolve(`.tmp_projects/${projectId}/index.sqlite`)
  ];

  for (const candidate of projectSpecificCandidates) {
    if (fs.existsSync(candidate)) {
      return { dbPath: candidate, exists: true };
    }
  }

  // If root/monorepo project is explicitly requested
  if (projectId === 'sem-7-project' || projectId === 'monorepo' || projectId === 'db-context-indexer') {
    const rootCandidates = [
      path.resolve('.dbci/index.sqlite'),
      path.resolve('../../.dbci/index.sqlite'),
      path.resolve('../db-context-indexer/.dbci/index.sqlite'),
      path.resolve('packages/db-context-indexer/.dbci/index.sqlite')
    ];
    for (const candidate of rootCandidates) {
      if (fs.existsSync(candidate)) {
        return { dbPath: candidate, exists: true };
      }
    }
  }

  // Default path for project
  const defaultPath = path.resolve(process.cwd(), `.ai-manager/dbs/${projectId}.sqlite`);
  return { dbPath: defaultPath, exists: fs.existsSync(defaultPath) };
}


export interface ColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  dfltValue: any;
  pk: boolean;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
}

// GET /api/db/schema — Inspect real SQLite schema tables, columns, and row counts
dbRouter.get('/schema', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const { dbPath, exists } = getProjectDbPath(projectId);
    if (!exists) {
      res.status(200).json({
        indexed: false,
        projectId,
        dbPath: null,
        tables: [],
        message: `No SQLite database found for project '${projectId}'.`
      });
      return;
    }

    const SQL = await getSqlInstance();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const masterRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
    const tableNames: string[] = masterRes.length > 0 ? masterRes[0].values.map((v) => String(v[0])) : [];

    const tables: TableSchema[] = [];

    for (const tableName of tableNames) {
      // Get column definitions
      const pragmaRes = db.exec(`PRAGMA table_info("${tableName}");`);
      const columns: ColumnInfo[] = [];

      if (pragmaRes.length > 0) {
        for (const row of pragmaRes[0].values) {
          // PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
          columns.push({
            name: String(row[1]),
            type: String(row[2] || 'TEXT'),
            notNull: Boolean(row[3]),
            dfltValue: row[4],
            pk: Boolean(row[5])
          });
        }
      }

      // Get row count
      let rowCount = 0;
      try {
        const countRes = db.exec(`SELECT COUNT(*) as count FROM "${tableName}";`);
        if (countRes.length > 0 && countRes[0].values.length > 0) {
          rowCount = Number(countRes[0].values[0][0]) || 0;
        }
      } catch {}

      tables.push({
        name: tableName,
        columns,
        rowCount
      });
    }

    db.close();

    res.status(200).json({
      indexed: tables.length > 0,
      projectId,
      dbPath,
      tables,
      totalTables: tables.length
    });
  } catch (err: any) {
    console.error(`[db/schema] Error: ${err.message}`);
    res.status(500).json({ error: `Failed to inspect schema: ${err.message}` });
  }
});

// POST /api/db/query — Execute real SQL statement against project SQLite database
dbRouter.post('/query', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = performance.now();
  try {
    const { projectId = 'acme-api', query } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      res.status(400).json({ error: 'SQL query string is required.' });
      return;
    }

    const { dbPath } = getProjectDbPath(projectId);
    const SQL = await getSqlInstance();

    let db: any;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    const trimmed = query.trim();
    const isSelect = /^(SELECT|PRAGMA|EXPLAIN|WITH)/i.test(trimmed);

    let columns: string[] = [];
    let rows: any[] = [];
    let affectedRows = 0;

    if (isSelect) {
      const results = db.exec(trimmed);
      if (results.length > 0) {
        columns = results[0].columns;
        rows = results[0].values.map((v: any[]) => {
          const rowObj: Record<string, any> = {};
          columns.forEach((col, idx) => {
            rowObj[col] = v[idx];
          });
          return rowObj;
        });
      }
    } else {
      db.run(trimmed);
      affectedRows = db.getRowsModified();

      // Save database file on write mutations (CREATE, INSERT, UPDATE, DELETE)
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    }

    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    db.close();

    res.status(200).json({
      success: true,
      query: trimmed,
      columns,
      rows,
      rowCount: rows.length,
      affectedRows,
      executionTimeMs,
      dbPath
    });
  } catch (err: any) {
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    res.status(400).json({
      success: false,
      error: err.message || 'SQL execution failed',
      executionTimeMs
    });
  }
});

// POST /api/db/create-table — Create a new table with structured columns
dbRouter.post('/create-table', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', tableName, columns } = req.body;
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      res.status(400).json({ error: 'Table name and columns array are required.' });
      return;
    }

    const colDefs = columns.map((col: { name: string; type: string; isPk?: boolean; notNull?: boolean }) => {
      let def = `"${col.name}" ${col.type || 'TEXT'}`;
      if (col.isPk) def += ' PRIMARY KEY';
      if (col.notNull) def += ' NOT NULL';
      return def;
    });

    const ddl = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefs.join(',\n  ')}\n);`;

    const { dbPath } = getProjectDbPath(projectId);
    const SQL = await getSqlInstance();

    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let db: any;
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    db.run(ddl);
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    db.close();

    try {
      const { logActivity } = await import('./dashboardRoutes.js');
      logActivity({
        projectId,
        projectName: projectId,
        action: 'Table created',
        detail: `Created table '${tableName}' with ${columns.length} columns`,
        status: 'success'
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: `Table '${tableName}' created successfully.`,
      ddl,
      dbPath
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create table: ${err.message}` });
  }
});
