import fs from 'fs';
import path from 'path';
import { IndexResult, FileHashEntry, ReferenceNode, DiscussionThread, DiscussionEntry, DecisionRecord, PlanRecord, PlanProgressLogEntry, ProposalRecord } from '../types/index.js';


import { SCHEMA_SQL } from '../db/schema.js';

declare const __non_webpack_require__: any;

export type SqliteDriverType = 'auto' | 'better-sqlite3' | 'sql.js';

export interface SqliteStoreOptions {
  driver?: SqliteDriverType;
}

function loadBetterSqliteModule(): any {
  try {
    const req = typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : require;
    return req('better-sqlite3');
  } catch {
    return null;
  }
}

async function detectAvailableDriver(preferred: SqliteDriverType = 'auto'): Promise<'better-sqlite3' | 'sql.js'> {
  if (preferred === 'sql.js') return 'sql.js';

  const mod = loadBetterSqliteModule();
  if (preferred === 'better-sqlite3') {
    if (mod) return 'better-sqlite3';
    throw new Error("Requested driver 'better-sqlite3' could not be loaded because native bindings are missing.");
  }

  if (mod) {
    return 'better-sqlite3';
  }
  return 'sql.js';
}

function migrateLegacyDbBetterSqlite(db: any): void {
  try {
    const tables = db.prepare("SELECT name, type FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = new Set(tables.map((t) => t.name));

    if (tableNames.has('clients') && !tableNames.has('context_clients')) {
      console.log('[dbci] Migrating legacy un-namespaced index.sqlite to namespaced schema in-place...');
      db.exec(`
        ALTER TABLE clients RENAME TO context_clients;
        ALTER TABLE queries RENAME TO context_queries;
        ALTER TABLE functions RENAME TO context_functions;
        ALTER TABLE call_edges RENAME TO context_call_edges;
        ALTER TABLE symbol_references RENAME TO context_symbol_references;
        ALTER TABLE file_hashes RENAME TO context_file_hashes;
      `);
      console.log('[dbci] Migration Complete! All tables converted to context_* with backward-compatibility views.');
    }
    db.exec(SCHEMA_SQL);
  } catch (err: any) {
    console.warn(`[dbci] Legacy migration warning: ${err.message}`);
  }
}

function migrateLegacyDbSqlJs(db: any, dbPath?: string): void {
  try {
    const res = db.exec("SELECT name, type FROM sqlite_master WHERE type='table'");
    if (res.length > 0) {
      const tableNames = new Set(res[0].values.map((v: any) => v[0]));
      if (tableNames.has('clients') && !tableNames.has('context_clients')) {
        console.log('[dbci] Migrating legacy un-namespaced index.sqlite to namespaced schema in-place...');
        db.exec(`
          ALTER TABLE clients RENAME TO context_clients;
          ALTER TABLE queries RENAME TO context_queries;
          ALTER TABLE functions RENAME TO context_functions;
          ALTER TABLE call_edges RENAME TO context_call_edges;
          ALTER TABLE symbol_references RENAME TO context_symbol_references;
          ALTER TABLE file_hashes RENAME TO context_file_hashes;
        `);
        console.log('[dbci] Migration Complete! All tables converted to context_* with backward-compatibility views.');
      }
    }
    db.exec(SCHEMA_SQL);
    if (dbPath) {
      const binaryArray = db.export();
      fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    }
  } catch (err: any) {
    console.warn(`[dbci] Legacy migration warning: ${err.message}`);
  }
}

export async function addDiscussionEntry(
  dbPath: string,
  targetType: 'file' | 'function' | 'class' | 'query' | 'project',
  targetId: string,
  title: string,
  body: string,
  author: 'user' | 'ai',
  options?: SqliteStoreOptions
): Promise<{ threadId: string; entryId: string }> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const threadId = `thread:${targetType}:${targetId}`;
  const entryId = `entry:${now}:${Math.random().toString(36).substring(2, 8)}`;

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    const existingThread = db.prepare('SELECT id FROM discussion_threads WHERE id = ?').get(threadId);
    if (!existingThread) {
      db.prepare(
        'INSERT INTO discussion_threads (id, targetType, targetId, title, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(threadId, targetType, targetId, title, now, author);
    }

    db.prepare('INSERT INTO discussion_entries (id, threadId, author, body, createdAt) VALUES (?, ?, ?, ?, ?)').run(
      entryId,
      threadId,
      author,
      body,
      now
    );

    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    const checkRes = db.exec(`SELECT id FROM discussion_threads WHERE id = '${threadId}'`);
    if (checkRes.length === 0 || checkRes[0].values.length === 0) {
      db.run(
        'INSERT INTO discussion_threads (id, targetType, targetId, title, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
        [threadId, targetType, targetId, title, now, author]
      );
    }

    db.run('INSERT INTO discussion_entries (id, threadId, author, body, createdAt) VALUES (?, ?, ?, ?, ?)', [
      entryId,
      threadId,
      author,
      body,
      now
    ]);

    const binaryArray = db.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }

  return { threadId, entryId };
}

