import { useState, useEffect, useCallback } from 'react';
import {
  GraphNode,
  GraphEdge,
  GraphStats,
  GraphNodeType,
  ProjectContextBundle,
  FileContextReport,
  ImpactAnalysis
} from '@ai-manager/core';

export function useGraphify(projectId: string = 'sem-7-project') {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [bundle, setBundle] = useState<ProjectContextBundle | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active selections
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFileReport, setSelectedFileReport] = useState<FileContextReport | null>(null);
  const [selectedImpact, setSelectedImpact] = useState<ImpactAnalysis | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOverview = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/graphify/overview?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setBundle(data.bundle);
      } else {
        setError(data.error || 'Failed to fetch graph overview');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchSubGraph = useCallback(async (centerId?: string, typeFilter: string = filterType) => {
    try {
      const url = `/api/graphify/subgraph?projectId=${encodeURIComponent(projectId)}&filterType=${encodeURIComponent(typeFilter)}${centerId ? `&centerNodeId=${encodeURIComponent(centerId)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      }
    } catch (err: any) {
      console.warn('[useGraphify] Subgraph fetch error:', err);
    }
  }, [projectId, filterType]);

  const fetchFileContext = useCallback(async (filePath: string) => {
    try {
      const res = await fetch(`/api/graphify/file-context?projectId=${encodeURIComponent(projectId)}&file=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedFileReport(data.report);
      }
    } catch (err: any) {
      console.warn('[useGraphify] File context fetch error:', err);
    }
  }, [projectId]);

  const fetchImpact = useCallback(async (nodeId: string) => {
    try {
      const res = await fetch(`/api/graphify/impact?projectId=${encodeURIComponent(projectId)}&nodeId=${encodeURIComponent(nodeId)}`);
      const data = await res.json();
      if (data.success) {
        setSelectedImpact(data.impact);
      }
    } catch (err: any) {
      console.warn('[useGraphify] Impact fetch error:', err);
    }
  }, [projectId]);

  const triggerRescan = useCallback(async () => {
    try {
      setIsScanning(true);
      setError(null);
      const res = await fetch('/api/graphify/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setBundle(data.bundle);
        await fetchSubGraph(selectedNodeId || undefined);
      } else {
        setError(data.error || 'Rescan failed');
      }
    } catch (err: any) {
      setError(err.message || 'Scan network error');
    } finally {
      setIsScanning(false);
    }
  }, [projectId, selectedNodeId, fetchSubGraph]);

  const getAiContextMarkdown = useCallback(async (promptText?: string): Promise<string> => {
    try {
      const res = await fetch('/api/graphify/query-ai-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, prompt: promptText })
      });
      const data = await res.json();
      return data.contextMarkdown || '';
    } catch {
      return '';
    }
  }, [projectId]);

  useEffect(() => {
    fetchOverview();
    fetchSubGraph(undefined, filterType);
  }, [fetchOverview, fetchSubGraph, filterType]);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node?.file) {
      fetchFileContext(node.file);
    }
    fetchImpact(nodeId);
  }, [nodes, fetchFileContext, fetchImpact]);

  return {
    stats,
    bundle,
    nodes,
    edges,
    isLoading,
    isScanning,
    error,
    selectedNodeId,
    selectedNode: nodes.find(n => n.id === selectedNodeId) || null,
    selectedFileReport,
    selectedImpact,
    filterType,
    setFilterType,
    searchQuery,
    setSearchQuery,
    handleSelectNode,
    triggerRescan,
    getAiContextMarkdown,
    refetch: fetchOverview
  };
}
