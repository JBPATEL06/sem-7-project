import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { buildIndex } from '../src/core/indexBuilder.js';
import { cascadeDeleteFileFromIndex, loadIndexFromSqlite } from '../src/db/sqliteStore.js';

describe('DB Context Indexer v0.2 — Integration Test Suite', () => {
  it('should scan mongo-sample fixture and verify resolution, transitive call-graph, and unresolved dynamic targets', async () => {
    const mongoFixtureDir = path.resolve(__dirname, 'fixtures/mongo-sample');
    const result = await buildIndex({ rootDir: mongoFixtureDir, full: true });

    expect(result.clients.length).toBeGreaterThanOrEqual(1);
    const client = result.clients.find((c) => c.dbType === 'mongodb');
    expect(client).toBeDefined();

    const userQuery = result.queries.find((q) => q.target === 'users');
    expect(userQuery).toBeDefined();
    expect(userQuery?.resolved).toBe(true);

    const routeHandlerFunc = result.functions.find((f) => f.name === 'routeHandler');
    expect(routeHandlerFunc).toBeDefined();
    expect(routeHandlerFunc?.transitiveTouchesDb).toContain('mongodb');

    const dynamicQuery = result.queries.find((q) => q.enclosingFunction === 'getDynamicCollection');
    expect(dynamicQuery).toBeDefined();
    expect(dynamicQuery?.resolved).toBe(false);
  });

  it('should scan firebase-sample fixture and verify Firestore collection detection & unresolved paths', async () => {
    const firebaseFixtureDir = path.resolve(__dirname, 'fixtures/firebase-sample');
    const result = await buildIndex({ rootDir: firebaseFixtureDir, full: true });

    expect(result.clients.some((c) => c.dbType === 'firebase')).toBe(true);
    const orderQuery = result.queries.find((q) => q.target === 'orders');
    expect(orderQuery?.resolved).toBe(true);

    const dynamicDocQuery = result.queries.find((q) => q.enclosingFunction === 'getDynamicDoc');
    expect(dynamicDocQuery?.resolved).toBe(false);
  });

  it('should scan supabase-sample fixture and verify select chain target extraction', async () => {
    const supabaseFixtureDir = path.resolve(__dirname, 'fixtures/supabase-sample');
    const result = await buildIndex({ rootDir: supabaseFixtureDir, full: true });

    expect(result.clients.some((c) => c.dbType === 'supabase')).toBe(true);
    const productQuery = result.queries.find((q) => q.target === 'products');
    expect(productQuery?.resolved).toBe(true);

    const dynamicTableQuery = result.queries.find((q) => q.enclosingFunction === 'getDynamicTable');
    expect(dynamicTableQuery?.resolved).toBe(false);
  });

  it('should scan mysql-sample fixture, verify local-xampp detection, multi-table join parsing, and dynamic queries', async () => {
    const mysqlFixtureDir = path.resolve(__dirname, 'fixtures/mysql-sample');
    const result = await buildIndex({ rootDir: mysqlFixtureDir, full: true });

    const client = result.clients.find((c) => c.dbType === 'mysql');
    expect(client).toBeDefined();
    expect(client?.metadata?.['local-xampp-likely']).toBe(true);

    const reportQuery = result.queries.find((q) => q.enclosingFunction === 'getReport');
    expect(reportQuery?.target).toContain('users');
    expect(reportQuery?.target).toContain('orders');
    expect(reportQuery?.resolved).toBe(true);

    const dynamicQuery = result.queries.find((q) => q.enclosingFunction === 'runDynamicQuery');
    expect(dynamicQuery?.resolved).toBe(false);
    expect(dynamicQuery?.unresolvedReason).toBeDefined();
  });

  it('should verify incremental scan caching on unchanged files', async () => {
    const mongoFixtureDir = path.resolve(__dirname, 'fixtures/mongo-sample');
    const firstResult = await buildIndex({ rootDir: mongoFixtureDir, full: true });
    const secondResult = await buildIndex({ rootDir: mongoFixtureDir });

    expect(secondResult.queries.length).toBe(firstResult.queries.length);
    expect(secondResult.functions.length).toBe(firstResult.functions.length);
    expect(secondResult.clients.length).toBe(firstResult.clients.length);
  });

  it('should verify directional cascade deletion when caller file is deleted', async () => {
    const tmpFixtureDir = path.resolve(__dirname, 'fixtures/tmp-incremental');
    if (!fs.existsSync(tmpFixtureDir)) {
      fs.mkdirSync(tmpFixtureDir, { recursive: true });
    }

    const fileBPath = path.join(tmpFixtureDir, 'serviceB.ts');
    const fileAPath = path.join(tmpFixtureDir, 'callerA.ts');

    fs.writeFileSync(fileBPath, `export function calleeFunc() { return 'hello'; }`);
    fs.writeFileSync(fileAPath, `import { calleeFunc } from './serviceB'; export function callerFunc() { return calleeFunc(); }`);

    try {
      const initialIndex = await buildIndex({ rootDir: tmpFixtureDir, full: true });

      expect(initialIndex.functions.some((f) => f.name === 'callerFunc')).toBe(true);
      expect(initialIndex.functions.some((f) => f.name === 'calleeFunc')).toBe(true);
      expect(initialIndex.edges.length).toBeGreaterThan(0);

      // Delete caller file A
      fs.unlinkSync(fileAPath);

      const dbPath = path.join(tmpFixtureDir, '.dbci', 'index.sqlite');
      await cascadeDeleteFileFromIndex(dbPath, 'callerA.ts');
      const updatedIndex = await loadIndexFromSqlite(dbPath);

      // Caller file A rows & call edge removed
      expect(updatedIndex.functions.some((f) => f.name === 'callerFunc')).toBe(false);
      expect(updatedIndex.edges.some((e) => e.file.includes('callerA'))).toBe(false);

      // Callee file B's function row remains completely untouched
      expect(updatedIndex.functions.some((f) => f.name === 'calleeFunc')).toBe(true);
    } finally {
      if (fs.existsSync(fileAPath)) fs.unlinkSync(fileAPath);
      if (fs.existsSync(fileBPath)) fs.unlinkSync(fileBPath);
      if (fs.existsSync(tmpFixtureDir)) fs.rmSync(tmpFixtureDir, { recursive: true, force: true });
    }
  });

  it('should verify symbol reference indexing and lookup', async () => {
    const mongoFixtureDir = path.resolve(__dirname, 'fixtures/mongo-sample');
    const result = await buildIndex({ rootDir: mongoFixtureDir, full: true });

    expect(result.references).toBeDefined();
    expect(result.references.length).toBeGreaterThan(0);
  });

  it('should scan and detect Promise handlers and Event Emitter events', async () => {
    const tmpDir = path.resolve(__dirname, 'fixtures/tmp-async-test');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const code = `
      import { EventEmitter } from 'events';
      const emitter = new EventEmitter();

      function runAsync() {
        Promise.all([Promise.resolve(1)])
          .then((res) => {
            emitter.emit('async-success', res);
          })
          .catch((err) => {
            emitter.on('error', () => {});
          });
      }
    `;
    fs.writeFileSync(path.join(tmpDir, 'test-async.ts'), code, 'utf8');

    try {
      const result = await buildIndex({ rootDir: tmpDir, full: true });
      
      // Asserts
      const emitterEmit = result.queries.find((q) => q.dbType === 'emitter' && q.operation === 'emit');
      expect(emitterEmit).toBeDefined();
      expect(emitterEmit?.target).toBe('async-success');

      const promiseThen = result.queries.find((q) => q.dbType === 'promise' && q.operation === 'then');
      expect(promiseThen).toBeDefined();

      const promiseAll = result.queries.find((q) => q.dbType === 'promise' && q.operation === 'all');
      expect(promiseAll).toBeDefined();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
