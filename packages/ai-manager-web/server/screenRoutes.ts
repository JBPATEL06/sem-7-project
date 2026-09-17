import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ScreenModel } from './models/index.js';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { AppLogger } from './utils/logger.js';
import { exportScreenToFigBuffer } from './figExporter.js';
import {
  SemanticProps,
  DesignSystemTokens,
  AstPropertyDiff,
  LayoutComponent,
  LayoutBoard,
  ChatMessage,
  ScreenLayoutSpec,
  localScreenStore,
  designTokensStore,
  DEFAULT_SCREEN_THEME,
  getDefaultDesignTokens
} from './screens/screenTypes.js';
import {
  getWorkspaceRootDir,
  getScreenSlug,
  syncScreenToDisk,
  saveScreenBackup,
  deleteScreenFromDisk,
  syncDiskScreensToStore
} from './screens/screenDiskService.js';
import {
  callLlmForScreenAst,
  synthesizeStitchLayout,
  generateLayoutFromPrompt,
  detectIntent,
  callLlmForChatReply
} from './screens/screenAiService.js';

export type {
  SemanticProps,
  DesignSystemTokens,
  AstPropertyDiff,
  LayoutComponent,
  LayoutBoard,
  ChatMessage,
  ScreenLayoutSpec
};
export {
  DEFAULT_SCREEN_THEME,
  getDefaultDesignTokens,
  getWorkspaceRootDir,
  getScreenSlug,
  syncScreenToDisk,
  saveScreenBackup,
  deleteScreenFromDisk,
  syncDiskScreensToStore,
  callLlmForScreenAst,
  synthesizeStitchLayout,
  generateLayoutFromPrompt,
  detectIntent,
  callLlmForChatReply
};

export const screenRouter = Router();

// Helper: Targeted AST Property Diff Mutation Engine
export function applyTargetedAstDiff(
  components: LayoutComponent[],
  options: {
    selectedCompIds?: string[];
    prompt?: string;
    propertyUpdates?: Partial<LayoutComponent>;
    semanticUpdates?: Partial<SemanticProps>;
    designTokens?: DesignSystemTokens;
  }
): {
  updatedComponents: LayoutComponent[];
  astDiffs: AstPropertyDiff[];
  changesSummary: string;
} {
  const { selectedCompIds = [], prompt = '', propertyUpdates, semanticUpdates, designTokens } = options;
  const p = prompt.toLowerCase();
  const astDiffs: AstPropertyDiff[] = [];
  const updated: LayoutComponent[] = JSON.parse(JSON.stringify(components));

  const hasSpecificTarget = selectedCompIds.length > 0;
  const tokens = designTokens || getDefaultDesignTokens('violet');

  const mutateMatching = (mutateFn: (c: LayoutComponent) => void) => {
    const walk = (list: LayoutComponent[]) => {
      for (const c of list) {
        if (!hasSpecificTarget || selectedCompIds.includes(c.id)) {
          mutateFn(c);
        }
        if (c.children && c.children.length > 0) {
          walk(c.children);
        }
      }
    };
    walk(updated);
  };

  // 1. Direct propertyUpdates if supplied
  if (propertyUpdates || semanticUpdates) {
    mutateMatching((c) => {
      if (propertyUpdates) {
        for (const [key, val] of Object.entries(propertyUpdates)) {
          const oldVal = (c as any)[key];
          if (JSON.stringify(oldVal) !== JSON.stringify(val)) {
            (c as any)[key] = val;
            astDiffs.push({
              componentId: c.id,
              componentName: c.name,
              field: key,
              oldValue: oldVal,
              newValue: val,
              description: `Updated ${key} from ${JSON.stringify(oldVal)} to ${JSON.stringify(val)}`
            });
          }
        }
      }
      if (semanticUpdates) {
        const oldSemantic = c.semantic || {};
        c.semantic = { ...oldSemantic, ...semanticUpdates };
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'semantic',
          oldValue: oldSemantic,
          newValue: c.semantic,
          description: `Updated semantic configuration on ${c.name}`
        });
      }
    });
  }

  // 2. Prompt-driven targeted property diffs
  if (p.includes('color') || p.includes('theme') || p.includes('emerald') || p.includes('green') || p.includes('blue') || p.includes('violet') || p.includes('navy') || p.includes('dark') || p.includes('light') || p.includes('amber') || p.includes('orange') || p.includes('rose') || p.includes('red')) {
    let targetColor = tokens.colors.primary;
    if (p.includes('emerald') || p.includes('green')) targetColor = '#10b981';
    else if (p.includes('blue') || p.includes('azure')) targetColor = '#3b82f6';
    else if (p.includes('navy')) targetColor = '#1e3a8a';
    else if (p.includes('amber') || p.includes('orange')) targetColor = '#f59e0b';
    else if (p.includes('rose') || p.includes('red')) targetColor = '#ef4444';

    mutateMatching((c) => {
      const oldFills = JSON.parse(JSON.stringify(c.fills || []));
      const oldStrokes = JSON.parse(JSON.stringify(c.strokes || []));
      const isButtonLike = c.type === 'button' || c.type === 'rect' || (c as any).type === 'rectangle' || c.name.toLowerCase().includes('button');

      if (isButtonLike) {
        c.fills = [{ fillColor: targetColor, color: targetColor } as any];
        c.color = '#ffffff';
        c.semantic = { ...(c.semantic || {}), variant: 'primary', colorToken: 'primary' };
      } else if (c.type === 'badge') {
        c.color = targetColor;
        c.fills = [{ fillColor: `${targetColor}22`, color: `${targetColor}22` } as any];
        c.semantic = { ...(c.semantic || {}), variant: 'success', colorToken: 'accent' };
      } else if (c.type === 'text') {
        c.color = targetColor;
        c.semantic = { ...(c.semantic || {}), colorToken: 'primary' };
      } else {
        c.strokes = [{ strokeColor: targetColor, strokeWidth: 1.5 }];
      }

      if (JSON.stringify(oldFills) !== JSON.stringify(c.fills)) {
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'fills',
          oldValue: oldFills,
          newValue: c.fills,
          description: `Restyled ${c.name} palette from ${JSON.stringify(oldFills)} to ${targetColor}`
        });
      } else if (JSON.stringify(oldStrokes) !== JSON.stringify(c.strokes)) {
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'strokes',
          oldValue: oldStrokes,
          newValue: c.strokes,
          description: `Restyled ${c.name} stroke to ${targetColor}`
        });
      }
    });
  }

  return {
    updatedComponents: updated,
    astDiffs,
    changesSummary: `Applied ${astDiffs.length} targeted property diff(s) across ${hasSpecificTarget ? selectedCompIds.length : updated.length} element(s).`
  };
}

