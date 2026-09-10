import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { ProjectModel, ActivityLogModel } from './models/index.js';
import initSqlJs from 'sql.js';

export const dashboardRouter = Router();

const PROJECTS_FILE = path.resolve(process.cwd(), '.ai-manager/projects.json');
const DBS_DIR = path.resolve(process.cwd(), '.ai-manager/dbs');
const ACTIVITY_FILE = path.resolve(process.cwd(), '.ai-manager/activity.json');

export interface ActivityItem {
  id: string;
  projectId: string;
  projectName: string;
  userId?: string;
  action: string;
  detail: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
}

export async function logActivity(item: Omit<ActivityItem, 'id' | 'timestamp'>) {
  try {
    const newActivity: ActivityItem = {
      ...item,
      userId: item.userId || 'usr_admin_default',
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };

    if (getIsMongoConnected()) {
      try {
        await ActivityLogModel.create(newActivity);
      } catch (e) {
        console.error('[logActivity] Atlas create error:', e);
      }
    }

    const dir = path.dirname(ACTIVITY_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let activities: ActivityItem[] = [];
    if (fs.existsSync(ACTIVITY_FILE)) {
      try {
        activities = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
      } catch {}
    }

    activities.unshift(newActivity);
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

// GET /api/dashboard/stats — Calculated metrics (scoped to userId for regular users, global for admin)
dashboardRouter.get('/stats', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.sub;

    let projects: any[] = [];
    if (getIsMongoConnected()) {
      const filter = isAdmin ? {} : (userId ? { userId } : {});
      projects = await ProjectModel.find(filter).lean();
    } else if (fs.existsSync(PROJECTS_FILE)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
        projects = isAdmin ? parsed : parsed.filter((p: any) => !p.userId || p.userId === userId);
      } catch {}
    }

    const totalProjects = projects.length;
    const indexedProjects = projects.filter((p) => p.status === 'Indexed' || p.status === 'Active').length;
    const githubRepos = projects.filter((p) => p.githubRepo && p.githubRepo.includes('github.com')).length;
    const localRepos = totalProjects - githubRepos;

    // Database sizes across all project SQLite files
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

    // Root .dbci if exists
    const rootDbci = path.resolve('.dbci/index.sqlite');
    if (fs.existsSync(rootDbci)) {
      totalDbSizeBytes += fs.statSync(rootDbci).size;
      sqliteFilesCount++;
    }

    // sql.js engine runtime check
    let sqlJsStatus: 'Operational' | 'Degraded' | 'Unavailable' = 'Operational';
    try {
      const SQL = await initSqlJs();
      const testDb = new SQL.Database();
      testDb.run('SELECT 1;');
      testDb.close();
    } catch {
      sqlJsStatus = 'Degraded';
    }

    // Check Groq API key configuration
    const groqKeyPresent = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 5);
    const groqStatus = groqKeyPresent ? 'Operational' : 'Not Configured (Key Required)';

    // Encryption Layer Check
    const credsPath = path.resolve(process.cwd(), '.ai-manager/credentials.enc');
    const encryptionStatus = fs.existsSync(credsPath) ? 'AES-256-GCM Active' : 'Pending Item 4 (Settings)';

    // Compute real last sync from project timestamps
    let lastSyncTime: string | null = null;
    const syncedProjects = projects.filter((p) => p.lastSynced && p.lastSynced !== 'Never synced');
    if (syncedProjects.length > 0) {
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
        encryptionLayer: encryptionStatus,
        mongoPrimaryStore: getIsMongoConnected() ? 'Connected (Atlas)' : 'Local JSON'
      }
    });
  } catch (err: any) {
    console.error('[dashboard/stats] Error:', err);
    res.status(500).json({ error: `Failed to compute dashboard stats: ${err.message}` });
  }
});

// GET /api/dashboard/activity — Chronological activity stream (scoped to user, admin sees all)
dashboardRouter.get('/activity', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.sub;

    let activities: ActivityItem[] = [];

    if (getIsMongoConnected()) {
      try {
        const filter = isAdmin ? {} : (userId ? { userId } : {});
        const docs = await ActivityLogModel.find(filter).sort({ timestamp: -1 }).limit(50).lean();
        activities = docs.map((d: any) => ({
          id: d.id,
          projectId: d.projectId,
          projectName: d.projectName,
          userId: d.userId,
          action: d.action,
          detail: d.detail,
          timestamp: d.timestamp,
          status: d.status
        }));
      } catch (e) {
        console.error('[dashboard/activity] Atlas read error:', e);
      }
    }

    if (activities.length === 0 && fs.existsSync(ACTIVITY_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(ACTIVITY_FILE, 'utf-8'));
        activities = isAdmin ? raw : raw.filter((a: any) => !a.userId || a.userId === userId);
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
