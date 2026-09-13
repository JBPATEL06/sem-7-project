import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { JsonStore } from './utils/JsonStore.js';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { logActivity } from './dashboardRoutes.js';
import { DiagramModel } from './models/index.js';

export interface Diagram {
  id: string;
  projectId: string;
  userId?: string;
  name: string;
  description?: string;
  type: 'architecture' | 'er_diagram' | 'activity_flow' | 'scratchpad';
  elements: any[];
  appState?: {
    viewBackgroundColor?: string;
    currentItemFontFamily?: number;
    theme?: 'light' | 'dark';
    gridSize?: number | null;
  };
  files?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const diagramRouter = Router();
const diagramStore = new JsonStore<Diagram>('diagrams.json');

/**
 * Finds the project workspace root directory reliably
 */
export function getWorkspaceRootDir(): string {
  if (fs.existsSync(path.resolve(process.cwd(), '.git')) || fs.existsSync(path.resolve(process.cwd(), 'packages'))) {
    return process.cwd();
  }
  const oneUp = path.resolve(process.cwd(), '..');
  if (fs.existsSync(path.resolve(oneUp, '.git')) || fs.existsSync(path.resolve(oneUp, 'packages'))) {
    return oneUp;
  }
  const twoUp = path.resolve(process.cwd(), '..', '..');
  if (fs.existsSync(path.resolve(twoUp, '.git')) || fs.existsSync(path.resolve(twoUp, 'packages'))) {
    return twoUp;
  }
  return process.cwd();
}

/**
 * Clean slug generator for diagram filenames
 */
export function getDiagramSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled_diagram';
}

/**
 * Synchronizes diagram directly to project root diagrams/ directory
 */
export function syncDiagramToDisk(diagram: Diagram): string {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'diagrams');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const slug = getDiagramSlug(diagram.name);
    const filePath = path.join(targetDir, `${slug}.excalidraw`);
    const data = {
      type: 'excalidraw',
      version: 2,
      source: 'https://ai-manager.local',
      name: diagram.name,
      elements: diagram.elements || [],
      appState: diagram.appState || {},
      files: diagram.files || {}
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return `diagrams/${slug}.excalidraw`;
  } catch (e) {
    console.error('[Diagrams] Disk sync error:', e);
    return `diagrams/${getDiagramSlug(diagram.name)}.excalidraw`;
  }
}

/**
 * Removes deleted or renamed diagram file from disk
 */
export function deleteDiagramFromDisk(name: string) {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'diagrams');
    const slug = getDiagramSlug(name);
    const filePath = path.join(targetDir, `${slug}.excalidraw`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (e) {
    console.error('[Diagrams] Disk delete error:', e);
  }
}

async function getDiagramsFromDb(projectId?: string, userId?: string, isAdmin: boolean = false): Promise<Diagram[]> {
  if (getIsMongoConnected()) {
    try {
      const query: any = {};
      if (projectId) query.projectId = projectId;
      if (!isAdmin && userId) query.userId = userId;

      const docs = await DiagramModel.find(query).sort({ updatedAt: -1 }).lean();
      return docs.map((d: any) => ({
        id: d.id,
        projectId: d.projectId,
        userId: d.userId,
        name: d.name,
        description: d.description,
        type: d.type,
        elements: d.elements || [],
        appState: d.appState || {},
        files: d.files || {},
        createdAt: d.createdAt,
        updatedAt: d.updatedAt
      }));
    } catch (e) {
      console.error('[Diagrams] Atlas read error:', e);
    }
  }

  const all = await diagramStore.getAll();
  let filtered = projectId ? all.filter((d) => d.projectId === projectId) : all;
  if (!isAdmin && userId) {
    filtered = filtered.filter((d) => !d.userId || d.userId === userId);
  }
  return filtered;
}

async function getDiagramByIdFromDb(id: string): Promise<Diagram | null> {
  if (getIsMongoConnected()) {
    try {
      const doc = await DiagramModel.findOne({ id }).lean();
      if (doc) {
        return {
          id: (doc as any).id,
          projectId: (doc as any).projectId,
          userId: (doc as any).userId,
          name: (doc as any).name,
          description: (doc as any).description,
          type: (doc as any).type,
          elements: (doc as any).elements || [],
          appState: (doc as any).appState || {},
          files: (doc as any).files || {},
          createdAt: (doc as any).createdAt,
          updatedAt: (doc as any).updatedAt
        };
      }
    } catch (e) {
      console.error('[Diagrams] Atlas getById error:', e);
    }
  }

  return await diagramStore.getById(id);
}