// GET /api/screens - List all screens for active user
screenRouter.get('/', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { projectId } = req.query;
    const targetProjId = typeof projectId === 'string' ? projectId : 'acme-api';
    const targetUserId = user?.sub || 'usr_admin_default';

    await syncDiskScreensToStore(targetProjId, targetUserId);

    let screens: any[] = [];

    if (getIsMongoConnected()) {
      try {
        let query: any = {};
        if (projectId) query.projectId = projectId;
        if (user && user.role !== 'admin') {
          query.userId = user.sub;
        }
        screens = await ScreenModel.find(query).sort({ updatedAt: -1 }).lean();
      } catch (e) {
        console.error('[Screens] Atlas read error:', e);
      }
    }

    if (screens.length === 0) {
      let localScreens = await localScreenStore.getAll();
      if (user && user.role !== 'admin') {
        localScreens = localScreens.filter((s: ScreenLayoutSpec) => s.userId === user.sub);
      }
      if (projectId && typeof projectId === 'string') {
        localScreens = localScreens.filter((s: ScreenLayoutSpec) => s.projectId === projectId);
      }
      if (localScreens.length > 0) {
        screens = localScreens;
      }
    }

    return res.json({
      success: true,
      screens: screens.map((s: any) => {
        const spec: ScreenLayoutSpec = {
          id: s.id,
          projectId: s.projectId,
          userId: s.userId,
          name: s.name,
          description: s.description || '',
          board: s.layout || s.board,
          theme: s.theme || DEFAULT_SCREEN_THEME,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt
        };
        const relPath = syncScreenToDisk(spec);
        return {
          ...spec,
          filePath: relPath
        };
      })
    });
  } catch (err: any) {
    console.error('Error fetching screens:', err);
    return res.status(500).json({ error: 'Failed to fetch layout specs', details: err.message });
  }
});

