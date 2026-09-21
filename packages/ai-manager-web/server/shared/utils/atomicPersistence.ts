import fs from 'fs';
import path from 'path';

export interface AtomicWriteOptions {
  maxBackups?: number;
  createBackup?: boolean;
}

/**
 * Performs atomic file writes via a .tmp directory and atomic fs.renameSync.
 * Automatically manages up to N versioned backups in a .backups directory.
 */
export function atomicWriteFileSync(
  filePath: string,
  data: string | Buffer,
  options: AtomicWriteOptions = {}
): void {
  const { maxBackups = 5, createBackup = true } = options;
  const dir = path.dirname(filePath);
  const fileName = path.basename(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // 1. Versioned Backup before overwrite
  if (createBackup && fs.existsSync(filePath)) {
    try {
      const backupDir = path.join(dir, '.backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `${fileName}.${timestamp}.bak`);
      fs.copyFileSync(filePath, backupPath);

      // Prune backups exceeding maxBackups limit for this file
      const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith(`${fileName}.`) && f.endsWith('.bak'))
        .map(f => {
          const fullPath = path.join(backupDir, f);
          return {
            name: f,
            fullPath,
            mtime: fs.statSync(fullPath).mtimeMs
          };
        })
        .sort((a, b) => b.mtime - a.mtime);

      if (backupFiles.length > maxBackups) {
        for (let i = maxBackups; i < backupFiles.length; i++) {
          try {
            fs.unlinkSync(backupFiles[i].fullPath);
          } catch {}
        }
      }
    } catch (err: any) {
      console.error(`[AtomicPersistence] Warning: Backup snapshot failed for ${fileName}:`, err.message);
    }
  }

  // 2. Atomic write: Write to .tmp/ directory first, then renameSync
  const tmpDir = path.join(dir, '.tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const tmpPath = path.join(tmpDir, `${fileName}.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  fs.writeFileSync(tmpPath, data);
  fs.renameSync(tmpPath, filePath);
}
