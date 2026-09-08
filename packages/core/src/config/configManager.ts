import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { PlatformConfig } from '../types/index.js';

export function getConfigPath(rootDir: string = '.'): string {
  const aiManagerConfig = path.join(rootDir, '.ai-manager', 'config.json');
  const legacyDbciConfig = path.join(rootDir, '.dbci', 'config.json');

  if (fs.existsSync(aiManagerConfig)) {
    return aiManagerConfig;
  }
  if (fs.existsSync(legacyDbciConfig)) {
    return legacyDbciConfig;
  }
  return aiManagerConfig;
}

function generateDefaultConfig(rootDir: string = '.'): PlatformConfig {
  const absoluteDir = path.resolve(rootDir);
  const baseName = path.basename(absoluteDir);
  const hash = crypto.createHash('md5').update(absoluteDir).digest('hex').substring(0, 8);

  return {
    version: '0.2.0',
    projectId: `proj_${hash}`,
    projectName: baseName,
    storageMode: 'local',
    driveFolderName: 'dbci',
    activeModules: ['db-context-indexer']
  };
}

export function loadConfig(rootDir: string = '.'): PlatformConfig {
  const configPath = getConfigPath(rootDir);
  const defaults = generateDefaultConfig(rootDir);

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        projectId: parsed.projectId || defaults.projectId,
        projectName: parsed.projectName || defaults.projectName
      };
    } catch {
      return defaults;
    }
  }

  return defaults;
}

export function saveConfig(config: Partial<PlatformConfig>, rootDir: string = '.'): PlatformConfig {
  const configPath = getConfigPath(rootDir);
  const current = loadConfig(rootDir);
  const updated: PlatformConfig = { ...current, ...config };

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
  return updated;
}