// GET /api/screens/design-tokens
screenRouter.get('/design-tokens', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId = 'global', themeName = 'violet' } = req.query;
    const projId = String(projectId);
    const thName = String(themeName);

    let tokens = await designTokensStore.getById(`tokens_${projId}_${thName}`);
    if (!tokens) {
      tokens = getDefaultDesignTokens(thName, projId);
      await designTokensStore.create(tokens);
    }

    return res.json({
      success: true,
      tokens
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch design tokens', details: err.message });
  }
});

// PUT /api/screens/design-tokens
screenRouter.put('/design-tokens', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId = 'global', themeName = 'violet', tokens: customTokens } = req.body;
    const projId = String(projectId);
    const thName = String(themeName);

    const tokenId = `tokens_${projId}_${thName}`;
    const existing = await designTokensStore.getById(tokenId);
    const fullTokens: DesignSystemTokens = {
      ...(existing || getDefaultDesignTokens(thName, projId)),
      ...(customTokens || {}),
      id: tokenId,
      projectId: projId,
      themeName: thName
    };

    if (existing) {
      await designTokensStore.update(tokenId, fullTokens);
    } else {
      await designTokensStore.create(fullTokens);
    }

    return res.json({
      success: true,
      tokens: fullTokens
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update design tokens', details: err.message });
  }
});

// POST /api/screens/modify-element
screenRouter.post('/modify-element', localOrAuth, async (req: AuthRequest, res: Response) => {
  const logger = AppLogger.createRequestLogger(req.headers['x-request-id'] as string, '/api/screens/modify-element');
  try {
    const { screenId, selectedCompIds = [], propertyUpdates, semanticUpdates, prompt } = req.body;

    if (!screenId) {
      return res.status(400).json({ error: 'screenId is required.' });
    }

    let screen: any = null;
    if (getIsMongoConnected()) {
      screen = await ScreenModel.findOne({ id: screenId }).lean();
    }
    if (!screen) {
      screen = await localScreenStore.getById(screenId);
    }
    if (!screen) {
      return res.status(404).json({ error: `Screen ${screenId} not found.` });
    }

    const currentComps = screen.board?.components || screen.layout?.components || [];
    const designTokens = screen.designTokens || getDefaultDesignTokens('violet', screen.projectId);
    const { updatedComponents, astDiffs, changesSummary } = applyTargetedAstDiff(currentComps, {
      selectedCompIds,
      propertyUpdates,
      semanticUpdates,
      prompt,
      designTokens
    });

    const updatedSpec: ScreenLayoutSpec = {
      ...screen,
      board: {
        ...(screen.board || screen.layout),
        components: updatedComponents
      },
      updatedAt: new Date().toISOString()
    };

    if (getIsMongoConnected()) {
      try {
        await ScreenModel.updateOne({ id: screenId }, { $set: { layout: updatedSpec.board, components: updatedComponents, updatedAt: updatedSpec.updatedAt } });
      } catch {}
    }
    await localScreenStore.update(screenId, updatedSpec);
    syncScreenToDisk(updatedSpec);

    return res.status(200).json({
      success: true,
      mode: 'modify',
      screen: updatedSpec,
      astDiffs,
      changesSummary
    });
  } catch (err: any) {
    logger.logError('MODIFY_ELEMENT', err);
    return res.status(500).json({ error: 'Failed to modify element', details: err.message });
  }
});

// GET /api/screens/templates
screenRouter.get('/templates', localOrAuth, (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    templates: []
  });
});

// POST /api/screens/generate
screenRouter.post('/generate', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, projectId = 'global' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    const userId = req.user ? req.user.sub : 'anonymous';
    const spec = await generateLayoutFromPrompt(prompt);
    spec.userId = userId;
    spec.projectId = projectId;

    try {
      if (getIsMongoConnected()) {
        await ScreenModel.create({
          id: spec.id,
          projectId: spec.projectId,
          userId: spec.userId,
          name: spec.name,
          description: spec.description,
          layout: spec.board,
          components: spec.board.components
        });
      }
    } catch (err) {}

    await localScreenStore.create(spec);
    const relPath = syncScreenToDisk(spec);

    return res.status(201).json({
      success: true,
      screen: {
        ...spec,
        filePath: relPath
      }
    });
  } catch (err: any) {
    console.error('Error generating screen:', err);
    return res.status(500).json({ error: 'Failed to generate layout spec', details: err.message });
  }
});

// GET /api/screens/mcp-config
screenRouter.get('/mcp-config', async (_req, res: Response) => {
  const { getOpenPencilMcpConfig } = await import('./screens/mcpService.js');
  return res.json({
    success: true,
    config: getOpenPencilMcpConfig()
  });
});

