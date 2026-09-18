import path from 'path';
import fs from 'fs';
import initSqlJs from 'sql.js';
import { PgDriver } from '../db/drivers/pgDriver.js';
import { MongoDriver } from '../db/drivers/mongoDriver.js';
import { RedisDriver, RedisKeyInfo } from '../db/drivers/redisDriver.js';
import { DbConnectionModel } from '../../models/index.js';

let SQL_PROMISE: ReturnType<typeof initSqlJs> | null = null;
async function getSqlInstance() {
  if (!SQL_PROMISE) {
    SQL_PROMISE = initSqlJs();
  }
  return await SQL_PROMISE;
}

export interface QaDiagnosticIssue {
  id: string;
  code:
    | 'NO_PRIMARY_KEY'
    | 'UNINDEXED_FOREIGN_KEY'
    | 'MISSING_COLUMN_TYPE'
    | 'EMPTY_TABLE'
    | 'ORPHAN_FOREIGN_KEY'
    | 'UNINDEXED_WORKSPACE'
    | 'MISSING_SCHEMA_VALIDATOR'
    | 'UNBOUNDED_TTL';
  severity: 'critical' | 'warning' | 'minor';
  title: string;
  description: string;
  tableName?: string;
  columnName?: string;
  suggestion: string;
  remediationSql?: string;
}

export interface TableSummaryItem {
  name: string;
  columnCount: number;
  rowCount: number;
}

