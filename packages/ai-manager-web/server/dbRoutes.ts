import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { DbConnectionModel } from './models/index.js';
import { JsonStore } from './utils/JsonStore.js';
import initSqlJs from 'sql.js';
import { PgDriver } from './drivers/pgDriver.js';
import { MongoDriver } from './drivers/mongoDriver.js';
import { RedisDriver } from './drivers/redisDriver.js';
import { getWorkspaceRootDir } from './screenRoutes.js';
import { encrypt, decrypt } from './utils/encryption.js';

export const dbRouter = Router();

// G1: Mask URI for safe display in connection listings (never expose plaintext)
export function maskUri(uri: string): string {
  if (!uri) return '—';
  try {
    const url = new URL(uri);
    if (url.password) url.password = '•••';
    if (url.username) url.username = url.username.slice(0, 3) + '•••';
    return decodeURIComponent(url.toString());
  } catch {
    // Not a valid URL — mask credentials and host around @ sign
    const atIdx = uri.indexOf('@');
    if (atIdx > 0) {
      return uri.slice(0, 3) + '•••@' + uri.slice(atIdx + 1).slice(0, 3) + '•••';
    }
    return uri.slice(0, 6) + '•••';
  }
}

// G1: Safely decrypt URI — returns plaintext, or original if not encrypted (legacy conn strings)
export function safeDecryptUri(storedUri: string): string {
  if (!storedUri) return '';
  try {
    return decrypt(storedUri);
  } catch {
    return storedUri; // Legacy plain-text URI — return as-is for backward compat
  }
}

const localConnectionStore = new JsonStore<any>('connections.json');


let SQL_PROMISE: ReturnType<typeof initSqlJs> | null = null;

async function getSqlInstance() {
  if (!SQL_PROMISE) {
    SQL_PROMISE = initSqlJs();
  }
  return await SQL_PROMISE;
}

async function resolveConnection(connectionId: string | undefined, projectId: string): Promise<any | null> {
  if (!connectionId || connectionId.startsWith('conn_sqlite_')) {
    return null;
  }

  if (connectionId === `conn_mongo_atlas_${projectId}` || connectionId.startsWith('conn_mongo_atlas_')) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ai_manager';
    return {
      id: connectionId,
      projectId,
      name: 'MongoDB Atlas (Cloud)',
      type: 'mongodb',
      uri
    };
  }

  let conn: any = null;
  if (getIsMongoConnected()) {
    try {
      conn = await DbConnectionModel.findOne({ id: connectionId }).lean();
    } catch {}
  }
  if (!conn) {
    conn = await localConnectionStore.getById(connectionId);
  }
  return conn;
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

