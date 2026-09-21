import { PGlite } from '@electric-sql/pglite';
import path from 'path';
import fs from 'fs';
import { getWorkspaceRootDir } from '../../../shared/index.js';

const pgliteInstances = new Map<string, PGlite>();

export function sanitizeProjectId(projectId: string | undefined): string {
  if (!projectId || typeof projectId !== 'string') {
    return 'acme-api';
  }
  return projectId.toLowerCase().replace(/[^a-z0-9_-]/g, '_').replace(/^_+|_+$/g, '') || 'acme-api';
}

export function getPgliteDataDir(projectId: string = 'acme-api'): string {
  const rootDir = getWorkspaceRootDir();
  const cleanId = sanitizeProjectId(projectId);
  const dir = path.join(rootDir, 'pglite_data', cleanId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function getPgliteInstance(projectId: string = 'acme-api'): Promise<PGlite> {
  const cleanId = sanitizeProjectId(projectId);
  let db = pgliteInstances.get(cleanId);
  if (!db) {
    const dataDir = getPgliteDataDir(cleanId);
    db = new PGlite(dataDir);
    await db.waitReady;
    await seedDefaultPgliteTables(db, cleanId);
    pgliteInstances.set(cleanId, db);
  }
  return db;
}

async function seedDefaultPgliteTables(db: PGlite, projectId: string): Promise<void> {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        owner_email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO users (email, name, role)
      VALUES ('admin@local.dev', 'Local Administrator', 'admin'),
             ('developer@local.dev', 'Lead Developer', 'developer')
      ON CONFLICT (email) DO NOTHING;

      INSERT INTO projects (id, name, description, owner_email)
      VALUES ('${projectId}', '${projectId} Workspace', 'Isolated PGlite Database for ${projectId}', 'admin@local.dev')
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err: any) {
    console.error(`[PGlite Driver] Table seed error for project ${projectId}:`, err.message);
  }
}

export async function queryPglite(sql: string, params: any[] = [], projectId: string = 'acme-api'): Promise<{
  rows: any[];
  fields: string[];
  affectedRows?: number;
}> {
  const db = await getPgliteInstance(projectId);
  const res = await db.query(sql, params);
  const rows = res.rows || [];
  const fields = res.fields ? res.fields.map((f: any) => f.name) : (rows.length > 0 ? Object.keys(rows[0]) : []);

  return {
    rows,
    fields,
    affectedRows: res.affectedRows
  };
}

export async function getPgliteTables(projectId: string = 'acme-api'): Promise<Array<{ tableName: string; rowCount: number }>> {
  const db = await getPgliteInstance(projectId);
  const res = await db.query<{ table_name: string }>(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `);

  const tables: Array<{ tableName: string; rowCount: number }> = [];
  for (const row of res.rows) {
    const countRes = await db.query(`SELECT COUNT(*) as count FROM "${row.table_name}"`);
    const count = countRes.rows[0]?.count ? parseInt(String(countRes.rows[0].count), 10) : 0;
    tables.push({
      tableName: row.table_name,
      rowCount: count
    });
  }
  return tables;
}

export async function getPgliteSchema(projectId: string = 'acme-api'): Promise<Record<string, Array<{ columnName: string; dataType: string; isNullable: string }>>> {
  const db = await getPgliteInstance(projectId);
  const res = await db.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const schemaMap: Record<string, Array<{ columnName: string; dataType: string; isNullable: string }>> = {};
  for (const row of res.rows) {
    if (!schemaMap[row.table_name]) {
      schemaMap[row.table_name] = [];
    }
    schemaMap[row.table_name].push({
      columnName: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable
    });
  }
  return schemaMap;
}
