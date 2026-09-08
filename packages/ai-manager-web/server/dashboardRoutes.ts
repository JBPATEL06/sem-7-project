import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import initSqlJs from 'sql.js';

export const dashboardRouter = Router();

const PROJECTS_FILE = path.resolve(process.cwd(), '.ai-manager/projects.json');
const DBS_DIR = path.resolve(process.cwd(), '.ai-manager/dbs');
const ACTIVITY_FILE = path.resolve(process.cwd(), '.ai-manager/activity.json');

export interface ActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  action: string;
  detail: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export function logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  try {
    const dir = path.dirname(ACTIVITY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let activities: ActivityItem[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
    }

    const newActivity: ActivityItem = {
      ...item,
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    activities.unshift(newActivity);
    // Keep max 50 recent items
    if (activities.length > 50) activities = activities.slice(0, 50);

    fs.writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  } catch (err) {
    console.error('[logActivity] Failed to append activity:', err);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// GET /api/dashboard/stats — Real calculated metrics from local-first storage
dashboardRouter.get('/stats', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // 1. Projects metrics
    let projects: any[] = [];
    if (fs.existsSync(PROJECTS_FILE)) {
      try {
        projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
      } catch {}
    }

    const totalProjects = projects.length;
    const indexedProjects = projects.filter((p) => p.status === 'Indexed' || p.status === 'Active').length;
    const githubRepos = projects.filter((p) => p.repository && p.repository.includes('github.com')).length;
    const localRepos = totalProjects - githubRepos;

    // 2. Database sizes across all project SQLite files
    let totalDbSizeBytes = 0;
    let sqliteFilesCount = 0;

    if (fs.existsSync(DBS_DIR)) {
      const files = fs.readdirSync(DBS_DIR);
      for (const file of files) {
        if (file.endsWith('.sqlite') || file.endsWith('.db')) {
          const filePath = path.join(DBS_DIR, file);
          const stat = fs.statSync(filePath);
          totalDbSizeBytes += stat.size;
          sqliteFilesCount++;
        }
      }
    }

    // Also check root .dbci if exists
    const rootDbci = path.resolve('.dbci/index.sqlite');
    if (fs.existsSync(rootDbci)) {
      totalDbSizeBytes += fs.statSync(rootDbci).size;
      sqliteFilesCount++;
    }

    // 3. Test sql.js engine runtime
    let sqlJsStatus: 'Operational' | 'Degraded' | 'Unavailable' = 'Operational';
    try {
      const SQL = await initSqlJs();
      const testDb = new SQL.Database();
      testDb.run('SELECT 1;');
      testDb.close();
    } catch {
      sqlJsStatus = 'Degraded';
    }

    // 4. Check Groq API key configuration
    const groqKeyPresent = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);
    const groqStatus = groqKeyPresent ? 'Operational' : 'Not Configured (Key Required)';

    // 5. Check Encryption Layer (Credentials file exists or pending Item 4)
    const credsPath = path.resolve(process.cwd(), '.ai-manager/credentials.enc');
    const encryptionStatus = fs.existsSync(credsPath) ? 'AES-256-GCM Active' : 'Pending Item 4 (Settings)';

    // 6. Compute real last sync from project timestamps
    let lastSyncTime: string | null = null;
    const syncedProjects = projects.filter((p) => p.lastSynced && p.lastSynced !== 'Never synced');
    if (syncedProjects.length > 0) {
      // Find latest sync timestamp
      const timestamps = syncedProjects
        .map((p) => new Date(p.lastSynced).getTime())
        .filter((t) => !isNaN(t));
      if (timestamps.length > 0) {
        const latestMs = Math.max(...timestamps);
        lastSyncTime = new Date(latestMs).toISOString();
      }
    }

    res.status(200).json({
      activeProjects: totalProjects,
      indexedProjects,
      totalDbSize: formatBytes(totalDbSizeBytes),
      totalDbSizeBytes,
      sqliteFilesCount,
      connectedRepos: {
        total: totalProjects,
        github: githubRepos,
        local: localRepos
      },
      lastSync: lastSyncTime,
      systemHealth: {
        indexerEngine: 'Pending Tier 2 (DBCI Scanner)',
        groqApi: groqStatus,
        sqlJsRuntime: sqlJsStatus,
        encryptionLayer: encryptionStatus
      }
    });
  } catch (err: any) {
    console.error('[dashboard/stats] Error:', err);
    res.status(500).json({ error: `Failed to compute dashboard stats: ${err.message}` });
  }
});

// GET /api/dashboard/activity — Real chronological activity stream
dashboardRouter.get('/activity', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let activities: ActivityItem[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      try {
        activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
      } catch {}
    }

    // If empty, generate fallback seed from existing project creations if any
    if (activities.length === 0 && fs.existsSync(PROJECTS_FILE)) {
      try {
        const projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
        activities = projects.map((p: any) => ({
          id: `act_${p.projectId || p.id || p.name}`,
          projectId: p.projectId || p.id || p.name,
          projectName: p.name || p.projectName || 'Project',
          action: 'Project registered',
          detail: `Local workspace linked at ${p.rootDir || p.path || 'local directory'}`,
          timestamp: p.createdAt || p.lastModified || new Date().toISOString(),
          status: 'info'
        }));
      } catch {}
    }

    res.status(200).json({
      activities,
      total: activities.length
    });
  } catch (err: any) {
    console.error('[dashboard/activity] Error:', err);
    res.status(500).json({ error: `Failed to fetch activity log: ${err.message}` });
  }
});
