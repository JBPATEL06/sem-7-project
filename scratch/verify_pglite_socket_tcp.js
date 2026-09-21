import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

async function testTcp() {
  console.log('--- STEP 1: INITIALIZING PGLITE + PGLITE-SOCKET ---');
  const db = new PGlite('d:/Projets/sem-7-project/pglite_data/v058_acme');
  await db.waitReady;
  console.log('PGlite 0.5.8 instance ready with v058_acme database');

  const server = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1' });
  await server.start();
  console.log('PGLiteSocketServer listening on 127.0.0.1:5432');

  console.log('--- STEP 2: CONNECTING VIA STANDARD PG CLIENT OVER TCP ---');
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/postgres'
  });
  await client.connect();
  console.log('Connected to TCP socket successfully!');

  console.log('--- STEP 3: QUERYING REAL CUSTOMER DATA OVER TCP ---');
  const customerRes = await client.query('SELECT * FROM customers LIMIT 1;');
  console.log('Customer row over TCP:');
  console.log(JSON.stringify(customerRes.rows[0], null, 2));

  console.log('--- STEP 4: QUERYING FOREIGN KEYS OVER TCP ---');
  const fkRes = await client.query(`
    SELECT 
      conrelid::regclass::text AS source_table,
      confrelid::regclass::text AS target_table,
      pg_get_constraintdef(oid) AS constraint_def
    FROM pg_constraint
    WHERE contype = 'f';
  `);
  console.log(`Foreign keys found (${fkRes.rows.length}):`);
  fkRes.rows.forEach((r, idx) => {
    console.log(`  ${idx + 1}. ${r.source_table} -> ${r.target_table} : ${r.constraint_def}`);
  });

  console.log('--- STEP 5: QUERYING ALL 5 TABLE COUNTS OVER TCP ---');
  for (const tbl of ['customers', 'products', 'orders', 'order_items', 'payments']) {
    const countRes = await client.query(`SELECT COUNT(*) FROM ${tbl};`);
    console.log(`  Table ${tbl}: ${countRes.rows[0].count} rows`);
  }

  await client.end();
  await server.stop();
  console.log('--- STEP 6: TEST PASSED & CLEAN SHUTDOWN ---');
}

testTcp().catch(err => {
  console.error('TCP Test failed:', err);
  process.exit(1);
});
