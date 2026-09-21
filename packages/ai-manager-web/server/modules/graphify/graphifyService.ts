import path from 'path';
import fs from 'fs';
import {
  GraphNode,
  GraphEdge,
  GraphStats,
  GraphNodeType,
  ProjectContextBundle,
  FileContextReport,
  ImpactAnalysis
} from '@ai-manager/core';
import {
  buildUniversalGraph,
  saveGraphToSqlite,
  loadGraphFromSqlite,
  UniversalGraphResult,
  scanDocsFolder,
  scanAuthorAndAiTraces,
  buildIndex,
  loadProject
} from 'db-context-indexer';


import { getWorkspaceRootDir } from '../../shared/index.js';

/**
 * Returns path to .dbci/graphify.sqlite
 */
export function getGraphifyDbPath(projectId: string = 'sem-7-project'): string {
  const rootDir = getWorkspaceRootDir();
  return path.resolve(rootDir, '.dbci', `graphify_${projectId}.sqlite`);
}

/**
 * Builds or loads the universal context graph for a project
 */
export async function getOrBuildUniversalGraph(projectId: string = 'sem-7-project', forceRescan: boolean = false): Promise<UniversalGraphResult> {
  const rootDir = getWorkspaceRootDir();
  const dbPath = getGraphifyDbPath(projectId);

  if (!forceRescan && fs.existsSync(dbPath)) {
    const cached = await loadGraphFromSqlite(dbPath, projectId);
    if (cached && cached.nodes.length > 0) {
      return cached;
    }
  }

  // Perform full multi-layer scan with ZERO fallbacks
  const { sourceFiles } = loadProject({ rootDir });
  const indexResult = await buildIndex({ rootDir });

  const graphResult = buildUniversalGraph(sourceFiles, indexResult, rootDir, projectId);
  await saveGraphToSqlite(dbPath, graphResult, projectId);

  return graphResult;
}


/**
 * Extracts neighborhood sub-graph for focused visual canvas rendering
 */
export async function getSubGraph(
  projectId: string = 'sem-7-project',
  centerNodeId?: string,
  depth: number = 2,
  filterType?: string
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const graph = await getOrBuildUniversalGraph(projectId);

  if (!centerNodeId) {
    if (filterType && filterType !== 'all') {
      const filteredNodes = graph.nodes.filter(n => n.type === filterType);
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredEdges = graph.edges.filter(e => nodeIds.has(e.sourceId) || nodeIds.has(e.targetId));
      return { nodes: filteredNodes, edges: filteredEdges };
    }
    // Return all (capped at 300 for high-fps canvas rendering)
    return { nodes: graph.nodes.slice(0, 300), edges: graph.edges.slice(0, 500) };
  }

  const includedNodeIds = new Set<string>([centerNodeId]);
  let currentLayer = new Set<string>([centerNodeId]);

  for (let i = 0; i < depth; i++) {
    const nextLayer = new Set<string>();
    for (const edge of graph.edges) {
      if (currentLayer.has(edge.sourceId) && !includedNodeIds.has(edge.targetId)) {
        includedNodeIds.add(edge.targetId);
        nextLayer.add(edge.targetId);
      }
      if (currentLayer.has(edge.targetId) && !includedNodeIds.has(edge.sourceId)) {
        includedNodeIds.add(edge.sourceId);
        nextLayer.add(edge.sourceId);
      }
    }
    currentLayer = nextLayer;
  }

  const resultNodes = graph.nodes.filter(n => includedNodeIds.has(n.id));
  const resultEdges = graph.edges.filter(e => includedNodeIds.has(e.sourceId) && includedNodeIds.has(e.targetId));

  return { nodes: resultNodes, edges: resultEdges };
}

/**
 * Returns complete 360-degree context report for a single file
 */
