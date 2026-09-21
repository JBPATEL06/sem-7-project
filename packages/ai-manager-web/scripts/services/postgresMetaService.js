import http from 'http';
import { getPgliteInstance, getPgliteTables, queryPglite, execPglite } from '../../server/modules/db/drivers/pgliteDriver.js';

const PORT = 1337;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost:1337'}`);
  const pathname = url.pathname;
  const projectId = url.searchParams.get('project') || 'acme-api';

  const sendJson = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  try {
    // 1. Health
    if (pathname === '/health' || pathname === '/') {
      return sendJson(200, {
        status: 'ok',
        service: 'postgres-meta',
        port: PORT,
        engine: 'PGlite WASM',
        projectId
      });
    }

    // 2. Tables list
    if (pathname === '/tables') {
      const tables = await getPgliteTables(projectId);
      const metaTables = tables.map((t, idx) => {
        const tableName = t.name || t.tableName || t.table_name || `table_${idx + 1}`;
        return {
          id: idx + 1,
          name: tableName,
          tableName: tableName,
          table_name: tableName,
          schema: t.schema || 'public',
          comment: null,
          owner: 'postgres',
          rls_enabled: false,
          rls_forced: false,
          replica_identity: 'DEFAULT',
          bytes: 8192,
          size: '8 kB',
          live_rows_estimate: t.rowCount !== undefined ? t.rowCount : 0,
          dead_rows_estimate: 0,
          rowCount: t.rowCount !== undefined ? t.rowCount : 0
        };
      });
      return sendJson(200, metaTables);
    }

    // 3. Schemas list
    if (pathname === '/schemas') {
      return sendJson(200, [
        { id: 1, name: 'public', owner: 'postgres' },
        { id: 2, name: 'information_schema', owner: 'postgres' },
        { id: 3, name: 'pg_catalog', owner: 'postgres' }
      ]);
    }

    // 4. Columns introspection
    if (pathname === '/columns') {
      const tableFilter = url.searchParams.get('table');
      const sql = `
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE c.table_schema = 'public'
        ${tableFilter ? `AND c.table_name = '${tableFilter.replace(/'/g, "''")}'` : ''}
        ORDER BY c.table_name, c.ordinal_position;
      `;
      const result = await queryPglite(sql, [], projectId);
      return sendJson(200, result.rows || []);
    }

    // 5. Table Data (with pagination and sorting)
    if (pathname === '/table-data') {
      const table = url.searchParams.get('table');
      if (!table) return sendJson(400, { error: 'table parameter required' });

      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const offset = parseInt(url.searchParams.get('offset') || '0', 10);
      const sort = url.searchParams.get('sort');
      const order = (url.searchParams.get('order') || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

      const safeTable = `"${table.replace(/"/g, '""')}"`;
      const orderClause = sort ? `ORDER BY "${sort.replace(/"/g, '""')}" ${order}` : '';

      const countRes = await queryPglite(`SELECT COUNT(*) as count FROM ${safeTable}`, [], projectId);
      const total = countRes.rows[0]?.count ? parseInt(String(countRes.rows[0].count), 10) : 0;

      const dataRes = await queryPglite(`SELECT * FROM ${safeTable} ${orderClause} LIMIT ${limit} OFFSET ${offset}`, [], projectId);

      return sendJson(200, {
        table,
        rows: dataRes.rows || [],
        fields: dataRes.fields || [],
        total,
        limit,
        offset
      });
    }

    // 6. Insert row
    if (pathname === '/insert-row' && req.method === 'POST') {
      const { table, row } = await readBody(req);
      if (!table || !row || typeof row !== 'object') {
        return sendJson(400, { error: 'table and row object required' });
      }

      const keys = Object.keys(row).filter(k => row[k] !== undefined && row[k] !== '');
      if (keys.length === 0) {
        return sendJson(400, { error: 'No non-empty fields provided' });
      }

      const safeTable = `"${table.replace(/"/g, '""')}"`;
      const colNames = keys.map(k => `"${k.replace(/"/g, '""')}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => row[k]);

      const sql = `INSERT INTO ${safeTable} (${colNames}) VALUES (${placeholders}) RETURNING *;`;
      const result = await queryPglite(sql, values, projectId);
      return sendJson(201, { success: true, inserted: result.rows[0] });
    }

    // 7. Update cell (inline editing)
    if (pathname === '/update-cell' && (req.method === 'PUT' || req.method === 'POST')) {
      const { table, pkColumn, pkValue, column, value } = await readBody(req);
      if (!table || !pkColumn || pkValue === undefined || !column) {
        return sendJson(400, { error: 'table, pkColumn, pkValue, and column required' });
      }

      const safeTable = `"${table.replace(/"/g, '""')}"`;
      const safeCol = `"${column.replace(/"/g, '""')}"`;
      const safePk = `"${pkColumn.replace(/"/g, '""')}"`;

      const sql = `UPDATE ${safeTable} SET ${safeCol} = $1 WHERE ${safePk} = $2 RETURNING *;`;
      const result = await queryPglite(sql, [value, pkValue], projectId);
      return sendJson(200, { success: true, updated: result.rows[0] });
    }

    // 8. Functions: List, Create, Test
    if (pathname === '/functions') {
      if (req.method === 'GET') {
        const sql = `
          SELECT 
            p.proname as name,
            pg_get_functiondef(p.oid) as definition,
            p.prosrc as source,
            pg_get_function_arguments(p.oid) as arguments,
            pg_get_function_result(p.oid) as return_type,
            l.lanname as language
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          JOIN pg_language l ON p.prolang = l.oid
          WHERE n.nspname = 'public'
          ORDER BY p.proname;
        `;
        const result = await queryPglite(sql, [], projectId);
        return sendJson(200, result.rows || []);
      }

      if (req.method === 'POST') {
        const { sql } = await readBody(req);
        if (!sql) return sendJson(400, { error: 'sql parameter required' });
        const result = await queryPglite(sql, [], projectId);
        return sendJson(200, { success: true, message: 'Function saved successfully', result });
      }
    }

    if (pathname === '/functions/test' && req.method === 'POST') {
      const { functionName, args = [] } = await readBody(req);
      if (!functionName) return sendJson(400, { error: 'functionName required' });
      const safeName = functionName.replace(/[^a-zA-Z0-9_]/g, '');
      const placeholders = args.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `SELECT ${safeName}(${placeholders}) as result;`;
      const result = await queryPglite(sql, args, projectId);
      return sendJson(200, { success: true, result: result.rows[0]?.result });
    }

    // 9. Schema ERD Introspection
    if (pathname === '/schema/erd') {
      const tables = await getPgliteTables(projectId);
      const colsSql = `
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.table_name, ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku
            ON tc.constraint_name = ku.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position;
      `;
      const colsRes = await queryPglite(colsSql, [], projectId);

      const fkSql = `
        SELECT
          tc.constraint_name,
          tc.table_name AS source_table,
          kcu.column_name AS source_column,
          ccu.table_name AS target_table,
          ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public';
      `;
      const fkRes = await queryPglite(fkSql, [], projectId);

      const tableNodes = tables.map(t => {
        const tableName = t.name || t.tableName || t.table_name;
        const columns = (colsRes.rows || []).filter(c => c.table_name === tableName);
        return {
          name: tableName,
          rowCount: t.rowCount || 0,
          columns: columns.map(c => ({
            name: c.column_name,
            type: c.data_type,
            isPrimary: c.is_primary,
            isNullable: c.is_nullable === 'YES',
            columnDefault: c.column_default
          }))
        };
      });

      return sendJson(200, {
        tables: tableNodes,
        foreignKeys: fkRes.rows || []
      });
    }

    // 9b. Visual Table Builder Endpoint
    if (pathname === '/create-table' && req.method === 'POST') {
      const { name, columns } = await readBody(req);
      if (!name || typeof name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name.trim())) {
        return sendJson(400, { error: 'Invalid table name. Use alphanumeric characters and underscores.' });
      }
      if (!Array.isArray(columns) || columns.length === 0) {
        return sendJson(400, { error: 'At least one column is required.' });
      }

      const safeTableName = `"${name.trim().replace(/"/g, '""')}"`;
      const colDefs = [];
      const constraints = [];

      for (const col of columns) {
        if (!col.name || typeof col.name !== 'string') {
          return sendJson(400, { error: 'Column name is required for each column.' });
        }
        const safeColName = `"${col.name.trim().replace(/"/g, '""')}"`;
        const colType = (col.type || 'text').trim();
        let def = `${safeColName} ${colType}`;

        if (col.isPrimary) def += ' PRIMARY KEY';
        if (col.isNullable === false || col.isNotNull) def += ' NOT NULL';
        if (col.isUnique) def += ' UNIQUE';
        if (col.defaultValue && String(col.defaultValue).trim() !== '') {
          const val = String(col.defaultValue).trim();
          // If already expression or quoted string or number
          def += ` DEFAULT ${val}`;
        }
        colDefs.push(def);

        if (col.foreignKey && col.foreignKey.targetTable && col.foreignKey.targetColumn) {
          const fkName = `fk_${name.trim()}_${col.name.trim()}`;
          const safeTargetTable = `"${col.foreignKey.targetTable.replace(/"/g, '""')}"`;
          const safeTargetCol = `"${col.foreignKey.targetColumn.replace(/"/g, '""')}"`;
          constraints.push(`CONSTRAINT "${fkName}" FOREIGN KEY (${safeColName}) REFERENCES ${safeTargetTable} (${safeTargetCol}) ON DELETE SET NULL`);
        }
      }

      const allClauses = [...colDefs, ...constraints].join(',\n  ');
      const ddl = `CREATE TABLE ${safeTableName} (\n  ${allClauses}\n);`;

      try {
        await execPglite(ddl, projectId);
        return sendJson(201, {
          success: true,
          message: `Table ${name} created successfully`,
          ddl
        });
      } catch (err) {
        return sendJson(400, { error: err.message, ddl });
      }
    }

    // 10. Execute Arbitrary SQL (Supports Multi-Statement Scripts via db.exec)
    if (pathname === '/query' && req.method === 'POST') {
      const body = await readBody(req);
      const sql = (body.query || body.sql || 'SELECT 1;').trim();
      try {
        const results = await execPglite(sql, projectId);
        // Find the last statement that returned rows, or the last statement
        const lastWithRows = [...results].reverse().find(r => r.rows && r.rows.length > 0);
        const activeResult = lastWithRows || results[results.length - 1] || { rows: [], fields: [], affectedRows: 0 };
        return sendJson(200, {
          rows: activeResult.rows || [],
          fields: activeResult.fields || [],
          affectedRows: activeResult.affectedRows,
          totalStatements: results.length,
          allResults: results
        });
      } catch (err) {
        return sendJson(400, { error: err.message });
      }
    }

    // 404
    return sendJson(404, { error: 'Endpoint not found', path: pathname });
  } catch (error) {
    return sendJson(500, { error: error.message });
  }
});

server.listen(PORT, async () => {
  try {
    await getPgliteInstance('acme-api');
    console.log(`[postgres-meta] Local postgres-meta REST API running at http://localhost:${PORT} (USE_PGLITE=true)`);
  } catch (e) {
    console.log(`[postgres-meta] Local postgres-meta REST API running at http://localhost:${PORT}`);
  }
});

process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