export interface DiagnosticResult {
  projectId: string;
  dialect: 'sqlite' | 'postgres' | 'mongodb' | 'redis';
  indexed: boolean;
  dbPath?: string;
  connectionId?: string;
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

export async function runDiagnostics(projectId: string = 'acme-api', connectionId?: string): Promise<DiagnosticResult> {
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

  // 2. Multi-Dialect Connection Check
  if (connectionId) {
    try {
      const conn: any = await DbConnectionModel.findById(connectionId).lean();
      if (conn && !Array.isArray(conn)) {
        if (conn.dialect === 'postgres') {
          return await runPostgresDiagnostics(projectId, conn._id.toString(), conn.uri, {
            sqlJsStatus,
            groqStatus,
            encStatus
          });
        }
        if (conn.dialect === 'mongodb') {
          return await runMongoDiagnostics(projectId, conn._id.toString(), conn.uri, {
            sqlJsStatus,
            groqStatus,
            encStatus
          });
        }
        if (conn.dialect === 'redis') {
          return await runRedisDiagnostics(projectId, conn._id.toString(), conn.uri, {
            sqlJsStatus,
            groqStatus,
            encStatus
          });
        }
      }
    } catch (err) {
      console.warn('[qaDiagnosticsService] Remote DB inspection error, falling back to SQLite:', err);
    }
  }

  // 3. SQLite Diagnostics
  const { dbPath, exists } = getProjectDbPath(projectId);

  if (!exists) {
    return {
      projectId,
      dialect: 'sqlite',
      indexed: false,
      issues: [
        {
          id: `issue_${projectId}_unindexed`,
          code: 'UNINDEXED_WORKSPACE',
          severity: 'warning',
          title: `Workspace '${projectId}' has no indexed SQLite schema`,
          description: `No active SQLite database file found at .ai-manager/dbs/${projectId}.sqlite.`,
          suggestion: 'Create tables in DB Manager or run DBCI scan once built.',
          remediationSql: `CREATE TABLE IF NOT EXISTS sample_items (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);`
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
        indexerEngine: 'AST Tokenizer Ready',
        groqApi: groqStatus,
        sqlJsRuntime: sqlJsStatus,
        encryptionLayer: encStatus
      },
      scannedAt: new Date().toISOString()
    };
  }

  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);

  const masterRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const tableNames: string[] = masterRes.length > 0 ? masterRes[0].values.map((v) => String(v[0])) : [];

  // Introspect all indexes
  const indexRes = db.exec("SELECT tbl_name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL;");
  const indexedColumnsByTable = new Map<string, Set<string>>();
  if (indexRes.length > 0) {
    for (const row of indexRes[0].values) {
      const tbl = String(row[0]);
      const sql = String(row[1]);
      if (!indexedColumnsByTable.has(tbl)) {
        indexedColumnsByTable.set(tbl, new Set());
      }
      const match = sql.match(/\((.+?)\)/);
      if (match) {
        match[1].split(',').forEach((col) => {
          indexedColumnsByTable.get(tbl)!.add(col.trim().replace(/['"`]/g, ''));
        });
      }
    }
  }

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
      suggestion: 'Create tables via DB Manager (+ Create Table modal) or load seed schema.',
      remediationSql: `CREATE TABLE users (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  email TEXT UNIQUE NOT NULL,\n  created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n);`
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
        description: `All records in '${tableName}' lack a unique primary key identifier, which can cause duplicate rows and slow queries.`,
        suggestion: `Add an 'id INTEGER PRIMARY KEY' column to table '${tableName}'.`,
        remediationSql: `-- In SQLite, add primary key by recreating or ensuring id exists:\nALTER TABLE "${tableName}" ADD COLUMN id INTEGER PRIMARY KEY AUTOINCREMENT;`
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
          suggestion: `Explicitly declare a data type (e.g. TEXT, INTEGER, REAL, BLOB).`,
          remediationSql: `-- Update column definition to explicit type TEXT or INTEGER`
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
            suggestion: `Verify relationship or create the referenced table '${targetPrefix}s'.`,
            remediationSql: `CREATE TABLE IF NOT EXISTS ${targetPrefix}s (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  name TEXT NOT NULL\n);`
          });
        } else {
          // Rule 4: Unindexed Foreign Key Column
          const tableIndexes = indexedColumnsByTable.get(tableName);
          const isIndexed = tableIndexes ? tableIndexes.has(col.name) : false;
          if (!isIndexed) {
            issues.push({
              id: `issue_${tableName}_${col.name}_unindexed_fk`,
              code: 'UNINDEXED_FOREIGN_KEY',
              severity: 'warning',
              tableName,
              columnName: col.name,
              title: `Unindexed foreign key '${col.name}' in '${tableName}'`,
              description: `Foreign key '${col.name}' has no index, which degrades JOIN and filtering performance.`,
              suggestion: `Create an index on '${tableName}.${col.name}'.`,
              remediationSql: `CREATE INDEX idx_${tableName}_${col.name} ON "${tableName}" ("${col.name}");`
            });
          }
        }
      }
    }

    // Rule 5: Empty table check
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
        suggestion: `Insert test fixtures or initial records.`,
        remediationSql: `-- Insert seed record into ${tableName}`
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

  const healthScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10 - minorCount * 3);

  return {
    projectId,
    dialect: 'sqlite',
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
      indexerEngine: 'AST Tokenizer Ready',
      groqApi: groqStatus,
      sqlJsRuntime: sqlJsStatus,
      encryptionLayer: encStatus
    },
    scannedAt: new Date().toISOString()
  };
}

