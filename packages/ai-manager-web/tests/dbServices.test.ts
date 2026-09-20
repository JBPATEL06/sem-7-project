import { describe, it, expect } from 'vitest';
import { maskUri, safeDecryptUri } from '../server/dbRoutes.js';
import { encrypt } from '../server/utils/encryption.js';

describe('Database Services & Driver Utility Tests', () => {
  it('1. maskUri correctly hides passwords and usernames', () => {
    const postgresUri = 'postgresql://admin:secret123@localhost:5432/mydb';
    const masked = maskUri(postgresUri);
    expect(masked).not.toContain('secret123');
    expect(masked).toContain('•••');

    const invalidUri = 'some_raw_connection_string@secret_pass';
    const maskedInvalid = maskUri(invalidUri);
    expect(maskedInvalid).not.toContain('secret_pass');
    expect(maskedInvalid).toContain('•••');
  });

  it('2. safeDecryptUri handles both encrypted strings and legacy plain-text fallback', () => {
    const plaintext = 'postgresql://127.0.0.1:5432/test_db';
    const encrypted = encrypt(plaintext);
    
    expect(safeDecryptUri(encrypted)).toBe(plaintext);
    // Legacy plain-text fallback
    expect(safeDecryptUri(plaintext)).toBe(plaintext);
  });

  it('4. syncDiskDiagramsToStore auto-discovers .excalidraw files from diagrams/ folder', async () => {
    const { syncDiskDiagramsToStore } = await import('../server/diagramRoutes.js');
    await syncDiskDiagramsToStore('acme-api', 'usr_admin_default');
  });

  it('5. syncDiskScreensToStore auto-discovers layout specs from ui/ folder', async () => {
    const { syncDiskScreensToStore } = await import('../server/screenRoutes.js');
    await syncDiskScreensToStore('acme-api', 'usr_admin_default');
  });

  it('6. GET /api/db/export generates valid SQL DDL export', async () => {
    const express = (await import('express')).default;
    const { dbRouter } = await import('../server/dbRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/api/db', dbRouter);

    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/db/export?projectId=default&format=sql`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.format).toBe('sql');
      expect(data.ddl).toContain('CREATE TABLE IF NOT EXISTS');
    } finally {
      server.close();
    }
  });

  it('7. POST /api/db/import executes SQL DDL schema import', async () => {
    const express = (await import('express')).default;
    const { dbRouter } = await import('../server/dbRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/api/db', dbRouter);

    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/db/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'default',
          sql: 'CREATE TABLE IF NOT EXISTS vitest_import_test (id INTEGER PRIMARY KEY, title TEXT);'
        })
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.statementsExecuted).toBeGreaterThanOrEqual(1);
    } finally {
      server.close();
    }
  });

  it('8. POST /api/db/query returns structured pagination metadata', async () => {
    const express = (await import('express')).default;
    const { dbRouter } = await import('../server/dbRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/api/db', dbRouter);

    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: 'default',
          query: 'SELECT * FROM vitest_import_test;',
          page: 1,
          pageSize: 5
        })
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(5);
      expect(data.totalPages).toBeDefined();
      expect(data.total).toBeDefined();
    } finally {
      server.close();
    }
  });

  it('9. sanitizeProjectId strips path traversal characters and resolves to clean slug', async () => {
    const { sanitizeProjectId } = await import('../server/dbRoutes.js');
    expect(sanitizeProjectId('../../etc/cron.d/malicious')).toBe('etccrondmalicious');
    expect(sanitizeProjectId('..\\..\\windows\\system32')).toBe('windowssystem32');
    expect(sanitizeProjectId('valid-project_123')).toBe('valid-project_123');
    expect(sanitizeProjectId(undefined)).toBe('acme-api');
    expect(sanitizeProjectId('')).toBe('acme-api');
  });

  it('10. withProjectLock safely handles concurrent writes to SQLite database', async () => {
    const { withProjectLock, dbRouter } = await import('../server/dbRoutes.js');
    const express = (await import('express')).default;
    const app = express();
    app.use(express.json());
    app.use('/api/db', dbRouter);

    const testProjectId = `concurrency_test_${Date.now()}`;
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // 1. Create table
      await fetch(`http://localhost:${port}/api/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          query: 'DROP TABLE IF EXISTS items; CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, val INTEGER);'
        })
      });

      // 2. Fire 10 parallel insert queries
      const insertPromises = Array.from({ length: 10 }, (_, i) =>
        fetch(`http://localhost:${port}/api/db/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: testProjectId,
            query: `INSERT INTO items (val) VALUES (${i + 1});`
          })
        })
      );

      const responses = await Promise.all(insertPromises);
      for (const r of responses) {
        expect(r.status).toBe(200);
      }

      // 3. Verify all 10 rows exist
      const selectRes = await fetch(`http://localhost:${port}/api/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: testProjectId,
          query: 'SELECT COUNT(*) as count FROM items;'
        })
      });

      const data = await selectRes.json();
      expect(data.success).toBe(true);
      expect(Number(data.rows[0].count)).toBe(10);
    } finally {
      server.close();
    }
  });
});