export async function addDecisionRecord(
  dbPath: string,
  targetType: 'file' | 'function' | 'class' | 'query' | 'project',
  targetId: string,
  summary: string,
  rationale: string,
  decidedBy: string = 'user',
  supersedesId: string | null = null,
  options?: SqliteStoreOptions
): Promise<{ decisionId: string }> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const decisionId = `decision:${now}:${Math.random().toString(36).substring(2, 8)}`;

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    db.prepare(
      'INSERT INTO decisions (id, targetType, targetId, summary, rationale, decidedBy, decidedAt, supersedes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(decisionId, targetType, targetId, summary, rationale, decidedBy, now, supersedesId);

    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    db.run(
      'INSERT INTO decisions (id, targetType, targetId, summary, rationale, decidedBy, decidedAt, supersedes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [decisionId, targetType, targetId, summary, rationale, decidedBy, now, supersedesId]
    );

    const binaryArray = db.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }

  return { decisionId };
}

export async function addPlanRecord(
  dbPath: string,
  projectId: string,
  title: string,
  goal: string,
  createdBy: string,
  sourceThreadId?: string | null,
  relatedDecisionId?: string | null,
  options?: SqliteStoreOptions
): Promise<PlanRecord> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const planId = `plan:${projectId}:${Date.now()}`;

  const plan: PlanRecord = {
    id: planId,
    projectId,
    title,
    goal,
    status: 'draft',
    createdBy,
    createdAt: now,
    sourceThreadId: sourceThreadId || null,
    relatedDecisionId: relatedDecisionId || null
  };

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    db.prepare(
      'INSERT INTO plans (id, projectId, title, goal, status, createdBy, createdAt, sourceThreadId, relatedDecisionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(planId, projectId, title, goal, 'draft', createdBy, now, sourceThreadId || null, relatedDecisionId || null);

    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    db.run(
      'INSERT INTO plans (id, projectId, title, goal, status, createdBy, createdAt, sourceThreadId, relatedDecisionId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [planId, projectId, title, goal, 'draft', createdBy, now, sourceThreadId || null, relatedDecisionId || null]
    );

    const binaryArray = db.export();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }

  return plan;
}

export async function addPlanProgressLog(
  dbPath: string,
  planId: string,
  stepIndex: number,
  description: string,
  status: 'done' | 'failed' | 'in_progress',
  evidence?: string | null,
  options?: SqliteStoreOptions
): Promise<PlanProgressLogEntry> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const logId = `log:${planId}:${stepIndex}:${Date.now()}`;

  const entry: PlanProgressLogEntry = {
    id: logId,
    planId,
    stepIndex,
    description,
    status,
    evidence: evidence || null,
    timestamp: now
  };

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    db.prepare(
      'INSERT INTO plan_progress_log (id, planId, stepIndex, description, status, evidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(logId, planId, stepIndex, description, status, evidence || null, now);

    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    db.run(
      'INSERT INTO plan_progress_log (id, planId, stepIndex, description, status, evidence, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [logId, planId, stepIndex, description, status, evidence || null, now]
    );

    const binaryArray = db.export();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }

  return entry;
}

