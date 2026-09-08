import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import { authRouter, verifyToken, generateToken } from '../server/auth.js';
import { projectsRouter } from '../server/projects.js';

const PORT = 3019;
let server: http.Server;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/projects', projectsRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });
});

afterAll(async () => {
  if (server) server.close();
});

describe('Local-First Auth & Projects Test Suite', () => {
  it('1. Token generation & claims verification (24h expiry)', () => {
    const user = { id: 'usr_123', email: 'test@local.workspace' };
    const token = generateToken(user);
    expect(token).toBeDefined();

    const claims = verifyToken(token);
    expect(claims.sub).toBe('usr_123');
    expect(claims.email).toBe('test@local.workspace');
    expect(claims.exp - claims.iat).toBe(86400);
  });

  it('2. GET /api/projects returns local projects array without auth required', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/projects`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data.projects)).toBe(true);
  });

  it('3. POST /api/projects creates a new project with Not indexed status and — metrics', async () => {
    const res = await fetch(`http://localhost:${PORT}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'test-local-proj',
        projectName: 'Test Local Project',
        description: 'Test description',
        rootDir: '~/dev/test-local-proj'
      })
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.project.projectId).toBe('test-local-proj');
    expect(data.project.status).toBe('Not indexed');
    expect(data.project.files).toBe('—');
    expect(data.project.dbSize).toBe('—');
    expect(data.project.metrics).toBe('Not indexed');
  });
});
