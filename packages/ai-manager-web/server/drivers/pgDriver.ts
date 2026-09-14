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
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 8000
      });
      this.pools.set(uri, pool);
    }
    return this.pools.get(uri)!;
  }

  // Close and evict a single connection pool by URI
  public static async closePool(uri: string): Promise<void> {
    const pool = this.pools.get(uri);
    if (pool) {
      try {
        await pool.end();
      } catch {}
      this.pools.delete(uri);
      console.log(`[PgDriver] Pool for ${uri.slice(0, 15)}... closed.`);
    }
  }

  // G6: Graceful shutdown — end all pg pools
  public static async closeAll(): Promise<void> {
    const closers = Array.from(this.pools.values()).map(pool => {
      try { return pool.end(); } catch { return Promise.resolve(); }
    });
    await Promise.allSettled(closers);
    this.pools.clear();
    console.log('[PgDriver] All pools ended.');
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
      // 1. Get all public user tables and their columns in a single joined query
      const colsRes = await client.query(`
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk
        FROM information_schema.columns c
        JOIN information_schema.tables t 
          ON c.table_name = t.table_name 
          AND c.table_schema = t.table_schema
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = 'public'
        ) pk ON c.column_name = pk.column_name AND c.table_name = pk.table_name
        WHERE c.table_schema = 'public' 
          AND t.table_type = 'BASE TABLE'
        ORDER BY c.table_name, c.ordinal_position;
      `);

      // 2. Fetch approximate row counts for all tables in a single query
      const rowCountsRes = await client.query(`
        SELECT relname AS table_name, COALESCE(n_live_tup, 0) AS row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public';
      `);

      const rowCountMap = new Map<string, number>();
      for (const r of rowCountsRes.rows) {
        rowCountMap.set(r.table_name, parseInt(r.row_count || '0', 10));
      }

      // 3. Group columns by table
      const tablesMap = new Map<string, PgTableSchema>();

      for (const row of colsRes.rows) {
        const tableName = row.table_name;
        if (!tablesMap.has(tableName)) {
          tablesMap.set(tableName, {
            name: tableName,
            rowCount: rowCountMap.get(tableName) ?? 0,
            columns: []
          });
        }

        tablesMap.get(tableName)!.columns.push({
          name: row.column_name,
          type: row.data_type,
          notNull: row.is_nullable === 'NO',
          dfltValue: row.column_default,
          pk: row.is_pk
        });
      }

      return Array.from(tablesMap.values());
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
