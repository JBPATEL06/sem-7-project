import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import fg from 'fast-glob';
import { FileHashEntry } from '../types.js';

export interface IncrementalDiff {
  unchanged: string[];
  changed: string[];
  newFiles: string[];
  deleted: string[];
}

export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function diffFileHashes(
  currentFiles: string[],
  existingHashes: FileHashEntry[]
): IncrementalDiff {
  const existingMap = new Map<string, string>();
  for (const entry of existingHashes) {
    existingMap.set(entry.file, entry.contentHash);
  }

  const unchanged: string[] = [];
  const changed: string[] = [];
  const newFiles: string[] = [];
  const seenFiles = new Set<string>();

  for (const absPath of currentFiles) {
    const relPath = absPath.replace(/\\/g, '/');
    seenFiles.add(relPath);

    const newHash = computeFileHash(absPath);
    if (!existingMap.has(relPath)) {
      newFiles.push(relPath);
    } else if (existingMap.get(relPath) === newHash) {
      unchanged.push(relPath);
    } else {
      changed.push(relPath);
    }
  }

  const deleted: string[] = [];
  for (const oldFile of existingMap.keys()) {
    if (!seenFiles.has(oldFile)) {
      deleted.push(oldFile);
    }
  }

  return {
    unchanged,
    changed,
    newFiles,
    deleted
  };
}
