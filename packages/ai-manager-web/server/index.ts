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
import contextRouter from './contextRoutes.js';

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
app.use('/api', contextRouter);


const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'API endpoint not found.' });
    return;
  }
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

export default app;