// --------------------------------------------------------------------------
// 1. GET /api/db/connections — List all database connections
// --------------------------------------------------------------------------
dbRouter.get('/connections', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const userId = req.user?.sub;
    const isAdmin = req.user?.role === 'admin';

    // 1. Always include Local SQLite default connection
    const { dbPath, exists } = getProjectDbPath(projectId);

    const defaultSqliteConn = {
      id: `conn_sqlite_${projectId}`,
      projectId,
      name: `Local SQLite (${projectId})`,
      type: 'sqlite',
      uri: dbPath,
      isDefault: true,
      isConnected: exists,
      lastTested: new Date().toISOString()
    };

    // 2. Add System MongoDB Atlas Connection if active in .env
    const envMongoUri = process.env.MONGODB_URI;
    const isMongoConn = getIsMongoConnected();
    const systemConns: any[] = [];

    if (isMongoConn || envMongoUri) {
      systemConns.push({
        id: `conn_mongo_atlas_${projectId}`,
        projectId,
        name: `MongoDB Atlas (Cloud)`,
        type: 'mongodb',
        uri: maskUri(envMongoUri || ''),
        isDefault: false,
        isConnected: isMongoConn,
        lastTested: new Date().toISOString()
      });
    }

    // 3. Fetch custom connections from MongoDB / Local Store
    let customConns: any[] = [];
    if (getIsMongoConnected()) {
      try {
        const query: any = { projectId };
        if (!isAdmin && userId) query.userId = userId;
        customConns = await DbConnectionModel.find(query).lean();
      } catch (e) {
        console.error('[DB Connections] Atlas read error:', e);
      }
    }

    if (customConns.length === 0) {
      const all = await localConnectionStore.getAll();
      customConns = all.filter((c: any) => c.projectId === projectId);
      if (!isAdmin && userId) {
        customConns = customConns.filter((c: any) => !c.userId || c.userId === userId);
      }
    }

    // G1: Never expose raw stored URI — mask it before sending to client
    const safeCustomConns = customConns.map((c: any) => ({
      ...c,
      uri: maskUri(safeDecryptUri(c.uri || '')),
      _uriEncrypted: true
    }));

    res.status(200).json({
      success: true,
      connections: [defaultSqliteConn, ...systemConns, ...safeCustomConns]
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to list connections: ${err.message}` });
  }
});


// --------------------------------------------------------------------------
// 2. POST /api/db/connect — Test and add a new database connection
// --------------------------------------------------------------------------
dbRouter.post('/connect', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', name, type, uri } = req.body;
    const userId = req.user?.sub || 'anonymous';

    if (!name || !type || !uri) {
      res.status(400).json({ error: 'Name, database type (postgresql|supabase|mongodb|redis|sqlite), and URI are required.' });
      return;
    }

    // G8: Normalize 'supabase' to 'postgresql' for driver routing (Supabase is Postgres under the hood)
    const normalizedType = type === 'supabase' ? 'postgresql' : type;

    // Test connection latency
    let testResult: { success: boolean; latencyMs: number; error?: string } = { success: false, latencyMs: 0 };
    if (normalizedType === 'postgresql') {
      testResult = await PgDriver.testConnection(uri);
    } else if (normalizedType === 'mongodb') {
      testResult = await MongoDriver.testConnection(uri);
    } else if (normalizedType === 'redis') {
      testResult = await RedisDriver.testConnection(uri);
    } else if (normalizedType === 'sqlite') {
      testResult = { success: true, latencyMs: 1 };
    }

    if (!testResult.success) {
      res.status(400).json({
        success: false,
        error: `Connection test failed: ${testResult.error || 'Unable to connect'}`,
        latencyMs: testResult.latencyMs
      });
      return;
    }

    // G1: Encrypt URI before persisting
    const encryptedUri = encrypt(uri);

    const id = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newConn = {
      id,
      projectId,
      userId,
      name,
      type,             // store the user-facing type (e.g. 'supabase') for display
      uri: encryptedUri, // G1: AES-256-GCM encrypted
      isConnected: true,
      lastTested: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (getIsMongoConnected()) {
      try {
        await DbConnectionModel.create(newConn);
      } catch (err) {}
    }
    await localConnectionStore.create(newConn);

    try {
      const { logActivity } = await import('./dashboardRoutes.js');
      logActivity({
        projectId,
        projectName: projectId,
        userId,
        action: 'Database Connected',
        detail: `Connected to ${type.toUpperCase()} database '${name}' (${testResult.latencyMs}ms)`,
        status: 'success'
      });
    } catch {}

    res.status(201).json({
      success: true,
      connection: newConn,
      latencyMs: testResult.latencyMs
    });
  } catch (err: any) {
    res.status(500).json({ error: `Connection failed: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 3. DELETE /api/db/connections/:id — Remove custom connection
// --------------------------------------------------------------------------
dbRouter.delete('/connections/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (id.startsWith('conn_sqlite_')) {
      res.status(400).json({ error: 'Cannot delete default SQLite project database.' });
      return;
    }

    // Resolve connection details to close active pool/client in driver map
    let targetConn: any = null;
    if (getIsMongoConnected()) {
      try {
        targetConn = await DbConnectionModel.findOne({ id }).lean();
      } catch {}
    }
    if (!targetConn) {
      targetConn = await localConnectionStore.getById(id);
    }

    if (targetConn && targetConn.uri) {
      const plainUri = safeDecryptUri(targetConn.uri);
      const connType = targetConn.type === 'supabase' ? 'postgresql' : targetConn.type;
      if (connType === 'postgresql') {
        await PgDriver.closePool(plainUri);
      } else if (connType === 'mongodb') {
        await MongoDriver.closeConnection(plainUri);
      } else if (connType === 'redis') {
        await RedisDriver.closeClient(plainUri);
      }
    }

    if (getIsMongoConnected()) {
      await DbConnectionModel.deleteOne({ id });
    }
    await localConnectionStore.delete(id);

    res.status(200).json({ success: true, message: 'Connection removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to remove connection: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 4. GET /api/db/schema — Inspect schema for active connection
// --------------------------------------------------------------------------
dbRouter.get('/schema', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'acme-api';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const connectionId = req.query.connectionId as string | undefined;

    // A. Check if querying a custom connection (Postgres, Mongo, Redis)
    if (connectionId && !connectionId.startsWith('conn_sqlite_')) {
      const conn = await resolveConnection(connectionId, projectId);
      if (!conn) {
        res.status(404).json({ error: `Connection '${connectionId}' not found.` });
        return;
      }

      // G1: Decrypt stored URI before passing to driver
      const plainUri = safeDecryptUri(conn.uri || '');
      // G8: Normalize supabase -> postgresql for driver routing
      const connType = conn.type === 'supabase' ? 'postgresql' : conn.type;

      if (connType === 'postgresql') {
        const tables = await PgDriver.getSchema(plainUri);
        res.status(200).json({
          indexed: tables.length > 0,
          projectId,
          dbType: conn.type, // preserve original type for display
          connectionName: conn.name,
          tables,
          totalTables: tables.length
        });
        return;
      }

      if (connType === 'mongodb') {
        const collections = await MongoDriver.getSchema(plainUri);
        res.status(200).json({
          indexed: collections.length > 0,
          projectId,
          dbType: 'mongodb',
          connectionName: conn.name,
          collections,
          totalCollections: collections.length
        });
        return;
      }

      if (connType === 'redis') {
        const keys = await RedisDriver.getSchema(plainUri);
        res.status(200).json({
          indexed: keys.length > 0,
          projectId,
          dbType: 'redis',
          connectionName: conn.name,
          keys,
          totalKeys: keys.length
        });
        return;
      }
    }

    // B. Default Local SQLite Inspection
    const { dbPath, exists } = getProjectDbPath(projectId);
    if (!exists || !fs.existsSync(dbPath)) {
      res.status(200).json({
        indexed: false,
        projectId,
        dbType: 'sqlite',
        dbPath: null,
        tables: [],
        totalTables: 0,
        message: `No SQLite database tables exist yet for project '${projectId}'.`
      });
      return;
    }

    const SQL = await getSqlInstance();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    const tables: TableSchema[] = [];

    try {
      const masterRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
      const tableNames: string[] = masterRes.length > 0 ? masterRes[0].values.map((v) => String(v[0])) : [];

      for (const tableName of tableNames) {
        const safeTblName = tableName.replace(/"/g, '""');
        const pragmaRes = db.exec(`PRAGMA table_info("${safeTblName}");`);
        const columns: ColumnInfo[] = [];

        if (pragmaRes.length > 0) {
          for (const row of pragmaRes[0].values) {
            columns.push({
              name: String(row[1]),
              type: String(row[2] || 'TEXT'),
              notNull: Boolean(row[3]),
              dfltValue: row[4],
              pk: Boolean(row[5])
            });
          }
        }

        let rowCount = 0;
        try {
          const countRes = db.exec(`SELECT COUNT(*) as count FROM "${safeTblName}";`);
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
    } finally {
      db.close();
    }

    res.status(200).json({
      indexed: tables.length > 0,
      projectId,
      dbType: 'sqlite',
      dbPath,
      tables,
      totalTables: tables.length
    });
  } catch (err: any) {
    console.error(`[db/schema] Error: ${err.message}`);
    res.status(500).json({ error: `Failed to inspect schema: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 5. POST /api/db/query — Execute query against active connection
// --------------------------------------------------------------------------
dbRouter.post('/query', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const startTime = performance.now();
  try {
    const { projectId = 'acme-api', query, connectionId, collectionName, operation, limit = 100 } = req.body;

    if (!query && !collectionName && !operation) {
      res.status(400).json({ error: 'Query or operation is required.' });
      return;
    }

    // A. Custom Connection Query Handling
    if (connectionId && !connectionId.startsWith('conn_sqlite_')) {
      const conn = await resolveConnection(connectionId, projectId);

      if (!conn) {
        res.status(404).json({ error: `Connection '${connectionId}' not found.` });
        return;
      }

      // G1: Decrypt stored URI before passing to driver
      const queryPlainUri = safeDecryptUri(conn.uri || '');
      // G8: Normalize supabase -> postgresql for driver routing
      const queryConnType = conn.type === 'supabase' ? 'postgresql' : conn.type;

      if (queryConnType === 'postgresql') {
        const result = await PgDriver.executeQuery(queryPlainUri, query, limit);
        res.status(200).json({
          success: true,
          dbType: conn.type,
          query,
          columns: result.columns,
          rows: result.rows,
          rowCount: result.rowCount,
          executionTimeMs: result.executionTimeMs
        });
        return;
      }

      if (queryConnType === 'mongodb') {
        const result = await MongoDriver.executeQuery(queryPlainUri, operation || 'find', collectionName, query, limit);
        res.status(200).json({
          success: true,
          dbType: 'mongodb',
          operation: operation || 'find',
          collectionName,
          columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : [],
          rows: result.rows,
          rowCount: result.rowCount,
          executionTimeMs: result.executionTimeMs
        });
        return;
      }

      if (queryConnType === 'redis') {
        const result = await RedisDriver.executeCommand(queryPlainUri, query);
        res.status(200).json({
          success: true,
          dbType: 'redis',
          command: query,
          columns: result.rows.length > 0 ? Object.keys(result.rows[0]) : ['result'],
          rows: result.rows,
          rowCount: result.rowCount,
          executionTimeMs: result.executionTimeMs
        });
        return;
      }
    }

    // B. Default SQLite Local Query Execution
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

    try {
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
        const data = db.export();
        fs.writeFileSync(dbPath, Buffer.from(data));
      }
    } finally {
      db.close();
    }

    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));

    res.status(200).json({
      success: true,
      dbType: 'sqlite',
      query: trimmed,
      columns,
      rows: rows.slice(0, limit),
      rowCount: rows.length,
      affectedRows,
      executionTimeMs,
      dbPath
    });
  } catch (err: any) {
    const executionTimeMs = parseFloat((performance.now() - startTime).toFixed(2));
    res.status(400).json({
      success: false,
      error: err.message || 'Query execution failed',
      executionTimeMs
    });
  }
});

// --------------------------------------------------------------------------
// 6. POST /api/db/sync-er-diagram — Generate Excalidraw ER Diagram from live DB
// --------------------------------------------------------------------------
dbRouter.post('/sync-er-diagram', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', connectionId } = req.body;
    const rootDir = getWorkspaceRootDir();
    const diagramsDir = path.join(rootDir, 'diagrams');
    if (!fs.existsSync(diagramsDir)) {
      fs.mkdirSync(diagramsDir, { recursive: true });
    }

    // Introspect tables
    let tables: TableSchema[] = [];
    let dbName = projectId;

    if (connectionId && !connectionId.startsWith('conn_sqlite_')) {
      let conn: any = null;
      if (getIsMongoConnected()) {
        conn = await DbConnectionModel.findOne({ id: connectionId }).lean();
      }
      if (!conn) {
        conn = await localConnectionStore.getById(connectionId);
      }
      if (conn && (conn.type === 'postgresql' || conn.type === 'supabase')) {
        dbName = conn.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
        // G1: Decrypt URI before passing to driver
        tables = (await PgDriver.getSchema(safeDecryptUri(conn.uri || ''))) as any;
      }
    }

    if (tables.length === 0) {
      const { dbPath, exists } = getProjectDbPath(projectId);
      if (exists) {
        const SQL = await getSqlInstance();
        const fileBuffer = fs.readFileSync(dbPath);
        const db = new SQL.Database(fileBuffer);
        try {
          const masterRes = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
          const names = masterRes.length > 0 ? masterRes[0].values.map(v => String(v[0])) : [];
          for (const name of names) {
            const safeName = name.replace(/"/g, '""');
            const pragma = db.exec(`PRAGMA table_info("${safeName}");`);
            const columns: ColumnInfo[] = pragma.length > 0
              ? pragma[0].values.map(r => ({ name: String(r[1]), type: String(r[2]), notNull: Boolean(r[3]), dfltValue: r[4], pk: Boolean(r[5]) }))
              : [];
            tables.push({ name, columns, rowCount: 0 });
          }
        } finally {
          db.close();
        }
      }
    }

    // Build Excalidraw Elements for each table
    const elements: any[] = [];
    let curX = 100;
    let curY = 100;

    tables.forEach((tbl, idx) => {
      const height = Math.max(120, tbl.columns.length * 24 + 50);
      const width = 240;

      // Table Box
      elements.push({
        type: 'rectangle',
        x: curX,
        y: curY,
        width,
        height,
        backgroundColor: idx % 2 === 0 ? '#3b82f620' : '#10b98120',
        strokeColor: idx % 2 === 0 ? '#3b82f6' : '#10b981',
        strokeWidth: 2,
        roughness: 1,
        borderRadius: 8
      });

      // Table Header & Columns Text
      const colText = tbl.columns.map(c => `${c.pk ? '🔑 ' : '  '}${c.name}: ${c.type}`).join('\n');
      elements.push({
        type: 'text',
        x: curX + 16,
        y: curY + 16,
        text: `TABLE: ${tbl.name}\n------------------\n${colText || 'No columns'}`,
        fontSize: 13,
        fontFamily: 3
      });

      curX += width + 60;
      if (curX > 900) {
        curX = 100;
        curY += height + 80;
      }
    });

    const excalidrawDiagram = {
      type: 'excalidraw',
      version: 2,
      source: 'https://ai-manager.local',
      name: `${dbName}_er_diagram`,
      elements,
      appState: { viewBackgroundColor: '#1e1e24', theme: 'dark' },
      files: {}
    };

    const filePath = path.join(diagramsDir, `${dbName}_er_diagram.excalidraw`);
    const tempPath = `${filePath}.tmp_${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(excalidrawDiagram, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);

    try {
      const { syncDiskDiagramsToStore } = await import('./diagramRoutes.js');
      await syncDiskDiagramsToStore(projectId, req.user?.sub || 'usr_admin_default');
    } catch {}

    res.status(200).json({
      success: true,
      message: `ER diagram generated successfully at diagrams/${dbName}_er_diagram.excalidraw`,
      filePath: `diagrams/${dbName}_er_diagram.excalidraw`,
      tablesCount: tables.length
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to sync ER diagram: ${err.message}` });
  }
});

// POST /api/db/create-table — Create a new table
dbRouter.post('/create-table', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', tableName, columns } = req.body;
    if (!tableName || !Array.isArray(columns) || columns.length === 0) {
      res.status(400).json({ error: 'Table name and columns array are required.' });
      return;
    }

    const colDefs = columns.map((col: { name: string; type: string; isPk?: boolean; notNull?: boolean }) => {
      const safeColName = col.name.replace(/"/g, '""');
      let def = `"${safeColName}" ${col.type || 'TEXT'}`;
      if (col.isPk) def += ' PRIMARY KEY';
      if (col.notNull) def += ' NOT NULL';
      return def;
    });

    const safeTableName = tableName.replace(/"/g, '""');
    const ddl = `CREATE TABLE IF NOT EXISTS "${safeTableName}" (\n  ${colDefs.join(',\n  ')}\n);`;

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

    try {
      db.run(ddl);
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
    } finally {
      db.close();
    }

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

// POST /api/db/create-collection — Create a new MongoDB collection
dbRouter.post('/create-collection', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId = 'acme-api', connectionId, collectionName, initialDocument } = req.body;
    if (!collectionName) {
      res.status(400).json({ error: 'Collection name is required.' });
      return;
    }

    let uri = 'mongodb://127.0.0.1:27017/ai_manager';
    if (connectionId) {
      let conn: any = null;
      if (getIsMongoConnected()) {
        conn = await DbConnectionModel.findOne({ id: connectionId }).lean();
      }
      if (!conn) {
        const all = await localConnectionStore.getAll();
        conn = all.find((c: any) => c.id === connectionId);
      }
      // G1: Decrypt stored URI before use
      if (conn?.uri) uri = safeDecryptUri(conn.uri);
    }

    let initialDocObj: any = null;
    if (initialDocument) {
      try {
        initialDocObj = typeof initialDocument === 'string' ? JSON.parse(initialDocument) : initialDocument;
      } catch {
        initialDocObj = { name: 'Sample Item', createdAt: new Date() };
      }
    } else {
      initialDocObj = { name: 'Sample Item', createdAt: new Date() };
    }

    const result = await MongoDriver.createCollection(uri, collectionName.trim(), initialDocObj);

    try {
      const { logActivity } = await import('./dashboardRoutes.js');
      logActivity({
        projectId,
        projectName: projectId,
        action: 'Collection created',
        detail: `Created MongoDB collection '${collectionName}'`,
        status: 'success'
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: result.message
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create collection: ${err.message}` });
  }
});