export async function addProposalRecord(
  dbPath: string,
  type: 'code' | 'discussion' | 'decision' | 'plan' | 'issue',
  targetType: 'file' | 'function' | 'class' | 'query' | 'project',
  targetId: string,
  title: string,
  payload: string,
  proposedBy: string,
  options?: SqliteStoreOptions
): Promise<ProposalRecord> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const id = `proposal:${type}:${Date.now()}`;

  const proposal: ProposalRecord = {
    id,
    type,
    targetType,
    targetId,
    title,
    payload,
    proposedBy,
    createdAt: now,
    status: 'pending'
  };

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    db.prepare(
      'INSERT INTO proposals (id, type, targetType, targetId, title, payload, proposedBy, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(id, type, targetType, targetId, title, payload, proposedBy, now, 'pending');

    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    db.run(
      'INSERT INTO proposals (id, type, targetType, targetId, title, payload, proposedBy, createdAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, type, targetType, targetId, title, payload, proposedBy, now, 'pending']
    );

    const binaryArray = db.export();
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }

  return proposal;
}

export async function approveProposal(
  dbPath: string,
  proposalId: string,
  reviewedBy: string,
  options?: SqliteStoreOptions & { rootDir?: string }
): Promise<{ success: boolean; proposal: ProposalRecord | null; applied: boolean }> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  const rootDir = options?.rootDir || path.dirname(dbPath);

  let proposal: ProposalRecord | null = null;

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId) as any;
    if (row) {
      db.prepare('UPDATE proposals SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?').run(
        'approved',
        reviewedBy,
        now,
        proposalId
      );
      proposal = { ...row, status: 'approved', reviewedBy, reviewedAt: now };
    }
    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    const res = db.exec('SELECT * FROM proposals WHERE id = ?', [proposalId]);
    if (res.length > 0 && res[0].values.length > 0) {
      const cols = res[0].columns;
      const vals = res[0].values[0];
      const row: any = {};
      cols.forEach((c, idx) => { row[c] = vals[idx]; });

      db.run('UPDATE proposals SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?', [
        'approved',
        reviewedBy,
        now,
        proposalId
      ]);

      const binaryArray = db.export();
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, Buffer.from(binaryArray));
      proposal = { ...row, status: 'approved', reviewedBy, reviewedAt: now };
    }
    db.close();
  }

  // Execute Code or Data write-back payload upon approval
  if (proposal) {
    try {
      const payload = JSON.parse(proposal.payload);
      if (proposal.type === 'code' && payload.newContent && payload.filePath) {
        // Code-type payload execution: write payload directly to disk
        const targetPath = path.isAbsolute(payload.filePath) ? payload.filePath : path.join(rootDir, payload.filePath);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, payload.newContent, 'utf8');
      }
    } catch {}
  }

  return { success: Boolean(proposal), proposal, applied: true };
}

export async function rejectProposal(
  dbPath: string,
  proposalId: string,
  reviewedBy: string,
  rejectionReason?: string,
  options?: SqliteStoreOptions
): Promise<{ success: boolean; proposal: ProposalRecord | null }> {
  const driver = await detectAvailableDriver(options?.driver);
  const now = new Date().toISOString();
  let proposal: ProposalRecord | null = null;

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    const row = db.prepare('SELECT * FROM proposals WHERE id = ?').get(proposalId) as any;
    if (row) {
      db.prepare('UPDATE proposals SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ? WHERE id = ?').run(
        'rejected',
        reviewedBy,
        now,
        rejectionReason || null,
        proposalId
      );
      proposal = { ...row, status: 'rejected', reviewedBy, reviewedAt: now, rejectionReason: rejectionReason || null };
    }
    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    const res = db.exec('SELECT * FROM proposals WHERE id = ?', [proposalId]);
    if (res.length > 0 && res[0].values.length > 0) {
      const cols = res[0].columns;
      const vals = res[0].values[0];
      const row: any = {};
      cols.forEach((c, idx) => { row[c] = vals[idx]; });

      db.run('UPDATE proposals SET status = ?, reviewedBy = ?, reviewedAt = ?, rejectionReason = ? WHERE id = ?', [
        'rejected',
        reviewedBy,
        now,
        rejectionReason || null,
        proposalId
      ]);

      const binaryArray = db.export();
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      fs.writeFileSync(dbPath, Buffer.from(binaryArray));
      proposal = { ...row, status: 'rejected', reviewedBy, reviewedAt: now, rejectionReason: rejectionReason || null };
    }
    db.close();
  }

  return { success: Boolean(proposal), proposal };
}

