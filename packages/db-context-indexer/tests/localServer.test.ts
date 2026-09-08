import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import http from 'http';
import { startLocalServer } from '../src/local-server/server.ts';
import { buildIndex } from '../src/core/indexBuilder.js';

import fs from 'fs';

const TEST_PORT = 4599;
let serverInstance: http.Server;

beforeAll(async () => {
  const rootDir = path.resolve('.');
  await buildIndex({ rootDir, full: true });

  const res = await startLocalServer({ port: TEST_PORT, rootDir });
  serverInstance = res.server;
});

afterAll(async () => {
  if (serverInstance) {
    await new Promise<void>((resolve) => serverInstance.close(() => resolve()));
  }
  const secretsPath = path.resolve('.dbci/local-secrets.json');
  if (fs.existsSync(secretsPath)) {
    fs.unlinkSync(secretsPath);
  }
});

describe('Phase 1 — Local Mode API Server Skeleton', () => {
  it('GET /local-api/summary returns local AST summary without auth or account requirement', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/summary`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.mode).toBe('LOCAL');
    expect(data.projectName).toBeDefined();
    expect(typeof data.functionsCount).toBe('number');
    expect(typeof data.queriesCount).toBe('number');
    expect(data.functionsCount).toBeGreaterThan(0);
  });

  it('GET /local-api/functions returns function declarations from index.sqlite', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/functions`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data.functions)).toBe(true);
    expect(data.functions.length).toBeGreaterThan(0);
    expect(data.functions[0].name).toBeDefined();
  });
});

describe('Phase 2 — Local Code Preview (Direct Disk Read)', () => {
  it('GET /local-api/functions/:id fetches function metadata and actual source code from local disk', async () => {
    const listRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/functions`);
    const listData = await listRes.json();
    const targetFn = listData.functions[0];

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/functions/${encodeURIComponent(targetFn.name)}`);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe(targetFn.name);
    expect(data.fileExists).toBe(true);
    expect(typeof data.code).toBe('string');
    expect(data.code.length).toBeGreaterThan(0);
    expect(data.code).not.toContain('// Function implementation code');
  });
});

describe('Phase 3 — Remaining Read-Only Local Routes', () => {
  it('GET /local-api/queries returns query list with optional ?db= and ?table= filters', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/queries`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(typeof data.queriesCount).toBe('number');
    expect(Array.isArray(data.queries)).toBe(true);

    const mongoRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/queries?db=mongodb`);
    const mongoData = await mongoRes.json();
    expect(mongoRes.status).toBe(200);
    expect(Array.isArray(mongoData.queries)).toBe(true);
  });

  it('GET /local-api/call-graph returns function nodes and call graph edges', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/call-graph`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(typeof data.edgesCount).toBe('number');
    expect(Array.isArray(data.edges)).toBe(true);
    expect(Array.isArray(data.functions)).toBe(true);
  });

  it('GET /local-api/discussions and GET /local-api/decisions return discussion & decision records', async () => {
    const discRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/discussions`);
    const discData = await discRes.json();
    expect(discRes.status).toBe(200);
    expect(Array.isArray(discData.threads)).toBe(true);

    const decRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/decisions`);
    const decData = await decRes.json();
    expect(decRes.status).toBe(200);
    expect(Array.isArray(decData.decisions)).toBe(true);
  });
});

describe('Phase 5 — Optional Local Groq Key & Local Encrypted Secrets', () => {
  it('POST /local-api/groq-key encrypts and saves API key locally in .dbci/local-secrets.json', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/groq-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'mock_groq_key_123456789' })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const getRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/groq-key`);
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.hasKey).toBe(true);
    expect(getData.maskedKey).toContain('6789');
  });

  it('POST /local-api/groq/chat returns grounded AST context in offline mock mode', async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/groq/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Explain the MongoDB queries indexed in this codebase' })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.response).toContain('[Local Groq Proxy]');
    expect(data.groundedContext).toContain('Project:');
  });

  it('POST /local-api/groq/chat executes live HTTPS call to api.groq.com when gsk_ key is provided', async () => {
    await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/groq-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'gsk_live_test_token_999' })
    });

    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/groq/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Test prompt' })
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(false);
    expect(data.error).toBeDefined();
    expect(data.groundedContext).toBeDefined();
  });

  it('Phase 6 — Local Mode Plans & Plan Progress Log Endpoints', async () => {
    // 1. Create a Plan
    const createRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Native MCP Server Feature Plan',
        goal: 'Expose dbci as native MCP server over stdio transport',
        createdBy: 'user_dev',
        sourceThreadId: 'thread:file:src/mcp/server.ts:1',
        relatedDecisionId: 'decision:project:root:1'
      })
    });
    const createData = await createRes.json();
    expect(createRes.status).toBe(200);
    expect(createData.success).toBe(true);
    expect(createData.plan.id).toBeDefined();
    expect(createData.plan.sourceThreadId).toBe('thread:file:src/mcp/server.ts:1');
    expect(createData.plan.relatedDecisionId).toBe('decision:project:root:1');

    const planId = createData.plan.id;

    // 2. Add Progress Log to Plan
    const logRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/plans/${encodeURIComponent(planId)}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stepIndex: 1,
        description: 'Exposed dbci_summary, dbci_query, dbci_trace, and dbci_functions native tools',
        status: 'done',
        evidence: '20/20 Vitest tests passing & stdio JSON-RPC handshake verified'
      })
    });
    const logData = await logRes.json();
    expect(logRes.status).toBe(200);
    expect(logData.success).toBe(true);
    expect(logData.log.planId).toBe(planId);
    expect(logData.log.status).toBe('done');

    // 3. GET Plans
    const getRes = await fetch(`http://127.0.0.1:${TEST_PORT}/local-api/plans`);
    const getData = await getRes.json();
    expect(getRes.status).toBe(200);
    expect(getData.plansCount).toBeGreaterThan(0);
  });
});

