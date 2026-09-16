import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { JsonStore } from './utils/JsonStore.js';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { logActivity } from './dashboardRoutes.js';
import { DiagramModel } from './models/index.js';
import { loadDecryptedCredentials } from './settingsRoutes.js';
import { detectIntent, callLlmForChatReply } from './screenRoutes.js';

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

// --------------------------------------------------------------------------
// Helper: Call LLM (Groq / OpenAI) for Excalidraw Diagram AST
// --------------------------------------------------------------------------
async function callLlmForDiagramAst(prompt: string, type: string): Promise<any | null> {
  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) return null;

  const endpoint = groqKey
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['openai/gpt-oss-120b', 'groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b', 'groq/compound']
    : ['gpt-4o-mini', 'gpt-3.5-turbo'];

  const systemPrompt = `You are Stitch AI, a world-class systems and software architecture designer synthesizing Excalidraw diagram AST scenes.
Given a prompt, return a JSON object with:
- title: string (concise diagram title)
- description: string
- nodes: array of objects { id: string, name: string, subtitle?: string, x: number, y: number, width: number, height: number, color: string, bg: string, type: 'service' | 'database' | 'client' | 'queue' | 'table', fields?: string[] }
- connections: array of objects { from: string, to: string, label?: string, color?: string }
Return valid JSON only.`;

  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: JSON.stringify({ prompt, type }) }
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
            return parsed;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Diagram AI LLM] Model ${model} failed, checking fallback:`, err.message);
    }
  }
  return null;
}

// --------------------------------------------------------------------------
// 7. POST /api/diagrams/generate-ai — Stitch-Grade AI Diagram Generator
// --------------------------------------------------------------------------
diagramRouter.post('/generate-ai', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      prompt,
      type = 'architecture',
      projectId = 'acme-api',
      mode = 'create',
      diagramId
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'A natural language prompt is required.' });
      return;
    }

    const userId = req.user ? req.user.sub : 'usr_admin_default';
    const cleanPrompt = prompt.trim();

    // -----------------------------------------------------------------------
    // INTENT DETECTION GATE: Distinguish GENERATE vs DISCUSS before synthesis
    // -----------------------------------------------------------------------
    const intent = await detectIntent(cleanPrompt);
    console.log(`[Diagram Intent Gate] Prompt: "${cleanPrompt}" -> Intent: ${intent}`);

    if (intent === 'DISCUSS') {
      let existing: Diagram | null = null;
      if (diagramId) {
        existing = await getDiagramByIdFromDb(diagramId);
      }
      const reply = await callLlmForChatReply(cleanPrompt, {
        screenName: existing?.name || 'Architecture Diagram',
        compCount: existing?.elements?.length || 0,
        componentsSummary: existing?.type
      });

      res.status(200).json({
        success: true,
        intent: 'DISCUSS',
        reply,
        assistantExplanation: reply,
        changesSummary: 'Conversational response (diagram canvas unchanged)',
        diagram: existing || null,
        elements: existing?.elements || [],
        generationSteps: []
      });
      return;
    }

    // Derive semantic name
    const rawWords = cleanPrompt.replace(/[^a-zA-Z0-9\s-_]/g, '').split(/\s+/).filter(Boolean);
    const diagramName = rawWords.length > 0
      ? rawWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).slice(0, 4).join(' ')
      : 'AI Architecture Diagram';

    const p = cleanPrompt.toLowerCase();
    const isEr = type === 'er_diagram' || p.includes('er') || p.includes('schema') || p.includes('table') || p.includes('database') || p.includes('relation');
    const isAws = p.includes('aws') || p.includes('cloud') || p.includes('lambda') || p.includes('s3') || p.includes('dynamodb') || p.includes('serverless');
    const isK8s = p.includes('k8s') || p.includes('kubernetes') || p.includes('microservice') || p.includes('cluster') || p.includes('ingress');
    const isPayment = p.includes('stripe') || p.includes('payment') || p.includes('checkout') || p.includes('billing') || p.includes('e-commerce') || p.includes('ecommerce');
    const isAi = p.includes('ai') || p.includes('llm') || p.includes('rag') || p.includes('vector') || p.includes('pinecone') || p.includes('embedding');

    const elements: any[] = [];
    const steps: Array<{ step: number; name: string; type: string; x: number; y: number; width: number; height: number; action: string }> = [];

    // 1. Try LLM generation first if API key is active
    const llmResult = await callLlmForDiagramAst(cleanPrompt, type);
    if (llmResult && Array.isArray(llmResult.nodes) && llmResult.nodes.length > 0) {
      const nodePosMap = new Map<string, { x: number; y: number; width: number; height: number }>();

      llmResult.nodes.forEach((n: any, idx: number) => {
        const boxId = n.id || `node_${idx + 1}`;
        const x = n.x ?? (80 + (idx % 3) * 320);
        const y = n.y ?? (120 + Math.floor(idx / 3) * 200);
        const width = n.width || 260;
        const height = n.height || (n.fields ? 180 : 100);
        const strokeColor = n.color || '#a855f7';
        const bg = n.bg || '#131b2e';

        nodePosMap.set(boxId, { x, y, width, height });

        // Container Shape
        elements.push({
          id: boxId,
          type: 'rectangle',
          x,
          y,
          width,
          height,
          angle: 0,
          strokeColor,
          backgroundColor: bg,
          fillStyle: 'solid',
          strokeWidth: 2,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: { type: 3 },
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false
        });

        // Label
        const displayText = n.fields && Array.isArray(n.fields)
          ? `🗄️ ${n.name}\n────────────────────\n${n.fields.join('\n')}`
          : `⚡ ${n.name}\n${n.subtitle || ''}`;

        elements.push({
          id: `text_${boxId}`,
          type: 'text',
          x: x + 14,
          y: y + 16,
          width: width - 28,
          height: height - 32,
          angle: 0,
          strokeColor: '#f8fafc',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          text: displayText,
          fontSize: n.fields ? 13 : 14,
          fontFamily: 3,
          textAlign: n.fields ? 'left' : 'center',
          verticalAlign: 'top',
          baseline: 14,
          containerId: null,
          originalText: displayText
        });

        steps.push({
          step: steps.length + 1,
          name: n.name,
          type: n.type || 'service',
          x,
          y,
          width,
          height,
          action: `Synthesizing ${n.name}`
        });
      });

      // Connections
      if (Array.isArray(llmResult.connections)) {
        llmResult.connections.forEach((conn: any, cIdx: number) => {
          const fromNode = nodePosMap.get(conn.from);
          const toNode = nodePosMap.get(conn.to);
          if (fromNode && toNode) {
            const startX = fromNode.x + fromNode.width;
            const startY = fromNode.y + fromNode.height / 2;
            const endX = toNode.x;
            const endY = toNode.y + toNode.height / 2;
            const deltaX = endX - startX;
            const deltaY = endY - startY;

            elements.push({
              id: `arrow_${cIdx + 1}`,
              type: 'arrow',
              x: startX,
              y: startY,
              width: Math.abs(deltaX),
              height: Math.abs(deltaY),
              angle: 0,
              strokeColor: conn.color || '#38bdf8',
              backgroundColor: 'transparent',
              fillStyle: 'solid',
              strokeWidth: 2,
              strokeStyle: 'solid',
              roughness: 0,
              opacity: 100,
              groupIds: [],
              frameId: null,
              roundness: null,
              seed: Math.floor(Math.random() * 100000),
              version: 1,
              versionNonce: Math.floor(Math.random() * 100000),
              isDeleted: false,
              boundElements: null,
              updated: Date.now(),
              link: null,
              locked: false,
              points: [[0, 0], [deltaX, deltaY]],
              startArrowhead: null,
              endArrowhead: 'arrow'
            });

            steps.push({
              step: steps.length + 1,
              name: conn.label || 'Connection Arrow',
              type: 'arrow',
              x: startX,
              y: startY,
              width: Math.abs(deltaX),
              height: Math.abs(deltaY),
              action: `Routing link from ${conn.from} ➔ ${conn.to}`
            });
          }
        });
      }
    } else {
      // 2. Intelligent Dynamic Semantic Domain Synthesizer
      interface NodeSpec {
        id: string;
        name: string;
        sub?: string;
        x: number;
        y: number;
        width: number;
        height: number;
        color: string;
        bg: string;
        fields?: string[];
      }
      interface ConnSpec {
        from: number; // 1-based index in nodes
        to: number;
        color?: string;
        label?: string;
      }

      let nodesList: NodeSpec[] = [];
      let connsList: ConnSpec[] = [];

      const isGreeting = p === 'hey' || p === 'hello' || p === 'hi' || p.startsWith('hey ') || p.startsWith('hello ') || p.includes('help') || p.includes('welcome') || p.includes('starter');
      const isCicd = p.includes('cicd') || p.includes('devops') || p.includes('pipeline') || p.includes('deploy') || p.includes('github') || p.includes('docker') || p.includes('action');
      const isSocket = p.includes('socket') || p.includes('websocket') || p.includes('chat') || p.includes('realtime') || p.includes('stream') || p.includes('pubsub');
      const isAuthFlow = p.includes('auth') || p.includes('oauth') || p.includes('jwt') || p.includes('login') || p.includes('sso') || p.includes('security');
      const isKafka = p.includes('kafka') || p.includes('event') || p.includes('cqrs') || p.includes('queue') || p.includes('rabbitmq') || p.includes('lake');

      if (isGreeting) {
        // Welcome & Architecture Blueprint Map
        nodesList = [
          { id: 'g_1', name: 'Web Client Studio (React 19)', sub: 'Excalidraw & Stitch Canvas', x: 60, y: 180, width: 260, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'g_2', name: 'AI Manager API Gateway', sub: 'Express · LocalOrAuth Middleware', x: 390, y: 180, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'g_3', name: 'AI Synthesis Engine', sub: 'Groq / OpenAI Cascade · Heuristics', x: 730, y: 80, width: 270, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'g_4', name: 'Primary Persistence Layer', sub: 'MongoDB Atlas · Local JSON Store', x: 730, y: 280, width: 270, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'g_5', name: 'Workspace Disk Files', sub: 'ui/*.fig · diagrams/*.excalidraw', x: 1080, y: 180, width: 270, height: 100, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'HTTP / WS Request' },
          { from: 2, to: 3, color: '#10b981', label: 'Generate AST' },
          { from: 2, to: 4, color: '#f59e0b', label: 'Store State' },
          { from: 3, to: 5, color: '#06b6d4', label: 'Disk Sync' },
          { from: 4, to: 5, color: '#06b6d4', label: 'Export Specs' }
        ];
      } else if (isCicd) {
        // CI/CD DevOps Pipeline
        nodesList = [
          { id: 'ci_1', name: 'Git Commit & Push', sub: 'Feature Branch · PR Created', x: 60, y: 180, width: 240, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'ci_2', name: 'GitHub Actions Runner', sub: 'Lint · Typecheck · Vitest', x: 370, y: 180, width: 250, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'ci_3', name: 'Docker Container Build', sub: 'Multi-Stage Build · Tagged v1.0', x: 690, y: 80, width: 260, height: 100, color: '#06b6d4', bg: '#131b2e' },
          { id: 'ci_4', name: 'Security Vulnerability Scan', sub: 'Trivy · SAST / Dependency Audit', x: 690, y: 280, width: 260, height: 100, color: '#ef4444', bg: '#450a0a' },
          { id: 'ci_5', name: 'Kubernetes Cluster (K8s)', sub: 'ArgoCD Rolling Deployment', x: 1030, y: 180, width: 260, height: 100, color: '#10b981', bg: '#064e3b' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'Trigger Webhook' },
          { from: 2, to: 3, color: '#06b6d4', label: 'Build Image' },
          { from: 2, to: 4, color: '#ef4444', label: 'Scan Secrets' },
          { from: 3, to: 5, color: '#10b981', label: 'Deploy Pods' },
          { from: 4, to: 5, color: '#10b981', label: 'Pass Gate' }
        ];
      } else if (isSocket) {
        // Real-Time WebSockets & Chat Architecture
        nodesList = [
          { id: 'ws_1', name: 'Web & Mobile Clients', sub: 'Socket.IO / Native WS Client', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'ws_2', name: 'NGINX Load Balancer', sub: 'Sticky Sessions · TLS Offload', x: 380, y: 180, width: 250, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'ws_3', name: 'WebSocket Cluster Nodes', sub: 'Node.js Cluster · WSS Protocol', x: 710, y: 80, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'ws_4', name: 'Redis Pub/Sub Message Bus', sub: 'Channel Broadcasting · Sub-ms', x: 710, y: 280, width: 260, height: 100, color: '#ef4444', bg: '#450a0a' },
          { id: 'ws_5', name: 'MongoDB Message Store', sub: 'Capped Collections · Time-Series', x: 1050, y: 180, width: 260, height: 100, color: '#f59e0b', bg: '#451a03' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'Upgrade: WebSocket' },
          { from: 2, to: 3, color: '#10b981', label: 'Forward Stream' },
          { from: 3, to: 4, color: '#ef4444', label: 'Publish Event' },
          { from: 4, to: 3, color: '#a855f7', label: 'Broadcast Message' },
          { from: 3, to: 5, color: '#f59e0b', label: 'Persist Chat Log' }
        ];
      } else if (isAuthFlow) {
        // OAuth2 & SSO Identity Architecture
        nodesList = [
          { id: 'auth_1', name: 'User Browser / Client SPA', sub: 'PKCE Authorization Code Flow', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'auth_2', name: 'OAuth2 Authorization Server', sub: 'GitHub / Google / Auth0 Provider', x: 390, y: 80, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'auth_3', name: 'API Gateway & JWT Verifier', sub: 'RS256 Public Key Validation', x: 390, y: 280, width: 260, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'auth_4', name: 'Resource Microservices', sub: 'Scoped Access · Role-Based ACL', x: 740, y: 280, width: 260, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'auth_5', name: 'User Profile & Roles DB', sub: 'Encrypted Credential Vault', x: 1080, y: 280, width: 260, height: 100, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#a855f7', label: '1. Request Auth Code' },
          { from: 2, to: 1, color: '#38bdf8', label: '2. Return JWT Token' },
          { from: 1, to: 3, color: '#f59e0b', label: '3. Bearer Token API Call' },
          { from: 3, to: 4, color: '#10b981', label: '4. Pass Validated Claims' },
          { from: 4, to: 5, color: '#06b6d4', label: '5. Query User Data' }
        ];
      } else if (isKafka) {
        // Event-Driven CQRS / Kafka Pipeline
        nodesList = [
          { id: 'k_1', name: 'API Event Producers', sub: 'Command Handlers · REST API', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'k_2', name: 'Apache Kafka Cluster', sub: 'Partitioned Topics · Replication=3', x: 390, y: 180, width: 260, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'k_3', name: 'Event Consumer Workers', sub: 'Idempotent Handlers · DLQ', x: 730, y: 80, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'k_4', name: 'Read Model (ElasticSearch)', sub: 'Denormalized Fast Query Index', x: 1070, y: 80, width: 260, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'k_5', name: 'Write Model (PostgreSQL)', sub: 'Transactional Event Store', x: 730, y: 280, width: 260, height: 100, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#f59e0b', label: 'Produce Event' },
          { from: 2, to: 3, color: '#a855f7', label: 'Consume Partition' },
          { from: 3, to: 4, color: '#10b981', label: 'Update Read Model' },
          { from: 1, to: 5, color: '#06b6d4', label: 'Execute Command' },
          { from: 5, to: 2, color: '#f59e0b', label: 'CDC Outbox' }
        ];
      } else if (isEr) {
        // Relational Schema
        const entity1 = rawWords[0] ? `${rawWords[0]}s Table` : 'Users Table';
        const entity2 = rawWords[1] ? `${rawWords[1]}s Table` : 'Orders Table';
        const entity3 = rawWords[2] ? `${rawWords[2]}s Table` : 'Transactions Table';

        nodesList = [
          { id: 'er_1', name: entity1, fields: ['id (UUID, PK)', 'name (VARCHAR)', 'email (VARCHAR)', 'created_at (TIMESTAMP)'], x: 80, y: 140, width: 280, height: 180, color: '#7c3aed', bg: '#1e1b4b' },
          { id: 'er_2', name: entity2, fields: ['id (UUID, PK)', 'parent_id (UUID, FK)', 'status (VARCHAR)', 'total_cents (BIGINT)'], x: 460, y: 140, width: 280, height: 180, color: '#10b981', bg: '#064e3b' },
          { id: 'er_3', name: entity3, fields: ['id (UUID, PK)', 'reference_id (UUID, FK)', 'amount (NUMERIC)', 'verified (BOOLEAN)'], x: 840, y: 140, width: 280, height: 180, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#7c3aed', label: '1:N Foreign Key' },
          { from: 2, to: 3, color: '#10b981', label: '1:N Foreign Key' }
        ];
      } else if (isAws) {
        // AWS Serverless & Cloud Architecture
        nodesList = [
          { id: 'aws_1', name: 'Amazon CloudFront CDN', sub: 'Global Edge Caching · TLS 1.3', x: 60, y: 180, width: 250, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'aws_2', name: 'API Gateway HTTP API', sub: 'JWT Authorizer · Rate Limiting', x: 390, y: 180, width: 250, height: 100, color: '#f97316', bg: '#431407' },
          { id: 'aws_3', name: 'AWS Lambda Microservices', sub: 'Node.js 20 · ARM64 Graviton', x: 720, y: 80, width: 260, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'aws_4', name: 'Amazon DynamoDB Global Table', sub: 'Single-Digit ms Latency · Pay-per-req', x: 1060, y: 80, width: 270, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'aws_5', name: 'Amazon S3 Object Store', sub: 'Static Assets · Encrypted AES-256', x: 720, y: 280, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'aws_6', name: 'Amazon SQS Event Queue', sub: 'Async DLQ · FIFO Processing', x: 1060, y: 280, width: 270, height: 100, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#f59e0b', label: 'Edge Forward' },
          { from: 2, to: 3, color: '#f97316', label: 'Route Handler' },
          { from: 3, to: 4, color: '#10b981', label: 'KV Query' },
          { from: 2, to: 5, color: '#a855f7', label: 'Blob Upload' },
          { from: 3, to: 6, color: '#06b6d4', label: 'Event Emit' }
        ];
      } else if (isPayment) {
        // Payment & E-Commerce Pipeline
        nodesList = [
          { id: 'pay_1', name: 'Storefront Client App', sub: 'React 19 · Tailwind CSS', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'pay_2', name: 'Checkout & Cart Gateway', sub: 'Express · Idempotency Keys', x: 390, y: 180, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'pay_3', name: 'Stripe API & Webhooks', sub: '3D Secure 2 · Elements SDK', x: 730, y: 80, width: 260, height: 100, color: '#6366f1', bg: '#1e1b4b' },
          { id: 'pay_4', name: 'Orders & Inventory DB', sub: 'PostgreSQL ACID Transactions', x: 730, y: 280, width: 260, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'pay_5', name: 'Receipt & Fulfillment Worker', sub: 'Redis Queue · Resend Email', x: 1070, y: 180, width: 260, height: 100, color: '#f59e0b', bg: '#451a03' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'Initiate Order' },
          { from: 2, to: 3, color: '#6366f1', label: 'Charge Intent' },
          { from: 2, to: 4, color: '#10b981', label: 'Reserve Items' },
          { from: 3, to: 5, color: '#f59e0b', label: 'Webhook Event' },
          { from: 5, to: 4, color: '#10b981', label: 'Confirm Order' }
        ];
      } else if (isAi) {
        // AI / RAG Pipeline
        nodesList = [
          { id: 'ai_1', name: 'User Interaction Client', sub: 'Chat UI · Stream Listener', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'ai_2', name: 'RAG Ingestion Controller', sub: 'Semantic Chunking · Tokenizer', x: 390, y: 180, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'ai_3', name: 'Vector DB (Pinecone / Qdrant)', sub: 'HNSW Index · Cosine Similarity', x: 730, y: 80, width: 270, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'ai_4', name: 'LLM Reasoning Engine', sub: 'Groq Llama-3.3 / OpenAI GPT-4o', x: 730, y: 280, width: 270, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'ai_5', name: 'Redis Response Cache', sub: 'Exact Semantic Match · TTL 24h', x: 1080, y: 180, width: 260, height: 100, color: '#ef4444', bg: '#450a0a' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'Prompt Query' },
          { from: 2, to: 3, color: '#10b981', label: 'Vector Retrieval' },
          { from: 2, to: 4, color: '#f59e0b', label: 'Context Augmentation' },
          { from: 4, to: 5, color: '#ef4444', label: 'Cache Output' },
          { from: 5, to: 1, color: '#38bdf8', label: 'Stream Answer' }
        ];
      } else {
        // Universal High-Throughput Microservice Architecture
        const topic1 = rawWords[0] ? rawWords[0].charAt(0).toUpperCase() + rawWords[0].slice(1) : 'Web';
        const topic2 = rawWords[1] ? rawWords[1].charAt(0).toUpperCase() + rawWords[1].slice(1) : 'API';
        const topic3 = rawWords[2] ? rawWords[2].charAt(0).toUpperCase() + rawWords[2].slice(1) : 'Core';

        nodesList = [
          { id: 'uni_1', name: `${topic1} Client Interface`, sub: 'React / Mobile · Live Stream', x: 60, y: 180, width: 250, height: 100, color: '#38bdf8', bg: '#082f49' },
          { id: 'uni_2', name: `${topic2} Gateway & Auth`, sub: 'NGINX Reverse Proxy · JWT', x: 390, y: 180, width: 260, height: 100, color: '#a855f7', bg: '#1e1b4b' },
          { id: 'uni_3', name: `${topic3} Processing Engine`, sub: 'Worker Pool · Async Tasks', x: 730, y: 80, width: 260, height: 100, color: '#10b981', bg: '#064e3b' },
          { id: 'uni_4', name: 'Database Cluster & Cache', sub: 'PostgreSQL · Redis Key-Value', x: 730, y: 280, width: 260, height: 100, color: '#f59e0b', bg: '#451a03' },
          { id: 'uni_5', name: 'Telemetry & Event Stream', sub: 'Prometheus · Grafana · Kafka', x: 1070, y: 180, width: 260, height: 100, color: '#06b6d4', bg: '#131b2e' }
        ];
        connsList = [
          { from: 1, to: 2, color: '#38bdf8', label: 'HTTP / WS Request' },
          { from: 2, to: 3, color: '#10b981', label: 'Dispatch Task' },
          { from: 2, to: 4, color: '#f59e0b', label: 'Session Lookup' },
          { from: 3, to: 4, color: '#f59e0b', label: 'Persist State' },
          { from: 3, to: 5, color: '#06b6d4', label: 'Emit Telemetry' }
        ];
      }

      nodesList.forEach((n, idx) => {
        elements.push({
          id: n.id,
          type: 'rectangle',
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
          angle: 0,
          strokeColor: n.color,
          backgroundColor: n.bg,
          fillStyle: 'solid',
          strokeWidth: 2,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: { type: 3 },
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false
        });

        const displayText = n.fields && Array.isArray(n.fields)
          ? `🗄️ ${n.name}\n────────────────────\n${n.fields.join('\n')}`
          : `⚡ ${n.name}\n${n.sub || ''}`;

        elements.push({
          id: `text_${n.id}`,
          type: 'text',
          x: n.x + 14,
          y: n.y + 16,
          width: n.width - 28,
          height: n.height - 32,
          angle: 0,
          strokeColor: '#f8fafc',
          backgroundColor: 'transparent',
          fillStyle: 'solid',
          strokeWidth: 1,
          strokeStyle: 'solid',
          roughness: 0,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          text: displayText,
          fontSize: n.fields ? 13 : 13,
          fontFamily: 3,
          textAlign: n.fields ? 'left' : 'center',
          verticalAlign: 'top',
          baseline: 14,
          containerId: null,
          originalText: displayText
        });

        steps.push({
          step: idx + 1,
          name: n.name,
          type: 'service_node',
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
          action: `Synthesizing ${n.name}`
        });
      });

      connsList.forEach((conn, cIdx) => {
        const fromN = nodesList[conn.from - 1];
        const toN = nodesList[conn.to - 1];
        if (fromN && toN) {
          const startX = fromN.x + fromN.width;
          const startY = fromN.y + fromN.height / 2;
          const endX = toN.x;
          const endY = toN.y + toN.height / 2;
          const deltaX = endX - startX;
          const deltaY = endY - startY;

          elements.push({
            id: `arrow_${cIdx + 1}`,
            type: 'arrow',
            x: startX,
            y: startY,
            width: Math.abs(deltaX),
            height: Math.abs(deltaY),
            angle: 0,
            strokeColor: conn.color || '#38bdf8',
            backgroundColor: 'transparent',
            fillStyle: 'solid',
            strokeWidth: 2,
            strokeStyle: 'solid',
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: null,
            seed: Math.floor(Math.random() * 100000),
            version: 1,
            versionNonce: Math.floor(Math.random() * 100000),
            isDeleted: false,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            points: [[0, 0], [deltaX, deltaY]],
            startArrowhead: null,
            endArrowhead: 'arrow'
          });

          steps.push({
            step: steps.length + 1,
            name: conn.label || 'Directional Pipeline',
            type: 'arrow',
            x: startX,
            y: startY,
            width: Math.abs(deltaX),
            height: Math.abs(deltaY),
            action: `Connecting ${fromN.name} ➔ ${toN.name}`
          });
        }
      });
    }

    const targetId = (mode === 'modify' && diagramId)
      ? diagramId
      : `diag_ai_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const targetType: Diagram['type'] = isEr ? 'er_diagram' : 'architecture';

    const fullDiagram: Diagram = {
      id: targetId,
      projectId,
      userId,
      name: diagramName,
      description: `Stitch AI Generated: ${cleanPrompt}`,
      type: targetType,
      elements,
      appState: { viewBackgroundColor: '#090d16', theme: 'dark' },
      files: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (mode === 'modify' && diagramId) {
      if (getIsMongoConnected()) {
        try {
          await DiagramModel.updateOne({ id: diagramId }, { $set: fullDiagram });
        } catch {}
      }
      await diagramStore.update(diagramId, fullDiagram);
    } else {
      if (getIsMongoConnected()) {
        try {
          await DiagramModel.create(fullDiagram);
        } catch {}
      }
      await diagramStore.create(fullDiagram);
    }

    const relPath = syncDiagramToDisk(fullDiagram);

    res.status(201).json({
      success: true,
      diagram: {
        ...fullDiagram,
        filePath: relPath
      },
      generationSteps: steps,
      message: `Generated diagram '${diagramName}' with ${elements.length} editable elements`
    });
  } catch (err: any) {
    console.error('[diagrams/generate-ai] Error:', err.message);
    res.status(500).json({ error: `Failed to generate AI diagram: ${err.message}` });
  }
});


