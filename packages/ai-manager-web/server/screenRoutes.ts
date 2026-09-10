import { Router, Response } from 'express';
import { ScreenModel } from './models/index.js';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { JsonStore } from './utils/JsonStore.js';

export interface PenpotComponent {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'text' | 'button' | 'input' | 'card' | 'table' | 'badge' | 'avatar' | 'chart';
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: Array<{ fillOpacity?: number; fillColor?: string }>;
  strokes?: Array<{ strokeColor?: string; strokeWidth?: number }>;
  borderRadius?: number;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  layout?: 'flex' | 'grid' | 'none';
  flexDir?: 'row' | 'column';
  gap?: number;
  padding?: number;
  children?: PenpotComponent[];
  props?: Record<string, any>;
}

export interface PenpotBoard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  components: PenpotComponent[];
}

export interface ScreenLayoutSpec {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  board: PenpotBoard;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
  };
  createdAt: string;
  updatedAt: string;
}

const localScreenStore = new JsonStore<ScreenLayoutSpec>('screens.json');

// Built-in presets for rapid prototyping
export const SCREEN_TEMPLATES: Record<string, Omit<ScreenLayoutSpec, 'id' | 'projectId' | 'userId' | 'createdAt' | 'updatedAt'>> = {
  'saas-dashboard': {
    name: 'Modern SaaS Analytics Dashboard',
    description: 'Enterprise metrics overview with sidebar, 4 KPI cards, chart placeholder, and data table.',
    theme: {
      primaryColor: '#7c3aed',
      backgroundColor: '#090d16',
      surfaceColor: '#131b2e',
      textColor: '#f8fafc',
      accentColor: '#10b981',
      borderRadius: 12
    },
    board: {
      id: 'board-saas-1',
      name: 'Analytics Dashboard (1440 x 900)',
      x: 0,
      y: 0,
      width: 1440,
      height: 900,
      background: '#090d16',
      components: [
        {
          id: 'comp-sidebar',
          name: 'Navigation Sidebar',
          type: 'frame',
          x: 0,
          y: 0,
          width: 260,
          height: 900,
          fills: [{ fillColor: '#0d1322' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          layout: 'flex',
          flexDir: 'column',
          padding: 24,
          gap: 16,
          children: [
            { id: 'logo', name: 'App Logo', type: 'text', text: '⚡ AI Manager', fontSize: 20, fontWeight: 'bold', color: '#7c3aed', x: 24, y: 24, width: 212, height: 32 },
            { id: 'nav-1', name: 'Nav Item Active', type: 'button', text: '📊 Overview', fontSize: 14, color: '#f8fafc', fills: [{ fillColor: '#7c3aed33' }], borderRadius: 8, x: 24, y: 72, width: 212, height: 40 },
            { id: 'nav-2', name: 'Nav Item', type: 'button', text: '🗄️ Database CI/CD', fontSize: 14, color: '#94a3b8', x: 24, y: 120, width: 212, height: 40 },
            { id: 'nav-3', name: 'Nav Item', type: 'button', text: '🌿 Git Visualizer', fontSize: 14, color: '#94a3b8', x: 24, y: 168, width: 212, height: 40 },
            { id: 'nav-4', name: 'Nav Item', type: 'button', text: '🎨 Penpot Specs', fontSize: 14, color: '#94a3b8', x: 24, y: 216, width: 212, height: 40 },
            { id: 'nav-5', name: 'Nav Item', type: 'button', text: '⚙️ Settings', fontSize: 14, color: '#94a3b8', x: 24, y: 264, width: 212, height: 40 }
          ]
        },
        {
          id: 'comp-header',
          name: 'Top Header Bar',
          type: 'frame',
          x: 260,
          y: 0,
          width: 1180,
          height: 72,
          fills: [{ fillColor: '#0d1322' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          layout: 'flex',
          flexDir: 'row',
          padding: 20,
          children: [
            { id: 'page-title', name: 'Dashboard Title', type: 'text', text: 'Platform Overview & Health', fontSize: 18, fontWeight: '600', color: '#f8fafc', x: 20, y: 22, width: 300, height: 28 },
            { id: 'user-badge', name: 'User Profile Pill', type: 'badge', text: 'Enterprise Admin', fontSize: 12, color: '#10b981', fills: [{ fillColor: '#10b98122' }], borderRadius: 99, x: 1020, y: 20, width: 120, height: 32 }
          ]
        },
        { id: 'kpi-1', name: 'Active Projects KPI', type: 'card', text: 'Active Projects\n8 Projects', fontSize: 14, fills: [{ fillColor: '#131b2e' }], borderRadius: 12, strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }], x: 292, y: 104, width: 264, height: 120 },
        { id: 'kpi-2', name: 'Schema Tables KPI', type: 'card', text: 'Database Tables\n64 Tables', fontSize: 14, fills: [{ fillColor: '#131b2e' }], borderRadius: 12, strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }], x: 576, y: 104, width: 264, height: 120 },
        { id: 'kpi-3', name: 'QA Health Score', type: 'card', text: 'QA Health Score\n99.4% Passing', fontSize: 14, fills: [{ fillColor: '#131b2e' }], borderRadius: 12, strokes: [{ strokeColor: '#10b98144', strokeWidth: 1 }], x: 860, y: 104, width: 264, height: 120 },
        { id: 'kpi-4', name: 'AST Functions', type: 'card', text: 'Indexed Functions\n1,420 Symbols', fontSize: 14, fills: [{ fillColor: '#131b2e' }], borderRadius: 12, strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }], x: 1144, y: 104, width: 264, height: 120 },
        {
          id: 'comp-chart',
          name: 'Activity Chart Canvas Frame',
          type: 'chart',
          x: 292,
          y: 248,
          width: 720,
          height: 320,
          fills: [{ fillColor: '#131b2e' }],
          borderRadius: 12,
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          text: '📈 Database Query Throughput (ops/sec)'
        },
        {
          id: 'comp-status-panel',
          name: 'System Status Feed',
          type: 'frame',
          x: 1032,
          y: 248,
          width: 376,
          height: 320,
          fills: [{ fillColor: '#131b2e' }],
          borderRadius: 12,
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          padding: 20,
          children: [
            { id: 'status-title', name: 'Title', type: 'text', text: 'Live Diagnostic Status', fontSize: 16, fontWeight: 'bold', color: '#f8fafc', x: 20, y: 20, width: 200, height: 24 },
            { id: 'status-sub', name: 'Details', type: 'text', text: '🟢 MongoDB Atlas: Connected\n🟢 SQLite Runner: Operational\n🟢 simple-git: Synced', fontSize: 13, color: '#94a3b8', x: 20, y: 62, width: 336, height: 120 }
          ]
        },
        {
          id: 'comp-table',
          name: 'Recent Migrations Table',
          type: 'table',
          x: 292,
          y: 592,
          width: 1116,
          height: 270,
          fills: [{ fillColor: '#131b2e' }],
          borderRadius: 12,
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          text: 'Database Migrations & Branches'
        }
      ]
    }
  },

  'auth-portal': {
    name: 'Enterprise Auth & Login Flow',
    description: 'Split layout hero panel with glassmorphism login card, SSO buttons, and email inputs.',
    theme: {
      primaryColor: '#3b82f6',
      backgroundColor: '#0b0f19',
      surfaceColor: '#111827',
      textColor: '#f9fafb',
      accentColor: '#60a5fa',
      borderRadius: 16
    },
    board: {
      id: 'board-auth-1',
      name: 'Auth Screen (1280 x 800)',
      x: 0,
      y: 0,
      width: 1280,
      height: 800,
      background: '#0b0f19',
      components: [
        {
          id: 'hero-banner',
          name: 'Visual Brand Panel',
          type: 'frame',
          x: 0,
          y: 0,
          width: 580,
          height: 800,
          fills: [{ fillColor: '#1e1b4b' }],
          padding: 48,
          children: [
            { id: 'brand-title', name: 'Hero Title', type: 'text', text: 'AI Manager Platform\nEnterprise Edition', fontSize: 32, fontWeight: 'bold', color: '#ffffff', x: 48, y: 300, width: 480, height: 80 },
            { id: 'brand-sub', name: 'Hero Description', type: 'text', text: 'Automated database CI/CD, schema validation, and multi-branch intelligence for modern engineering teams.', fontSize: 16, color: '#a5b4fc', x: 48, y: 390, width: 480, height: 60 }
          ]
        },
        {
          id: 'login-card',
          name: 'Login Form Container',
          type: 'frame',
          x: 680,
          y: 120,
          width: 480,
          height: 560,
          fills: [{ fillColor: '#111827' }],
          borderRadius: 16,
          strokes: [{ strokeColor: '#374151', strokeWidth: 1 }],
          padding: 40,
          children: [
            { id: 'form-title', name: 'Sign In Heading', type: 'text', text: 'Welcome Back', fontSize: 24, fontWeight: 'bold', color: '#f9fafb', x: 40, y: 40, width: 400, height: 32 },
            { id: 'email-input', name: 'Email Input Field', type: 'input', text: 'name@company.com', fontSize: 14, fills: [{ fillColor: '#1f2937' }], borderRadius: 8, strokes: [{ strokeColor: '#4b5563', strokeWidth: 1 }], x: 40, y: 100, width: 400, height: 48 },
            { id: 'pass-input', name: 'Password Field', type: 'input', text: '••••••••••••', fontSize: 14, fills: [{ fillColor: '#1f2937' }], borderRadius: 8, strokes: [{ strokeColor: '#4b5563', strokeWidth: 1 }], x: 40, y: 168, width: 400, height: 48 },
            { id: 'submit-btn', name: 'Sign In Button', type: 'button', text: 'Sign In to Workspace →', fontSize: 15, fontWeight: 'bold', fills: [{ fillColor: '#3b82f6' }], borderRadius: 8, color: '#ffffff', x: 40, y: 240, width: 400, height: 48 },
            { id: 'sso-btn', name: 'GitHub SSO Button', type: 'button', text: 'Continue with GitHub', fontSize: 14, fills: [{ fillColor: '#1f2937' }], borderRadius: 8, strokes: [{ strokeColor: '#4b5563', strokeWidth: 1 }], color: '#d1d5db', x: 40, y: 304, width: 400, height: 48 }
          ]
        }
      ]
    }
  },

  'kanban-board': {
    name: 'DevOps & Sprint Kanban Board',
    description: '4-column agile board with draggable sprint cards, story point pills, and task assignees.',
    theme: {
      primaryColor: '#06b6d4',
      backgroundColor: '#0f172a',
      surfaceColor: '#1e293b',
      textColor: '#f8fafc',
      accentColor: '#38bdf8',
      borderRadius: 10
    },
    board: {
      id: 'board-kanban-1',
      name: 'Sprint Workflow Board (1400 x 850)',
      x: 0,
      y: 0,
      width: 1400,
      height: 850,
      background: '#0f172a',
      components: [
        {
          id: 'col-1',
          name: 'Backlog Column',
          type: 'frame',
          x: 40,
          y: 40,
          width: 300,
          height: 770,
          fills: [{ fillColor: '#1e293b' }],
          borderRadius: 12,
          padding: 16,
          children: [
            { id: 'col1-title', name: 'Header', type: 'text', text: '📋 Backlog (3)', fontSize: 16, fontWeight: 'bold', color: '#94a3b8', x: 16, y: 16, width: 268, height: 24 },
            { id: 'card-1', name: 'Task Card', type: 'card', text: 'Add Penpot Plugin Exporter\n[Feature] 5 pts', fontSize: 13, fills: [{ fillColor: '#334155' }], borderRadius: 8, x: 16, y: 56, width: 268, height: 80 }
          ]
        },
        {
          id: 'col-2',
          name: 'In Progress Column',
          type: 'frame',
          x: 380,
          y: 40,
          width: 300,
          height: 770,
          fills: [{ fillColor: '#1e293b' }],
          borderRadius: 12,
          padding: 16,
          children: [
            { id: 'col2-title', name: 'Header', type: 'text', text: '⚡ In Progress (2)', fontSize: 16, fontWeight: 'bold', color: '#38bdf8', x: 16, y: 16, width: 268, height: 24 },
            { id: 'card-2', name: 'Task Card', type: 'card', text: 'AST Function Call Graph\n[Engine] 8 pts', fontSize: 13, fills: [{ fillColor: '#334155' }], borderRadius: 8, x: 16, y: 56, width: 268, height: 80 }
          ]
        },
        {
          id: 'col-3',
          name: 'Review Column',
          type: 'frame',
          x: 720,
          y: 40,
          width: 300,
          height: 770,
          fills: [{ fillColor: '#1e293b' }],
          borderRadius: 12,
          padding: 16,
          children: [
            { id: 'col3-title', name: 'Header', type: 'text', text: '🔍 QA Review (1)', fontSize: 16, fontWeight: 'bold', color: '#fbbf24', x: 16, y: 16, width: 268, height: 24 },
            { id: 'card-3', name: 'Task Card', type: 'card', text: 'Merge Conflict Studio 3-Way\n[Complete] 3 pts', fontSize: 13, fills: [{ fillColor: '#334155' }], borderRadius: 8, x: 16, y: 56, width: 268, height: 80 }
          ]
        },
        {
          id: 'col-4',
          name: 'Done Column',
          type: 'frame',
          x: 1060,
          y: 40,
          width: 300,
          height: 770,
          fills: [{ fillColor: '#1e293b' }],
          borderRadius: 12,
          padding: 16,
          children: [
            { id: 'col4-title', name: 'Header', type: 'text', text: '✅ Deployed (5)', fontSize: 16, fontWeight: 'bold', color: '#4ade80', x: 16, y: 16, width: 268, height: 24 },
            { id: 'card-4', name: 'Task Card', type: 'card', text: 'Multi-User Data Isolation\n[Verified] 5 pts', fontSize: 13, fills: [{ fillColor: '#334155' }], borderRadius: 8, x: 16, y: 56, width: 268, height: 80 }
          ]
        }
      ]
    }
  }
};

