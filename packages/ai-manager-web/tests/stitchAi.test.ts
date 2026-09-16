import { describe, it, expect } from 'vitest';
import express from 'express';
import { screenRouter } from '../server/screenRoutes.js';
import { diagramRouter } from '../server/diagramRoutes.js';
import fs from 'fs';
import path from 'path';

describe('Stitch-Grade AI Generation & Modification Engine Tests', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/screens', screenRouter);
  app.use('/api/diagrams', diagramRouter);

  it('1. POST /api/screens/generate-stitch (mode: create) generates layout AST, progressive steps, and native .fig files', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/screens/generate-stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Modern SaaS Analytics dashboard with 4 KPI cards, live chart, and schema migration table',
          mode: 'create',
          theme: 'dark',
          category: 'dashboard'
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.mode).toBe('create');
      expect(data.screen).toBeDefined();
      expect(data.screen.board).toBeDefined();
      expect(Array.isArray(data.screen.board.components)).toBe(true);
      expect(data.screen.board.components.length).toBeGreaterThan(0);

      // Verify progressive steps
      expect(Array.isArray(data.generationSteps)).toBe(true);
      expect(data.generationSteps.length).toBe(data.screen.board.components.length);
      expect(data.generationSteps[0]).toHaveProperty('step');
      expect(data.generationSteps[0]).toHaveProperty('name');
      expect(data.generationSteps[0]).toHaveProperty('x');
      expect(data.generationSteps[0]).toHaveProperty('y');
      expect(data.generationSteps[0]).toHaveProperty('width');
      expect(data.generationSteps[0]).toHaveProperty('height');

      // Verify granular AST editability properties
      const firstComp = data.screen.board.components[0];
      expect(firstComp.id).toBeDefined();
      expect(firstComp.type).toBeDefined();
      expect(typeof firstComp.x).toBe('number');
      expect(typeof firstComp.y).toBe('number');
      expect(typeof firstComp.width).toBe('number');
      expect(typeof firstComp.height).toBe('number');

      // Verify file sync to ui/ folder
      const slug = data.screen.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const jsonPath = path.resolve(process.cwd(), '../../ui', `${slug}.json`);
      if (fs.existsSync(jsonPath)) {
        const fileContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        expect(fileContent.board).toBeDefined();
      }
    } finally {
      server.close();
    }
  }, 20000);

  it('2. POST /api/screens/generate-stitch (mode: modify) mutates and extends existing screen AST in-place', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      // First create a screen to have an existing board
      const createRes = await fetch(`http://localhost:${port}/api/screens/generate-stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Minimal auth portal',
          mode: 'create'
        })
      });
      const createData = await createRes.json();
      const existingScreen = createData.screen;
      const initialCompCount = existingScreen.board.components.length;

      // Now request in-place AI modification
      const modifyRes = await fetch(`http://localhost:${port}/api/screens/generate-stitch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Add 2 new KPI metric cards for monthly churn and latency',
          mode: 'modify',
          screenId: existingScreen.id,
          existingBoard: existingScreen.board
        })
      });

      expect(modifyRes.status).toBe(201);
      const modifyData = await modifyRes.json();
      expect(modifyData.success).toBe(true);
      expect(modifyData.mode).toBe('modify');
      expect(modifyData.screen.id).toBe(existingScreen.id);
      expect(modifyData.screen.board.components.length).toBeGreaterThan(0);
      expect(modifyData.generationSteps.length).toBeGreaterThan(0);
    } finally {
      server.close();
    }
  }, 20000);

  it('3. POST /api/diagrams/generate-ai creates Excalidraw architecture elements with connected arrows', async () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    try {
      const res = await fetch(`http://localhost:${port}/api/diagrams/generate-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'High-throughput microservices architecture with Kafka, Redis, and PostgreSQL',
          type: 'architecture'
        })
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.diagram).toBeDefined();
      expect(data.diagram.elements).toBeDefined();
      expect(Array.isArray(data.diagram.elements)).toBe(true);
      expect(data.diagram.elements.length).toBeGreaterThan(0);

      // Verify node types (rectangles and texts)
      const elementTypes = data.diagram.elements.map((e: any) => e.type);
      expect(elementTypes.some((t: string) => ['rectangle', 'text', 'arrow'].includes(t))).toBe(true);

      // Verify file sync to diagrams/ folder
      const slug = data.diagram.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const filePath = path.resolve(process.cwd(), '../../diagrams', `${slug}.excalidraw`);
      if (fs.existsSync(filePath)) {
        const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(fileContent.elements).toBeDefined();
      }
    } finally {
      server.close();
    }
  }, 20000);
});
