import { Router, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ScreenModel } from './models/index.js';
import { localOrAuth, AuthRequest, getIsMongoConnected } from './auth.js';
import { JsonStore } from './utils/JsonStore.js';
import { loadDecryptedCredentials } from './settingsRoutes.js';
import { AppLogger } from './utils/logger.js';
import { exportScreenToFigBuffer } from './figExporter.js';

export interface SemanticProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'elevated' | 'glassmorphic' | 'success' | 'warning' | 'info' | 'neutral' | string;
  size?: 'sm' | 'md' | 'lg';
  inputType?: 'text' | 'email' | 'password' | 'search' | 'number';
  chartType?: 'line' | 'bar' | 'donut' | 'waveform';
  scaleToken?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  weightToken?: 'regular' | 'medium' | 'semiBold' | 'bold';
  colorToken?: 'primary' | 'secondary' | 'muted' | 'accent' | 'danger';
  radiusToken?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  spacingToken?: number;
  states?: {
    default?: Record<string, any>;
    hover?: Record<string, any>;
    focus?: Record<string, any>;
    active?: Record<string, any>;
    disabled?: Record<string, any>;
  };
  meta?: Record<string, any>;
}

export interface DesignSystemTokens {
  id: string;
  projectId: string;
  name: string;
  themeName: 'violet' | 'emerald' | 'azure' | 'minimal-light' | string;
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    danger: string;
    warning: string;
    success: string;
  };
  typography: {
    fontFamily: string;
    scale: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      '2xl': number;
      '3xl': number;
    };
    weights: {
      regular: string;
      medium: string;
      semiBold: string;
      bold: string;
    };
    lineHeights: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    scale: Record<string, number>;
    baseGrid: number;
  };
  radii: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    full: number;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
}

export interface AstPropertyDiff {
  componentId: string;
  componentName: string;
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
}

export interface LayoutComponent {
  id: string;
  name: string;
  type: 'frame' | 'rect' | 'circle' | 'text' | 'button' | 'input' | 'card' | 'table' | 'badge' | 'avatar' | 'chart' | 'navbar' | 'sidebar';
  semantic?: SemanticProps;
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
  children?: LayoutComponent[];
  props?: Record<string, any>;
}

export interface LayoutBoard {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  background: string;
  components: LayoutComponent[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  stepsCount?: number;
  changesSummary?: string;
  metadata?: {
    mode?: string;
    intent?: string;
    theme?: string;
    dimensions?: { width: number; height: number };
  };
}

export interface ScreenLayoutSpec {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  board: LayoutBoard;
  theme: {
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor: string;
    borderRadius: number;
  };
  designTokens?: DesignSystemTokens;
  chatHistory?: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

const localScreenStore = new JsonStore<ScreenLayoutSpec>('screens.json');
export const designTokensStore = new JsonStore<DesignSystemTokens>('design_tokens.json');

export function getDefaultDesignTokens(themeName: string = 'violet', projectId: string = 'global'): DesignSystemTokens {
  const isLight = themeName === 'light' || themeName === 'minimal-light';
  const isEmerald = themeName === 'emerald';
  const isAzure = themeName === 'azure' || themeName === 'blue';

  let primary = '#7c3aed';
  let primaryHover = '#6d28d9';
  let secondary = '#3b82f6';
  let accent = '#10b981';

  if (isEmerald) {
    primary = '#10b981';
    primaryHover = '#059669';
    secondary = '#06b6d4';
    accent = '#8b5cf6';
  } else if (isAzure) {
    primary = '#2563eb';
    primaryHover = '#1d4ed8';
    secondary = '#0284c7';
    accent = '#f59e0b';
  }

  return {
    id: `tokens_${projectId}_${themeName}`,
    projectId,
    name: `${themeName.charAt(0).toUpperCase() + themeName.slice(1)} Design System`,
    themeName,
    colors: {
      primary,
      primaryHover,
      secondary,
      accent,
      background: isLight ? '#f8fafc' : '#090d16',
      surface: isLight ? '#ffffff' : '#131b2e',
      surfaceHover: isLight ? '#f1f5f9' : '#1e293b',
      border: isLight ? '#e2e8f0' : '#1e293b',
      textPrimary: isLight ? '#0f172a' : '#f8fafc',
      textSecondary: isLight ? '#475569' : '#94a3b8',
      textMuted: isLight ? '#94a3b8' : '#64748b',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981'
    },
    typography: {
      fontFamily: "'Inter', -apple-system, sans-serif",
      scale: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 18,
        xl: 22,
        '2xl': 28,
        '3xl': 36
      },
      weights: {
        regular: '400',
        medium: '500',
        semiBold: '600',
        bold: '700'
      },
      lineHeights: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.75
      }
    },
    spacing: {
      scale: {
        0: 0,
        1: 4,
        2: 8,
        3: 12,
        4: 16,
        5: 20,
        6: 24,
        8: 32,
        10: 40,
        12: 48,
        16: 64
      },
      baseGrid: 4
    },
    radii: {
      none: 0,
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 24,
      full: 9999
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
      glow: `0 0 20px ${primary}44`
    }
  };
}

export const DEFAULT_SCREEN_THEME = {
  primaryColor: '#7c3aed',
  backgroundColor: '#090d16',
  surfaceColor: '#131b2e',
  textColor: '#f8fafc',
  accentColor: '#10b981',
  borderRadius: 12
};

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
 * Clean slug generator for workspace filenames
 */
export function getScreenSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'untitled_screen';
}

/**
 * Synchronizes screen specification directly to project root ui/ directory
 */
export function syncScreenToDisk(spec: ScreenLayoutSpec): string {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'ui');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const slug = getScreenSlug(spec.name);
    const filePath = path.join(targetDir, `${slug}.json`);
    fs.writeFileSync(filePath, JSON.stringify(spec, null, 2), 'utf-8');

    // Also synchronously write native .fig file to ui/<slug>.fig via OpenPencil engine
    exportScreenToFigBuffer(spec).then(figBytes => {
      const figPath = path.join(targetDir, `${slug}.fig`);
      fs.writeFileSync(figPath, Buffer.from(figBytes));
    }).catch(err => console.error('[Screens] Error syncing .fig file:', err));

    return `ui/${slug}.fig`;
  } catch (e) {
    console.error('[Screens] Disk sync error:', e);
    return `ui/${getScreenSlug(spec.name)}.fig`;
  }
}

/**
 * Saves an automated backup snapshot before modifications or overwrites
 */