/**
 * Transforms layout components into official Penpot Plugin JSON Manifest
 */
export function generatePenpotManifest(spec: ScreenLayoutSpec) {
  return {
    schemaVersion: '2.0',
    generator: 'AI-Manager Penpot Layout Spec Bridge',
    exportedAt: new Date().toISOString(),
    name: spec.name,
    description: spec.description,
    theme: spec.theme,
    board: {
      id: spec.board.id,
      name: spec.board.name,
      x: spec.board.x,
      y: spec.board.y,
      width: spec.board.width,
      height: spec.board.height,
      fills: [{ fillColor: spec.board.background, fillOpacity: 1 }],
      shapes: spec.board.components.map(c => mapComponentToPenpotShape(c))
    }
  };
}

function mapComponentToPenpotShape(c: PenpotComponent): any {
  return {
    id: c.id,
    name: c.name,
    type: c.type === 'text' ? 'text' : c.type === 'frame' ? 'frame' : 'rect',
    x: c.x,
    y: c.y,
    width: c.width,
    height: c.height,
    borderRadius: c.borderRadius || 0,
    fills: c.fills || [{ fillColor: '#1e293b', fillOpacity: 1 }],
    strokes: c.strokes || [],
    text: c.text,
    fontSize: c.fontSize,
    fontWeight: c.fontWeight,
    color: c.color,
    layout: c.layout || 'none',
    flexDirection: c.flexDir,
    gap: c.gap,
    padding: c.padding,
    children: c.children ? c.children.map(mapComponentToPenpotShape) : []
  };
}

