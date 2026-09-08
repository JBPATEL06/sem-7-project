import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import { decrypt } from './utils/encryption.js';
import { fetchProjectFromDrive, loadIndexFromSqlite } from '@ai-manager/core';

export const projectsRouter = Router();

const LOCAL_PROJECTS_FILE = path.resolve(process.cwd(), '.ai-manager/projects.json');

export interface LocalProject {
  projectId: string;
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

function getLocalProjects(): LocalProject[] {
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

function saveLocalProjects(projects: LocalProject[]) {
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

// GET /api/projects — List projects from local storage
projectsRouter.get('/', localOrAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const localProjects = getLocalProjects();
    res.status(200).json({
      projects: localProjects,
      onboardingRequired: localProjects.length === 0
    });
  } catch (err: any) {
    console.error(`[projects/list] Error: ${err.message}`);
    res.status(500).json({ error: `Failed to fetch projects: ${err.message}` });
  }
});

// POST /api/projects — Create / Register a new project in local storage
projectsRouter.post('/', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, projectName, description, githubRepo, rootDir } = req.body;
    if (!projectId || !projectName) {
      res.status(400).json({ error: 'Project ID and Project Name are required.' });
      return;
    }

    const slug = projectId.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const localProjects = getLocalProjects();

    if (localProjects.some((p) => p.projectId === slug || p.name === slug)) {
      res.status(400).json({ error: `Project '${slug}' already exists.` });
      return;
    }

    const newLocalProject: LocalProject = {
      projectId: slug,
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

    localProjects.unshift(newLocalProject);
    saveLocalProjects(localProjects);

    // Record dynamic activity event
    try {
      const { logActivity } = await import('./dashboardRoutes.js');
      logActivity({
        projectId: slug,
        projectName,
        action: 'Project registered',
        detail: `Linked workspace at ${newLocalProject.rootDir}`,
        status: 'info'
      });
    } catch {}

    res.status(201).json({
      message: 'Project created successfully in local workspace.',
      project: newLocalProject
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to create project: ${err.message}` });
  }
});

// DELETE /api/projects/:id — Remove project workspace from local storage
projectsRouter.delete('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id;
    let localProjects = getLocalProjects();
    const beforeCount = localProjects.length;
    localProjects = localProjects.filter((p) => p.projectId !== projectId);

    if (localProjects.length === beforeCount) {
      res.status(404).json({ error: `Project '${projectId}' not found.` });
      return;
    }

    saveLocalProjects(localProjects);
    res.status(200).json({ message: `Project '${projectId}' removed from workspace.` });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to delete project: ${err.message}` });
  }
});

// GET /api/projects/:id/context — Load AST context index
projectsRouter.get('/:id/context', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.params.id as string;
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