export function saveScreenBackup(spec: ScreenLayoutSpec): string | null {
  try {
    const rootDir = getWorkspaceRootDir();
    let backupDir = path.join(rootDir, 'packages', 'ai-manager-web', '.ai-manager', 'backups');
    if (!fs.existsSync(path.join(rootDir, 'packages'))) {
      backupDir = path.join(rootDir, '.ai-manager', 'backups');
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const slug = getScreenSlug(spec.name || 'screen');
    const backupPath = path.join(backupDir, `${spec.id}_${slug}_${timestamp}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(spec, null, 2), 'utf-8');
    return backupPath;
  } catch (e) {
    console.error('[Screens] Failed to create backup snapshot:', e);
    return null;
  }
}

/**
 * Removes deleted or renamed screen file from disk
 */
export function deleteScreenFromDisk(name: string) {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'ui');
    const slug = getScreenSlug(name);
    const figPath = path.join(targetDir, `${slug}.fig`);
    const jsonPath = path.join(targetDir, `${slug}.json`);
    const legacyPath = path.join(targetDir, `${slug}.penpot.json`);
    if (fs.existsSync(figPath)) fs.unlinkSync(figPath);
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    if (fs.existsSync(legacyPath)) fs.unlinkSync(legacyPath);
  } catch (e) {
    console.error('[Screens] Disk delete error:', e);
  }
}

export const SCREEN_TEMPLATES: Record<string, any> = {};

/**
 * Dynamic AI Layout Spec Generator from user prompt (Zero Hardcoded Templates)
 */
export async function generateLayoutFromPrompt(prompt: string, _projectName: string = 'Workspace'): Promise<ScreenLayoutSpec> {
  const result = await synthesizeStitchLayout({
    prompt,
    mode: 'create',
    baseComponents: [],
    boardWidth: 1440,
    boardHeight: 900,
    isDark: true
  });
  const id = `screen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    projectId: 'global',
    userId: 'system',
    name: result.title,
    description: result.description,
    board: {
      id: `board_${Date.now()}`,
      name: `${result.title} Artboard`,
      x: 0,
      y: 0,
      width: result.boardWidth || 1440,
      height: result.boardHeight || 900,
      background: result.theme.backgroundColor,
      components: result.components
    },
    theme: result.theme,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const screenRouter = Router();

export async function syncDiskScreensToStore(projectId: string = 'acme-api', userId: string = 'usr_admin_default'): Promise<void> {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'ui');
    if (!fs.existsSync(targetDir)) return;

    const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.json') && !f.endsWith('.penpot.json') || f.endsWith('.penpot.json'));
    const existingList = await localScreenStore.getAll();
    const existingSlugs = new Set(existingList.map((s) => getScreenSlug(s.name)));

    for (const filename of files) {
      const slug = filename.replace(/\.penpot\.json$/, '').replace(/\.json$/, '');
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
      const boardData = parsed.board || {
        id: `board_${slug}`,
        name: `${name} Board`,
        x: 0,
        y: 0,
        width: 1440,
        height: 900,
        background: '#090d16',
        components: []
      };

      const newSpec: ScreenLayoutSpec = {
        id: `screen_disk_${slug}`,
        projectId,
        userId,
        name,
        description: parsed.description || 'Auto-indexed from ui/ workspace folder',
        board: {
          id: boardData.id || `board_${slug}`,
          name: boardData.name || `${name} Board`,
          x: boardData.x || 0,
          y: boardData.y || 0,
          width: boardData.width || 1440,
          height: boardData.height || 900,
          background: boardData.background || (boardData.fills?.[0]?.fillColor) || '#090d16',
          components: boardData.components || boardData.shapes || []
        },
        theme: parsed.theme || DEFAULT_SCREEN_THEME,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (getIsMongoConnected()) {
        try {
          await ScreenModel.create({
            id: newSpec.id,
            projectId: newSpec.projectId,
            userId: newSpec.userId,
            name: newSpec.name,
            description: newSpec.description,
            layout: newSpec.board,
            components: newSpec.board.components
          });
        } catch {}
      }
      await localScreenStore.create(newSpec);
      existingSlugs.add(slug);
    }
  } catch (err: any) {
    console.error('[Screens] Disk auto-index error:', err.message);
  }
}

// GET /api/screens - List all screens for active user
screenRouter.get('/', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { projectId } = req.query;
    const targetProjId = typeof projectId === 'string' ? projectId : 'acme-api';
    const targetUserId = user?.sub || 'usr_admin_default';

    // Auto-discover any .penpot.json layout specs in ui/ directory on disk
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
  // A. Color/Theme Mutation
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

  // B. Border Radius & Pill Mutation
  if (p.includes('round') || p.includes('pill') || p.includes('corner') || p.includes('radius')) {
    const isPill = p.includes('pill') || p.includes('full');
    const radiusVal = isPill ? tokens.radii.full : tokens.radii.lg;
    const radiusToken = isPill ? 'full' : 'lg';

    mutateMatching((c) => {
      const oldRadius = c.borderRadius ?? 0;
      if (oldRadius !== radiusVal) {
        c.borderRadius = radiusVal;
        c.semantic = { ...(c.semantic || {}), radiusToken: radiusToken as any };
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'borderRadius',
          oldValue: oldRadius,
          newValue: radiusVal,
          description: `Set border radius to ${radiusVal}px (${radiusToken}) on ${c.name}`
        });
      }
    });
  }

  // C. Glassmorphism / Glow Mutation
  if (p.includes('glass') || p.includes('glow') || p.includes('blur') || p.includes('frosted')) {
    mutateMatching((c) => {
      const oldFills = JSON.parse(JSON.stringify(c.fills || []));
      c.fills = [{ fillColor: '#1e293bcc', color: '#1e293bcc' } as any];
      c.strokes = [{ strokeColor: tokens.colors.primary, strokeWidth: 1.5 }];
      c.borderRadius = Math.max(tokens.radii.lg, c.borderRadius || tokens.radii.md);
      c.semantic = { ...(c.semantic || {}), variant: 'glassmorphic' };

      if (JSON.stringify(oldFills) !== JSON.stringify(c.fills)) {
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'fills',
          oldValue: oldFills,
          newValue: c.fills,
          description: `Applied glassmorphic fill and ${tokens.colors.primary} glow to ${c.name}`
        });
      }
    });
  }

  // D. Typography Scale Mutation
  if (p.includes('font') || p.includes('size') || p.includes('larger') || p.includes('bold') || p.includes('text')) {
    mutateMatching((c) => {
      const oldFont = c.fontSize;
      if (c.fontSize) c.fontSize = Math.min(tokens.typography.scale['3xl'], Math.round(c.fontSize * 1.3));
      c.fontWeight = tokens.typography.weights.bold;
      c.semantic = { ...(c.semantic || {}), weightToken: 'bold' };

      if (oldFont !== c.fontSize) {
        astDiffs.push({
          componentId: c.id,
          componentName: c.name,
          field: 'fontSize',
          oldValue: oldFont,
          newValue: c.fontSize,
          description: `Scaled typography on ${c.name} to ${c.fontSize}px`
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

// GET /api/screens/design-tokens - Get active design tokens for project
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

// PUT /api/screens/design-tokens - Update design tokens for project
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

// POST /api/screens/modify-element — Atomic Targeted Property Diff Engine
screenRouter.post('/modify-element', localOrAuth, async (req: AuthRequest, res: Response) => {
  const logger = AppLogger.createRequestLogger(req.headers['x-request-id'] as string, '/api/screens/modify-element');
  try {
    const { screenId, selectedCompIds = [], propertyUpdates, semanticUpdates, prompt } = req.body;
    logger.logStep('INCOMING_REQUEST', `Modify Element Request | ScreenId: ${screenId || 'none'} | Targets: [${selectedCompIds.join(', ')}] | Prompt: "${prompt || ''}"`, {
      screenId,
      selectedCompIds,
      propertyUpdates,
      semanticUpdates,
      prompt
    });

    if (!screenId) {
      logger.logResponse(400, 'screenId is required');
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
      logger.logResponse(404, `Screen ${screenId} not found`);
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

    logger.logStep('AST_DIFF_MUTATION', `Calculated ${astDiffs.length} property diff(s)`, {
      astDiffs,
      changesSummary
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

    logger.logResponse(200, `Successfully applied ${astDiffs.length} AST diff(s)`);
    return res.status(200).json({
      success: true,
      mode: 'modify',
      screen: updatedSpec,
      astDiffs,
      changesSummary
    });
  } catch (err: any) {
    logger.logError('MODIFY_ELEMENT', err);
    logger.logResponse(500, 'Failed to modify element', { error: err.message });
    return res.status(500).json({ error: 'Failed to modify element', details: err.message });
  }
});

// GET /api/screens/templates - Get list of available presets (Zero pre-baked templates)
screenRouter.get('/templates', localOrAuth, (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    templates: []
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
    const spec = await generateLayoutFromPrompt(prompt);
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
        theme: theme || DEFAULT_SCREEN_THEME,
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
      theme: theme || initialSpec.theme || DEFAULT_SCREEN_THEME,
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

    // Ownership check
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
    } catch (err) {}

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

// GET /api/screens/:id/export - Export to native Figma .fig or JSON spec
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

    // Default: native .fig binary export via OpenPencil engine
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

// GET /api/screens/project-root/files - List all .fig and .json files in workspace ui/ folder
screenRouter.get('/project-root/files', localOrAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const uiDir = path.resolve(process.cwd(), '../../ui');
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

// POST /api/screens/project-root/open - Read and open a file from workspace ui/ folder
screenRouter.post('/project-root/open', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }
    // Prevent path traversal
    const safeName = path.basename(filename);
    const uiDir = path.resolve(process.cwd(), '../../ui');
    const filePath = path.join(uiDir, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `File ui/${safeName} not found` });
    }

    if (safeName.endsWith('.json')) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ success: true, format: 'json', name: safeName.replace(/\.json$/i, ''), data });
    }

    // Binary .fig file read
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

// POST /api/screens/project-root/save - Save screen directly to workspace ui/ folder as .fig and .json
screenRouter.post('/project-root/save', localOrAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, board, theme, description = '' } = req.body;
    if (!name || !board) {
      return res.status(400).json({ error: 'Name and board layout are required' });
    }
    const slug = getScreenSlug(name);
    const uiDir = path.resolve(process.cwd(), '../../ui');
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

    // 1. Write JSON spec
    const jsonPath = path.join(uiDir, `${slug}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(fullSpec, null, 2), 'utf-8');

    // 2. Generate and write native binary .fig
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

// POST /api/screens/generate-stitch — Stitch-Grade AI Screen Generator & Modifier
// --------------------------------------------------------------------------
screenRouter.post('/generate-stitch', localOrAuth, async (req: AuthRequest, res: Response) => {
  const logger = AppLogger.createRequestLogger(req.headers['x-request-id'] as string, '/api/screens/generate-stitch');
  try {
    const {
      prompt,
      mode = 'create', // 'create' | 'modify'
      screenId,
      existingBoard,
      selectedCompIds = [],
      selectedScreenIds = [],
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
      selectedCompIdsCount: Array.isArray(selectedCompIds) ? selectedCompIds.length : 0,
      selectedScreenIdsCount: Array.isArray(selectedScreenIds) ? selectedScreenIds.length : 0
    });

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      logger.logResponse(400, 'Prompt string is required');
      return res.status(400).json({ error: 'A natural language prompt is required.' });
    }

    const userId = req.user ? req.user.sub : 'anonymous';
    const isDark = requestedTheme !== 'light';

    // -----------------------------------------------------------------------
    // INTENT DETECTION GATE: Distinguish GENERATE vs MODIFY vs DISCUSS
    // -----------------------------------------------------------------------
    const hasExplicitSelection = Array.isArray(selectedCompIds) && selectedCompIds.length > 0;
    const isExplicitRedesign = /\b(redesign from scratch|start over|clear and replace|wipe canvas|brand new screen|completely new screen)\b/i.test(prompt);
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

    if (rawIntent === 'DISCUSS') {
      intent = 'DISCUSS';
    } else if (mode === 'create') {
      intent = 'GENERATE';
      effectiveMode = 'create';
    } else if (mode === 'modify' || hasExplicitSelection) {
      intent = 'MODIFY';
      effectiveMode = 'modify';
    } else if (screenId && hasExistingComponents && !isExplicitRedesign) {
      intent = 'MODIFY';
      effectiveMode = 'modify';
    } else {
      intent = 'GENERATE';
      effectiveMode = 'create';
    }

    logger.logStep('INTENT_DECISION', `Classified Intent: ${intent} (mode: ${effectiveMode}) for prompt: "${prompt}"`, {
      prompt,
      rawIntent,
      intent,
      mode: effectiveMode,
      screenId: screenId || 'none',
      hasExplicitSelection,
      hasExistingComponents,
      isExplicitRedesign
    });

    // Save automated pre-mutation backup snapshot before modifying an existing screen
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

      logger.logStep('DISCUSS_REPLY', `Conversational AI Reply: "${conversationalReply}"`, {
        reply: conversationalReply,
        screenName: currentScreenSpec?.name || 'Active Canvas'
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

      const targetScreen = currentScreenSpec
        ? {
            ...currentScreenSpec,
            board: {
              ...(currentScreenSpec.board || (currentScreenSpec as any).layout),
              components: currentScreenSpec.board?.components || (currentScreenSpec as any).layout?.components || existingBoard?.components || []
            }
          }
        : (existingBoard
          ? {
              id: screenId || `screen_discuss_${Date.now()}`,
              projectId,
              userId,
              name: 'Discussion',
              description: 'Design consultation',
              board: existingBoard,
              theme: DEFAULT_SCREEN_THEME,
              chatHistory: updatedChatHistory,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          : {
              id: screenId || `screen_discuss_${Date.now()}`,
              projectId,
              userId,
              name: 'Design Discussion',
              description: 'Conversational design consultation',
              board: {
                id: `board_discuss_${Date.now()}`,
                name: 'Discussion Canvas',
                x: 0,
                y: 0,
                width: 1440,
                height: 900,
                background: isDark ? '#090d16' : '#f8fafc',
                components: []
              },
              theme: DEFAULT_SCREEN_THEME,
              chatHistory: updatedChatHistory,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });

      logger.logResponse(200, 'DISCUSS intent processed successfully');
      return res.status(200).json({
        success: true,
        intent: 'DISCUSS',
        mode: 'discuss',
        reply: conversationalReply,
        assistantExplanation: conversationalReply,
        changesSummary: 'Conversational response (canvas unchanged)',
        screen: targetScreen,
        chatHistory: updatedChatHistory,
        generationSteps: []
      });
    }

    // Support batch multi-screen AI modification
    if (mode === 'modify' && Array.isArray(selectedScreenIds) && selectedScreenIds.length > 1) {
      const modifiedScreens: ScreenLayoutSpec[] = [];
      for (const sId of selectedScreenIds) {
        let existing: any = null;
        if (getIsMongoConnected()) {
          existing = await ScreenModel.findOne({ id: sId }).lean();
        }
        if (!existing) {
          existing = await localScreenStore.getById(sId);
        }
        if (existing) {
          const board = existing.layout || existing.board;
          const { components, theme, changesSummary } = await synthesizeStitchLayout({
            prompt: prompt.trim(),
            mode: 'modify',
            baseComponents: JSON.parse(JSON.stringify(board.components || [])),
            boardWidth: board.width || 1440,
            boardHeight: board.height || 900,
            isDark,
            category,
            existingName: existing.name,
            selectedCompIds: []
          });

          const updated: ScreenLayoutSpec = {
            id: sId,
            projectId,
            userId,
            name: existing.name,
            description: existing.description || '',
            theme,
            board: {
              ...board,
              background: theme.backgroundColor,
              components
            },
            createdAt: existing.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          if (getIsMongoConnected()) {
            try {
              await ScreenModel.updateOne({ id: sId }, { $set: { layout: updated.board, components: updated.board.components, updatedAt: updated.updatedAt } });
            } catch {}
          }
          await localScreenStore.update(sId, updated);
          syncScreenToDisk(updated);
          modifiedScreens.push(updated);
        }
      }

      return res.json({
        success: true,
        mode: 'modify',
        screen: modifiedScreens[0],
        screens: modifiedScreens,
        changesSummary: `Modified ${modifiedScreens.length} screens simultaneously with AI: "${prompt}"`
      });
    }

    // 1. Prepare base or existing layout
    let baseComponents: LayoutComponent[] = [];
    let boardWidth = 1440;
    let boardHeight = 900;
    let screenName = '';
    let screenDesc = '';
    let existingChatHistory: ChatMessage[] = [];

    const pLower = prompt.toLowerCase();
    const isMobilePrompt = pLower.includes('mobile') || pLower.includes('phone') || pLower.includes('ios') || pLower.includes('android');
    const isLandscapePrompt = pLower.includes('landscape') || pLower.includes('game') || pLower.includes('map') || pLower.includes('militia') || pLower.includes('2d');
    if (effectiveMode === 'create') {
      if (isMobilePrompt && isLandscapePrompt) {
        boardWidth = 844;
        boardHeight = 390;
      } else if (isMobilePrompt) {
        boardWidth = 390;
        boardHeight = 844;
      }
    }

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
        screenDesc = existing.description || '';
        existingChatHistory = Array.isArray(existing.chatHistory) ? existing.chatHistory : [];
      } else if (existingBoard) {
        baseComponents = JSON.parse(JSON.stringify(existingBoard.components || []));
        boardWidth = existingBoard.width || 1440;
        boardHeight = existingBoard.height || 900;
      }
    } else if (existingBoard) {
      baseComponents = JSON.parse(JSON.stringify(existingBoard.components || []));
      boardWidth = existingBoard.width || 1440;
      boardHeight = existingBoard.height || 900;
    }

    // 2. Synthesize layout via AI or fallback engine
    const {
      components,
      title,
      description,
      theme,
      steps,
      changesSummary,
      boardWidth: customW,
      boardHeight: customH,
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

    const finalBoardWidth = customW || boardWidth;
    const finalBoardHeight = customH || boardHeight;

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
        theme: isDark ? 'dark' : 'light',
        dimensions: { width: finalBoardWidth, height: finalBoardHeight }
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
        width: finalBoardWidth,
        height: finalBoardHeight,
        background: theme.backgroundColor,
        components
      },
      chatHistory: [...existingChatHistory, userMsg, assistantMsg],
      createdAt: (currentScreenSpec?.createdAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Persist spec
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
    logger.logStep('AST_SYNTHESIS_COMPLETE', `Generated screen "${fullSpec.name}" with ${components.length} components (${steps.length} placement steps)`, {
      screenId: fullSpec.id,
      name: fullSpec.name,
      componentsCount: components.length,
      stepsCount: steps.length
    });
    logger.logResponse(201, `Screen "${fullSpec.name}" synthesized with ${components.length} components`);

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
    logger.logResponse(500, 'Failed to generate screen spec', { error: err.message });
    return res.status(500).json({ error: 'Failed to generate screen spec', details: err.message });
  }
});

// POST /api/screens/:id/chat - Pure conversational AI chat query or follow-up
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

/**
 * Detects whether user prompt is a generation request (GENERATE) or a discussion/question (DISCUSS)
 */
export async function detectIntent(prompt: string, hasSelection: boolean = false): Promise<'GENERATE' | 'DISCUSS'> {
  const p = prompt.trim().toLowerCase();

  // 1. Definite Greetings & Conversational Chit-Chat (e.g. "hey", "hey you there", "hello there", "hi stitch") -> DISCUSS
  const greetingsRegex = /^(hey|hello|hi|hiya|howdy|greetings|hola|sup|yo|good\s+(morning|afternoon|evening|day)|thanks|thank\s+you|thx|bye|goodbye|cya)(\s+(there|you\s+there|you|mate|friend|stitch|ai|assistant|how\s+are\s+you|are\s+you\s+there|what'?s\s+up|wassup))?[\s!.,?]*$/i;
  if (greetingsRegex.test(p)) {
    return 'DISCUSS';
  }

  // Conversational presence inquiries -> DISCUSS
  const conversationalInquiryRegex = /^(are\s+you\s+there|who\s+are\s+you|what\s+can\s+you\s+do|help|how\s+are\s+you)\b[\s!.,?]*$/i;
  if (conversationalInquiryRegex.test(p)) {
    return 'DISCUSS';
  }

  // 2. Definite Questions, Feedback Inquiry, or Explanations -> DISCUSS
  const questionInquiryRegex = /^(what\s+do\s+you\s+think|what\s+are\s+your\s+thoughts|why\s+is|why\s+are|why\s+did|how\s+does|how\s+do|how\s+can\s+i|can\s+you\s+explain|what\s+is|what\s+are|tell\s+me\s+about|do\s+you\s+like|can\s+we\s+discuss|can\s+we\s+improve|give\s+me\s+feedback|critique|review\s+this|what\s+would\s+happen|is\s+it\s+better|should\s+i\s+use|why\b)/i;
  if (questionInquiryRegex.test(p)) {
    const explicitGenFollowup = /(please\s+(generate|create|build|make)|go\s+ahead\s+and\s+(generate|create|build|make))/i;
    if (!explicitGenFollowup.test(p)) {
      return 'DISCUSS';
    }
  }

  // 3. Definite Generation Verbs + UI Nouns -> GENERATE
  const strongGenRegex = /^(create|make|generate|design|build|add|insert|append|place|draw|construct|style|transform|convert|render|turn\s+into|give\s+me\s+a)\b/i;
  const uiNounRegex = /\b(screen|page|layout|diagram|flow|board|wireframe|dashboard|modal|form|navbar|sidebar|header|table|grid|card|button|input|hero|footer|login|signup|register|auth|checkout|cart|settings|profile|view|ui|components?|elements?|section|architecture|pipeline|microservices?|infrastructure|system)\b/i;

  if (strongGenRegex.test(p) && uiNounRegex.test(p)) {
    return 'GENERATE';
  }

  // Quick Direct UI / Diagram categories (e.g., "login screen", "crypto dashboard", "ecommerce store", "microservices architecture")
  const directNounGenRegex = /^(login|signup|register|auth|onboarding|dashboard|landing\s+page|ecommerce|e-commerce|checkout|crm|admin\s+portal|settings\s+page|pricing\s+table|kanban|chat\s+app|music\s+player|analytics\s+view|modern\s+saas|high-throughput|microservices|architecture|serverless|pipeline|database\s+schema|er\s+diagram)\b/i;
  if (directNounGenRegex.test(p)) {
    return 'GENERATE';
  }

  // If prompt explicitly names an architecture or system without inquiry words
  if (/\b(architecture|microservices|serverless|kafka|redis|postgresql|payment\s+gateway|telemetry\s+pipeline)\b/i.test(p)) {
    if (!/^(what|why|how|can\s+you\s+explain|tell\s+me|review|critique)\b/i.test(p)) {
      return 'GENERATE';
    }
  }

  // If in targeted edit mode (e.g. selection active) with styling verbs
  if (hasSelection && /\b(color|round|glow|glass|pill|font|size|larger|smaller|move|delete|remove|align)\b/i.test(p)) {
    return 'GENERATE';
  }

  // 4. Ambiguous -> Call Fast Lightweight Classification LLM (low tokens, single word reply)
  return await callLlmForIntentClassification(prompt);
}

/**
 * Lightweight classification LLM call for ambiguous queries (GENERATE vs DISCUSS)
 */
export async function callLlmForIntentClassification(prompt: string): Promise<'GENERATE' | 'DISCUSS'> {
  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;

  const hasCreationKeyword = /\b(make|create|add|build|design|draw|generate|render|insert|modify|change|turn|convert)\b/i.test(prompt);

  if (!groqKey && !openaiKey) {
    return hasCreationKeyword ? 'GENERATE' : 'DISCUSS';
  }

  const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini']
    : ['gpt-4o-mini', 'gpt-3.5-turbo'];

  for (const model of models) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'Classify the user message for a UI design studio as either GENERATE or DISCUSS. Output only the single word GENERATE (if user wants to create/modify/render UI or diagrams) or DISCUSS (if asking questions, greeting, or seeking advice/critique).'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0,
          max_tokens: 10
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const text = (data.choices?.[0]?.message?.content || '').trim().toUpperCase();
        if (text.includes('DISCUSS')) return 'DISCUSS';
        if (text.includes('GENERATE')) return 'GENERATE';
      }
    } catch {}
  }
  return hasCreationKeyword ? 'GENERATE' : 'DISCUSS';
}

/**
 * Intelligent Conversational Chat Reply for DISCUSS intent
 */
export async function callLlmForChatReply(
  prompt: string,
  context?: {
    screenName?: string;
    compCount?: number;
    componentsSummary?: string;
  }
): Promise<string> {
  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    if (/^(hey|hello|hi)\b/i.test(prompt)) {
      return "Hello! I'm your Stitch AI design assistant. How can I help you refine or design your screens today?";
    }
    return `Regarding "${prompt}": I am here to help you review, refine, or design your layouts. Let me know if you'd like me to generate or modify any components!`;
  }

  const endpoint = groqKey ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'groq/compound-mini']
    : ['gpt-4o-mini', 'gpt-3.5-turbo'];

  const contextStr = context?.screenName
    ? `Current active screen: "${context.screenName}" with ${context.compCount || 0} components.${context.componentsSummary ? ` Elements present: ${context.componentsSummary}` : ''}`
    : 'No active screen selected on canvas.';

  for (const model of models) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are Stitch AI, a world-class UI/UX design assistant and architecture expert.
The user is in a visual design studio discussing their UI / diagrams.
${contextStr}
Provide a helpful, thoughtful, concise conversational reply (2-4 sentences max). Offer constructive UI/UX suggestions, answer questions directly, or warmly greet the user. Do NOT output raw JSON or code unless asked.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      });

      if (res.ok) {
        const data: any = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) return content;
      } else {
        const errText = await res.text();
        console.warn(`[Stitch AI Chat] Model "${model}" failed with HTTP ${res.status}: ${errText.substring(0, 150)}`);
      }
    } catch (err: any) {
      console.warn(`[Stitch AI Chat] Network error on model "${model}":`, err.message);
    }
  }

  return `I'm here to help with your UI design. What specific changes or ideas would you like to explore?`;
}

