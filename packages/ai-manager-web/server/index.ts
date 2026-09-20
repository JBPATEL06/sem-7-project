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
import {
  authRouter,
  initMongoAndMigrate,
  initDefaultAdmin,
  projectsRouter,
  dbRouter,
  dashboardRouter,
  settingsRouter,
  qaRouter,
  adminRouter,
  gitRouter,
  diagramRouter,
  screenRouter,
  flowAuditRouter,
  graphifyRouter
} from './modules/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: isProd
    ? (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      }
    : '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/db', dbRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/qa', qaRouter);
app.use('/api/git', gitRouter);
app.use('/api/diagrams', diagramRouter);
app.use('/api/screens', screenRouter);
app.use('/api/flow-audit', flowAuditRouter);
app.use('/api/graphify', graphifyRouter);




// G3: Global 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `API route ${req.method} ${req.path} not found.` });
});

// G3: Global API error handler — suppresses internal stack traces and sanitizes filesystem paths
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ai-manager-web] Uncaught Server Error:', err);
  const statusCode = Number(err.status || err.statusCode) || 500;
  const rawMsg = err.message || 'Internal Server Error';
  const safeMessage = isProd && statusCode === 500
    ? 'Internal Server Error'
    : String(rawMsg)
        .replace(/[a-zA-Z]:\\[^\s:;,]+/g, '[redacted_path]')
        .replace(/\/[a-zA-Z0-9_\-\.\/]+\/[a-zA-Z0-9_\-\.]+/g, '[redacted_path]')
        .replace(/:[^\s@]+@/g, ':•••@');

  res.status(statusCode).json({
    success: false,
    error: safeMessage
  });
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

// G6/G7: Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n[ai-manager-web] Received ${signal}, shutting down gracefully...`);
  console.log('[ai-manager-web] Server shutdown complete. Exiting.');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default app;