/**
 * Simple Rule-Based AI Layout Spec Generator
 */
export function generateLayoutFromPrompt(prompt: string, projectName: string = 'Workspace'): ScreenLayoutSpec {
  const p = prompt.toLowerCase();
  const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (p.includes('auth') || p.includes('login') || p.includes('signup') || p.includes('register')) {
    const template = SCREEN_TEMPLATES['auth-portal'];
    return {
      ...template,
      id,
      projectId: 'global',
      userId: 'system',
      name: `Generated: Auth Portal (${prompt.slice(0, 30)}...)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  if (p.includes('kanban') || p.includes('board') || p.includes('scrum') || p.includes('task') || p.includes('jira')) {
    const template = SCREEN_TEMPLATES['kanban-board'];
    return {
      ...template,
      id,
      projectId: 'global',
      userId: 'system',
      name: `Generated: Kanban Workflow (${prompt.slice(0, 30)}...)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // Default to customized SaaS Dashboard
  const template = SCREEN_TEMPLATES['saas-dashboard'];
  return {
    ...template,
    id,
    projectId: 'global',
    userId: 'system',
    name: `Generated: ${prompt.slice(0, 35)}...`,
    description: `Generated Penpot Layout Spec for prompt: "${prompt}"`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const screenRouter = Router();

// GET /api/screens - List all screens for active user
screenRouter.get('/', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { projectId } = req.query;

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

    // If database has none, load from local mirror store
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

    // If still 0 screens for user, seed initial SaaS dashboard
    if (screens.length === 0) {
      const defaultSpec: ScreenLayoutSpec = {
        id: `screen_default_${Date.now()}`,
        projectId: typeof projectId === 'string' ? projectId : 'global',
        userId: user ? user.sub : 'anonymous',
        ...SCREEN_TEMPLATES['saas-dashboard'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        if (getIsMongoConnected()) {
          await ScreenModel.create({
            id: defaultSpec.id,
            projectId: defaultSpec.projectId,
            userId: defaultSpec.userId,
            name: defaultSpec.name,
            description: defaultSpec.description,
            layout: defaultSpec.board,
            components: defaultSpec.board.components
          });
        }
      } catch (err) {
        // Ignored
      }

      await localScreenStore.create(defaultSpec);
      screens = [defaultSpec];
    }

    return res.json({
      success: true,
      screens: screens.map((s: any) => ({
        id: s.id,
        projectId: s.projectId,
        userId: s.userId,
        name: s.name,
        description: s.description || '',
        board: s.layout || s.board,
        theme: s.theme || SCREEN_TEMPLATES['saas-dashboard'].theme,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });
  } catch (err: any) {
    console.error('Error fetching screens:', err);
    return res.status(500).json({ error: 'Failed to fetch layout specs', details: err.message });
  }
});

// GET /api/screens/templates - Get list of available presets
screenRouter.get('/templates', localOrAuth, (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    templates: Object.entries(SCREEN_TEMPLATES).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
      theme: value.theme,
      dimensions: { width: value.board.width, height: value.board.height }
    }))
  });
});

// POST /api/screens/generate - AI Layout Generator from prompt
screenRouter.post('/generate', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { prompt, projectId = 'global' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Valid prompt string is required' });
    }

    const userId = req.user ? req.user.sub : 'anonymous';
    const spec = generateLayoutFromPrompt(prompt);
    spec.userId = userId;
    spec.projectId = projectId;

    // Persist in Atlas & local store
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

    return res.status(201).json({
      success: true,
      screen: spec
    });
  } catch (err: any) {
    console.error('Error generating screen:', err);
    return res.status(500).json({ error: 'Failed to generate layout spec', details: err.message });
  }
});

