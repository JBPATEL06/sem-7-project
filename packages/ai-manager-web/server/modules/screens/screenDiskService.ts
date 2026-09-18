import fs from 'fs';
import path from 'path';
import { ScreenLayoutSpec, localScreenStore, DEFAULT_SCREEN_THEME } from './screenTypes.js';
import { exportScreenToFigBuffer } from './figExporter.js';
import { ScreenModel } from '../../models/index.js';
import { getIsMongoConnected } from '../auth/auth.js';
import { getWorkspaceRootDir } from '../../shared/index.js';

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

/**
 * Indexes any manually added or edited files in ui/ into memory/store
 */
export async function syncDiskScreensToStore(projectId: string = 'acme-api', userId: string = 'usr_admin_default'): Promise<void> {
  try {
    const rootDir = getWorkspaceRootDir();
    const targetDir = path.join(rootDir, 'ui');
    if (!fs.existsSync(targetDir)) return;

    const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.json') && !f.endsWith('.penpot.json') || f.endsWith('.penpot.json'));
    const existingList = await localScreenStore.getAll();
    const existingSlugs = new Set(existingList.map((s: any) => getScreenSlug(s.name)));

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
    console.error('[Screens] Failed to sync disk screens to store:', err);
  }
}