export async function cascadeDeleteFileFromIndex(
  dbPath: string,
  targetFile: string,
  options?: SqliteStoreOptions
): Promise<void> {
  const driver = await detectAvailableDriver(options?.driver);
  const relFile = targetFile.replace(/\\/g, '/');
  const matchPattern = `%${relFile}%`;

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM context_clients WHERE file = ? OR file LIKE ?').run(relFile, matchPattern);
      db.prepare('DELETE FROM context_queries WHERE file = ? OR file LIKE ?').run(relFile, matchPattern);
      db.prepare('DELETE FROM context_functions WHERE file = ? OR file LIKE ?').run(relFile, matchPattern);
      db.prepare('DELETE FROM context_symbol_references WHERE file = ? OR file LIKE ?').run(relFile, matchPattern);
      db.prepare('DELETE FROM context_file_hashes WHERE file = ? OR file LIKE ?').run(relFile, matchPattern);
      db.prepare('DELETE FROM context_call_edges WHERE file = ? OR file LIKE ? OR callerId LIKE ? OR calleeId LIKE ?').run(
        relFile,
        matchPattern,
        matchPattern,
        matchPattern
      );
    });
    tx();
    db.close();
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    db.run('DELETE FROM context_clients WHERE file = ? OR file LIKE ?', [relFile, matchPattern]);
    db.run('DELETE FROM context_queries WHERE file = ? OR file LIKE ?', [relFile, matchPattern]);
    db.run('DELETE FROM context_functions WHERE file = ? OR file LIKE ?', [relFile, matchPattern]);
    db.run('DELETE FROM context_symbol_references WHERE file = ? OR file LIKE ?', [relFile, matchPattern]);
    db.run('DELETE FROM context_file_hashes WHERE file = ? OR file LIKE ?', [relFile, matchPattern]);
    db.run('DELETE FROM context_call_edges WHERE file = ? OR file LIKE ? OR callerId LIKE ? OR calleeId LIKE ?', [
      relFile,
      matchPattern,
      matchPattern,
      matchPattern
    ]);

    const binaryArray = db.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
  }
}