// GET /api/screens/mcp-status
screenRouter.get('/mcp-status', async (_req, res: Response) => {
  const { checkOpenPencilMcpBridgeStatus } = await import('./screens/mcpService.js');
  const status = await checkOpenPencilMcpBridgeStatus();
  return res.json({
    success: true,
    status
  });
});

// GET /api/screens/:id
screenRouter.get('/:id', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.user;

    let screen: any = null;
    if (getIsMongoConnected()) {
      screen = await ScreenModel.findOne({ id }).lean();
    }
    if (!screen) {
      screen = await localScreenStore.getById(id);
    }

    if (!screen) {
      return res.status(404).json({ error: `Screen ${id} not found` });
    }

    if (user && user.role !== 'admin' && screen.userId && screen.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this layout spec' });
    }

    return res.json({
      success: true,
      screen: {
        id: screen.id,
        projectId: screen.projectId,
        userId: screen.userId,
        name: screen.name,
        description: screen.description || '',
        board: screen.layout || screen.board,
        theme: screen.theme || DEFAULT_SCREEN_THEME,
        createdAt: screen.createdAt,
        updatedAt: screen.updatedAt
      }
    });
  } catch (err: any) {
    console.error('Error fetching screen:', err);
    return res.status(500).json({ error: 'Failed to fetch screen', details: err.message });
  }
});

// POST /api/screens - Create / Save layout spec
screenRouter.post('/', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description = '', projectId = 'global', board, theme } = req.body;
    const userId = req.user ? req.user.sub : 'anonymous';

    if (!name) {
      return res.status(400).json({ error: 'Screen name is required' });
    }

    const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullSpec: ScreenLayoutSpec = {
      id,
      projectId,
      userId,
      name,
      description,
      board: board || {
        id: `board_${Date.now()}`,
        name: `${name} Board`,
        x: 0,
        y: 0,
        width: 1440,
        height: 900,
        background: '#090d16',
        components: []
      },
      theme: theme || DEFAULT_SCREEN_THEME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (getIsMongoConnected()) {
        await ScreenModel.create({
          id: fullSpec.id,
          projectId: fullSpec.projectId,
          userId: fullSpec.userId,
          name: fullSpec.name,
          description: fullSpec.description,
          layout: fullSpec.board,
          components: fullSpec.board.components
        });
      }
    } catch (err) {}

    await localScreenStore.create(fullSpec);
    const relPath = syncScreenToDisk(fullSpec);

    return res.status(201).json({
      success: true,
      screen: {
        ...fullSpec,
        filePath: relPath
      }
    });
  } catch (err: any) {
    console.error('Error creating screen:', err);
    return res.status(500).json({ error: 'Failed to create screen', details: err.message });
  }
});

// PUT /api/screens/:id - Update layout spec
screenRouter.put('/:id', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.user;
    const { name, description, board, theme } = req.body;

    let existing: any = null;
    if (getIsMongoConnected()) {
      existing = await ScreenModel.findOne({ id }).lean();
    }
    if (!existing) {
      existing = await localScreenStore.getById(id);
    }

    if (!existing) {
      return res.status(404).json({ error: `Screen ${id} not found` });
    }

    if (user && user.role !== 'admin' && existing.userId && existing.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to update this layout spec' });
    }

    if (name !== undefined && name !== existing.name) {
      deleteScreenFromDisk(existing.name);
    }

    const updatedSpec: ScreenLayoutSpec = {
      id,
      projectId: existing.projectId || 'global',
      userId: existing.userId || (user ? user.sub : 'anonymous'),
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : (existing.description || ''),
      board: board !== undefined ? board : (existing.layout || existing.board),
      theme: theme !== undefined ? theme : (existing.theme || DEFAULT_SCREEN_THEME),
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      if (getIsMongoConnected()) {
        await ScreenModel.updateOne(
          { id },
          {
            $set: {
              name: updatedSpec.name,
              description: updatedSpec.description,
              layout: updatedSpec.board,
              components: updatedSpec.board.components,
              updatedAt: updatedSpec.updatedAt
            }
          }
        );
      }
    } catch {}

    await localScreenStore.update(id, updatedSpec);
    const relPath = syncScreenToDisk(updatedSpec);

    return res.json({
      success: true,
      screen: {
        ...updatedSpec,
        filePath: relPath
      }
    });
  } catch (err: any) {
    console.error('Error updating screen:', err);
    return res.status(500).json({ error: 'Failed to update screen', details: err.message });
  }
});