export async function getFileContextReport(projectId: string = 'sem-7-project', filePath: string): Promise<FileContextReport> {
  const graph = await getOrBuildUniversalGraph(projectId);
  const normalizedPath = filePath.replace(/\\/g, '/');

  const fileFunctions = graph.nodes.filter(n => n.type === 'function' && n.file?.includes(normalizedPath));
  const fileRoutes = graph.nodes.filter(n => n.type === 'route' && n.file?.includes(normalizedPath));

  // Find DB touches for this file
  const fnIds = new Set(fileFunctions.map(f => f.id));
  const dbEdges = graph.edges.filter(e => fnIds.has(e.sourceId) && e.type === 'TOUCHES_DB');
  const tableIds = new Set(dbEdges.map(e => e.targetId));
  const dbTouches = graph.nodes.filter(n => tableIds.has(n.id));

  // Linked issues
  const issueEdges = graph.edges.filter(e => (e.targetId === `file:${normalizedPath}` || fnIds.has(e.targetId)) && e.type === 'HAS_ISSUE');
  const issueIds = new Set(issueEdges.map(e => e.sourceId));
  const linkedIssues = graph.nodes.filter(n => issueIds.has(n.id));

  // Linked plans
  const planEdges = graph.edges.filter(e => e.type === 'PLANNED_BY');
  const linkedPlans = graph.nodes.filter(n => n.type === 'plan_item');

  // AI edit history
  const aiEdges = graph.edges.filter(e => e.type === 'MODIFIED_BY_AI' && e.targetId.includes(normalizedPath));
  const aiTraceIds = new Set(aiEdges.map(e => e.sourceId));
  const aiTraceNodes = graph.nodes.filter(n => aiTraceIds.has(n.id));

  const aiHistory = aiTraceNodes.map(t => ({
    timestamp: t.metadata?.timestamp || t.createdAt || new Date().toISOString(),
    model: t.metadata?.model || 'AI Assistant',
    provider: (t.metadata?.model || '').split('/')[0]?.trim() || 'Groq',
    promptPreview: t.metadata?.rawLine
  }));

  return {
    file: normalizedPath,
    functions: fileFunctions,
    routes: fileRoutes,
    dbTouches,
    linkedIssues,
    linkedPlans,
    qaFindings: [],
    verifiedByTests: [],
    aiHistory
  };
}

/**
 * Computes Blast Radius & Impact Analysis for any node or symbol
 */
export async function computeImpactAnalysis(projectId: string = 'sem-7-project', nodeId: string): Promise<ImpactAnalysis> {
  const graph = await getOrBuildUniversalGraph(projectId);
  const targetNode = graph.nodes.find(n => n.id === nodeId);

  if (!targetNode) {
    return {
      targetNodeId: nodeId,
      targetLabel: 'Unknown Node',
      targetType: 'file',
      directCallers: [],
      transitiveCallers: [],
      affectedRoutes: [],
      affectedTables: [],
      affectedTests: [],
      linkedIssues: [],
      blastRadiusScore: 0
    };
  }

  // Find incoming callers
  const directCallerEdges = graph.edges.filter(e => e.targetId === nodeId && e.type === 'CALLS');
  const directCallerIds = new Set(directCallerEdges.map(e => e.sourceId));
  const directCallers = graph.nodes.filter(n => directCallerIds.has(n.id));

  // Find affected routes
  const affectedRoutes = graph.nodes.filter(n => n.type === 'route' && (n.id === nodeId || directCallerIds.has(n.id)));

  // Find affected tables
  const dbTouchEdges = graph.edges.filter(e => (e.sourceId === nodeId || directCallerIds.has(e.sourceId)) && e.type === 'TOUCHES_DB');
  const tableIds = new Set(dbTouchEdges.map(e => e.targetId));
  const affectedTables = graph.nodes.filter(n => tableIds.has(n.id));

  // Find linked issues
  const issueEdges = graph.edges.filter(e => e.targetId === nodeId && e.type === 'HAS_ISSUE');
  const issueIds = new Set(issueEdges.map(e => e.sourceId));
  const linkedIssues = graph.nodes.filter(n => issueIds.has(n.id));

  // Blast radius calculation
  const blastRadiusScore = Math.min(100, (directCallers.length * 15) + (affectedRoutes.length * 25) + (affectedTables.length * 20));

  return {
    targetNodeId: nodeId,
    targetLabel: targetNode.label,
    targetType: targetNode.type,
    directCallers,
    transitiveCallers: [],
    affectedRoutes,
    affectedTables,
    affectedTests: [],
    linkedIssues,
    blastRadiusScore
  };
}

/**
 * Builds compact, token-efficient Markdown context for LLM prompt injections
 */
export async function buildPromptContextBundle(projectId: string = 'sem-7-project', userQuery?: string): Promise<string> {
  const graph = await getOrBuildUniversalGraph(projectId);
  const bundle = graph.bundle;

  return `
# Project Context: ${projectId}
**Core Overview**: ${bundle.prd.overview || 'AI Manager Local Cockpit'}

## Architecture & Tech Stack
- Stack: ${bundle.architecture.techStack.slice(0, 5).join(', ') || 'React, Express, SQLite, PGlite, TypeScript'}
- Key Decisions: ${bundle.architecture.keyDecisions.slice(0, 3).join('; ') || 'Local-first architecture'}

## Active Plans & Progress
- Next Milestones: ${bundle.plans.nextUp.slice(0, 3).join('; ') || 'Universal Graphify Context System'}
- Shipped Features: ${bundle.progress.done.slice(0, 3).join('; ')}

## Known Issues & Gaps
${bundle.issues.openBugs.map(b => `- [${b.severity.toUpperCase()}] ${b.description}`).slice(0, 5).join('\n') || '- None'}

## Codebase Graph Stats
- Total Symbols: ${graph.stats.totalNodes} | Call Edges: ${graph.stats.totalEdges} | DB Tables: ${graph.stats.nodesByType.table}
`.trim();
}
