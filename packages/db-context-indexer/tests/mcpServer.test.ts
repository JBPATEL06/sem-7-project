import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { createMcpServer } from '../src/mcp/server.ts';
import { buildIndex } from '../src/core/indexBuilder.js';

const dbPath = path.resolve('.dbci/index_mcp_test.sqlite');
const rootDir = path.resolve('.');

beforeAll(async () => {
  await buildIndex({ rootDir, dbPath, full: true });
});

describe('Native MCP Server (mcp-server-dbci) Tool Execution Suite', () => {
  it('1. dbci_summary returns high-level AST index counts & project health score', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    expect(tools.dbci_summary).toBeDefined();
    const result = await tools.dbci_summary.handler({}, {});
    
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe('text');
    
    const parsed = JSON.parse(result.content[0].text);
    console.log('[MCP dbci_summary]', parsed.mode, parsed.projectName, parsed.healthScore);

    expect(parsed.mode).toBe('MCP_NATIVE');
    expect(parsed.projectName).toBeDefined();
    expect(typeof parsed.functionsCount).toBe('number');
    expect(typeof parsed.queriesCount).toBe('number');
    expect(parsed.functionsCount).toBeGreaterThan(0);
  });

  it('2. dbci_query returns queries filtered by db, table, or enclosing function', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    expect(tools.dbci_query).toBeDefined();
    
    // Test all queries
    const allResult = await tools.dbci_query.handler({}, {});
    const allParsed = JSON.parse(allResult.content[0].text);
    console.log('[MCP dbci_query all]', 'Count:', allParsed.count);
    expect(allParsed.count).toBeGreaterThanOrEqual(0);

    // Test filtered by dbType
    const mongoResult = await tools.dbci_query.handler({ db: 'mongodb' }, {});
    const mongoParsed = JSON.parse(mongoResult.content[0].text);
    console.log('[MCP dbci_query mongodb]', 'Count:', mongoParsed.count);
    expect(Array.isArray(mongoParsed.queries)).toBe(true);
  });

  it('3. dbci_trace returns function symbol metadata, declaration (isDirty, branch, rawSource), direct queries, and caller chain', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    expect(tools.dbci_trace).toBeDefined();
    
    // Trace a function symbol
    const traceResult = await tools.dbci_trace.handler({ functionName: 'loadOpenModule' }, {});
    const traceParsed = JSON.parse(traceResult.content[0].text);
    console.log('[MCP dbci_trace]', traceParsed.function?.name, 'isDirty:', traceParsed.declaration?.isDirty, 'branch:', traceParsed.declaration?.branch);

    expect(traceParsed.function).toBeDefined();
    expect(traceParsed.function.name).toBe('loadOpenModule');
    expect(traceParsed.declaration).toBeDefined();
    expect(typeof traceParsed.declaration.isDirty).toBe('boolean');
    expect(traceParsed.declaration.branch).toBeDefined();
    expect(typeof traceParsed.declaration.rawSource).toBe('string');
    expect(Array.isArray(traceParsed.directQueries)).toBe(true);
    expect(Array.isArray(traceParsed.callers)).toBe(true);
  });

  it('4. dbci_functions lists function symbols enriched with declaration metadata (isDirty, branch, rawSource)', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    expect(tools.dbci_functions).toBeDefined();

    const fnResult = await tools.dbci_functions.handler({ search: 'build' }, {});
    const fnParsed = JSON.parse(fnResult.content[0].text);
    console.log('[MCP dbci_functions search=build]', 'Count:', fnParsed.count, 'isDirty:', fnParsed.functions[0]?.declaration?.isDirty);

    expect(fnParsed.count).toBeGreaterThan(0);
    expect(Array.isArray(fnParsed.functions)).toBe(true);
    expect(fnParsed.functions[0].declaration).toBeDefined();
    expect(typeof fnParsed.functions[0].declaration.isDirty).toBe('boolean');
    expect(typeof fnParsed.functions[0].declaration.rawSource).toBe('string');
  });

  it('5. dbci_functions asserts declaration.isDirty boolean when inspecting git modified file', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    const fnResult = await tools.dbci_functions.handler({ file: 'src/mcp/server.ts' }, {});
    const fnParsed = JSON.parse(fnResult.content[0].text);

    expect(fnParsed.functions.length).toBeGreaterThan(0);
    const targetFn = fnParsed.functions[0];
    expect(targetFn.declaration).toBeDefined();
    expect(typeof targetFn.declaration.isDirty).toBe('boolean');
    expect(targetFn.declaration.file).toContain('src/mcp/server.ts');
  });

  it('6. dbci_query verifies distinct DB type filtering for mongodb vs mysql', async () => {
    const server = createMcpServer({ rootDir, dbPath });
    const tools = (server as any)._registeredTools;

    const mongoResult = await tools.dbci_query.handler({ db: 'mongodb' }, {});
    const mongoParsed = JSON.parse(mongoResult.content[0].text);

    const mysqlResult = await tools.dbci_query.handler({ db: 'mysql' }, {});
    const mysqlParsed = JSON.parse(mysqlResult.content[0].text);

    expect(Array.isArray(mongoParsed.queries)).toBe(true);
    expect(Array.isArray(mysqlParsed.queries)).toBe(true);
    mongoParsed.queries.forEach((q: any) => expect(q.dbType).toBe('mongodb'));
    mysqlParsed.queries.forEach((q: any) => expect(q.dbType).toBe('mysql'));
  });
});