// DELETE /api/screens/:id
screenRouter.delete('/:id', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.user;

    let existing: any = null;
    if (getIsMongoConnected()) {
      existing = await ScreenModel.findOne({ id }).lean();
    }
    if (!existing) {
      existing = await localScreenStore.getById(id);
    }

    if (!existing) {
      return res.status(404).json({ error: `Screen ${id} not found` });
    }

    if (user && user.role !== 'admin' && existing.userId && existing.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to delete this layout spec' });
    }

    if (getIsMongoConnected()) {
      await ScreenModel.deleteOne({ id });
    }
    await localScreenStore.delete(id);
    deleteScreenFromDisk(existing.name);

    return res.json({
      success: true,
      message: `Screen ${id} deleted successfully`
    });
  } catch (err: any) {
    console.error('Error deleting screen:', err);
    return res.status(500).json({ error: 'Failed to delete screen', details: err.message });
  }
});

// GET /api/screens/:id/export - Export to native .fig or JSON
screenRouter.get('/:id/export', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const user = req.user;

    let screen: any = null;
    if (getIsMongoConnected()) {
      screen = await ScreenModel.findOne({ id }).lean();
    }
    if (!screen) {
      screen = await localScreenStore.getById(id);
    }

    if (!screen) {
      return res.status(404).json({ error: `Screen ${id} not found` });
    }

    if (user && user.role !== 'admin' && screen.userId && screen.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to export this layout spec' });
    }

    const fullSpec: ScreenLayoutSpec = {
      id: screen.id,
      projectId: screen.projectId,
      userId: screen.userId,
      name: screen.name,
      description: screen.description || '',
      board: screen.layout || screen.board,
      theme: screen.theme || DEFAULT_SCREEN_THEME,
      createdAt: screen.createdAt,
      updatedAt: screen.updatedAt
    };

    const format = (req.query.format as string) || 'fig';

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${getScreenSlug(screen.name)}.json"`);
      return res.json(fullSpec);
    }

    const figBytes = await exportScreenToFigBuffer(fullSpec);
    const slug = getScreenSlug(screen.name);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.fig"`);
    return res.send(Buffer.from(figBytes));
  } catch (err: any) {
    console.error('Error exporting screen:', err);
    return res.status(500).json({ error: 'Failed to export screen', details: err.message });
  }
});

// GET /api/screens/project-root/raw/:filename
screenRouter.get('/project-root/raw/:filename', async (req: Request | any, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    if (!rawFilename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const filename = Array.isArray(rawFilename) ? rawFilename[0] : String(rawFilename);
    const safeName = path.basename(filename);
    const rootDir = getWorkspaceRootDir();
    const uiDir = path.join(rootDir, 'ui');
    const filePath = path.join(uiDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ui/${safeName} not found` });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (safeName.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (safeName.endsWith('.fig')) {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    return res.sendFile(filePath);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to stream raw file', details: err.message });
  }
});

// GET /api/screens/project-root/files
screenRouter.get('/project-root/files', localOrAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rootDir = getWorkspaceRootDir();
    const uiDir = path.join(rootDir, 'ui');
    if (!fs.existsSync(uiDir)) {
      fs.mkdirSync(uiDir, { recursive: true });
    }
    const files = fs.readdirSync(uiDir);
    const result = files
      .filter(f => f.endsWith('.fig') || f.endsWith('.json'))
      .map(f => {
        const fullPath = path.join(uiDir, f);
        const stats = fs.statSync(fullPath);
        return {
          name: f,
          sizeBytes: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          type: f.endsWith('.fig') ? 'fig' : 'json'
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
    return res.json({ success: true, files: result, path: 'ui/' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list project root files', details: err.message });
  }
});

// POST /api/screens/project-root/open
screenRouter.post('/project-root/open', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const safeName = path.basename(filename);
    const rootDir = getWorkspaceRootDir();
    const uiDir = path.join(rootDir, 'ui');
    const filePath = path.join(uiDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ui/${safeName} not found` });
    }

    if (safeName.endsWith('.json')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ success: true, format: 'json', name: safeName.replace(/\.json$/i, ''), data });
    }

    const buffer = fs.readFileSync(filePath);
    return res.json({
      success: true,
      format: 'fig',
      name: safeName.replace(/\.fig$/i, ''),
      sizeBytes: buffer.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to open project root file', details: err.message });
  }
});