/**
 * Calls User's Configured LLM (Groq / OpenAI) to generate arbitrary, customized AST trees
 */
async function callLlmForScreenAst(
  prompt: string,
  mode: string,
  existingComponents: LayoutComponent[],
  isDark: boolean,
  selectedCompIds: string[] = []
): Promise<any | null> {
  const creds = loadDecryptedCredentials();
  const groqKey = creds.groq || process.env.GROQ_API_KEY;
  const openaiKey = creds.openai || process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    throw new Error('No AI API key found. Please configure your Groq or OpenAI API key in /settings. Zero prebuilt templates are allowed.');
  }

  const endpoint = groqKey
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const apiKey = groqKey || openaiKey;
  const models = groqKey
    ? ['groq/compound-mini', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b', 'openai/gpt-oss-120b']
    : ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];

  const isTargetedEdit = mode === 'modify' && selectedCompIds.length > 0;
  const targetedNodes = isTargetedEdit
    ? existingComponents.filter(c => selectedCompIds.includes(c.id))
    : existingComponents;

  const systemPrompt = `You are an elite vector design AI engine synthesizing Figma/OpenPencil SceneGraph layouts from user prompts.
Given a user prompt and design context, generate a complete, custom UI layout from scratch strictly conforming to the prompt instructions.

Do NOT use generic boilerplate if the user asks for specific structures. Follow the user's explicit quantities, layouts, dimensions, hierarchies, and themes.

Output a valid JSON object strictly matching this schema:
{
  "title": "Concise Descriptive Title",
  "description": "Short explanation of the generated design",
  "theme": {
    "primaryColor": "#hex",
    "backgroundColor": "#hex",
    "surfaceColor": "#hex",
    "textColor": "#hex",
    "accentColor": "#hex",
    "borderRadius": number
  },
  "boardWidth": 1440,
  "boardHeight": 900,
  "components": [
    {
      "id": "unique_string_id",
      "name": "Descriptive Name",
      "type": "frame",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "fills": [{ "fillColor": "#hex", "opacity": 1 }],
      "strokes": [{ "strokeColor": "#hex", "strokeWidth": 1 }],
      "borderRadius": number,
      "text": "optional text content",
      "fontSize": number,
      "fontWeight": "normal",
      "color": "#hex",
      "children": [
        // nested child components (e.g. text, buttons, sub-frames, inputs)
      ]
    }
  ]
}

Layout & Coordinate Rules:
- If isDark is true: background="#0a0e17" or "#0f172a", surfaces="#131b2e", text="#f8fafc" or "#e2e8f0", muted text="#94a3b8", accent="#7c3aed" or "#10b981".
- If isDark is false: background="#f8fafc", surfaces="#ffffff", text="#0f172a", muted text="#64748b", accent="#7c3aed" or "#0284c7".
- When creating containers/cards (type "frame" or "card"), position them cleanly on the canvas (e.g. padding 24, staggered x/y coordinates, appropriate widths and heights).
- When creating child elements inside a container, give them relative x and y coordinates within that container so they fit inside nicely.
- When user asks for specific counts (e.g. "5 containers with each 10 text", "3 pricing tiers", "4 KPI cards"), create EXACTLY that number of elements with rich, readable sample content matching the theme.
${isTargetedEdit ? 'TARGETED EDIT MODE: Modify ONLY the selected components provided in targetedNodes according to the user instruction, keeping the rest of the canvas structure intact.' : 'ZERO TEMPLATES: Generate every component dynamically from scratch according to the user prompt.'}
Return valid JSON only.`;

  let lastError: any = null;
  for (const model of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

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
            {
              role: 'user',
              content: JSON.stringify({
                prompt,
                mode,
                isDark,
                selectedCompIds,
                targetedNodes: targetedNodes.slice(0, 10),
                totalExisting: existingComponents.length
              })
            }
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
          if (parsed && Array.isArray(parsed.components) && parsed.components.length > 0) {
            console.log(`[Stitch AI LLM] Successfully synthesized AST using model: ${model} (${parsed.components.length} components)`);
            return {
              ...parsed,
              modelUsed: model
            };
          }
        }
      } else {
        const errText = await res.text();
        lastError = new Error(`Model ${model} error (HTTP ${res.status}): ${errText.slice(0, 200)}`);
        console.warn(`[Stitch AI LLM] Model "${model}" failed with HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Stitch AI LLM] Model "${model}" network/timeout error:`, err.message);
    }
  }

  throw lastError || new Error('Failed to synthesize layout with LLM. Check API key or prompt.');
}
/**
 * Intelligent Stitch AST Layout Synthesis Engine (LLM + Diverse Category Generators)
 */
