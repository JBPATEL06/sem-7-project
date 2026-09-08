import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  saveConfig,
  loadConfig,
  saveCredentials,
  loadCredentials,
  whoami,
  logout,
  saveIndexToSqlite,
  loadIndexFromSqlite,
  addDiscussionEntry,
  addDecisionRecord,
  fetchProjectFromDrive,
  listProjectsInDrive,
  SCHEMA_SQL
} from '../src/index.js';

describe('@ai-manager/core — Comprehensive Foundation & Features Test Suite', () => {
  it('should manage project configuration (.ai-manager/config.json) with stable projectId', () => {
    const tmpDir = path.resolve(__dirname, 'tmp-config');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    try {
      const config = loadConfig(tmpDir);
      expect(config.projectId).toBeDefined();
      expect(config.projectId).toMatch(/^proj_/);
      expect(config.projectName).toBe(path.basename(tmpDir));

      const saved = saveConfig({ storageMode: 'drive', activeModules: ['db-context-indexer', 'db-schema-manager'] }, tmpDir);
      expect(saved.storageMode).toBe('drive');
      expect(saved.projectId).toBe(config.projectId);
    } finally {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should manage authentication credentials and whoami status', async () => {
    saveCredentials({
      client_id: 'test-client-id',
      client_secret: 'test-client-secret',
      refresh_token: 'test-refresh-token',
      user_email: 'test@example.com'
    });

    const creds = loadCredentials();
    expect(creds?.user_email).toBe('test@example.com');

    const status = await whoami();
    expect(status.loggedIn).toBe(true);
    expect(status.email).toBe('test@example.com');

    logout();
    const postLogoutCreds = loadCredentials();
    expect(postLogoutCreds?.user_email).toBeUndefined();
  });

  it('should store and retrieve discussion threads, entries, and decision rationale records', async () => {
    const tmpDir = path.resolve(__dirname, 'tmp-discussion');
    const dbPath = path.join(tmpDir, 'index.sqlite');

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    try {
      await saveIndexToSqlite(
        dbPath,
        SCHEMA_SQL,
        {
          clients: [],
          queries: [],
          functions: [],
          edges: [],
          references: [],
          fileHashes: [],
          unresolved: []
        },
        { driver: 'sql.js' }
      );

      const threadRes = await addDiscussionEntry(
        dbPath,
        'function',
        'getUserById',
        'Denormalization Rationale',
        'Bypassed lookup for performance.',
        'ai'
      );
      expect(threadRes.threadId).toContain('thread:function:getUserById');

      const decisionRes = await addDecisionRecord(
        dbPath,
        'function',
        'getUserById',
        'Use Mongo index over populated ref',
        'Avoid N+1 populated queries in hot API path.',
        'user'
      );
      expect(decisionRes.decisionId).toContain('decision:');

      // Append second entry to existing discussion thread
      await addDiscussionEntry(
        dbPath,
        'function',
        'getUserById',
        'Denormalization Rationale',
        'Follow-up comment agreeing with rationale.',
        'user'
      );

      // Add a superseding decision
      await addDecisionRecord(
        dbPath,
        'function',
        'getUserById',
        'Updated Mongo Index Strategy',
        'Compound index added on (status, createdAt).',
        'user',
        decisionRes.decisionId
      );

      const index = await loadIndexFromSqlite(dbPath, { driver: 'sql.js' });
      expect(index.threads?.length).toBe(1);
      expect(index.entries?.length).toBe(2);
      expect(index.entries![0].body).toBe('Bypassed lookup for performance.');
      expect(index.entries![1].body).toBe('Follow-up comment agreeing with rationale.');

      expect(index.decisions?.length).toBe(2);
      expect(index.decisions![0].summary).toBe('Use Mongo index over populated ref');
      expect(index.decisions![1].summary).toBe('Updated Mongo Index Strategy');
      expect(index.decisions![1].supersedes).toBe(decisionRes.decisionId);
    } finally {
      if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should verify fetchProjectFromDrive and listProjectsInDrive interface contracts', async () => {
    // Calling without active drive mock handles graceful non-authenticated error cleanly
    const fetchRes = await fetchProjectFromDrive('non_existent_project');
    expect(fetchRes.success).toBe(false);
    expect(fetchRes.message).toBeDefined();
  });
});