// DELETE /api/screens/project-root/files/:filename
screenRouter.delete('/project-root/files/:filename', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    if (!rawFilename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    const filename = Array.isArray(rawFilename) ? rawFilename[0] : String(rawFilename);
    const safeName = path.basename(filename);
    const rootDir = getWorkspaceRootDir();
    const uiDir = path.join(rootDir, 'ui');
    const filePath = path.join(uiDir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ui/${safeName} not found` });
    }

    fs.unlinkSync(filePath);

    // Also delete associated companion file if .json and .fig share the base slug
    const baseSlug = safeName.replace(/\.(fig|json)$/i, '');
    const companionExt = safeName.endsWith('.fig') ? '.json' : '.fig';
    const companionPath = path.join(uiDir, `${baseSlug}${companionExt}`);
    if (fs.existsSync(companionPath)) {
      try {
        fs.unlinkSync(companionPath);
      } catch {}
    }

    return res.json({
      success: true,
      message: `File ui/${safeName} deleted successfully`
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete project root file', details: err.message });
  }
});

// POST /api/screens/project-root/save
screenRouter.post('/project-root/save', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, board, theme, description = '' } = req.body;
    if (!name || !board) {
      return res.status(400).json({ error: 'Name and board layout are required' });
    }
    const slug = getScreenSlug(name);
    const rootDir = getWorkspaceRootDir();
    const uiDir = path.join(rootDir, 'ui');
    if (!fs.existsSync(uiDir)) {
      fs.mkdirSync(uiDir, { recursive: true });
    }

    const fullSpec: ScreenLayoutSpec = {
      id: `spec_${slug}_${Date.now()}`,
      projectId: 'root',
      userId: req.user?.sub || 'local',
      name,
      description,
      board,
      theme: theme || DEFAULT_SCREEN_THEME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const jsonPath = path.join(uiDir, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(fullSpec, null, 2), 'utf-8');

    const figBytes = await exportScreenToFigBuffer(fullSpec);
    const figPath = path.join(uiDir, `${slug}.fig`);
    fs.writeFileSync(figPath, Buffer.from(figBytes));

    return res.json({
      success: true,
      message: `Saved ${name} to ui/${slug}.fig and ui/${slug}.json`,
      files: [`ui/${slug}.fig`, `ui/${slug}.json`]
    });
  } catch (err: any) {
    console.error('Error saving to project root:', err);
    return res.status(500).json({ error: 'Failed to save to project root', details: err.message });
  }
});

// POST /api/screens/generate-stitch
screenRouter.post('/generate-stitch', localOrAuth, async (req: AuthRequest, res: Response) => {
  const logger = AppLogger.createRequestLogger(req.headers['x-request-id'] as string, '/api/screens/generate-stitch');
  try {
    const {
      prompt,
      mode = 'create',
      screenId,
      existingBoard,
      selectedCompIds = [],
      projectId = 'global',
      theme: requestedTheme = 'dark',
      category = 'dashboard'
    } = req.body;

    logger.logStep('INCOMING_REQUEST', `Prompt: "${prompt}" | Project: ${projectId} | ScreenId: ${screenId || 'none'} | Mode: ${mode}`, {
      prompt,
      mode,
      screenId,
      projectId,
      theme: requestedTheme,
      category,
      selectedCompIdsCount: Array.isArray(selectedCompIds) ? selectedCompIds.length : 0
    });

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'A natural language prompt is required.' });
    }

    const userId = req.user ? req.user.sub : 'anonymous';
    const isDark = requestedTheme !== 'light';

    const hasExplicitSelection = Array.isArray(selectedCompIds) && selectedCompIds.length > 0;
    const isExplicitRedesign = /\b(redesign from scratch|start over|clear and replace|wipe canvas|brand new screen)\b/i.test(prompt);
    const isAdditivePrompt = /\b(add|insert|append|put|attach|include|place|create\s+\d+|add\s+\d+)\b/i.test(prompt);
    const rawIntent = await detectIntent(prompt, hasExplicitSelection);

    let currentScreenSpec: ScreenLayoutSpec | null = null;
    if (screenId) {
      if (getIsMongoConnected()) {
        const doc = await ScreenModel.findOne({ id: screenId }).lean();
        if (doc) currentScreenSpec = doc as any;
      }
      if (!currentScreenSpec) {
        currentScreenSpec = await localScreenStore.getById(screenId);
      }
    }

    const hasExistingComponents = (currentScreenSpec?.board?.components?.length || existingBoard?.components?.length || 0) > 0;

    let intent: 'GENERATE' | 'MODIFY' | 'DISCUSS' = rawIntent as any;
    let effectiveMode: 'create' | 'modify' = mode;

    if (rawIntent === 'DISCUSS' && mode !== 'create' && mode !== 'modify') {
      intent = 'DISCUSS';
    } else if (hasExistingComponents && (isAdditivePrompt || mode === 'modify' || hasExplicitSelection) && !isExplicitRedesign) {
      intent = 'MODIFY';
      effectiveMode = 'modify';
    } else if (isExplicitRedesign || (!hasExistingComponents && mode === 'create')) {
      intent = 'GENERATE';
      effectiveMode = 'create';
    } else {
      intent = 'MODIFY';
      effectiveMode = 'modify';
    }

    const backupCandidate = currentScreenSpec || (existingBoard ? {
      id: screenId || `screen_${Date.now()}`,
      projectId,
      userId,
      name: 'Pre-mutation Snapshot',
      description: 'Auto-saved before modify',
      board: existingBoard,
      theme: DEFAULT_SCREEN_THEME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as ScreenLayoutSpec : null);

    if (backupCandidate && hasExistingComponents) {
      const backupPath = saveScreenBackup(backupCandidate);
      if (backupPath) {
        logger.logStep('SCREEN_BACKUP', `Saved pre-mutation backup snapshot to ${backupPath}`, { backupPath, screenId });
      }
    }

    if (intent === 'DISCUSS') {
      const compList = currentScreenSpec?.board?.components || existingBoard?.components || [];
      const compNames = compList.slice(0, 8).map((c: any) => c.name || c.type).join(', ');

      const conversationalReply = await callLlmForChatReply(prompt.trim(), {
        screenName: currentScreenSpec?.name || 'Active Canvas',
        compCount: compList.length,
        componentsSummary: compNames
      });

      const userMsg: ChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: 'user',
        text: prompt,
        timestamp: new Date().toISOString()
      };

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        text: conversationalReply,
        timestamp: new Date().toISOString(),
        stepsCount: 0,
        changesSummary: 'Conversational response (canvas unchanged)',
        metadata: {
          mode: 'discuss',
          theme: isDark ? 'dark' : 'light'
        }
      };

      const prevChat = Array.isArray(currentScreenSpec?.chatHistory) ? currentScreenSpec!.chatHistory! : [];
      const updatedChatHistory = [...prevChat, userMsg, assistantMsg];

      if (currentScreenSpec) {
        currentScreenSpec.chatHistory = updatedChatHistory;
        currentScreenSpec.updatedAt = new Date().toISOString();

        if (getIsMongoConnected()) {
          try {
            await ScreenModel.updateOne({ id: currentScreenSpec.id }, { $set: { chatHistory: updatedChatHistory, updatedAt: currentScreenSpec.updatedAt } });
          } catch {}
        }
        await localScreenStore.update(currentScreenSpec.id, currentScreenSpec);
      }

      return res.status(200).json({
        success: true,
        intent: 'DISCUSS',
        mode: 'discuss',
        reply: conversationalReply,
        assistantExplanation: conversationalReply,
        changesSummary: 'Conversational response (canvas unchanged)',
        screen: currentScreenSpec,
        chatHistory: updatedChatHistory,
        generationSteps: []
      });
    }

    let baseComponents: LayoutComponent[] = [];
    let boardWidth = 1440;
    let boardHeight = 900;
    let screenName = '';
    let existingChatHistory: ChatMessage[] = [];

    if (effectiveMode === 'modify' && screenId) {
      let existing: any = currentScreenSpec;
      if (!existing) {
        if (getIsMongoConnected()) {
          existing = await ScreenModel.findOne({ id: screenId }).lean();
        }
        if (!existing) {
          existing = await localScreenStore.getById(screenId);
        }
      }
      if (existing) {
        const board = existing.layout || existing.board;
        baseComponents = JSON.parse(JSON.stringify(board.components || []));
        boardWidth = board.width || 1440;
        boardHeight = board.height || 900;
        screenName = existing.name || '';
        existingChatHistory = Array.isArray(existing.chatHistory) ? existing.chatHistory : [];
      }
    } else if (existingBoard) {
      baseComponents = JSON.parse(JSON.stringify(existingBoard.components || []));
      boardWidth = existingBoard.width || 1440;
      boardHeight = existingBoard.height || 900;
    }

    const {
      components,
      title,
      description,
      theme,
      steps,
      changesSummary,
      assistantExplanation
    } = await synthesizeStitchLayout({
      prompt: prompt.trim(),
      mode: effectiveMode,
      baseComponents,
      boardWidth,
      boardHeight,
      isDark,
      category,
      existingName: screenName,
      selectedCompIds: Array.isArray(selectedCompIds) ? selectedCompIds : []
    });

    const targetId = (effectiveMode === 'modify' && screenId)
      ? screenId
      : (screenId || `screen_stitch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date().toISOString()
    };

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      text: assistantExplanation || (effectiveMode === 'modify'
        ? `Applied modifications: **${changesSummary || 'Updated elements'}**.`
        : `Synthesized **${title}** layout with ${components.length} components matching "${prompt}".`),
      timestamp: new Date().toISOString(),
      stepsCount: steps.length,
      changesSummary,
      metadata: {
        mode: effectiveMode,
        intent,
        theme: isDark ? 'dark' : 'light'
      }
    };

    const fullSpec: ScreenLayoutSpec = {
      id: targetId,
      projectId,
      userId,
      name: title,
      description,
      theme,
      board: {
        id: `board_${targetId}`,
        name: `${title} Canvas`,
        x: 0,
        y: 0,
        width: boardWidth,
        height: boardHeight,
        background: theme.backgroundColor,
        components
      },
      chatHistory: [...existingChatHistory, userMsg, assistantMsg],
      createdAt: (currentScreenSpec?.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (effectiveMode === 'modify' && screenId) {
      if (getIsMongoConnected()) {
        try {
          await ScreenModel.updateOne(
            { id: screenId },
            {
              $set: {
                name: fullSpec.name,
                description: fullSpec.description,
                layout: fullSpec.board,
                components: fullSpec.board.components,
                chatHistory: fullSpec.chatHistory,
                updatedAt: fullSpec.updatedAt
              }
            }
          );
        } catch {}
      }
      await localScreenStore.update(screenId, fullSpec);
    } else {
      if (getIsMongoConnected()) {
        try {
          await ScreenModel.create({
            id: fullSpec.id,
            projectId: fullSpec.projectId,
            userId: fullSpec.userId,
            name: fullSpec.name,
            description: fullSpec.description,
            layout: fullSpec.board,
            components: fullSpec.board.components,
            chatHistory: fullSpec.chatHistory
          });
        } catch {}
      }
      await localScreenStore.create(fullSpec);
    }

    const relPath = syncScreenToDisk(fullSpec);

    return res.status(201).json({
      success: true,
      intent,
      mode: effectiveMode,
      screen: {
        ...fullSpec,
        filePath: relPath
      },
      generationSteps: steps,
      changesSummary,
      assistantExplanation: assistantMsg.text,
      assistantMessage: assistantMsg.text,
      chatHistory: fullSpec.chatHistory
    });
  } catch (err: any) {
    logger.logError('GENERATE_STITCH', err);
    return res.status(500).json({ error: 'Failed to generate screen spec', details: err.message });
  }
});

// POST /api/screens/:id/chat
screenRouter.post('/:id/chat', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    let screen: any = null;
    if (getIsMongoConnected()) {
      screen = await ScreenModel.findOne({ id }).lean();
    }
    if (!screen) {
      screen = await localScreenStore.getById(id);
    }
    if (!screen) {
      return res.status(404).json({ error: `Screen ${id} not found` });
    }

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };

    const compList = screen.layout?.components || screen.board?.components || [];
    const compNames = compList.slice(0, 8).map((c: any) => c.name || c.type).join(', ');

    const assistantReply = await callLlmForChatReply(message.trim(), {
      screenName: screen.name,
      compCount: compList.length,
      componentsSummary: compNames
    });

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      text: assistantReply,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...(screen.chatHistory || []), userMsg, assistantMsg];
    screen.chatHistory = updatedHistory;

    if (getIsMongoConnected()) {
      try {
        await ScreenModel.updateOne({ id }, { $set: { chatHistory: updatedHistory } });
      } catch {}
    }
    await localScreenStore.update(id, { ...screen, chatHistory: updatedHistory });

    return res.json({
      success: true,
      reply: assistantReply,
      chatHistory: updatedHistory
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to process chat message', details: err.message });
  }
});

