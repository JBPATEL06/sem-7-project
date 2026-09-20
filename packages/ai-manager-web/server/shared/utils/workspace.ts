import path from 'path';
import fs from 'fs';

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