export async function syncDiskDiagramsToStore(projectId: string = 'acme-api', userId: string = 'usr_admin_default'): Promise<void> {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'diagrams');
    if (!fs.existsSync(targetDir)) return;

    const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.excalidraw'));
    const existingList = await diagramStore.getAll();
    const existingSlugs = new Set(existingList.map((d) => getDiagramSlug(d.name)));

    for (const filename of files) {
      const slug = filename.replace(/\.excalidraw$/, '');
      if (existingSlugs.has(slug)) continue;

      const filePath = path.join(targetDir, filename);
      let contentRaw = '';
      try {
        contentRaw = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      let parsed: any = {};
      try {
        parsed = JSON.parse(contentRaw);
      } catch {
        parsed = {};
      }

      const name = parsed.name || slug.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const type = slug.includes('er_diagram')
        ? 'er_diagram'
        : slug.includes('flow') || slug.includes('architecture')
        ? 'architecture'
        : 'scratchpad';

      const newDiagram: Diagram = {
        id: `diag_disk_${slug}`,
        projectId,
        userId,
        name,
        description: 'Auto-indexed from diagrams/ workspace folder',
        type,
        elements: Array.isArray(parsed.elements) ? parsed.elements : [],
        appState: parsed.appState || { viewBackgroundColor: '#1e1e24', theme: 'dark' },
        files: parsed.files || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (getIsMongoConnected()) {
        try {
          await DiagramModel.create(newDiagram);
        } catch {}
      }
      await diagramStore.create(newDiagram);
      existingSlugs.add(slug);
    }
  } catch (err: any) {
    console.error('[Diagrams] Disk auto-index error:', err.message);
  }
}