export async function saveIndexToSqlite(
  dbPath: string,
  schemaSql: string,
  indexResult: IndexResult,
  options?: SqliteStoreOptions
): Promise<{ driverUsed: 'better-sqlite3' | 'sql.js' }> {
  const driver = await detectAvailableDriver(options?.driver);

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (driver === 'better-sqlite3') {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    db.exec(schemaSql);

    const insertClient = db.prepare(`
      INSERT INTO context_clients (id, file, line, variableName, dbType, initExpression, exportedAs, configSource, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertQuery = db.prepare(`
      INSERT INTO context_queries (id, file, line, enclosingFunction, enclosingClass, dbType, operation, target, clientRefId, resolved, unresolvedReason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertFunction = db.prepare(`
      INSERT INTO context_functions (id, name, file, line, endLine, className, touchesDb, transitiveTouchesDb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertEdge = db.prepare(`
      INSERT INTO context_call_edges (callerId, calleeId, file, line)
      VALUES (?, ?, ?, ?)
    `);

    const insertRef = db.prepare(`
      INSERT INTO context_symbol_references (id, declarationId, file, line, refType)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertHash = db.prepare(`
      INSERT INTO context_file_hashes (file, contentHash, lastScanned)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      for (const client of indexResult.clients) {
        insertClient.run(
          client.id,
          client.file,
          client.line,
          client.variableName,
          client.dbType,
          client.initExpression,
          client.exportedAs,
          client.configSource,
          client.metadata ? JSON.stringify(client.metadata) : null
        );
      }

      for (const query of indexResult.queries) {
        insertQuery.run(
          query.id,
          query.file,
          query.line,
          query.enclosingFunction,
          query.enclosingClass,
          query.dbType,
          query.operation,
          query.target,
          query.clientRefId,
          query.resolved ? 1 : 0,
          query.unresolvedReason || null
        );
      }

      for (const func of indexResult.functions) {
        insertFunction.run(
          func.id,
          func.name,
          func.file,
          func.line,
          func.endLine || func.line,
          func.className,
          JSON.stringify(func.touchesDb),
          JSON.stringify(func.transitiveTouchesDb)
        );
      }

      for (const edge of indexResult.edges) {
        insertEdge.run(edge.callerId, edge.calleeId, edge.file, edge.line);
      }

      for (const ref of indexResult.references || []) {
        insertRef.run(ref.id, ref.declarationId, ref.file, ref.line, ref.refType);
      }

      for (const hash of indexResult.fileHashes || []) {
        insertHash.run(hash.file, hash.contentHash, hash.lastScanned);
      }
    });

    transaction();
    db.close();
    return { driverUsed: 'better-sqlite3' };
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const db = new SQL.Database();

    db.run(schemaSql);

    const insertClient = db.prepare(`
      INSERT INTO context_clients (id, file, line, variableName, dbType, initExpression, exportedAs, configSource, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const client of indexResult.clients) {
      insertClient.run([
        client.id,
        client.file,
        client.line,
        client.variableName,
        client.dbType,
        client.initExpression,
        client.exportedAs,
        client.configSource,
        client.metadata ? JSON.stringify(client.metadata) : null
      ]);
    }
    insertClient.free();

    const insertQuery = db.prepare(`
      INSERT INTO context_queries (id, file, line, enclosingFunction, enclosingClass, dbType, operation, target, clientRefId, resolved, unresolvedReason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const query of indexResult.queries) {
      insertQuery.run([
        query.id,
        query.file,
        query.line,
        query.enclosingFunction,
        query.enclosingClass,
        query.dbType,
        query.operation,
        query.target,
        query.clientRefId,
        query.resolved ? 1 : 0,
        query.unresolvedReason || null
      ]);
    }
    insertQuery.free();

    const insertFunction = db.prepare(`
      INSERT INTO context_functions (id, name, file, line, endLine, className, touchesDb, transitiveTouchesDb)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const func of indexResult.functions) {
      insertFunction.run([
        func.id,
        func.name,
        func.file,
        func.line,
        func.endLine || func.line,
        func.className,
        JSON.stringify(func.touchesDb),
        JSON.stringify(func.transitiveTouchesDb)
      ]);
    }
    insertFunction.free();

    const insertEdge = db.prepare(`
      INSERT INTO context_call_edges (callerId, calleeId, file, line)
      VALUES (?, ?, ?, ?)
    `);

    for (const edge of indexResult.edges) {
      insertEdge.run([edge.callerId, edge.calleeId, edge.file, edge.line]);
    }
    insertEdge.free();

    const insertRef = db.prepare(`
      INSERT INTO context_symbol_references (id, declarationId, file, line, refType)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const ref of indexResult.references || []) {
      insertRef.run([ref.id, ref.declarationId, ref.file, ref.line, ref.refType]);
    }
    insertRef.free();

    const insertHash = db.prepare(`
      INSERT INTO context_file_hashes (file, contentHash, lastScanned)
      VALUES (?, ?, ?)
    `);

    for (const hash of indexResult.fileHashes || []) {
      insertHash.run([hash.file, hash.contentHash, hash.lastScanned]);
    }
    insertHash.free();

    const binaryArray = db.export();
    fs.writeFileSync(dbPath, Buffer.from(binaryArray));
    db.close();
    return { driverUsed: 'sql.js' };
  }
}

export async function loadIndexFromSqlite(dbPath: string, options?: SqliteStoreOptions): Promise<IndexResult> {
  const driver = await detectAvailableDriver(options?.driver);

  if (driver === 'better-sqlite3') {
    const Database = loadBetterSqliteModule();
    const db = new Database(dbPath);
    migrateLegacyDbBetterSqlite(db);

    const clients = db.prepare('SELECT * FROM context_clients').all().map((row: any) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));

    const queries = db.prepare('SELECT * FROM context_queries').all().map((row: any) => ({
      ...row,
      resolved: Boolean(row.resolved)
    }));

    const functions = db.prepare('SELECT * FROM context_functions').all().map((row: any) => ({
      ...row,
      endLine: row.endLine || row.line,
      touchesDb: JSON.parse(row.touchesDb),
      transitiveTouchesDb: JSON.parse(row.transitiveTouchesDb)
    }));

    const edges = db.prepare('SELECT * FROM context_call_edges').all() as any[];
    const references = db.prepare('SELECT * FROM context_symbol_references').all() as ReferenceNode[];
    const fileHashes = db.prepare('SELECT * FROM context_file_hashes').all() as FileHashEntry[];
    const threads = db.prepare('SELECT * FROM discussion_threads').all() as DiscussionThread[];
    const entries = db.prepare('SELECT * FROM discussion_entries').all() as DiscussionEntry[];
    const decisions = db.prepare('SELECT * FROM decisions').all() as DecisionRecord[];
    const plans = db.prepare('SELECT * FROM plans').all() as PlanRecord[];
    const planLogs = db.prepare('SELECT * FROM plan_progress_log').all() as PlanProgressLogEntry[];
    const proposals = db.prepare('SELECT * FROM proposals').all() as ProposalRecord[];

    const unresolved = queries.filter((q: any) => !q.resolved);
    db.close();

    return { clients, queries, functions, edges, references, fileHashes, unresolved, threads, entries, decisions, plans, planLogs, proposals };
  } else {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    migrateLegacyDbSqlJs(db, dbPath);

    const parseRows = (queryStr: string) => {
      try {
        const res = db.exec(queryStr);
        const rows: any[] = [];
        if (res.length > 0) {
          const columns = res[0].columns;
          for (const values of res[0].values) {
            const row: any = {};
            columns.forEach((col, idx) => {
              row[col] = values[idx];
            });
            rows.push(row);
          }
        }
        return rows;
      } catch {
        return [];
      }
    };

    const clients = parseRows('SELECT * FROM context_clients').map((row) => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));

    const queries = parseRows('SELECT * FROM context_queries').map((row) => ({
      ...row,
      resolved: Boolean(row.resolved)
    }));

    const functions = parseRows('SELECT * FROM context_functions').map((row) => ({
      ...row,
      endLine: row.endLine || row.line,
      touchesDb: JSON.parse(row.touchesDb),
      transitiveTouchesDb: JSON.parse(row.transitiveTouchesDb)
    }));

    const edges = parseRows('SELECT * FROM context_call_edges');
    const references = parseRows('SELECT * FROM context_symbol_references') as ReferenceNode[];
    const fileHashes = parseRows('SELECT * FROM context_file_hashes') as FileHashEntry[];
    const threads = parseRows('SELECT * FROM discussion_threads') as DiscussionThread[];
    const entries = parseRows('SELECT * FROM discussion_entries') as DiscussionEntry[];
    const decisions = parseRows('SELECT * FROM decisions') as DecisionRecord[];
    const plans = parseRows('SELECT * FROM plans') as PlanRecord[];
    const planLogs = parseRows('SELECT * FROM plan_progress_log') as PlanProgressLogEntry[];
    const proposals = parseRows('SELECT * FROM proposals') as ProposalRecord[];

    const unresolved = queries.filter((q: any) => !q.resolved);
    db.close();

    return { clients, queries, functions, edges, references, fileHashes, unresolved, threads, entries, decisions, plans, planLogs, proposals };
  }
}
