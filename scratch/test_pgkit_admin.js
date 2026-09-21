import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { getExpressRouter } from '@pgkit/admin';

async function startAdmin() {
  const db = new PGlite('d:/Projets/sem-7-project/pglite_data/v058_acme');
  await db.waitReady;
  console.log('PGlite 0.5.8 instance ready with v058_acme database');

  const socketServer = new PGLiteSocketServer({ db, port: 5432, host: '127.0.0.1' });
  await socketServer.start();
  console.log('PGLiteSocketServer running on 127.0.0.1:5432');

  const app = express();
  const connStr = 'postgresql://postgres:postgres@127.0.0.1:5432/postgres';
  
  app.use(getExpressRouter(connStr));

  const server = app.listen(5050, () => {
    console.log('@pgkit/admin server running at http://localhost:5050');
  });
}

startAdmin().catch(err => {
  console.error('Failed to start @pgkit/admin:', err);
  process.exit(1);
});