// GET /api/screens/:id - Get specific layout spec
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

    // Strict multi-user ownership check
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
        theme: screen.theme || SCREEN_TEMPLATES['saas-dashboard'].theme,
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
    const { name, description = '', projectId = 'global', templateKey, board, theme } = req.body;
    const userId = req.user ? req.user.sub : 'anonymous';

    if (!name && !templateKey) {
      return res.status(400).json({ error: 'Screen name or templateKey is required' });
    }

    let initialSpec: Partial<ScreenLayoutSpec>;
    if (templateKey && SCREEN_TEMPLATES[templateKey]) {
      initialSpec = SCREEN_TEMPLATES[templateKey];
    } else {
      initialSpec = {
        name: name || 'Custom Screen',
        description,
        theme: theme || SCREEN_TEMPLATES['saas-dashboard'].theme,
        board: board || {
          id: `board_${Date.now()}`,
          name: name || 'Main Board',
          x: 0,
          y: 0,
          width: 1440,
          height: 900,
          background: '#090d16',
          components: []
        }
      };
    }

    const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullSpec: ScreenLayoutSpec = {
      id,
      projectId,
      userId,
      name: name || initialSpec.name || 'Untitled Spec',
      description: description || initialSpec.description || '',
      board: board || initialSpec.board!,
      theme: theme || initialSpec.theme || SCREEN_TEMPLATES['saas-dashboard'].theme,
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

    return res.status(201).json({
      success: true,
      screen: fullSpec
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

    // Ownership check
    if (user && user.role !== 'admin' && existing.userId && existing.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to update this layout spec' });
    }

    const updatedSpec: ScreenLayoutSpec = {
      id,
      projectId: existing.projectId || 'global',
      userId: existing.userId || (user ? user.sub : 'anonymous'),
      name: name !== undefined ? name : existing.name,
      description: description !== undefined ? description : (existing.description || ''),
      board: board !== undefined ? board : (existing.layout || existing.board),
      theme: theme !== undefined ? theme : (existing.theme || SCREEN_TEMPLATES['saas-dashboard'].theme),
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
    } catch (err) {}

    await localScreenStore.update(id, updatedSpec);

    return res.json({
      success: true,
      screen: updatedSpec
    });
  } catch (err: any) {
    console.error('Error updating screen:', err);
    return res.status(500).json({ error: 'Failed to update screen', details: err.message });
  }
});

// DELETE /api/screens/:id - Delete screen
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

    // Ownership check
    if (user && user.role !== 'admin' && existing.userId && existing.userId !== user.sub) {
      return res.status(403).json({ error: 'Forbidden: Access denied to delete this layout spec' });
    }

    if (getIsMongoConnected()) {
      await ScreenModel.deleteOne({ id });
    }
    await localScreenStore.delete(id);

    return res.json({
      success: true,
      message: `Screen ${id} deleted successfully`
    });
  } catch (err: any) {
    console.error('Error deleting screen:', err);
    return res.status(500).json({ error: 'Failed to delete screen', details: err.message });
  }
});

// GET /api/screens/:id/export - Export to official Penpot Plugin JSON manifest
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

    // Ownership check
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
      theme: screen.theme || SCREEN_TEMPLATES['saas-dashboard'].theme,
      createdAt: screen.createdAt,
      updatedAt: screen.updatedAt
    };

    const manifest = generatePenpotManifest(fullSpec);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${screen.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.penpot.json"`);

    return res.json(manifest);
  } catch (err: any) {
    console.error('Error exporting screen to Penpot:', err);
    return res.status(500).json({ error: 'Failed to export screen', details: err.message });
  }
});
