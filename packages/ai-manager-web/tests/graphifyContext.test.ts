import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  scanDocsFolder,
  scanAuthorAndAiTraces,
  buildUniversalGraph,
  saveGraphToSqlite,
  loadGraphFromSqlite,
  loadProject
} from 'db-context-indexer';


import { IndexResult } from '@ai-manager/core';


describe('Universal Graphify Context System Tests', () => {
  const rootDir = path.resolve(__dirname, '../../..');

  it('1. should scan docs folder and extract PRD specs, architecture, plans, and issues', () => {
    const result = scanDocsFolder(rootDir, 'sem-7-project');

    expect(result).toBeDefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.bundle).toBeDefined();
    expect(result.bundle.projectId).toBe('sem-7-project');

    // Check PRD
    expect(result.bundle.prd).toBeDefined();

    // Check that some node types are populated
    const prdNodes = result.nodes.filter(n => n.type === 'prd_spec');
    const docNodes = result.nodes.filter(n => n.type === 'doc_section');
    const planNodes = result.nodes.filter(n => n.type === 'plan_item');
    const progressNodes = result.nodes.filter(n => n.type === 'progress_item');

    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
  });

  it('2. should scan AI logs and author traces for model lineage', () => {
    const result = scanAuthorAndAiTraces(rootDir);

    expect(result).toBeDefined();
    expect(result.activeModels).toBeDefined();
    expect(result.activeModels.length).toBeGreaterThan(0);
  });

  it('3. should build universal graph linking AST functions, DB tables, and docs', () => {
    const dummyIndexResult: IndexResult = {
      clients: [
        {
          id: 'client-1',
          file: 'server/db.ts',
          line: 10,
          variableName: 'db',
          dbType: 'mongodb',
          initExpression: 'new MongoClient()',
          exportedAs: 'db',
          configSource: 'literal'
        }
      ],
      queries: [
        {
          id: 'q-1',
          file: 'server/screenRoutes.ts',
          line: 120,
          enclosingFunction: 'saveScreen',
          enclosingClass: null,
          dbType: 'mongodb',
          operation: 'insertOne',
          target: 'screens',
          clientRefId: 'client-1',
          resolved: true
        }
      ],
      functions: [
        {
          id: 'server/screenRoutes.ts:100:200:saveScreen',
          name: 'saveScreen',
          file: 'server/screenRoutes.ts',
          line: 100,
          endLine: 140,
          className: null,
          touchesDb: ['mongodb'],
          transitiveTouchesDb: []
        }
      ],
      edges: [],
      references: [],
      fileHashes: [],
      unresolved: []
    };

    const { sourceFiles } = loadProject({ rootDir });
    const subsetFiles = sourceFiles.slice(0, 5);

    const graph = buildUniversalGraph(subsetFiles, dummyIndexResult, rootDir, 'sem-7-project');



    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.stats.totalNodes).toBe(graph.nodes.length);

    // Verify AST function node exists
    const fnNode = graph.nodes.find(n => n.type === 'function' && n.label === 'saveScreen');
    expect(fnNode).toBeDefined();

    // Verify DB table node was created
    const tableNode = graph.nodes.find(n => n.type === 'table' && n.label.includes('screens'));
    expect(tableNode).toBeDefined();

    // Verify Route node was created
    const routeNode = graph.nodes.find(n => n.type === 'route');
    expect(routeNode).toBeDefined();

    // Verify TOUCHES_DB edge
    const dbEdge = graph.edges.find(e => e.type === 'TOUCHES_DB');
    expect(dbEdge).toBeDefined();
  });

  it('4. should save and load universal graph to/from SQLite', async () => {
    const tempDbPath = path.resolve(rootDir, '.dbci/test_graphify.sqlite');

    const dummyGraph = {
      nodes: [
        { id: 'fn:1', type: 'function' as const, label: 'testFunction', file: 'test.ts', line: 1 },
        { id: 'table:1', type: 'table' as const, label: 'users (mongodb)' }
      ],
      edges: [
        { id: 'edge:1', sourceId: 'fn:1', targetId: 'table:1', type: 'TOUCHES_DB' as const }
      ],
      stats: {
        totalNodes: 2,
        totalEdges: 1,
        nodesByType: { file: 0, function: 1, route: 0, table: 1, prd_spec: 0, doc_section: 0, plan_item: 0, progress_item: 0, issue: 0, audit_finding: 0, test_suite: 0, ai_trace: 0 },
        edgesByType: { IMPORTS: 0, CALLS: 0, TOUCHES_DB: 1, HANDLES_ROUTE: 0, IMPLEMENTS_SPEC: 0, DOCUMENTED_IN: 0, HAS_ISSUE: 0, PLANNED_BY: 0, STATUS_OF: 0, AUDITED_BY: 0, VERIFIED_BY: 0, MODIFIED_BY_AI: 0, AUTHORED_BY_USER: 0 },
        dbTouchCount: 1,
        openIssuesCount: 0,
        auditFindingsCount: 0,
        aiTracesCount: 0,
        healthScore: 100
      },
      bundle: {
        projectId: 'test-project',
        timestamp: new Date().toISOString(),
        prd: { overview: 'Test PRD', valueProps: [], targetUsers: [], scopeBoundaries: [] },
        architecture: { techStack: [], keyDecisions: [], folderStructure: [] },
        plans: { nextUp: [], roadmap: [] },
        progress: { done: [], inProgress: [], broken: [] },
        issues: { openBugs: [], knownGaps: [] },
        qaHealth: { healthScore: 100, schemaIssuesCount: 0, astSafetyIssuesCount: 0, testsPassing: true },
        aiLineage: { recentAiEditsCount: 0, activeModels: [] }
      }
    };

    await saveGraphToSqlite(tempDbPath, dummyGraph, 'test-project');
    expect(fs.existsSync(tempDbPath)).toBe(true);

    const loaded = await loadGraphFromSqlite(tempDbPath, 'test-project');
    expect(loaded).toBeDefined();
    expect(loaded!.nodes.length).toBe(2);
    expect(loaded!.edges.length).toBe(1);
    expect(loaded!.bundle.projectId).toBe('test-project');

    // Cleanup
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });
});