// --------------------------------------------------------------------------
// 1. GET /api/diagrams — List diagrams (Filtered by user session, Admin sees all)
// --------------------------------------------------------------------------
diagramRouter.get('/', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawProjectId = req.query.projectId as string | undefined;
    const projectId = rawProjectId || 'acme-api';
    const isAdmin = req.user?.role === 'admin';
    const userId = req.user?.sub || 'usr_admin_default';

    // Auto-discover any .excalidraw files in diagrams/ directory on disk
    await syncDiskDiagramsToStore(projectId, userId);

    const diagramsList = await getDiagramsFromDb(projectId, userId, isAdmin);

    const diagramsWithPaths = diagramsList.map((d) => {
      const relPath = syncDiagramToDisk(d);
      return {
        ...d,
        filePath: relPath
      };
    });

    res.status(200).json({
      diagrams: diagramsWithPaths,
      total: diagramsWithPaths.length
    });
  } catch (err: any) {
    console.error('[diagrams/list] Error:', err.message);
    res.status(500).json({ error: `Failed to list diagrams: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 2. GET /api/diagrams/:id — Get diagram by ID (Ownership checked)
// --------------------------------------------------------------------------
diagramRouter.get('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const diagram = await getDiagramByIdFromDb(id);

    if (!diagram) {
      res.status(404).json({ error: `Diagram '${id}' not found.` });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = diagram.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to view this diagram.' });
      return;
    }

    res.status(200).json({ diagram });
  } catch (err: any) {
    console.error('[diagrams/get] Error:', err.message);
    res.status(500).json({ error: `Failed to get diagram: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 3. POST /api/diagrams — Create new diagram (userId bound from session)
// --------------------------------------------------------------------------
diagramRouter.post('/', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, name, description, type, elements, appState, files } = req.body;

    if (!name || !projectId) {
      res.status(400).json({ error: 'Diagram name and projectId are required.' });
      return;
    }

    const userId = req.user?.sub || 'usr_admin_default';
    const id = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newDiagram: Diagram = {
      id,
      projectId,
      userId,
      name,
      description: description || '',
      type: type || 'architecture',
      elements: Array.isArray(elements) ? elements : [],
      appState: appState || { viewBackgroundColor: '#ffffff', theme: 'dark' },
      files: files || {},
      createdAt: now,
      updatedAt: now
    };

    if (getIsMongoConnected()) {
      try {
        await DiagramModel.create(newDiagram);
      } catch (e) {
        console.error('[Diagrams] Atlas create error:', e);
      }
    }

    const created = await diagramStore.create(newDiagram);
    const relPath = syncDiagramToDisk(newDiagram);

    try {
      logActivity({
        projectId,
        projectName: projectId,
        userId,
        action: 'Diagram created',
        detail: `Created ${newDiagram.type} diagram '${newDiagram.name}'`,
        status: 'success'
      });
    } catch {}

    res.status(201).json({
      message: 'Diagram created successfully.',
      diagram: {
        ...created,
        filePath: relPath
      }
    });
  } catch (err: any) {
    console.error('[diagrams/create] Error:', err.message);
    res.status(500).json({ error: `Failed to create diagram: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 4. PUT /api/diagrams/:id — Update diagram (Ownership checked)
// --------------------------------------------------------------------------
diagramRouter.put('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, type, elements, appState, files } = req.body;

    const existing = await getDiagramByIdFromDb(id);
    if (!existing) {
      res.status(404).json({ error: `Diagram '${id}' not found.` });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = existing.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to modify this diagram.' });
      return;
    }

    if (name !== undefined && name !== existing.name) {
      deleteDiagramFromDisk(existing.name);
    }

    const updates: Partial<Diagram> = {
      updatedAt: new Date().toISOString()
    };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (type !== undefined) updates.type = type;
    if (elements !== undefined) updates.elements = elements;
    if (appState !== undefined) updates.appState = appState;
    if (files !== undefined) updates.files = files;

    if (getIsMongoConnected()) {
      try {
        await DiagramModel.updateOne({ id }, { $set: updates });
      } catch (e) {
        console.error('[Diagrams] Atlas update error:', e);
      }
    }

    const updated = await diagramStore.update(id, updates);
    const fullUpdated: Diagram = updated || { ...existing, ...updates };
    const relPath = syncDiagramToDisk(fullUpdated);

    res.status(200).json({
      message: 'Diagram updated successfully.',
      diagram: {
        ...fullUpdated,
        filePath: relPath
      }
    });
  } catch (err: any) {
    console.error('[diagrams/update] Error:', err.message);
    res.status(500).json({ error: `Failed to update diagram: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 5. DELETE /api/diagrams/:id — Delete diagram (Ownership checked)
// --------------------------------------------------------------------------
diagramRouter.delete('/:id', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const existing = await getDiagramByIdFromDb(id);
    if (!existing) {
      res.status(404).json({ error: `Diagram '${id}' not found.` });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = existing.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to delete this diagram.' });
      return;
    }

    if (getIsMongoConnected()) {
      try {
        await DiagramModel.deleteOne({ id });
      } catch (e) {
        console.error('[Diagrams] Atlas delete error:', e);
      }
    }

    const deleted = await diagramStore.delete(id);
    deleteDiagramFromDisk(existing.name);

    try {
      logActivity({
        projectId: existing.projectId,
        projectName: existing.projectId,
        userId: existing.userId || req.user?.sub || 'usr_admin_default',
        action: 'Diagram deleted',
        detail: `Deleted diagram '${existing.name}'`,
        status: 'warning'
      });
    } catch {}

    res.status(200).json({
      success: deleted,
      message: `Diagram '${id}' deleted successfully.`
    });
  } catch (err: any) {
    console.error('[diagrams/delete] Error:', err.message);
    res.status(500).json({ error: `Failed to delete diagram: ${err.message}` });
  }
});

// --------------------------------------------------------------------------
// 6. GET /api/diagrams/:id/export — Export diagram (Ownership checked)
// --------------------------------------------------------------------------
diagramRouter.get('/:id/export', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const diagram = await getDiagramByIdFromDb(id);

    if (!diagram) {
      res.status(404).json({ error: `Diagram '${id}' not found.` });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = diagram.userId === req.user?.sub;

    if (!isAdmin && !isOwner) {
      res.status(403).json({ error: 'Forbidden. You do not have permission to export this diagram.' });
      return;
    }

    const excalidrawExport = {
      type: 'excalidraw',
      version: 2,
      source: 'https://ai-manager.local',
      elements: diagram.elements || [],
      appState: diagram.appState || { viewBackgroundColor: '#ffffff' },
      files: diagram.files || {}
    };

    const sanitizedName = diagram.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const filename = `${sanitizedName}_${diagram.id}.excalidraw`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(JSON.stringify(excalidrawExport, null, 2));
  } catch (err: any) {
    console.error('[diagrams/export] Error:', err.message);
    res.status(500).json({ error: `Failed to export diagram: ${err.message}` });
  }
});
