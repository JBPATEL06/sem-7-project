import { getPgliteInstance } from '../../server/modules/db/drivers/pgliteDriver.js';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import pg from 'pg';

async function main() {
  console.log('Fetching live acme-api PGlite instance...');
  const db = await getPgliteInstance('acme-api');
  console.log('Obtained live acme-api PGlite instance!');

  const server = new PGLiteSocketServer(db, { port: 5434, host: '127.0.0.1' });
  await server.start();
  console.log('PGLiteSocketServer started on port 5434!');

  const client = new pg.Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:5434/postgres'
  });
  await client.connect();
  console.log('Connected via standard pg Client over TCP port 5434!');

  const res = await client.query('SELECT * FROM customers LIMIT 1;');
  console.log('TCP Query Result:', res.rows);

  await client.end();
  await server.stop();
  console.log('Test completed and server stopped cleanly!');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
