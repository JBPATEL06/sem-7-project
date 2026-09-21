import { describe, it, expect } from 'vitest';
import express from 'express';
import { flowAuditRouter } from '../server/modules/graphify/flowAuditRoutes.js';

describe('Flow Audit & AST Visualizer Endpoint Tests', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/flow-audit', flowAuditRouter);

  it('1. GET /api/flow-audit/graph returns compiled AST symbols, edges, queries and stats', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/flow-audit/graph?projectId=sem-7-project`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.stats).toBeDefined();
      expect(data.stats.totalFunctions).toBeGreaterThan(0);
      expect(data.stats.totalQueries).toBeGreaterThanOrEqual(0);
      expect(data.stats.totalEdges).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(data.functions)).toBe(true);
      expect(Array.isArray(data.queries)).toBe(true);
      expect(Array.isArray(data.edges)).toBe(true);
      expect(Array.isArray(data.clients)).toBe(true);

      // Verify path sanitization (paths should be relative and not contain drive roots)
      if (data.functions.length > 0) {
        const firstFn = data.functions[0];
        expect(firstFn.file).not.toMatch(/^[a-zA-Z]:\\/);
      }
    } finally {
      server.close();
    }
  }, 30000);

  it('2. GET /api/flow-audit/export generates OpenTelemetry-compliant JSON trace', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/flow-audit/export?projectId=sem-7-project`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.resourceSpans).toBeDefined();
      expect(Array.isArray(data.resourceSpans)).toBe(true);
      expect(data.resourceSpans.length).toBeGreaterThan(0);

      const firstSpan = data.resourceSpans[0].scopeSpans[0].spans[0];
      expect(firstSpan.traceId).toBeDefined();
      expect(firstSpan.spanId).toBeDefined();
      expect(firstSpan.name).toBeDefined();
      expect(firstSpan.attributes).toBeDefined();
      expect(typeof firstSpan.attributes).toBe('object');
    } finally {
      server.close();
    }
  }, 30000);

  it('3. POST /api/flow-audit/scan performs incremental AST compilation', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/flow-audit/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: 'sem-7-project' })
      });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.stats).toBeDefined();
    } finally {
      server.close();
    }
  }, 30000);
});
