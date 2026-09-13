import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {}

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { authRouter, initMongoAndMigrate, initDefaultAdmin } from './auth.js';
import { projectsRouter } from './projects.js';
import { modulesRouter } from './modules.js';
import { dbRouter } from './dbRoutes.js';
import { dashboardRouter } from './dashboardRoutes.js';
import { settingsRouter } from './settingsRoutes.js';
import { qaRouter } from './qaRoutes.js';
import { adminRouter } from './adminRoutes.js';
import { gitRouter } from './gitRoutes.js';
import { diagramRouter } from './diagramRoutes.js';
import { screenRouter } from './screenRoutes.js';
import contextRouter from './contextRoutes.js';
import { PgDriver } from './drivers/pgDriver.js';
import { RedisDriver } from './drivers/redisDriver.js';
import { MongoDriver } from './drivers/mongoDriver.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/modules', modulesRouter);
app.use('/api/db', dbRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/qa', qaRouter);
app.use('/api/git', gitRouter);
app.use('/api/diagrams', diagramRouter);
app.use('/api/screens', screenRouter);
app.use('/api', contextRouter);


app.use('/api', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.originalUrl} not found.` });
});

// Global API error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ai-manager-web] Uncaught Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

function startServer() {
  try {
    app.listen(PORT, async () => {
      console.log(`[ai-manager-web] Local Express Server running on http://localhost:${PORT}`);
      await initMongoAndMigrate();
      await initDefaultAdmin();
    });
  } catch (err: any) {
    console.error(`[ai-manager-web] Server startup failed: ${err.message}`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// G6/G7: Graceful shutdown — close all driver connections/pools cleanly
async function gracefulShutdown(signal: string) {
  console.log(`\n[ai-manager-web] Received ${signal}, shutting down gracefully...`);
  await Promise.allSettled([
    PgDriver.closeAll(),
    RedisDriver.closeAll(),
    MongoDriver.closeAll()
  ]);
  console.log('[ai-manager-web] All DB connections closed. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
