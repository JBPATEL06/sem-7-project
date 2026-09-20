import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest, getIsMongoConnected } from '../auth/auth.js';
import { decrypt } from '../../shared/utils/encryption.js';
import { fetchProjectFromDrive, loadIndexFromSqlite } from '@ai-manager/core';
import { ProjectModel } from '../../models/index.js';

export const projectsRouter = Router();

const LOCAL_PROJECTS_FILE = path.resolve(process.cwd(), '.ai-manager/projects.json');

export interface LocalProject {
  projectId: string;
  userId?: string;
  name: string;
  projectName: string;
  description: string;
  rootDir: string;
  githubRepo: string | null;
  githubBranch: string;
  status: 'Not indexed' | 'Indexed' | 'Syncing' | 'Error';
  statusVariant: 'secondary' | 'success' | 'warning' | 'destructive';
  filesCount: number | null;
  files: string;
  dbSize: string;
  lastModified: string;
  lastSynced: string;
  metrics: string;
}

export async function getProjects(userId?: string, isAdmin: boolean = false): Promise<LocalProject[]> {
  if (getIsMongoConnected()) {
    try {
      const filter = isAdmin ? {} : (userId ? { userId } : {});
      const docs = await ProjectModel.find(filter).sort({ createdAt: -1 }).lean();
      return docs.map((d: any) => ({
        projectId: d.projectId,
        userId: d.userId,
        name: d.name,
        projectName: d.projectName || d.name,
        description: d.description || '',
        rootDir: d.rootDir || '',
        githubRepo: d.githubRepo || null,
        githubBranch: d.githubBranch || 'main',
        status: d.status || 'Not indexed',
        statusVariant: d.statusVariant || 'secondary',
        filesCount: d.filesCount ?? null,
        files: d.files || '—',
        dbSize: d.dbSize || '—',
        lastModified: d.lastModified || new Date().toISOString(),
        lastSynced: d.lastSynced || 'Never synced',
        metrics: d.metrics || 'Not indexed'
      }));
    } catch (e) {
      console.error('[Projects] Error reading from Atlas, using fallback:', e);
    }
  }

  const local = getLocalProjects();
  if (isAdmin || !userId) return local;
  return local.filter((p) => !p.userId || p.userId === userId);
}

export async function getProjectById(projectId: string): Promise<LocalProject | null> {
  if (getIsMongoConnected()) {
    try {
      const doc = await ProjectModel.findOne({ projectId }).lean();
      if (doc) {
        return {
          projectId: (doc as any).projectId,
          userId: (doc as any).userId,
          name: (doc as any).name,
          projectName: (doc as any).projectName || (doc as any).name,
          description: (doc as any).description || '',
          rootDir: (doc as any).rootDir || '',
          githubRepo: (doc as any).githubRepo || null,
          githubBranch: (doc as any).githubBranch || 'main',
          status: (doc as any).status || 'Not indexed',
          statusVariant: (doc as any).statusVariant || 'secondary',
          filesCount: (doc as any).filesCount ?? null,
          files: (doc as any).files || '—',
          dbSize: (doc as any).dbSize || '—',
          lastModified: (doc as any).lastModified || new Date().toISOString(),
          lastSynced: (doc as any).lastSynced || 'Never synced',
          metrics: (doc as any).metrics || 'Not indexed'
        };
      }
    } catch (e) {
      console.error('[Projects] Atlas getProjectById error:', e);
    }
  }

  const local = getLocalProjects();
  return local.find((p) => p.projectId === projectId) || null;
}

