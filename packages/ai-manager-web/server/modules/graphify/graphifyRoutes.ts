import { Router, Response } from 'express';
import { localOrAuth, AuthRequest } from '../auth/auth.js';
import {
  getOrBuildUniversalGraph,
  getSubGraph,
  getFileContextReport,
  computeImpactAnalysis,
  buildPromptContextBundle
} from './graphifyService.js';
import { sanitizeErrorMessage } from '../db/dbRoutes.js';

export const graphifyRouter = Router();

// --------------------------------------------------------------------------
// 1. GET /api/graphify/overview — Graph Statistics & Project Context
// --------------------------------------------------------------------------
graphifyRouter.get('/overview', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const graph = await getOrBuildUniversalGraph(projectId);

    res.status(200).json({
      success: true,
      projectId,
      stats: graph.stats,
      bundle: graph.bundle
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Overview error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 2. GET /api/graphify/context-bundle — 360° Project Context for AI Agents
// --------------------------------------------------------------------------
graphifyRouter.get('/context-bundle', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);

    const graph = await getOrBuildUniversalGraph(projectId);

    res.status(200).json({
      success: true,
      projectId,
      bundle: graph.bundle,
      stats: graph.stats
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Context bundle error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 3. GET /api/graphify/nodes — Searchable & Filterable Node Inventory
// --------------------------------------------------------------------------
graphifyRouter.get('/nodes', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase() : '';

    const graph = await getOrBuildUniversalGraph(projectId);

    let nodes = graph.nodes;
    if (type && type !== 'all') {
      nodes = nodes.filter(n => n.type === type);
    }
    if (search) {
      nodes = nodes.filter(n =>
        n.label.toLowerCase().includes(search) ||
        (n.file && n.file.toLowerCase().includes(search))
      );
    }

    res.status(200).json({
      success: true,
      projectId,
      total: nodes.length,
      nodes: nodes.slice(0, 200) // Cap for responsive API payloads
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Nodes error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 4. GET /api/graphify/subgraph — Focused Subgraph for Visual Canvas
// --------------------------------------------------------------------------
graphifyRouter.get('/subgraph', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const centerNodeId = typeof req.query.centerNodeId === 'string' ? req.query.centerNodeId : undefined;
    const depth = typeof req.query.depth === 'string' ? parseInt(req.query.depth, 10) : 2;
    const filterType = typeof req.query.filterType === 'string' ? req.query.filterType : 'all';

    const subGraph = await getSubGraph(projectId, centerNodeId, depth, filterType);

    res.status(200).json({
      success: true,
      projectId,
      centerNodeId,
      nodes: subGraph.nodes,
      edges: subGraph.edges,
      count: {
        nodes: subGraph.nodes.length,
        edges: subGraph.edges.length
      }
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Subgraph error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 5. GET /api/graphify/file-context — 360° Context Report for Single File
// --------------------------------------------------------------------------
graphifyRouter.get('/file-context', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const file = typeof req.query.file === 'string' ? req.query.file : '';

    if (!file) {
      res.status(400).json({ success: false, error: 'Query param "file" is required.' });
      return;
    }

    const report = await getFileContextReport(projectId, file);

    res.status(200).json({
      success: true,
      projectId,
      report
    });
  } catch (err: any) {
    console.error('[graphifyRouter] File context error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 6. GET /api/graphify/impact — Blast Radius & Downstream Dependency Impact
// --------------------------------------------------------------------------
graphifyRouter.get('/impact', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rawId = req.query.projectId || 'sem-7-project';
    const projectId = Array.isArray(rawId) ? String(rawId[0]) : String(rawId);
    const nodeId = typeof req.query.nodeId === 'string' ? req.query.nodeId : '';

    if (!nodeId) {
      res.status(400).json({ success: false, error: 'Query param "nodeId" is required.' });
      return;
    }

    const impact = await computeImpactAnalysis(projectId, nodeId);

    res.status(200).json({
      success: true,
      projectId,
      impact
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Impact error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 7. POST /api/graphify/scan — Trigger Live AST & Living Docs Rescan
// --------------------------------------------------------------------------
graphifyRouter.post('/scan', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.body?.projectId || 'sem-7-project';
    const graph = await getOrBuildUniversalGraph(projectId, true);

    res.status(200).json({
      success: true,
      projectId,
      message: 'Universal context graph successfully re-indexed.',
      stats: graph.stats,
      bundle: graph.bundle
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Rescan error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});

// --------------------------------------------------------------------------
// 8. POST /api/graphify/query-ai-context — Get Formatted Context for LLM
// --------------------------------------------------------------------------
graphifyRouter.post('/query-ai-context', localOrAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const projectId = req.body?.projectId || 'sem-7-project';
    const prompt = req.body?.prompt || '';

    const markdownContext = await buildPromptContextBundle(projectId, prompt);

    res.status(200).json({
      success: true,
      projectId,
      contextMarkdown: markdownContext
    });
  } catch (err: any) {
    console.error('[graphifyRouter] Query AI context error:', err);
    res.status(500).json({
      success: false,
      error: sanitizeErrorMessage(err)
    });
  }
});