async function synthesizeStitchLayout(options: {
  prompt: string;
  mode: 'create' | 'modify';
  baseComponents: LayoutComponent[];
  boardWidth: number;
  boardHeight: number;
  isDark: boolean;
  category?: string;
  existingName?: string;
  selectedCompIds?: string[];
}) {
  const { prompt, mode, baseComponents, boardWidth, boardHeight, isDark, existingName, selectedCompIds = [] } = options;
  const p = prompt.toLowerCase();

  const bg = isDark ? '#090d16' : '#f8fafc';
  const surface = isDark ? '#131b2e' : '#ffffff';
  const surfaceBorder = isDark ? '#1e293b' : '#e2e8f0';
  const textPrimary = isDark ? '#f8fafc' : '#0f172a';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const primaryAccent = '#7c3aed';
  const emeraldAccent = '#10b981';
  const amberAccent = '#f59e0b';
  const cyanAccent = '#06b6d4';
  const roseAccent = '#f43f5e';

  const theme = {
    primaryColor: primaryAccent,
    backgroundColor: bg,
    surfaceColor: surface,
    textColor: textPrimary,
    accentColor: emeraldAccent,
    borderRadius: 12
  };

  // Derive title from prompt
  const rawWords = prompt.replace(/[^a-zA-Z0-9\s-_]/g, '').split(/\s+/).filter(Boolean);
  const derivedTitle = rawWords.length > 0
    ? rawWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).slice(0, 4).join(' ')
    : 'Custom Interface';

  // Try LLM generation first if API keys exist
  const llmResult = await callLlmForScreenAst(prompt, mode, baseComponents, isDark, selectedCompIds);
  if (llmResult && Array.isArray(llmResult.components) && llmResult.components.length > 0) {
    const finalTitle = existingName || llmResult.title || derivedTitle;
    let components = llmResult.components;

    // IF in MODIFY mode on an existing screen:
    if (mode === 'modify' && baseComponents.length > 0) {
      if (selectedCompIds && selectedCompIds.length > 0) {
        // Targeted mutation: update ONLY selected components in baseComponents
        const updatedBase: LayoutComponent[] = JSON.parse(JSON.stringify(baseComponents));
        const mutateMatching = (list: LayoutComponent[]) => {
          for (let i = 0; i < list.length; i++) {
            if (selectedCompIds.includes(list[i].id)) {
              const matchedNew = llmResult.components.find((c: any) => c.id === list[i].id) || llmResult.components[0];
              if (matchedNew) {
                list[i] = {
                  ...list[i],
                  ...matchedNew,
                  id: list[i].id, // retain stable ID
                  x: matchedNew.x !== undefined ? matchedNew.x : list[i].x,
                  y: matchedNew.y !== undefined ? matchedNew.y : list[i].y
                };
              }
            }
            if (list[i] && list[i].children && list[i].children!.length > 0) {
              mutateMatching(list[i].children!);
            }
          }
        };
        mutateMatching(updatedBase);
        components = updatedBase;
      } else {
        // Non-targeted modify: If LLM returned fewer components than baseComponents without explicit wipe intent, merge by ID or append new components!
        const isExplicitRedesign = /\b(redesign from scratch|start over|clear and replace|wipe canvas|brand new screen)\b/i.test(prompt);
        if (!isExplicitRedesign && components.length < baseComponents.length) {
          const updatedBase: LayoutComponent[] = JSON.parse(JSON.stringify(baseComponents));
          const newComps = components.filter((c: any) => !updatedBase.some(bc => bc.id === c.id || bc.name === c.name));
          components = [...updatedBase, ...newComps];
        }
      }
    }

    const steps = components.map((c: any, idx: number) => ({
      step: idx + 1,
      name: c.name || `Component ${idx + 1}`,
      type: c.type || 'frame',
      x: c.x || 0,
      y: c.y || 0,
      width: c.width || 100,
      height: c.height || 100,
      action: `AI Synthesizing ${c.name || c.type} (${idx + 1}/${components.length})`
    }));

    const modelTag = llmResult.modelUsed ? ` (via Groq ${llmResult.modelUsed})` : '';
    return {
      components,
      title: finalTitle,
      description: llmResult.description || `Generated by AI: ${prompt}`,
      theme: llmResult.theme || theme,
      steps,
      changesSummary: mode === 'modify'
        ? `Modified elements in ${finalTitle}${modelTag}`
        : `Synthesized ${components.length} custom AI components for ${finalTitle}${modelTag}`,
      assistantExplanation: mode === 'modify'
        ? `I applied your modifications to **${finalTitle}** (${components.length} components retained) matching "${prompt}".`
        : `I synthesized **${finalTitle}** with ${components.length} components matching your prompt "${prompt}" using Groq LLM (${llmResult.modelUsed || 'AI Engine'}).`
    };
  }

  // =========================================================================
  // CASE 1: MODIFY EXISTING SCREEN (WHOLE OR TARGETED MULTI-ELEMENT SELECTION)
  // =========================================================================
  if (mode === 'modify' && baseComponents.length > 0) {
    let updated: LayoutComponent[] = JSON.parse(JSON.stringify(baseComponents));
    const changes: string[] = [];
    const steps: Array<{ step: number; name: string; type: string; x: number; y: number; width: number; height: number; action: string }> = [];

    const hasSpecificTarget = selectedCompIds.length > 0;

    // Helper to mutate matching elements in-place recursively
    const mutateMatchingComps = (mutateFn: (c: LayoutComponent) => void) => {
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

    // 1. Glassmorphism / Glow Transformation
    if (p.includes('glass') || p.includes('glow') || p.includes('blur') || p.includes('frosted')) {
      mutateMatchingComps((c) => {
        c.fills = [{ fillColor: isDark ? '#1e293bcc' : '#ffffffcc' }];
        c.strokes = [{ strokeColor: primaryAccent, strokeWidth: 1.5 }];
        c.borderRadius = Math.max(14, c.borderRadius || 12);
        steps.push({
          step: steps.length + 1,
          name: c.name,
          type: c.type,
          x: c.x || 0,
          y: c.y || 0,
          width: c.width || 100,
          height: c.height || 100,
          action: `Applying glassmorphic blur & violet glow to ${c.name}`
        });
      });
      changes.push(`Applied glassmorphism and accent glow to ${hasSpecificTarget ? `${selectedCompIds.length} selected element(s)` : 'screen elements'}`);
    }

    // 2. Color / Theme Palette Transformation
    if (p.includes('violet') || p.includes('purple') || p.includes('emerald') || p.includes('green') || p.includes('blue') || p.includes('cyan') || p.includes('amber') || p.includes('rose') || p.includes('red') || p.includes('dark') || p.includes('light')) {
      let targetColor = primaryAccent;
      if (p.includes('emerald') || p.includes('green')) targetColor = emeraldAccent;
      if (p.includes('cyan') || p.includes('blue')) targetColor = cyanAccent;
      if (p.includes('amber') || p.includes('orange')) targetColor = amberAccent;
      if (p.includes('rose') || p.includes('red')) targetColor = roseAccent;

      mutateMatchingComps((c) => {
        if (c.type === 'button') {
          c.fills = [{ fillColor: targetColor }];
          c.color = '#ffffff';
        } else if (c.type === 'badge') {
          c.color = targetColor;
          c.fills = [{ fillColor: `${targetColor}22` }];
        } else if (c.type === 'text') {
          c.color = targetColor;
        } else {
          c.strokes = [{ strokeColor: targetColor, strokeWidth: 1.5 }];
        }
        steps.push({
          step: steps.length + 1,
          name: c.name,
          type: c.type,
          x: c.x || 0,
          y: c.y || 0,
          width: c.width || 100,
          height: c.height || 100,
          action: `Restyled ${c.name} with ${targetColor} palette`
        });
      });
      changes.push(`Updated color theme for ${hasSpecificTarget ? `${selectedCompIds.length} selected element(s)` : 'layout'}`);
    }

    // 3. Rounded Pill & Border Radius Transformation
    if (p.includes('rounded') || p.includes('pill') || p.includes('corner') || p.includes('radius')) {
      const radiusVal = p.includes('pill') || p.includes('full') ? 99 : 20;
      mutateMatchingComps((c) => {
        c.borderRadius = radiusVal;
        steps.push({
          step: steps.length + 1,
          name: c.name,
          type: c.type,
          x: c.x || 0,
          y: c.y || 0,
          width: c.width || 100,
          height: c.height || 100,
          action: `Set border radius to ${radiusVal}px on ${c.name}`
        });
      });
      changes.push(`Applied ${radiusVal}px rounded corners`);
    }

    // 4. Typography & Font Size Transformation
    if (p.includes('font') || p.includes('size') || p.includes('larger') || p.includes('bold') || p.includes('text')) {
      mutateMatchingComps((c) => {
        if (c.fontSize) c.fontSize = Math.min(36, Math.round(c.fontSize * 1.3));
        c.fontWeight = 'bold';
        steps.push({
          step: steps.length + 1,
          name: c.name,
          type: c.type,
          x: c.x || 0,
          y: c.y || 0,
          width: c.width || 100,
          height: c.height || 100,
          action: `Enlarged typography and set bold weight on ${c.name}`
        });
      });
      changes.push(`Enlarged font size and typography styling`);
    }

    // 5. Append New Search Input Filter
    if (p.includes('search') || p.includes('filter')) {
      const headerFrame = updated.find((c: LayoutComponent) => c.name.toLowerCase().includes('header') || c.type === 'frame');
      if (headerFrame && headerFrame.children) {
        const searchInput: LayoutComponent = {
          id: `input-search-${Date.now()}`,
          name: 'Search Input Filter',
          type: 'input',
          x: 380,
          y: 18,
          width: 280,
          height: 36,
          fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }],
          strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
          borderRadius: 8,
          text: '🔍 Search records...',
          fontSize: 12,
          color: textSecondary
        };
        headerFrame.children.push(searchInput);
        changes.push('Added Search Input Filter');
        steps.push({ step: steps.length + 1, name: 'Search Input', type: 'input', x: (headerFrame.x || 0) + 380, y: (headerFrame.y || 0) + 18, width: 280, height: 36, action: 'Inserted Search Filter in Header' });
      }
    }

    // 6. Append Metric KPI Card
    if (p.includes('metric') || p.includes('kpi') || p.includes('stat') || p.includes('add card')) {
      const nextX = 292 + (updated.filter((c: any) => c.type === 'card' && c.y === 104).length % 4) * 280;
      const kpiCard: LayoutComponent = {
        id: `kpi-card-${Date.now()}`,
        name: 'AI Metric Card',
        type: 'card',
        x: nextX,
        y: 104,
        width: 264,
        height: 120,
        fills: [{ fillColor: surface }],
        borderRadius: 12,
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        text: `⚡ Realtime Metric\n+34.2% Optimization`,
        fontSize: 14,
        color: textPrimary
      };
      updated.push(kpiCard);
      changes.push('Appended Metric KPI Card');
      steps.push({ step: steps.length + 1, name: 'Metric KPI Card', type: 'card', x: nextX, y: 104, width: 264, height: 120, action: 'Placed New Metric Card on Canvas' });
    }

    // 7. Append Data Table Grid
    if (p.includes('table') || p.includes('grid') || p.includes('list')) {
      const newTable: LayoutComponent = {
        id: `table-grid-${Date.now()}`,
        name: 'Data Table Grid',
        type: 'table',
        x: 292,
        y: 592,
        width: 1116,
        height: 270,
        fills: [{ fillColor: surface }],
        borderRadius: 12,
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        text: `📋 Live Entity Registry (${existingName || derivedTitle})`
      };
      updated.push(newTable);
      changes.push('Appended Data Table Grid');
      steps.push({ step: steps.length + 1, name: 'Data Grid Table', type: 'table', x: 292, y: 592, width: 1116, height: 270, action: 'Constructed Data Table on Canvas' });
    }

    if (changes.length === 0) {
      // General targeted modification fallback
      mutateMatchingComps((c) => {
        c.strokes = [{ strokeColor: primaryAccent, strokeWidth: 1.5 }];
        if (c.text) c.text = `${c.text} ✨`;
        steps.push({
          step: steps.length + 1,
          name: c.name,
          type: c.type,
          x: c.x || 0,
          y: c.y || 0,
          width: c.width || 100,
          height: c.height || 100,
          action: `Applied AI transformation to ${c.name}`
        });
      });
      changes.push(`Applied custom modification: "${prompt}"`);
    }

    return {
      components: updated,
      title: existingName || derivedTitle,
      description: `Modified with AI: ${changes.join(', ')}`,
      theme,
      steps: steps.length > 0 ? steps : [{ step: 1, name: 'AST Update', type: 'frame', x: 0, y: 0, width: boardWidth, height: boardHeight, action: 'Updated layout AST' }],
      changesSummary: changes.join('; ') || 'Screen modified with AI'
    };
  }

  // =========================================================================
  // CASE 2: DIVERSE CATEGORY GENERATORS FOR BRAND NEW SCREENS (NEVER THE SAME)
  // =========================================================================

  // Category -1: GREETINGS / HELLO / WELCOME / QUICK START LAUNCHPAD
  if (
    p === 'hey' ||
    p === 'hello' ||
    p === 'hi' ||
    p === 'start' ||
    p === 'help' ||
    p === 'test' ||
    p.startsWith('hey ') ||
    p.startsWith('hello ') ||
    p.startsWith('hi ') ||
    p.includes('greeting') ||
    p.includes('welcome')
  ) {
    const comps: LayoutComponent[] = [
      // Top Welcome Banner
      {
        id: `welcome-banner-${Date.now()}`,
        name: 'Stitch AI Studio Welcome Banner',
        type: 'frame',
        x: 40,
        y: 30,
        width: boardWidth - 80,
        height: 160,
        fills: [{ fillColor: isDark ? '#1e1b4b' : '#ede9fe' }],
        strokes: [{ strokeColor: primaryAccent, strokeWidth: 1.5 }],
        borderRadius: 18,
        padding: 28,
        children: [
          { id: 'w-logo', name: 'Badge', type: 'badge', text: '✨ STITCH AI DESIGN STUDIO', fontSize: 11, fontWeight: 'bold', color: primaryAccent, fills: [{ fillColor: `${primaryAccent}22` }], borderRadius: 99, x: 28, y: 20, width: 200, height: 26 },
          { id: 'w-title', name: 'Title', type: 'text', text: 'Welcome! What would you like to design today?', fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#312e81', x: 28, y: 56, width: 800, height: 36 },
          { id: 'w-sub', name: 'Subtitle', type: 'text', text: 'Type any natural language prompt (e.g. "Food delivery app", "Crypto trading terminal", "Music player") or explore the live blueprints below.', fontSize: 13, color: isDark ? '#c7d2fe' : '#4338ca', x: 28, y: 96, width: 900, height: 24 }
        ]
      },
      // 6 Blueprint Category Cards
      {
        id: `bp-card-1-${Date.now()}`,
        name: 'Blueprint: E-Commerce Store',
        type: 'card',
        x: 40,
        y: 214,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-1', name: 'Icon', type: 'text', text: '🛍️ E-Commerce Storefront', fontSize: 16, fontWeight: 'bold', color: primaryAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-1', name: 'Desc', type: 'text', text: 'Product catalog, price filters, shopping cart, and one-click checkout CTA.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-1', name: 'Action', type: 'button', text: 'Prompt: "E-Commerce store" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      {
        id: `bp-card-2-${Date.now()}`,
        name: 'Blueprint: Real-Time Chat',
        type: 'card',
        x: 40 + Math.floor((boardWidth - 80 - 40) / 3) + 20,
        y: 214,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-2', name: 'Icon', type: 'text', text: '💬 Real-Time Messenger', fontSize: 16, fontWeight: 'bold', color: emeraldAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-2', name: 'Desc', type: 'text', text: 'Channels drawer, active thread with message bubbles, composer bar.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-2', name: 'Action', type: 'button', text: 'Prompt: "Chat messenger" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: emeraldAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      {
        id: `bp-card-3-${Date.now()}`,
        name: 'Blueprint: 2D Combat Arena',
        type: 'card',
        x: 40 + (Math.floor((boardWidth - 80 - 40) / 3) + 20) * 2,
        y: 214,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-3', name: 'Icon', type: 'text', text: '🎮 2D Mobile Battleground', fontSize: 16, fontWeight: 'bold', color: cyanAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-3', name: 'Desc', type: 'text', text: 'Multi-tier floating platforms, weapons drops, radar, and mobile joysticks.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-3', name: 'Action', type: 'button', text: 'Prompt: "2D game arena" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: cyanAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      {
        id: `bp-card-4-${Date.now()}`,
        name: 'Blueprint: Crypto Trading',
        type: 'card',
        x: 40,
        y: 414,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-4', name: 'Icon', type: 'text', text: '📈 Crypto Trading Terminal', fontSize: 16, fontWeight: 'bold', color: amberAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-4', name: 'Desc', type: 'text', text: 'Candlestick charts, live orderbook, wallet balance, buy/sell triggers.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-4', name: 'Action', type: 'button', text: 'Prompt: "Crypto exchange" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: amberAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      {
        id: `bp-card-5-${Date.now()}`,
        name: 'Blueprint: Food Delivery',
        type: 'card',
        x: 40 + Math.floor((boardWidth - 80 - 40) / 3) + 20,
        y: 414,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-5', name: 'Icon', type: 'text', text: '🍔 Food & Restaurant App', fontSize: 16, fontWeight: 'bold', color: roseAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-5', name: 'Desc', type: 'text', text: 'Restaurant menu cards, delivery tracking badge, order checkout list.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-5', name: 'Action', type: 'button', text: 'Prompt: "Food delivery" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: roseAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      {
        id: `bp-card-6-${Date.now()}`,
        name: 'Blueprint: Auth & SSO',
        type: 'card',
        x: 40 + (Math.floor((boardWidth - 80 - 40) / 3) + 20) * 2,
        y: 414,
        width: Math.floor((boardWidth - 80 - 40) / 3),
        height: 180,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'bp-icon-6', name: 'Icon', type: 'text', text: '🔐 Enterprise SSO Auth', fontSize: 16, fontWeight: 'bold', color: primaryAccent, x: 20, y: 18, width: 280, height: 24 },
          { id: 'bp-desc-6', name: 'Desc', type: 'text', text: 'GitHub OAuth buttons, email/password inputs, AES-256 security notice.', fontSize: 12, color: textSecondary, x: 20, y: 50, width: 280, height: 38 },
          { id: 'bp-btn-6', name: 'Action', type: 'button', text: 'Prompt: "Login portal" ➔', fontSize: 12, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 20, y: 110, width: 240, height: 36 }
        ]
      },
      // Bottom Quick Tips & Keyboard Shortcuts Footer
      {
        id: `welcome-footer-${Date.now()}`,
        name: 'Studio Keyboard Shortcuts & Tips',
        type: 'frame',
        x: 40,
        y: 614,
        width: boardWidth - 80,
        height: 80,
        fills: [{ fillColor: isDark ? '#0c111d' : '#f1f5f9' }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: 'wf-tips', name: 'Tips', type: 'text', text: '💡 Quick Controls: Select any element and press "E" for instant AI transformation. Use "H" or hold Spacebar to Pan. Drag 8 anchor points to resize.', fontSize: 12, color: textPrimary, x: 20, y: 28, width: boardWidth - 120, height: 24 }
        ]
      }
    ];

    return {
      components: comps,
      title: 'Stitch AI Launchpad',
      description: 'Interactive Design Studio Welcome Artboard & Blueprint Showcase',
      theme,
      steps: [
        { step: 1, name: 'Welcome Banner', type: 'frame', x: 40, y: 30, width: boardWidth - 80, height: 160, action: 'Creating Studio Welcome Artboard' },
        { step: 2, name: 'Blueprint Cards', type: 'card', x: 40, y: 214, width: boardWidth - 80, height: 380, action: 'Rendering 6 Concept Blueprints' },
        { step: 3, name: 'Shortcuts & Controls Bar', type: 'frame', x: 40, y: 614, width: boardWidth - 80, height: 80, action: 'Adding Keyboard Shortcuts Footer' }
      ],
      changesSummary: 'Synthesized interactive Stitch AI Studio Welcome Launchpad with 6 blueprint starter cards'
    };
  }

  // Category 0: 2D GAME ARENA / MINI MILITIA MAP / PLATFORMER LEVEL / MOBILE COMBAT
  if (
    p.includes('minimilitia') ||
    p.includes('militia') ||
    p.includes('game') ||
    p.includes('map') ||
    p.includes('2d') ||
    p.includes('arena') ||
    p.includes('battleground') ||
    p.includes('platformer') ||
    p.includes('shooter') ||
    p.includes('level') ||
    p.includes('arcade')
  ) {
    const isMobile = p.includes('mobile') || p.includes('phone') || boardWidth <= 900;
    const w = isMobile ? 844 : boardWidth;
    const h = isMobile ? 390 : boardHeight;
    const gameBg = isDark ? '#080d1a' : '#1e293b';

    const comps: LayoutComponent[] = [
      // 1. Sky / Battle Cavern Background Frame
      {
        id: `game-arena-${Date.now()}`,
        name: 'Battleground Cavern Arena',
        type: 'frame',
        x: 0,
        y: 0,
        width: w,
        height: h,
        fills: [{ fillColor: gameBg }],
        strokes: [{ strokeColor: '#334155', strokeWidth: 1 }],
        borderRadius: 16
      },
      // 2. Base Ground Terrain Rock
      {
        id: `terrain-base-${Date.now()}`,
        name: 'Bedrock Ground Terrain',
        type: 'frame',
        x: 0,
        y: h - 44,
        width: w,
        height: 44,
        fills: [{ fillColor: '#0f172a' }],
        strokes: [{ strokeColor: emeraldAccent, strokeWidth: 2 }],
        borderRadius: 4
      },
      // 3. Floating Tactical Platform (Left Outpost)
      {
        id: `plat-left-${Date.now()}`,
        name: 'Left Outpost Ledge',
        type: 'frame',
        x: 40,
        y: h - 140,
        width: 190,
        height: 18,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: cyanAccent, strokeWidth: 2 }],
        borderRadius: 6
      },
      // 4. Floating Sniper Tower / Central Catwalk
      {
        id: `plat-center-${Date.now()}`,
        name: 'Central Sniper Skywalk',
        type: 'frame',
        x: Math.round(w / 2 - 120),
        y: h - 210,
        width: 240,
        height: 20,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: primaryAccent, strokeWidth: 2 }],
        borderRadius: 6
      },
      // 5. Floating Tactical Platform (Right Outpost)
      {
        id: `plat-right-${Date.now()}`,
        name: 'Right Sniper Ledge',
        type: 'frame',
        x: w - 230,
        y: h - 150,
        width: 190,
        height: 18,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: emeraldAccent, strokeWidth: 2 }],
        borderRadius: 6
      },
      // 6. Underground Tunnel / Bunker Vault
      {
        id: `bunker-vault-${Date.now()}`,
        name: 'Underground Supply Bunker',
        type: 'frame',
        x: Math.round(w / 2 - 160),
        y: h - 90,
        width: 320,
        height: 40,
        fills: [{ fillColor: '#0b0f19' }],
        strokes: [{ strokeColor: amberAccent, strokeWidth: 1.5 }],
        borderRadius: 8
      },
      // 7. Tactical Obstacle Crates
      {
        id: `crate-1-${Date.now()}`,
        name: 'Explosive Crate A',
        type: 'card',
        x: 60,
        y: h - 182,
        width: 40,
        height: 40,
        fills: [{ fillColor: '#854d0e' }],
        strokes: [{ strokeColor: '#eab308', strokeWidth: 1 }],
        borderRadius: 6,
        text: '📦'
      },
      {
        id: `crate-2-${Date.now()}`,
        name: 'Metal Armor Barrel',
        type: 'card',
        x: w - 90,
        y: h - 192,
        width: 40,
        height: 40,
        fills: [{ fillColor: '#334155' }],
        strokes: [{ strokeColor: '#94a3b8', strokeWidth: 1 }],
        borderRadius: 6,
        text: '🛢️'
      },
      // 8. Weapon & Health Pickups
      {
        id: `pickup-rpg-${Date.now()}`,
        name: 'Rocket Launcher Drop',
        type: 'badge',
        x: Math.round(w / 2 - 50),
        y: h - 250,
        width: 100,
        height: 26,
        fills: [{ fillColor: '#f59e0b22' }],
        strokes: [{ strokeColor: amberAccent, strokeWidth: 1 }],
        borderRadius: 99,
        text: '🚀 RPG Launcher',
        color: amberAccent,
        fontSize: 11
      },
      {
        id: `pickup-medkit-${Date.now()}`,
        name: 'Medkit Health Pack',
        type: 'badge',
        x: Math.round(w / 2 - 40),
        y: h - 84,
        width: 80,
        height: 24,
        fills: [{ fillColor: '#10b98122' }],
        strokes: [{ strokeColor: emeraldAccent, strokeWidth: 1 }],
        borderRadius: 99,
        text: '❤️ +50 HP',
        color: emeraldAccent,
        fontSize: 10
      },
      // 9. Spawn Points
      {
        id: `spawn-alpha-${Date.now()}`,
        name: 'Alpha Spawn Beacon',
        type: 'badge',
        x: 60,
        y: h - 72,
        width: 90,
        height: 22,
        fills: [{ fillColor: '#10b98133' }],
        borderRadius: 6,
        text: '🟢 Alpha Base',
        color: emeraldAccent,
        fontSize: 10
      },
      {
        id: `spawn-bravo-${Date.now()}`,
        name: 'Bravo Spawn Beacon',
        type: 'badge',
        x: w - 150,
        y: h - 72,
        width: 90,
        height: 22,
        fills: [{ fillColor: '#ef444433' }],
        borderRadius: 6,
        text: '🔴 Bravo Base',
        color: roseAccent,
        fontSize: 10
      },
      // 10. Top Combat Telemetry HUD
      {
        id: `hud-top-${Date.now()}`,
        name: 'Combat Match Header HUD',
        type: 'frame',
        x: 16,
        y: 12,
        width: w - 32,
        height: 40,
        fills: [{ fillColor: `${surface}cc` }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 10,
        padding: 8,
        children: [
          { id: 'hud-hp', name: 'HP & Boost', type: 'text', text: '❤️ 100/100 HP  |  🚀 85% JETPACK', fontSize: 12, fontWeight: 'bold', color: emeraldAccent, x: 14, y: 11, width: 220, height: 18 },
          { id: 'hud-score', name: 'Match Score', type: 'text', text: '⚔️ BLUE 14 - 12 RED  (02:30)', fontSize: 13, fontWeight: 'bold', color: textPrimary, x: Math.round((w - 32) / 2 - 100), y: 10, width: 200, height: 20 },
          { id: 'hud-radar', name: 'Mini-Radar', type: 'badge', text: '📡 Radar · 3 Enemies', fontSize: 11, fontWeight: 'bold', color: cyanAccent, fills: [{ fillColor: `${cyanAccent}22` }], borderRadius: 99, x: w - 32 - 140, y: 8, width: 130, height: 24 }
        ]
      },
      // 11. Mobile Touch Joystick (Left)
      {
        id: `touch-joystick-${Date.now()}`,
        name: 'Virtual Move Analog Joystick',
        type: 'circle',
        x: 24,
        y: h - 104,
        width: 80,
        height: 80,
        fills: [{ fillColor: '#ffffff11' }],
        strokes: [{ strokeColor: cyanAccent, strokeWidth: 2 }],
        text: '🕹️\nMOVE',
        fontSize: 11,
        color: '#94a3b8'
      },
      // 12. Mobile Fire Trigger (Right)
      {
        id: `touch-fire-${Date.now()}`,
        name: 'Primary Fire Trigger Button',
        type: 'circle',
        x: w - 90,
        y: h - 104,
        width: 74,
        height: 74,
        fills: [{ fillColor: '#dc2626dd' }],
        strokes: [{ strokeColor: '#fca5a5', strokeWidth: 2 }],
        text: '🔥\nFIRE',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#ffffff'
      },
      // 13. Mobile Jetpack Boost Trigger (Right Secondary)
      {
        id: `touch-boost-${Date.now()}`,
        name: 'Jetpack Boost Trigger',
        type: 'circle',
        x: w - 160,
        y: h - 74,
        width: 54,
        height: 54,
        fills: [{ fillColor: '#0891b2dd' }],
        strokes: [{ strokeColor: '#67e8f9', strokeWidth: 1.5 }],
        text: '🚀',
        fontSize: 14,
        color: '#ffffff'
      },
      // 14. Bottom Active Weapon Switcher Bar
      {
        id: `weapon-dock-${Date.now()}`,
        name: 'Weapon Arsenal Switcher',
        type: 'badge',
        x: Math.round(w / 2 - 120),
        y: h - 42,
        width: 240,
        height: 32,
        fills: [{ fillColor: `${surface}ee` }],
        strokes: [{ strokeColor: primaryAccent, strokeWidth: 1 }],
        borderRadius: 8,
        text: '🔫 Dual MP5 [60/120]  |  💣 Grenade x2',
        fontSize: 11,
        fontWeight: 'bold',
        color: textPrimary
      }
    ];

    const assistantExplanation = `I've synthesized a high-intensity **2D Multiplayer Combat Map for ${derivedTitle}** in mobile landscape viewport (${w}×${h}px).\n\n### 🎮 What Was Built:\n- **Terrain & Verticality**: 3 tactical floating platforms (Left Outpost, Right Sniper Ledge, and Central Highwalk) plus a subterranean supply bunker.\n- **Spawns & Pickups**: Alpha/Bravo team spawn beacons, Medkit health caches, and a high-tier Rocket Launcher (RPG) power weapon drop.\n- **Combat HUD**: Top real-time telemetry displaying Player Health, Jetpack Boost % gauge, Deathmatch score counter, and Sector Radar.\n- **Mobile Touch Controls**: Dual-thumb on-screen controls with Left Analog Joystick, Primary Fire Trigger, Rocket Flight Boost, and Quick Weapon Selector.`;

    return {
      components: comps,
      title: `${derivedTitle} 2D Map`,
      description: '2D Mobile Arena Battleground & Mini Militia Level Spec',
      theme: {
        ...theme,
        backgroundColor: gameBg
      },
      boardWidth: w,
      boardHeight: h,
      assistantExplanation,
      steps: [
        { step: 1, name: 'Arena Environment', type: 'frame', x: 0, y: 0, width: w, height: h, action: 'Constructing 2D Battleground & Bedrock Ground Terrain' },
        { step: 2, name: 'Floating Platforms & Bunker', type: 'frame', x: 40, y: h - 210, width: w - 80, height: 160, action: 'Placing Floating Rock Ledges and Underground Tunnel' },
        { step: 3, name: 'Weapon Spawns & Crates', type: 'card', x: 60, y: h - 250, width: w - 120, height: 100, action: 'Seeding RPG Weapon Drops, Ammo Crates, and Health Packs' },
        { step: 4, name: 'Combat HUD & Mobile Controls', type: 'circle', x: 16, y: 12, width: w - 32, height: h - 24, action: 'Wiring Top Telemetry Radar and Virtual Touch Joysticks' }
      ],
      changesSummary: `Synthesized 2D Mobile Battleground Map with floating platforms, weapon spawns, and mobile touch HUD`
    };
  }

  // Category A: AUTH / LOGIN / REGISTER / SSO
  if (p.includes('auth') || p.includes('login') || p.includes('signup') || p.includes('register') || p.includes('sso') || p.includes('password')) {
    const cardX = Math.round((boardWidth - 440) / 2);
    const cardY = 160;
    const comps: LayoutComponent[] = [
      {
        id: `auth-card-${Date.now()}`,
        name: 'Auth Modal Card',
        type: 'frame',
        x: cardX,
        y: cardY,
        width: 440,
        height: 580,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 16,
        padding: 32,
        children: [
          { id: 'auth-logo', name: 'Brand Logo', type: 'text', text: '🔐 Secure SSO Portal', fontSize: 22, fontWeight: 'bold', color: primaryAccent, x: 32, y: 32, width: 376, height: 32 },
          { id: 'auth-sub', name: 'Subtitle', type: 'text', text: 'Enter your enterprise credentials to access workspace', fontSize: 13, color: textSecondary, x: 32, y: 68, width: 376, height: 24 },
          { id: 'auth-sso-btn', name: 'GitHub SSO Button', type: 'button', text: '❖ Sign in with GitHub', fontSize: 14, fontWeight: '600', color: textPrimary, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, x: 32, y: 110, width: 376, height: 44 },
          { id: 'auth-div', name: 'Or Divider', type: 'text', text: '———————— or continue with email ————————', fontSize: 11, color: textSecondary, x: 32, y: 170, width: 376, height: 20 },
          { id: 'auth-email-lbl', name: 'Email Label', type: 'text', text: 'Work Email Address', fontSize: 12, fontWeight: '600', color: textPrimary, x: 32, y: 204, width: 376, height: 20 },
          { id: 'auth-email-input', name: 'Email Input', type: 'input', text: 'alex.developer@company.io', fontSize: 13, fills: [{ fillColor: isDark ? '#0c111d' : '#f8fafc' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, color: textPrimary, x: 32, y: 228, width: 376, height: 44 },
          { id: 'auth-pwd-lbl', name: 'Password Label', type: 'text', text: 'Password', fontSize: 12, fontWeight: '600', color: textPrimary, x: 32, y: 290, width: 376, height: 20 },
          { id: 'auth-pwd-input', name: 'Password Input', type: 'input', text: '••••••••••••••••', fontSize: 13, fills: [{ fillColor: isDark ? '#0c111d' : '#f8fafc' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, color: textPrimary, x: 32, y: 314, width: 376, height: 44 },
          { id: 'auth-submit', name: 'Submit Button', type: 'button', text: 'Sign In to Workspace ➔', fontSize: 14, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 32, y: 384, width: 376, height: 48 },
          { id: 'auth-footer', name: 'Security Notice', type: 'text', text: '🔒 Protected with AES-256 & Argon2 Hashing', fontSize: 11, color: emeraldAccent, x: 32, y: 450, width: 376, height: 20 }
        ]
      }
    ];
    return {
      components: comps,
      title: `${derivedTitle} Auth Portal`,
      description: 'Enterprise Authentication & SSO Portal Spec',
      theme,
      steps: [
        { step: 1, name: 'Auth Center Card', type: 'frame', x: cardX, y: cardY, width: 440, height: 580, action: 'Creating Glassmorphism Auth Card Frame' },
        { step: 2, name: 'SSO OAuth & Form Inputs', type: 'input', x: cardX + 32, y: cardY + 110, width: 376, height: 240, action: 'Drafting GitHub SSO and Credential Inputs' },
        { step: 3, name: 'Primary Action Trigger', type: 'button', x: cardX + 32, y: cardY + 384, width: 376, height: 48, action: 'Placing Sign In Button & Security Badge' }
      ],
      changesSummary: 'Synthesized Enterprise Auth Portal with SSO buttons and credential inputs'
    };
  }

  // Category B: E-COMMERCE / STORE / PRODUCT CATALOG / CHECKOUT
  if (p.includes('shop') || p.includes('ecommerce') || p.includes('store') || p.includes('product') || p.includes('cart') || p.includes('checkout')) {
    const comps: LayoutComponent[] = [
      {
        id: `ecom-header-${Date.now()}`,
        name: 'Store Navigation Bar',
        type: 'frame',
        x: 40,
        y: 20,
        width: 1360,
        height: 64,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 12,
        padding: 16,
        children: [
          { id: 'store-logo', name: 'Brand', type: 'text', text: '🛍️ NEXUS Store', fontSize: 18, fontWeight: 'bold', color: primaryAccent, x: 20, y: 18, width: 200, height: 28 },
          { id: 'store-search', name: 'Search', type: 'input', text: '🔍 Search 4,200+ hardware items, components...', fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, color: textSecondary, x: 240, y: 14, width: 500, height: 36 },
          { id: 'store-cart', name: 'Cart Pill', type: 'badge', text: '🛒 Cart (3 Items · $420)', fontSize: 12, fontWeight: 'bold', color: emeraldAccent, fills: [{ fillColor: `${emeraldAccent}22` }], borderRadius: 99, x: 1140, y: 16, width: 180, height: 32 }
        ]
      },
      {
        id: `ecom-banner-${Date.now()}`,
        name: 'Featured Hero Promo Banner',
        type: 'frame',
        x: 40,
        y: 104,
        width: 1360,
        height: 180,
        fills: [{ fillColor: isDark ? '#1e1b4b' : '#e0e7ff' }],
        strokes: [{ strokeColor: primaryAccent, strokeWidth: 1 }],
        borderRadius: 16,
        padding: 32,
        children: [
          { id: 'promo-title', name: 'Title', type: 'text', text: '⚡ Summer Developer Tech Drop — 30% Off', fontSize: 24, fontWeight: 'bold', color: isDark ? '#ffffff' : '#312e81', x: 32, y: 28, width: 700, height: 36 },
          { id: 'promo-sub', name: 'Sub', type: 'text', text: 'Next-gen Edge microcontrollers, NVMe telemetry drives, and mechanical keyboards', fontSize: 14, color: isDark ? '#c7d2fe' : '#4338ca', x: 32, y: 72, width: 700, height: 24 },
          { id: 'promo-btn', name: 'CTA', type: 'button', text: 'Explore Tech Drop ➔', fontSize: 13, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 32, y: 112, width: 180, height: 40 }
        ]
      }
    ];

    // 4 Product Cards
    const products = [
      { name: 'Edge AI Compute Unit', price: '$249.00', rating: '★ 4.9 (128)', badge: 'Best Seller' },
      { name: 'Telemetry NVMe Array 4TB', price: '$189.00', rating: '★ 4.8 (94)', badge: 'In Stock' },
      { name: 'Haptic Studio Keyboard', price: '$129.00', rating: '★ 5.0 (210)', badge: 'Popular' },
      { name: 'Ultra-Wide 5K Display', price: '$799.00', rating: '★ 4.7 (42)', badge: 'Limited' }
    ];

    products.forEach((prod, idx) => {
      const pX = 40 + idx * 348;
      comps.push({
        id: `prod-card-${idx + 1}-${Date.now()}`,
        name: `Product: ${prod.name}`,
        type: 'card',
        x: pX,
        y: 304,
        width: 328,
        height: 380,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 20,
        children: [
          { id: `prod-badge-${idx}`, name: 'Badge', type: 'badge', text: prod.badge, fontSize: 11, color: amberAccent, fills: [{ fillColor: `${amberAccent}22` }], borderRadius: 99, x: 20, y: 16, width: 90, height: 24 },
          { id: `prod-title-${idx}`, name: 'Title', type: 'text', text: prod.name, fontSize: 16, fontWeight: 'bold', color: textPrimary, x: 20, y: 52, width: 288, height: 28 },
          { id: `prod-rating-${idx}`, name: 'Rating', type: 'text', text: prod.rating, fontSize: 12, color: amberAccent, x: 20, y: 84, width: 288, height: 20 },
          { id: `prod-price-${idx}`, name: 'Price', type: 'text', text: prod.price, fontSize: 20, fontWeight: 'bold', color: emeraldAccent, x: 20, y: 260, width: 140, height: 32 },
          { id: `prod-btn-${idx}`, name: 'Add to Cart', type: 'button', text: '+ Add to Cart', fontSize: 13, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 20, y: 310, width: 288, height: 42 }
        ]
      });
    });

    return {
      components: comps,
      title: `${derivedTitle} Store`,
      description: 'E-Commerce Product Showcase & Shopping Catalog Spec',
      theme,
      steps: [
        { step: 1, name: 'Store Navigation Bar', type: 'frame', x: 40, y: 20, width: 1360, height: 64, action: 'Creating Store Header with Search and Cart' },
        { step: 2, name: 'Hero Promotional Banner', type: 'frame', x: 40, y: 104, width: 1360, height: 180, action: 'Positioning Hero Promo Banner' },
        { step: 3, name: 'Product Grid Cards (4x)', type: 'card', x: 40, y: 304, width: 1360, height: 380, action: 'Generating Product Showcase Cards with Buy Buttons' }
      ],
      changesSummary: 'Synthesized E-Commerce storefront with promo banner and interactive product cards'
    };
  }

  // Category C: CHAT / MESSAGING / CONVERSATION
  if (p.includes('chat') || p.includes('message') || p.includes('conversation') || p.includes('messenger') || p.includes('assistant') || p.includes('bot')) {
    const comps: LayoutComponent[] = [
      {
        id: `chat-sidebar-${Date.now()}`,
        name: 'Channels & Contacts Drawer',
        type: 'frame',
        x: 40,
        y: 40,
        width: 320,
        height: 800,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 16,
        padding: 20,
        children: [
          { id: 'chat-title', name: 'Title', type: 'text', text: '💬 Active Conversations', fontSize: 16, fontWeight: 'bold', color: textPrimary, x: 20, y: 20, width: 280, height: 28 },
          { id: 'chat-search', name: 'Search', type: 'input', text: '🔍 Search messages...', fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 8, color: textSecondary, x: 20, y: 60, width: 280, height: 36 },
          { id: 'convo-1', name: 'Convo: Core Team', type: 'card', text: '🚀 Core Engineering\n"PR #142 ready for review"\n2m ago', fontSize: 12, fills: [{ fillColor: `${primaryAccent}22` }], borderRadius: 10, color: textPrimary, x: 20, y: 110, width: 280, height: 70 },
          { id: 'convo-2', name: 'Convo: AI Agent', type: 'card', text: '🤖 Stitch Assistant\n"AST layout generated successfully"\n15m ago', fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f8fafc' }], borderRadius: 10, color: textSecondary, x: 20, y: 190, width: 280, height: 70 },
          { id: 'convo-3', name: 'Convo: DevOps', type: 'card', text: '⚙️ Cloud Deployment\n"Atlas cluster healthy"\n1h ago', fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f8fafc' }], borderRadius: 10, color: textSecondary, x: 20, y: 270, width: 280, height: 70 }
        ]
      },
      {
        id: `chat-main-${Date.now()}`,
        name: 'Active Chat Message Feed',
        type: 'frame',
        x: 380,
        y: 40,
        width: 1020,
        height: 800,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 16,
        padding: 24,
        children: [
          { id: 'feed-header', name: 'Feed Header', type: 'text', text: '🚀 Core Engineering Team (12 Members · 🟢 8 Online)', fontSize: 16, fontWeight: 'bold', color: textPrimary, x: 24, y: 20, width: 700, height: 28 },
          { id: 'msg-1', name: 'Incoming Message', type: 'card', text: 'Alex D. (Staff Architect):\n"Can we verify the OpenPencil .fig binary exporter on the staging branch?"', fontSize: 13, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 12, color: textPrimary, x: 24, y: 80, width: 680, height: 80 },
          { id: 'msg-2', name: 'Outgoing Response', type: 'card', text: 'You:\n"Yes! The 53 unit tests passed with 100% success rate and verified on Atlas."', fontSize: 13, fills: [{ fillColor: `${primaryAccent}33` }], strokes: [{ strokeColor: primaryAccent, strokeWidth: 1 }], borderRadius: 12, color: textPrimary, x: 316, y: 180, width: 680, height: 80 },
          { id: 'msg-input', name: 'Message Input Bar', type: 'input', text: 'Type a message or press "/" for AI commands...', fontSize: 13, fills: [{ fillColor: isDark ? '#0c111d' : '#f8fafc' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 12, color: textPrimary, x: 24, y: 720, width: 850, height: 48 },
          { id: 'msg-send-btn', name: 'Send Button', type: 'button', text: 'Send ➔', fontSize: 13, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 10, x: 890, y: 720, width: 106, height: 48 }
        ]
      }
    ];

    return {
      components: comps,
      title: `${derivedTitle} Chat Interface`,
      description: 'Real-Time Messaging & Chat Thread UI Spec',
      theme,
      steps: [
        { step: 1, name: 'Contacts Drawer', type: 'frame', x: 40, y: 40, width: 320, height: 800, action: 'Creating Conversations & Channels Drawer' },
        { step: 2, name: 'Active Chat Feed', type: 'frame', x: 380, y: 40, width: 1020, height: 800, action: 'Embedding Chat Thread with Message Bubbles' },
        { step: 3, name: 'Composer & Send Action', type: 'input', x: 404, y: 760, width: 972, height: 48, action: 'Positioning Message Composer Bar' }
      ],
      changesSummary: 'Synthesized modern team chat messenger with channels drawer and message bubbles'
    };
  }

  // Category D: KANBAN / AGILE / SPRINT BOARD
  if (p.includes('kanban') || p.includes('scrum') || p.includes('sprint') || p.includes('board') || p.includes('jira') || p.includes('trello') || p.includes('task')) {
    const cols = [
      { name: '📋 Backlog', count: '4 Tasks', color: textSecondary, tasks: ['Sync AST schema', 'Add Redis caching'] },
      { name: '⚡ In Progress', count: '2 Tasks', color: cyanAccent, tasks: ['Stitch AI live streamer', 'Excalidraw diagram sync'] },
      { name: '🔍 Code Review', count: '3 Tasks', color: amberAccent, tasks: ['Multi-User ACL', 'Postgres Pool tuning'] },
      { name: '✅ Deployed', count: '8 Tasks', color: emeraldAccent, tasks: ['Atlas DB Persistence', 'Flow Audit graph'] }
    ];

    const comps: LayoutComponent[] = [];
    cols.forEach((col, idx) => {
      const cX = 40 + idx * 348;
      comps.push({
        id: `kanban-col-${idx + 1}-${Date.now()}`,
        name: `Column: ${col.name}`,
        type: 'frame',
        x: cX,
        y: 40,
        width: 330,
        height: 800,
        fills: [{ fillColor: surface }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 14,
        padding: 16,
        children: [
          { id: `col-head-${idx}`, name: 'Header', type: 'text', text: `${col.name} (${col.count})`, fontSize: 15, fontWeight: 'bold', color: col.color, x: 16, y: 16, width: 298, height: 26 },
          { id: `card-1-${idx}`, name: 'Task Card 1', type: 'card', text: `${col.tasks[0]}\nPriority: High · 5 Pts`, fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 8, color: textPrimary, x: 16, y: 56, width: 298, height: 80 },
          { id: `card-2-${idx}`, name: 'Task Card 2', type: 'card', text: `${col.tasks[1]}\nPriority: Normal · 3 Pts`, fontSize: 12, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 8, color: textPrimary, x: 16, y: 148, width: 298, height: 80 },
          { id: `add-task-${idx}`, name: '+ Add Task', type: 'button', text: '+ Add New Task', fontSize: 12, color: textSecondary, fills: [{ fillColor: 'transparent' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, x: 16, y: 740, width: 298, height: 36 }
        ]
      });
    });

    return {
      components: comps,
      title: `${derivedTitle} Kanban Board`,
      description: 'Agile Sprint Kanban Board with Multi-Stage Columns',
      theme,
      steps: cols.map((col, idx) => ({
        step: idx + 1,
        name: `Column: ${col.name}`,
        type: 'frame',
        x: 40 + idx * 348,
        y: 40,
        width: 330,
        height: 800,
        action: `Constructing ${col.name} Column with task cards`
      })),
      changesSummary: 'Synthesized 4-column Agile Kanban Board with interactive sprint cards'
    };
  }

  // Category E: PRICING / SUBSCRIPTION MATRIX
  if (p.includes('pricing') || p.includes('tier') || p.includes('subscription') || p.includes('plan') || p.includes('billing')) {
    const tiers = [
      { name: 'Starter', price: '$0 / mo', desc: 'For individuals and hobby developers', badge: 'Free Forever', highlight: false },
      { name: 'Pro Developer', price: '$29 / mo', desc: 'Unlimited AI generation & real-time sync', badge: 'Most Popular', highlight: true },
      { name: 'Enterprise Team', price: '$99 / mo', desc: 'Multi-user workspace isolation & SLAs', badge: 'Full Power', highlight: false }
    ];

    const comps: LayoutComponent[] = [
      {
        id: `pricing-header-${Date.now()}`,
        name: 'Pricing Page Header',
        type: 'text',
        text: '💎 Flexible Plans for High-Velocity Engineering Teams',
        fontSize: 24,
        fontWeight: 'bold',
        color: textPrimary,
        x: 40,
        y: 40,
        width: 1360,
        height: 40
      }
    ];

    tiers.forEach((t, idx) => {
      const tX = 140 + idx * 400;
      comps.push({
        id: `tier-card-${idx + 1}-${Date.now()}`,
        name: `Tier: ${t.name}`,
        type: 'card',
        x: tX,
        y: 120,
        width: 360,
        height: 680,
        fills: [{ fillColor: t.highlight ? (isDark ? '#1e1b4b' : '#ede9fe') : surface }],
        strokes: [{ strokeColor: t.highlight ? primaryAccent : surfaceBorder, strokeWidth: t.highlight ? 2 : 1 }],
        borderRadius: 18,
        padding: 32,
        children: [
          { id: `t-badge-${idx}`, name: 'Badge', type: 'badge', text: t.badge, fontSize: 11, fontWeight: 'bold', color: t.highlight ? primaryAccent : emeraldAccent, fills: [{ fillColor: `${t.highlight ? primaryAccent : emeraldAccent}22` }], borderRadius: 99, x: 32, y: 24, width: 110, height: 26 },
          { id: `t-title-${idx}`, name: 'Title', type: 'text', text: t.name, fontSize: 20, fontWeight: 'bold', color: textPrimary, x: 32, y: 64, width: 296, height: 30 },
          { id: `t-price-${idx}`, name: 'Price', type: 'text', text: t.price, fontSize: 28, fontWeight: 'bold', color: t.highlight ? primaryAccent : emeraldAccent, x: 32, y: 104, width: 296, height: 40 },
          { id: `t-desc-${idx}`, name: 'Description', type: 'text', text: t.desc, fontSize: 13, color: textSecondary, x: 32, y: 154, width: 296, height: 36 },
          { id: `t-feats-${idx}`, name: 'Features', type: 'text', text: '✓ Unlimited OpenPencil Native .fig Export\n✓ Live Progressive Element Streaming\n✓ MongoDB Atlas & SQLite Sync\n✓ AES-256 Encrypted Credential Vault\n✓ Flow Audit AST Call Graphs', fontSize: 13, color: textPrimary, x: 32, y: 210, width: 296, height: 160 },
          { id: `t-btn-${idx}`, name: 'CTA Button', type: 'button', text: t.highlight ? 'Start 14-Day Free Pro Trial ➔' : 'Select Plan', fontSize: 14, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: t.highlight ? primaryAccent : (isDark ? '#334155' : '#0f172a') }], borderRadius: 10, x: 32, y: 590, width: 296, height: 48 }
        ]
      });
    });

    return {
      components: comps,
      title: `${derivedTitle} Pricing Matrix`,
      description: 'Tiered Pricing Matrix with Features Comparison',
      theme,
      steps: tiers.map((t, idx) => ({
        step: idx + 1,
        name: `Tier: ${t.name}`,
        type: 'card',
        x: 140 + idx * 400,
        y: 120,
        width: 360,
        height: 680,
        action: `Synthesizing ${t.name} Tier Card & Feature Matrix`
      })),
      changesSummary: 'Synthesized 3-tier SaaS pricing comparison matrix'
    };
  }

  // =========================================================================
  // Category F: DYNAMIC OPEN-ENDED SEMANTIC AST SYNTHESIZER (ZERO REPETITION)
  // Decomposes the prompt into custom domain entities, metrics, cards, and tables
  // =========================================================================
  const components: LayoutComponent[] = [];
  const steps: Array<{ step: number; name: string; type: string; x: number; y: number; width: number; height: number; action: string }> = [];

  // 1. Top Navigation Bar customized to prompt domain
  const navBar: LayoutComponent = {
    id: `dyn-nav-${Date.now()}`,
    name: `${derivedTitle} Navigation Header`,
    type: 'frame',
    x: 40,
    y: 24,
    width: boardWidth - 80,
    height: 70,
    fills: [{ fillColor: surface }],
    strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
    borderRadius: 14,
    padding: 20,
    children: [
      { id: 'dyn-logo', name: 'Brand Title', type: 'text', text: `❖ ${derivedTitle}`, fontSize: 18, fontWeight: 'bold', color: primaryAccent, x: 24, y: 22, width: 340, height: 28 },
      { id: 'dyn-search', name: 'Search Filter', type: 'input', text: `🔍 Search in ${derivedTitle.toLowerCase()}...`, fontSize: 12, fills: [{ fillColor: isDark ? '#0c111d' : '#f8fafc' }], strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }], borderRadius: 8, color: textSecondary, x: 380, y: 16, width: 440, height: 38 },
      { id: 'dyn-action-btn', name: 'Primary Action', type: 'button', text: `+ New ${rawWords[0] || 'Entry'}`, fontSize: 13, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: boardWidth - 280, y: 16, width: 140, height: 38 }
    ]
  };
  components.push(navBar);
  steps.push({ step: 1, name: `${derivedTitle} Header`, type: 'frame', x: 40, y: 24, width: boardWidth - 80, height: 70, action: `Drafting custom ${derivedTitle} Navigation Bar` });

  // 2. Domain Metric KPI Cards (Tailored to prompt semantics)
  const isFinance = p.includes('crypto') || p.includes('stock') || p.includes('trade') || p.includes('money') || p.includes('bank') || p.includes('wallet') || p.includes('finance');
  const isHealth = p.includes('health') || p.includes('fitness') || p.includes('workout') || p.includes('gym') || p.includes('medical') || p.includes('patient') || p.includes('doctor');
  const isMedia = p.includes('music') || p.includes('video') || p.includes('photo') || p.includes('player') || p.includes('stream') || p.includes('movie') || p.includes('podcast');
  const isDev = p.includes('code') || p.includes('server') || p.includes('cloud') || p.includes('cluster') || p.includes('api') || p.includes('docker') || p.includes('k8s');

  const domainMetrics = isFinance
    ? [
        { label: 'Total Portfolio Balance', val: '$84,920.50', sub: '+12.4% this week', col: emeraldAccent },
        { label: '24h Trading Volume', val: '$1.42M', sub: 'High Liquidity', col: cyanAccent },
        { label: 'Active Orders', val: '18 Open', sub: 'Limit & Stop', col: amberAccent },
        { label: 'Realized PnL', val: '+$6,420.00', sub: '84% Win Rate', col: primaryAccent }
      ]
    : isHealth
    ? [
        { label: 'Daily Calorie Burn', val: '2,450 kcal', sub: 'Target: 2,500 kcal', col: roseAccent },
        { label: 'Active Workout Streak', val: '14 Days', sub: 'Personal Record', col: amberAccent },
        { label: 'Avg Resting Heart Rate', val: '62 bpm', sub: 'Optimal Health', col: emeraldAccent },
        { label: 'Weekly Active Time', val: '8.5 Hours', sub: '+1.2 hrs vs last week', col: cyanAccent }
      ]
    : isMedia
    ? [
        { label: 'Now Streaming', val: 'Lossless FLAC 24-bit', sub: 'Spatial Audio Enabled', col: primaryAccent },
        { label: 'Monthly Listeners', val: '1.2M Active', sub: '+28% growth', col: emeraldAccent },
        { label: 'Playlist Tracks', val: '342 Songs', sub: '18.4 hrs duration', col: cyanAccent },
        { label: 'Cloud Storage Used', val: '64.2 GB', sub: 'Offline Cache', col: amberAccent }
      ]
    : isDev
    ? [
        { label: 'Microservice Nodes', val: '16 Running', sub: '100% Uptime', col: emeraldAccent },
        { label: 'Throughput', val: '28,400 req/s', sub: 'Latency: 1.2ms', col: cyanAccent },
        { label: 'Memory Allocation', val: '12.8 / 32 GB', sub: 'Optimal Heap', col: primaryAccent },
        { label: 'Error Rate', val: '0.002%', sub: 'Zero Critical Flags', col: amberAccent }
      ]
    : [
        { label: `Total ${rawWords[0] || 'Items'} Managed`, val: '1,420 Active', sub: 'Real-time sync', col: primaryAccent },
        { label: 'Operational Efficiency', val: '98.6%', sub: '+4.2% optimization', col: emeraldAccent },
        { label: 'Active Collaborators', val: '24 Members', sub: '8 currently online', col: cyanAccent },
        { label: 'System Health', val: 'All Systems Normal', sub: 'Zero latency spikes', col: amberAccent }
      ];

  const cardWidth = Math.floor((boardWidth - 80 - 3 * 20) / 4);
  domainMetrics.forEach((m, idx) => {
    const cX = 40 + idx * (cardWidth + 20);
    components.push({
      id: `dyn-kpi-${idx + 1}-${Date.now()}`,
      name: `Metric Card: ${m.label}`,
      type: 'card',
      x: cX,
      y: 114,
      width: cardWidth,
      height: 120,
      fills: [{ fillColor: surface }],
      strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
      borderRadius: 14,
      padding: 16,
      children: [
        { id: `kpi-lbl-${idx}`, name: 'Label', type: 'text', text: m.label, fontSize: 12, color: textSecondary, x: 16, y: 16, width: cardWidth - 32, height: 20 },
        { id: `kpi-val-${idx}`, name: 'Value', type: 'text', text: m.val, fontSize: 20, fontWeight: 'bold', color: textPrimary, x: 16, y: 44, width: cardWidth - 32, height: 30 },
        { id: `kpi-sub-${idx}`, name: 'Sub', type: 'text', text: m.sub, fontSize: 11, fontWeight: '600', color: m.col, x: 16, y: 80, width: cardWidth - 32, height: 20 }
      ]
    });
  });
  steps.push({ step: 2, name: 'Domain Metric Cards', type: 'card', x: 40, y: 114, width: boardWidth - 80, height: 120, action: `Generating ${domainMetrics.length} Domain Metric Cards` });

  // 3. Central Interactive Canvas Feature (Customized based on topic)
  const mainFeatureWidth = Math.floor((boardWidth - 80) * 0.64);
  const sideFeatureWidth = boardWidth - 80 - mainFeatureWidth - 24;

  const mainFeature: LayoutComponent = {
    id: `dyn-main-feat-${Date.now()}`,
    name: `${derivedTitle} Primary Workspace`,
    type: 'frame',
    x: 40,
    y: 254,
    width: mainFeatureWidth,
    height: 340,
    fills: [{ fillColor: surface }],
    strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
    borderRadius: 16,
    padding: 24,
    children: [
      { id: 'feat-header', name: 'Header', type: 'text', text: `📈 ${derivedTitle} Live Analytics & Flow Stream`, fontSize: 16, fontWeight: 'bold', color: textPrimary, x: 24, y: 20, width: mainFeatureWidth - 48, height: 28 },
      { id: 'feat-sub', name: 'Sub', type: 'text', text: `Real-time activity and entity telemetry updated live for ${prompt}`, fontSize: 12, color: textSecondary, x: 24, y: 52, width: mainFeatureWidth - 48, height: 20 },
      {
        id: 'feat-chart-canvas',
        name: 'Telemetry Waveform Chart',
        type: 'chart',
        x: 24,
        y: 86,
        width: mainFeatureWidth - 48,
        height: 220,
        fills: [{ fillColor: isDark ? '#0c111d' : '#f8fafc' }],
        strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
        borderRadius: 12,
        text: `Live Telemetry Waveform (${derivedTitle})`
      }
    ]
  };
  components.push(mainFeature);

  // 4. Side Entity Controller / Action Feed
  const sideFeature: LayoutComponent = {
    id: `dyn-side-feat-${Date.now()}`,
    name: `${derivedTitle} Action Console`,
    type: 'frame',
    x: 40 + mainFeatureWidth + 24,
    y: 254,
    width: sideFeatureWidth,
    height: 340,
    fills: [{ fillColor: surface }],
    strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
    borderRadius: 16,
    padding: 20,
    children: [
      { id: 'side-title', name: 'Title', type: 'text', text: `⚡ Quick Controls`, fontSize: 15, fontWeight: 'bold', color: textPrimary, x: 20, y: 20, width: sideFeatureWidth - 40, height: 24 },
      { id: 'ctrl-1', name: 'Control 1', type: 'button', text: `⚙️ Configure ${rawWords[0] || 'System'}`, fontSize: 13, fontWeight: '600', color: textPrimary, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 8, x: 20, y: 60, width: sideFeatureWidth - 40, height: 44 },
      { id: 'ctrl-2', name: 'Control 2', type: 'button', text: `📊 Export ${rawWords[0] || 'Data'} Report`, fontSize: 13, fontWeight: '600', color: textPrimary, fills: [{ fillColor: isDark ? '#1e293b' : '#f1f5f9' }], borderRadius: 8, x: 20, y: 114, width: sideFeatureWidth - 40, height: 44 },
      { id: 'ctrl-3', name: 'Control 3', type: 'button', text: `🚀 Run Automated Pipeline`, fontSize: 13, fontWeight: 'bold', color: '#ffffff', fills: [{ fillColor: primaryAccent }], borderRadius: 8, x: 20, y: 168, width: sideFeatureWidth - 40, height: 44 },
      { id: 'ctrl-notice', name: 'Notice', type: 'text', text: `● All ${rawWords.length} semantic parameters verified`, fontSize: 11, color: emeraldAccent, x: 20, y: 240, width: sideFeatureWidth - 40, height: 20 }
    ]
  };
  components.push(sideFeature);
  steps.push({ step: 3, name: 'Workspace Feature Panels', type: 'frame', x: 40, y: 254, width: boardWidth - 80, height: 340, action: `Positioning Main Waveform & Control Panels` });

  // 5. Bottom Entity Data Table
  const bottomTable: LayoutComponent = {
    id: `dyn-table-${Date.now()}`,
    name: `${derivedTitle} Entity Grid`,
    type: 'table',
    x: 40,
    y: 614,
    width: boardWidth - 80,
    height: 260,
    fills: [{ fillColor: surface }],
    strokes: [{ strokeColor: surfaceBorder, strokeWidth: 1 }],
    borderRadius: 16,
    text: `📋 ${derivedTitle} Data Entities & Activity Log (${prompt})`
  };
  components.push(bottomTable);
  steps.push({ step: 4, name: 'Data Grid Records', type: 'table', x: 40, y: 614, width: boardWidth - 80, height: 260, action: `Synthesizing ${derivedTitle} Live Data Grid` });

  return {
    components,
    title: derivedTitle,
    description: `Stitch AI Semantic Spec: ${prompt}`,
    theme,
    steps,
    changesSummary: `Synthesized tailored ${derivedTitle} interface with ${components.length} custom domain components`
  };
}