export function getLocalProjects(): LocalProject[] {
  try {
    if (fs.existsSync(LOCAL_PROJECTS_FILE)) {
      const data = fs.readFileSync(LOCAL_PROJECTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading local projects file:', e);
  }
  return [];
}

export function saveLocalProjects(projects: LocalProject[]) {
  try {
    const dir = path.dirname(LOCAL_PROJECTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing local projects file:', e);
  }
}

// In-Memory 5-Minute GitHub Code Preview Cache
interface CodeCacheEntry {
  content: string;
  timestamp: number;
}
const codePreviewCache = new Map<string, CodeCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/projects — List projects (Filtered by user session, Admin sees all)
projectsRouter.get('/', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.sub;
    const projectsList = await getProjects(userId, isAdmin);

    res.status(200).json({
      projects: projectsList,
      onboardingRequired: projectsList.length === 0
    });
  } catch (err: any) {
    console.error(`[projects/list] Error: ${err.message}`);
    res.status(500).json({ error: `Failed to fetch projects: ${err.message}` });
  }
});

// POST /api/projects — Create / Register a new project in MongoDB Atlas (userId bound from session)
projectsRouter.post('/', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, projectName, description, githubRepo, rootDir } = req.body;
    if (!projectId || !projectName) {
      res.status(400).json({ error: 'Project ID and Project Name are required.' });
      return;
    }

    const userId = req.user?.sub || 'usr_admin_default';
    const slug = projectId.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const existing = await getProjectById(slug);

    if (existing) {
      res.status(400).json({ error: `Project '${slug}' already exists.` });
      return;
    }

    const newProject: LocalProject = {
      projectId: slug,
      userId, // Authenticated user ID automatically assigned
      name: projectName,
      projectName,
      description: description || '',
      rootDir: rootDir || `~/dev/${slug}`,
      githubRepo: githubRepo ? githubRepo.trim() : null,
      githubBranch: 'main',
      status: 'Not indexed',
      statusVariant: 'secondary',
      filesCount: null,
      files: '—',
      dbSize: '—',
      lastModified: new Date().toISOString(),
      lastSynced: 'Never synced',
      metrics: 'Not indexed'
    };

    // Save to Atlas if connected
    if (getIsMongoConnected()) {
      try {
        await ProjectModel.create({
          ...newProject,
          createdAt: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Projects] Atlas create error:', e);
      }
    }

    const localProjects = getLocalProjects();
    localProjects.unshift(newProject);
    saveLocalProjects(localProjects);

    // Record dynamic activity event with userId
    try {
      const { logActivity } = await import('../dashboard/dashboardRoutes.js');
      logActivity({
        projectId: slug,
        projectName,
        userId,
        action: 'Project registered',
        detail: `Linked workspace at ${newProject.rootDir}`,
        status: 'info'
      });
    } catch {}

    res.status(201).json({
      message: 'Project created successfully in database.',
      project: newProject
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create project: ${err.message}` });
  }
});

// GET /api/projects/:id — Get specific project details
projectsRouter.get('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: `Project '${projectId}' not found.` });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = !project.userId || project.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden: You do not have permission to view this project.' });
      return;
    }

    res.status(200).json({ project });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to fetch project: ${err.message}` });
  }
});

// DELETE /api/projects/:id — Remove project (RBAC & Ownership enforced: non-owner/non-admin rejected with 403)
projectsRouter.delete('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const project = await getProjectById(projectId);

    if (!project) {
      res.status(404).json({ error: `Project '${projectId}' not found.` });
      return;
    }

    // Ownership Enforcement
    const isAdmin = req.user?.role === 'admin';
    const isOwner = project.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to delete this project.' });
      return;
    }

    if (getIsMongoConnected()) {
      try {
        await ProjectModel.deleteOne({ projectId });
      } catch (e) {
        console.error('[Projects] Atlas delete error:', e);
      }
    }

    let localProjects = getLocalProjects();
    localProjects = localProjects.filter((p) => p.projectId !== projectId);
    saveLocalProjects(localProjects);

    res.status(200).json({ message: `Project '${projectId}' removed successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to delete project: ${err.message}` });
  }
});

// GET /api/projects/:id/context — Load AST context index (Ownership checked)
projectsRouter.get('/:id/context', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
    const project = await getProjectById(projectId);

    if (project) {
      const isAdmin = req.user?.role === 'admin';
      const isOwner = project.userId === req.user?.sub;
      if (!isAdmin && !isOwner) {
        res.status(403).json({ error: 'Forbidden. You do not have permission to access this project context.' });
        return;
      }
    }

    const targetDbFile = path.resolve(`.tmp_projects/${projectId}/index.sqlite`);
    let dbFilePath = targetDbFile;

    if (!fs.existsSync(dbFilePath)) {
      const localCandidates = [
        path.resolve('../../.dbci/index.sqlite'),
        path.resolve('.dbci/index.sqlite'),
        path.resolve('../db-context-indexer/.dbci/index.sqlite'),
        path.resolve('packages/db-context-indexer/.dbci/index.sqlite'),
        targetDbFile
      ];
      const foundLocal = localCandidates.find((p) => fs.existsSync(p));
      if (foundLocal) {
        dbFilePath = foundLocal;
      }
    }

    if (!fs.existsSync(dbFilePath)) {
      res.status(404).json({ error: `Project index '${projectId}' not found. Run dbci scan first.` });
      return;
    }

    const index = await loadIndexFromSqlite(dbFilePath);

    const queriesByDb: Record<string, number> = {};
    for (const q of index.queries) {
      queriesByDb[q.dbType] = (queriesByDb[q.dbType] || 0) + 1;
    }

    res.status(200).json({
      projectId,
      metrics: {
        clientsCount: index.clients.length,
        queriesCount: index.queries.length,
        functionsCount: index.functions.length,
        edgesCount: index.edges.length,
        referencesCount: index.references ? index.references.length : 0,
        unresolvedCount: index.unresolved.length
      },
      queriesByDb,
      clients: index.clients.slice(0, 10),
      queries: index.queries.slice(0, 20),
      functions: index.functions,
      threads: index.threads || [],
      decisions: index.decisions || []
    });
  } catch (err: any) {
    console.error(`[projects/context] Error: ${err.message}`);
    res.status(500).json({ error: `Failed to load context index for project '${req.params.id}'.` });
  }
});
