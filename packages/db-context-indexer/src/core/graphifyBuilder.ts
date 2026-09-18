import { SourceFile, Node } from 'ts-morph';
import {
  GraphNode,
  GraphEdge,
  GraphStats,
  GraphNodeType,
  GraphEdgeType,
  IndexResult,
  ProjectContextBundle
} from '@ai-manager/core';
import { scanDocsFolder } from './docsContextScanner.js';
import { scanAuthorAndAiTraces } from './authorTraceScanner.js';

export interface UniversalGraphResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
  bundle: ProjectContextBundle;
}

/**
 * Builds a Universal Context Graph linking Code AST, Database Schemas, API Routes, Docs, Issues, and AI Lineage.
 */
export function buildUniversalGraph(
  sourceFiles: SourceFile[],
  indexResult: IndexResult,
  rootDir: string,
  projectId: string = 'sem-7-project'
): UniversalGraphResult {
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  // Helper to add node safely
  const addNode = (node: GraphNode) => {
    if (!nodesMap.has(node.id)) {
      nodesMap.set(node.id, node);
    }
  };

  // Helper to add edge safely
  const addEdge = (sourceId: string, targetId: string, type: GraphEdgeType, metadata?: Record<string, any>) => {
    const id = `edge:${type}:${sourceId}->${targetId}`;
    edges.push({ id, sourceId, targetId, type, metadata });
  };

  // --------------------------------------------------------------------------
  // 1. Ingest Docs, PRD, Plans, Progress, and Issues
  // --------------------------------------------------------------------------
  const docsResult = scanDocsFolder(rootDir, projectId);
  for (const node of docsResult.nodes) {
    addNode(node);
  }
  for (const edge of docsResult.edges) {
    edges.push(edge);
  }

  // --------------------------------------------------------------------------
  // 2. Ingest AI & Author Trace Lineage
  // --------------------------------------------------------------------------
  const authorResult = scanAuthorAndAiTraces(rootDir);
  for (const node of authorResult.nodes) {
    addNode(node);
  }
  for (const edge of authorResult.edges) {
    edges.push(edge);
  }

  // --------------------------------------------------------------------------
  // 3. Ingest Code AST Functions & Files
  // --------------------------------------------------------------------------
  const fileNodesSet = new Set<string>();

  for (const fn of indexResult.functions) {
    const fnNodeId = fn.id;
    addNode({
      id: fnNodeId,
      type: 'function',
      label: fn.name,
      file: fn.file,
      line: fn.line,
      endLine: fn.endLine,
      metadata: {
        className: fn.className,
        touchesDb: fn.touchesDb,
        transitiveTouchesDb: fn.transitiveTouchesDb
      }
    });

    // Create File Node
    if (!fileNodesSet.has(fn.file)) {
      fileNodesSet.add(fn.file);
      const fileNodeId = `file:${fn.file}`;
      addNode({
        id: fileNodeId,
        type: 'file',
        label: fn.file.split('/').pop() || fn.file,
        file: fn.file,
        metadata: { fullPath: fn.file }
      });
    }

    // Connect File -> Function
    addEdge(`file:${fn.file}`, fnNodeId, 'IMPORTS');
  }

  // --------------------------------------------------------------------------
  // 4. Ingest Database Tables / Collections
  // --------------------------------------------------------------------------
  const tableNodesSet = new Set<string>();

  for (const query of indexResult.queries) {
    if (query.target) {
      const tableNodeId = `table:${query.dbType}:${query.target}`;
      if (!tableNodesSet.has(tableNodeId)) {
        tableNodesSet.add(tableNodeId);
        addNode({
          id: tableNodeId,
          type: 'table',
          label: `${query.target} (${query.dbType})`,
          metadata: {
            dbType: query.dbType,
            tableName: query.target
          }
        });
      }

      // Connect calling function to Table
      if (query.enclosingFunction) {
        // Find matching function node
        for (const fn of indexResult.functions) {
          if (fn.file === query.file && fn.name === query.enclosingFunction) {
            addEdge(fn.id, tableNodeId, 'TOUCHES_DB', {
              operation: query.operation,
              line: query.line
            });
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. Ingest API Routes & Controllers
  // --------------------------------------------------------------------------
  for (const sf of sourceFiles) {
    const file = sf.getFilePath().replace(/\\/g, '/');

    sf.forEachDescendant((node) => {
      if (Node.isCallExpression(node)) {
        const expr = node.getExpression();
        const text = expr.getText();

        // Express / Fastify style: router.get('/path', handler) or app.post('/path', handler)
        const isRoute = /^(app|router|server)\.(get|post|put|delete|patch|options|use)$/i.test(text);
        if (isRoute) {
          const args = node.getArguments();
          if (args.length >= 2) {
            const firstArg = args[0];
            const routePath = firstArg.getText().replace(/['"`]/g, '');
            const method = text.split('.').pop()?.toUpperCase() || 'GET';

            if (routePath.startsWith('/') || routePath.startsWith('api/')) {
              const routeNodeId = `route:${method}:${routePath}`;
              addNode({
                id: routeNodeId,
                type: 'route',
                label: `${method} ${routePath}`,
                file,
                line: node.getStartLineNumber(),
                metadata: { method, path: routePath }
              });

              // Connect File -> Route
              addEdge(`file:${file}`, routeNodeId, 'HANDLES_ROUTE');

              // Find handler function if referenced
              const handlerArg = args[args.length - 1];
              const handlerName = handlerArg.getText();
              for (const fn of indexResult.functions) {
                if (fn.file === file && (fn.name === handlerName || handlerName.includes(fn.name))) {
                  addEdge(routeNodeId, fn.id, 'CALLS');
                }
              }
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------------
  // 6. Connect Function -> Function (Call Graph Edges)
  // --------------------------------------------------------------------------
  for (const edge of indexResult.edges) {
    addEdge(edge.callerId, edge.calleeId, 'CALLS', { file: edge.file, line: edge.line });
  }

  // --------------------------------------------------------------------------
  // 7. Semantic Interlinking: Issues & Plans <-> Code Files
  // --------------------------------------------------------------------------
  const allNodes = Array.from(nodesMap.values());

  // Link Issues to code files mentioned in text
  for (const node of allNodes) {
    if (node.type === 'issue') {
      const fullText = node.metadata?.fullText || node.label;
      for (const fileNode of allNodes) {
        if (fileNode.type === 'file') {
          const fileName = fileNode.label;
          if (fullText.toLowerCase().includes(fileName.toLowerCase())) {
            addEdge(node.id, fileNode.id, 'HAS_ISSUE');
          }
        }
      }
    } else if (node.type === 'plan_item') {
      const fullText = node.metadata?.fullText || node.label;
      for (const routeNode of allNodes) {
        if (routeNode.type === 'route') {
          const routePath = routeNode.metadata?.path || '';
          if (routePath && fullText.includes(routePath)) {
            addEdge(node.id, routeNode.id, 'PLANNED_BY');
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 8. Calculate Graph Statistics
  // --------------------------------------------------------------------------
  const nodesByType: Record<GraphNodeType, number> = {
    file: 0,
    function: 0,
    route: 0,
    table: 0,
    prd_spec: 0,
    doc_section: 0,
    plan_item: 0,
    progress_item: 0,
    issue: 0,
    audit_finding: 0,
    test_suite: 0,
    ai_trace: 0
  };

  for (const node of allNodes) {
    if (nodesByType[node.type] !== undefined) {
      nodesByType[node.type]++;
    }
  }

  const edgesByType: Record<GraphEdgeType, number> = {
    IMPORTS: 0,
    CALLS: 0,
    TOUCHES_DB: 0,
    HANDLES_ROUTE: 0,
    IMPLEMENTS_SPEC: 0,
    DOCUMENTED_IN: 0,
    HAS_ISSUE: 0,
    PLANNED_BY: 0,
    STATUS_OF: 0,
    AUDITED_BY: 0,
    VERIFIED_BY: 0,
    MODIFIED_BY_AI: 0,
    AUTHORED_BY_USER: 0
  };

  for (const edge of edges) {
    if (edgesByType[edge.type] !== undefined) {
      edgesByType[edge.type]++;
    }
  }

  const stats: GraphStats = {
    totalNodes: allNodes.length,
    totalEdges: edges.length,
    nodesByType,
    edgesByType,
    dbTouchCount: edgesByType.TOUCHES_DB,
    openIssuesCount: nodesByType.issue,
    auditFindingsCount: nodesByType.audit_finding,
    aiTracesCount: nodesByType.ai_trace,
    healthScore: Math.max(20, 100 - (nodesByType.issue * 8))
  };

  // Populate bundle AI lineage and QA summary
  docsResult.bundle.aiLineage.activeModels = authorResult.activeModels;
  docsResult.bundle.aiLineage.recentAiEditsCount = authorResult.recentAiEditsCount;
  docsResult.bundle.qaHealth.healthScore = stats.healthScore;

  return {
    nodes: allNodes,
    edges,
    stats,
    bundle: docsResult.bundle
  };
}
