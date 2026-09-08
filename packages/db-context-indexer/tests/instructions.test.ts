import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createMcpServer } from '../src/mcp/server.ts';
import { buildIndex } from '../src/core/indexBuilder.js';
import { generateInstructionDoc, addPlanRecord, addDecisionRecord } from '@ai-manager/core';

const dbPath = path.resolve('.dbci/index_instructions_test.sqlite');
const rootDir = path.resolve('.');

beforeAll(async () => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  await buildIndex({ rootDir, dbPath, full: true });

  // Seed sample plan and decision for grounding test
  await addPlanRecord(
    dbPath,
    'proj_inst_test',
    'AST Instruction Generator Support',
    'Compile live index metadata into system prompts',
    'in_progress',
    'developer'
  );

  await addDecisionRecord(
    dbPath,
    'project',
    'root',
    'Use AST static analysis for zero-AI-API instruction generation',
    'Guarantees zero ongoing LLM API token costs during instruction compilation',
    'architect'
  );
});

describe('Item #5: dbci instructions Test Suite', () => {
  it('1. Generates AST-grounded instruction Markdown document with active plans and decisions', async () => {
    const doc = await generateInstructionDoc(dbPath, { format: 'agents', rootDir });

    expect(doc).toBeDefined();
    expect(doc).toContain('# Project Instructions & Codebase Context');
    expect(doc).toContain('## 1. Codebase AST Grounding & Architecture Overview');
    expect(doc).toContain('## 2. Active Feature Roadmap & Step Progress');
    expect(doc).toContain('AST Instruction Generator Support');
    expect(doc).toContain('## 3. Architecture Decision Records (ADRs)');
    expect(doc).toContain('Use AST static analysis for zero-AI-API instruction generation');
    expect(doc).toContain('## 4. Project Rules & Guidelines');
  });

  it('2. Supports target formats: cursor (.cursorrules) and claude (.clauderules)', async () => {
    const cursorDoc = await generateInstructionDoc(dbPath, { format: 'cursor', rootDir });
    expect(cursorDoc).toContain('# Cursor AI System Instructions');

    const claudeDoc = await generateInstructionDoc(dbPath, { format: 'claude', rootDir });
    expect(claudeDoc).toContain('# Claude / System AI Instructions');
  });

  it('3. Retrives instructions via native MCP tool dbci_instructions', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    expect(tools.dbci_instructions).toBeDefined();
    const res = await tools.dbci_instructions.handler({ format: 'agents' }, {});

    expect(res.content).toBeDefined();
    expect(res.content[0].type).toBe('text');
    expect(res.content[0].text).toContain('# Project Instructions & Codebase Context');
  });
});
