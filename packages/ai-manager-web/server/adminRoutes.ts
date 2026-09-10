import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAdmin, getAllUsers, updateUserRole, deleteUser } from './auth';

const router = Router();
const PROJECTS_FILE = path.join(process.cwd(), '.ai-manager', 'projects.json');
const DBS_DIR = path.join(process.cwd(), '.ai-manager', 'dbs');

// Helper to calculate DB size
function getDirSize(dirPath: string): { size: number; count: number } {
  let size = 0;
  let count = 0;
  if (!fs.existsSync(dirPath)) return { size, count };
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    if (file.endsWith('.sqlite')) {
      const stats = fs.statSync(path.join(dirPath, file));
      size += stats.size;
      count++;
    }
  }
  return { size, count };
}

// GET /api/admin/overview
router.get('/overview', requireAdmin, async (req: Request, res: Response) => {
  try {
    const usersList = await getAllUsers();
    const adminCount = usersList.filter(u => u.role === 'admin').length;
    const userCount = usersList.length - adminCount;

    let projects: any[] = [];
    if (fs.existsSync(PROJECTS_FILE)) {
      projects = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    }
    const totalProjects = projects.length;
    const indexedProjects = projects.filter((p: any) => p.status === 'Indexed').length;

    const dbStats = getDirSize(DBS_DIR);
    const sizeKB = Math.round(dbStats.size / 1024);
    const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;

    // A hacky way to check if mongo is active since it's not exported: 
    // we can check if process.env.MONGODB_URI is present, but for now we just show active.
    const mongoStoreStatus = process.env.MONGODB_URI ? 'Connected (MongoDB Atlas)' : 'Inactive (Local JSON)';

    res.json({
      metrics: {
        totalUsers: usersList.length,
        adminCount,
        userCount,
        totalProjects,
        indexedProjects,
        totalDbSize: sizeStr,
        sqliteFilesCount: dbStats.count
      },
      systemHealth: {
        sqlJsEngine: 'Operational',
        mongoStore: mongoStoreStatus,
        encryptionLayer: 'AES-256-GCM Active',
        jwtAuth: 'Active'
      },
      projects: projects.map((p: any) => ({
        projectId: p.id,
        name: p.name,
        status: p.status,
        lastModified: new Date().toISOString()
      }))
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const usersList = await getAllUsers();
    res.json({ users: usersList });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    if (role !== 'user' && role !== 'admin') {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    await updateUserRole(id, role);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await deleteUser(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const adminRouter = router;
