import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { localOrAuth, AuthRequest } from './auth.js';
import { loadIndexFromSqlite } from '@ai-manager/core';

const router = Router();

function getDbFilePath(projectId: string): string | null {
  const candidates = [
    path.resolve(`.tmp_projects/${projectId}/index.sqlite`),
    path.resolve('.dbci/index.sqlite'),
    path.resolve('../../.dbci/index.sqlite'),
    path.resolve('../db-context-indexer/.dbci/index.sqlite'),
    path.resolve('packages/db-context-indexer/.dbci/index.sqlite')
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// GET /api/projects/:id/threads
router.get('/projects/:id/threads', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const dbPath = getDbFilePath(projectId);
    if (!dbPath) {
      res.json({ threads: [] });
      return;
    }
    const index = await loadIndexFromSqlite(dbPath);
    res.json({ threads: index.threads || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/decisions
router.get('/projects/:id/decisions', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const dbPath = getDbFilePath(projectId);
    if (!dbPath) {
      res.json({ decisions: [] });
      return;
    }
    const index = await loadIndexFromSqlite(dbPath);
    res.json({ decisions: index.decisions || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/plans
router.get('/projects/:id/plans', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const dbPath = getDbFilePath(projectId);
    if (!dbPath) {
      res.json({ plans: [] });
      return;
    }
    const index = await loadIndexFromSqlite(dbPath);
    res.json({ plans: (index as any).plans || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id/proposals
router.get('/projects/:id/proposals', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.params.id;
    const projectId = Array.isArray(rawId) ? rawId[0] : rawId;
    const dbPath = getDbFilePath(projectId);
    if (!dbPath) {
      res.json({ proposals: [] });
      return;
    }
    const index = await loadIndexFromSqlite(dbPath);
    res.json({ proposals: (index as any).proposals || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
