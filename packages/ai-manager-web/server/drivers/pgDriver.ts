import pg from 'pg';
const { Pool } = pg;

export interface PgColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  dfltValue: any;
  pk: boolean;
}

export interface PgTableSchema {
  name: string;
  columns: PgColumnInfo[];
  rowCount: number;
}

export class PgDriver {
  private static pools: Map<string, pg.Pool> = new Map();

  public static getPool(uri: string): pg.Pool {
    if (!this.pools.has(uri)) {
      const pool = new Pool({
        connectionString: uri,
        ssl: uri.includes('supabase') || uri.includes('neon.tech') || uri.includes('aws') || uri.includes('sslmode=require')
          ? { rejectUnauthorized: false }
          : false,
        connectionTimeoutMillis: 8000
      });
      this.pools.set(uri, pool);
    }
    return this.pools.get(uri)!;
  }

  public static async testConnection(uri: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const pool = this.getPool(uri);
      const client = await pool.connect();
      await client.query('SELECT 1;');
      client.release();
      return { success: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message };
    }
  }

  public static async getSchema(uri: string): Promise<PgTableSchema[]> {
    const pool = this.getPool(uri);
    const client = await pool.connect();

    try {
      // 1. Get all public user tables
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);

      const tables: PgTableSchema[] = [];

      for (const row of tablesRes.rows) {
        const tableName = row.table_name;

        // 2. Get columns and primary key constraints
        const colsRes = await client.query(`
          SELECT 
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name, ku.table_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name
              AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = 'public'
              AND tc.table_name = $1
          ) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
          WHERE c.table_schema = 'public' AND c.table_name = $1
          ORDER BY c.ordinal_position;
        `, [tableName]);

        // 3. Approximate row count
        let rowCount = 0;
        try {
          const countRes = await client.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
          rowCount = parseInt(countRes.rows[0]?.count || '0', 10);
        } catch {
          rowCount = 0;
        }

        tables.push({
          name: tableName,
          rowCount,
          columns: colsRes.rows.map((col: any) => ({
            name: col.column_name,
            type: col.data_type,
            notNull: col.is_nullable === 'NO',
            dfltValue: col.column_default,
            pk: col.is_pk
          }))
        });
      }

      return tables;
    } finally {
      client.release();
    }
  }

  public static async executeQuery(uri: string, queryText: string, limit: number = 100): Promise<{
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTimeMs: number;
  }> {
    const pool = this.getPool(uri);
    const client = await pool.connect();
    const start = performance.now();

    try {
      const res = await client.query(queryText);
      const executionTimeMs = Math.round((performance.now() - start) * 100) / 100;

      if (Array.isArray(res)) {
        const last = res[res.length - 1];
        return {
          columns: last.fields ? last.fields.map((f: any) => f.name) : [],
          rows: (last.rows || []).slice(0, limit),
          rowCount: last.rowCount || (last.rows ? last.rows.length : 0),
          executionTimeMs
        };
      }

      return {
        columns: res.fields ? res.fields.map((f: any) => f.name) : [],
        rows: (res.rows || []).slice(0, limit),
        rowCount: res.rowCount !== null ? res.rowCount : (res.rows ? res.rows.length : 0),
        executionTimeMs
      };
    } finally {
      client.release();
    }
  }
}