// PostgreSQL Diagnostics Runner
async function runPostgresDiagnostics(
  projectId: string,
  connectionId: string,
  uri: string,
  systemHealth: { sqlJsStatus: string; groqStatus: string; encStatus: string }
): Promise<DiagnosticResult> {
  const schema = await PgDriver.getSchema(uri);
  const issues: QaDiagnosticIssue[] = [];
  const tableSummaries: TableSummaryItem[] = [];
  let totalColumnsScanned = 0;

  for (const table of schema) {
    totalColumnsScanned += table.columns.length;
    tableSummaries.push({
      name: table.name,
      columnCount: table.columns.length,
      rowCount: table.rowCount
    });

    // Rule 1: No PK
    const hasPk = table.columns.some((c) => c.pk);
    if (!hasPk) {
      issues.push({
        id: `pg_${table.name}_no_pk`,
        code: 'NO_PRIMARY_KEY',
        severity: 'critical',
        tableName: table.name,
        title: `PostgreSQL Table '${table.name}' has no PRIMARY KEY defined`,
        description: `Lack of a primary key in PostgreSQL table '${table.name}' causes table scans on updates and deletes.`,
        suggestion: `Add a primary key constraint to '${table.name}'.`,
        remediationSql: `ALTER TABLE "${table.name}" ADD COLUMN id BIGSERIAL PRIMARY KEY;`
      });
    }

    // Rule 2: Unindexed Foreign Keys & Orphans
    for (const col of table.columns) {
      const fkMatch = col.name.match(/^(.+?)(_id|Id)$/i);
      if (fkMatch && !col.pk) {
        const targetPrefix = fkMatch[1].toLowerCase();
        const matchingTable = schema.find((t) => {
          const tl = t.name.toLowerCase();
          return tl === targetPrefix || tl === `${targetPrefix}s` || tl === `${targetPrefix}es`;
        });

        if (!matchingTable) {
          issues.push({
            id: `pg_${table.name}_${col.name}_orphan_fk`,
            code: 'ORPHAN_FOREIGN_KEY',
            severity: 'warning',
            tableName: table.name,
            columnName: col.name,
            title: `Potential orphaned foreign key '${col.name}' in '${table.name}'`,
            description: `Column '${col.name}' references '${targetPrefix}s' which does not exist.`,
            suggestion: `Verify relation or create referenced table.`,
            remediationSql: `CREATE TABLE IF NOT EXISTS "${targetPrefix}s" (\n  id BIGSERIAL PRIMARY KEY,\n  name VARCHAR(255) NOT NULL\n);`
          });
        } else {
          issues.push({
            id: `pg_${table.name}_${col.name}_unindexed_fk`,
            code: 'UNINDEXED_FOREIGN_KEY',
            severity: 'warning',
            tableName: table.name,
            columnName: col.name,
            title: `Foreign key column '${col.name}' in '${table.name}' requires index`,
            description: `Creating a B-Tree index improves JOIN efficiency on foreign key queries.`,
            suggestion: `Create an index on '${table.name}.${col.name}'.`,
            remediationSql: `CREATE INDEX idx_${table.name}_${col.name} ON "${table.name}" ("${col.name}");`
          });
        }
      }
    }

    // Rule 3: Empty Table
    if (table.rowCount === 0) {
      issues.push({
        id: `pg_${table.name}_empty`,
        code: 'EMPTY_TABLE',
        severity: 'minor',
        tableName: table.name,
        title: `Table '${table.name}' is empty (0 rows)`,
        description: `Schema is active but contains no live data records.`,
        suggestion: `Seed sample data for testing.`,
        remediationSql: `-- Insert seed rows into ${table.name}`
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;
  const healthScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10 - minorCount * 3);

  return {
    projectId,
    dialect: 'postgres',
    connectionId,
    indexed: true,
    issues,
    tables: tableSummaries,
    summary: {
      total: issues.length,
      critical: criticalCount,
      warning: warningCount,
      minor: minorCount,
      tablesScanned: schema.length,
      columnsScanned: totalColumnsScanned,
      healthScore
    },
    systemHealth: {
      indexerEngine: 'PostgreSQL Introspector Operational',
      groqApi: systemHealth.groqStatus,
      sqlJsRuntime: systemHealth.sqlJsStatus,
      encryptionLayer: systemHealth.encStatus
    },
    scannedAt: new Date().toISOString()
  };
}

// MongoDB Diagnostics Runner
async function runMongoDiagnostics(
  projectId: string,
  connectionId: string,
  uri: string,
  systemHealth: { sqlJsStatus: string; groqStatus: string; encStatus: string }
): Promise<DiagnosticResult> {
  const collections = await MongoDriver.getSchema(uri);
  const issues: QaDiagnosticIssue[] = [];
  const tableSummaries: TableSummaryItem[] = [];

  for (const col of collections) {
    tableSummaries.push({
      name: col.name,
      columnCount: col.fields.length,
      rowCount: col.count
    });

    if (col.count === 0) {
      issues.push({
        id: `mongo_${col.name}_empty`,
        code: 'EMPTY_TABLE',
        severity: 'minor',
        tableName: col.name,
        title: `Collection '${col.name}' contains 0 documents`,
        description: `Empty collection registered in MongoDB.`,
        suggestion: `Insert seed documents into '${col.name}'.`,
        remediationSql: `db.${col.name}.insertOne({ sample: true, createdAt: new Date() })`
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;
  const healthScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10 - minorCount * 3);

  return {
    projectId,
    dialect: 'mongodb',
    connectionId,
    indexed: true,
    issues,
    tables: tableSummaries,
    summary: {
      total: issues.length,
      critical: criticalCount,
      warning: warningCount,
      minor: minorCount,
      tablesScanned: collections.length,
      columnsScanned: collections.reduce((acc, c) => acc + c.fields.length, 0),
      healthScore
    },
    systemHealth: {
      indexerEngine: 'MongoDB Document Sampler Operational',
      groqApi: systemHealth.groqStatus,
      sqlJsRuntime: systemHealth.sqlJsStatus,
      encryptionLayer: systemHealth.encStatus
    },
    scannedAt: new Date().toISOString()
  };
}

// Redis Diagnostics Runner
async function runRedisDiagnostics(
  projectId: string,
  connectionId: string,
  uri: string,
  systemHealth: { sqlJsStatus: string; groqStatus: string; encStatus: string }
): Promise<DiagnosticResult> {
  const keys: RedisKeyInfo[] = await RedisDriver.getSchema(uri);
  const issues: QaDiagnosticIssue[] = [];
  const tableSummaries: TableSummaryItem[] = [];

  const namespacesMap = new Map<string, RedisKeyInfo[]>();
  for (const k of keys) {
    const ns = k.key.includes(':') ? k.key.split(':')[0] : 'default';
    if (!namespacesMap.has(ns)) {
      namespacesMap.set(ns, []);
    }
    namespacesMap.get(ns)!.push(k);
  }

  for (const [ns, nsKeys] of namespacesMap.entries()) {
    tableSummaries.push({
      name: ns,
      columnCount: nsKeys.length,
      rowCount: nsKeys.length
    });

    const untypedKeys = nsKeys.filter((k) => k.ttl === -1);
    if (untypedKeys.length > 0) {
      issues.push({
        id: `redis_${ns}_no_ttl`,
        code: 'UNBOUNDED_TTL',
        severity: 'warning',
        tableName: ns,
        title: `Namespace '${ns}' has ${untypedKeys.length} key(s) with NO TTL (infinite expiry)`,
        description: `Keys without TTL will remain indefinitely in memory, risking cache ballooning and OOM errors.`,
        suggestion: `Set an explicit TTL policy on keys in namespace '${ns}'.`,
        remediationSql: `EXPIRE ${untypedKeys[0].key} 86400`
      });
    }
  }

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const minorCount = issues.filter((i) => i.severity === 'minor').length;
  const healthScore = Math.max(0, 100 - criticalCount * 25 - warningCount * 10 - minorCount * 3);

  return {
    projectId,
    dialect: 'redis',
    connectionId,
    indexed: true,
    issues,
    tables: tableSummaries,
    summary: {
      total: issues.length,
      critical: criticalCount,
      warning: warningCount,
      minor: minorCount,
      tablesScanned: namespacesMap.size,
      columnsScanned: keys.length,
      healthScore
    },
    systemHealth: {
      indexerEngine: 'Redis SCAN Inspector Operational',
      groqApi: systemHealth.groqStatus,
      sqlJsRuntime: systemHealth.sqlJsStatus,
      encryptionLayer: systemHealth.encStatus
    },
    scannedAt: new Date().toISOString()
  };
}
