import { useState, useEffect, useCallback, useMemo } from 'react';

export interface AstFunction {
  id: string;
  name: string;
  file: string;
  line: number;
  endLine: number;
  className: string | null;
  touchesDb: string[];
  transitiveTouchesDb: string[];
}

export interface AstQuery {
  id: string;
  file: string;
  line: number;
  enclosingFunction: string | null;
  enclosingClass: string | null;
  dbType: string;
  operation: string;
  target: string | null;
  clientRefId: string | null;
  resolved: boolean;
  unresolvedReason?: string;
}

export interface AstEdge {
  callerId: string;
  calleeId: string;
  file: string;
  line: number;
}

export interface AstClient {
  id: string;
  file: string;
  line: number;
  variableName: string;
  dbType: string;
  initExpression: string;
  exportedAs: string | null;
  configSource: string;
}

export interface AstStats {
  totalFunctions: number;
  totalQueries: number;
  totalEdges: number;
  totalClients: number;
  totalUnresolved: number;
  healthScore: number;
}

export interface FlowGraphData {
  success: boolean;
  projectId: string;
  dbPath: string | null;
  stats: AstStats;
  functions: AstFunction[];
  queries: AstQuery[];
  edges: AstEdge[];
  clients: AstClient[];
  unresolved: any[];
}

export interface StreamEvent {
  step: number;
  name: string;
  message: string;
  percent: number;
  timestamp?: string;
}

async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ai_manager_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as any || {})
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, status: res.status, error: data.error || `HTTP Error ${res.status}` };
      }
      return { ok: true, status: res.status, data };
    } else {
      const text = await res.text();
      return { ok: false, status: res.status, error: res.ok ? 'Non-JSON response' : `Server error (${res.status}): ${text.slice(0, 100)}` };
    }
  } catch (err: any) {
    return { ok: false, status: 0, error: err.message || 'Network request failed' };
  }
}

export function useFlowAudit(projectId: string = 'sem-7-project') {
  const [data, setData] = useState<FlowGraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFunctionId, setSelectedFunctionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'routes' | 'db-callers' | 'async'>('all');
  const [streamProgress, setStreamProgress] = useState<StreamEvent | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  // 1. Fetch graph data
  const fetchGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetch<FlowGraphData>(`/api/flow-audit/graph?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok && res.data) {
        setData(res.data);
        if (res.data.functions.length > 0 && !selectedFunctionId) {
          // Auto-select first function with DB touches or routes
          const firstMeaningful = res.data.functions.find((f: AstFunction) => (f.touchesDb && f.touchesDb.length > 0) || f.name.startsWith('handle') || f.name.includes('Route')) || res.data.functions[0];
          setSelectedFunctionId(firstMeaningful?.id || res.data.functions[0].id);
        }
      } else {
        setError(res.error || 'Failed to load AST graph data');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading AST graph');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, selectedFunctionId]);

  useEffect(() => {
    fetchGraph();
  }, [projectId]);

  // 2. Run live scan with SSE streaming
  const runScan = async () => {
    setIsScanning(true);
    setIsStreaming(true);
    setStreamProgress({ step: 1, name: 'STARTING', message: 'Initializing AST scanner...', percent: 5 });

    try {
      // Connect EventSource for progress
      const eventSource = new EventSource(`/api/flow-audit/stream?projectId=${encodeURIComponent(projectId)}`);

      eventSource.addEventListener('progress', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          setStreamProgress(parsed);
        } catch {}
      });

      eventSource.addEventListener('complete', async () => {
        eventSource.close();
        setIsStreaming(false);
        setIsScanning(false);
        setStreamProgress(null);
        await fetchGraph();
      });

      eventSource.onerror = async () => {
        eventSource.close();
        setIsStreaming(false);
        setIsScanning(false);
        // Fallback to direct POST scan
        await apiFetch('/api/flow-audit/scan', {
          method: 'POST',
          body: JSON.stringify({ projectId })
        });
        await fetchGraph();
      };
    } catch (err: any) {
      setIsScanning(false);
      setIsStreaming(false);
      setError(err.message || 'Scan failed');
    }
  };

  // 3. Export Trace (OpenTelemetry JSON)
  const exportTrace = async () => {
    try {
      const res = await apiFetch<any>(`/api/flow-audit/export?projectId=${encodeURIComponent(projectId)}`);
      if (res.ok && res.data) {
        const content = JSON.stringify(res.data, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectId}_ast_flow_trace.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true };
      }
      return { success: false, error: 'Export failed' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // 4. Filtered functions computation
  const filteredFunctions = useMemo(() => {
    if (!data?.functions) return [];

    return data.functions.filter((fn: AstFunction) => {
      // Search filter
      const matchesSearch = !searchQuery.trim() ||
        fn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fn.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (fn.className && fn.className.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category filter
      if (filterType === 'routes') {
        return fn.name.startsWith('handle') || fn.name.includes('Route') || fn.file.includes('routes') || fn.file.includes('api');
      }
      if (filterType === 'db-callers') {
        return (fn.touchesDb && fn.touchesDb.length > 0) || (fn.transitiveTouchesDb && fn.transitiveTouchesDb.length > 0);
      }
      if (filterType === 'async') {
        return fn.name.includes('async') || fn.name.includes('fetch') || fn.name.includes('scan') || fn.name.includes('load');
      }

      return true;
    });
  }, [data?.functions, searchQuery, filterType]);

  // 5. Selected function inspection details
  const selectedFunction = useMemo(() => {
    if (!data?.functions || !selectedFunctionId) return null;
    return data.functions.find((f: AstFunction) => f.id === selectedFunctionId) || null;
  }, [data?.functions, selectedFunctionId]);

  const selectedFunctionQueries = useMemo(() => {
    if (!data?.queries || !selectedFunction) return [];
    return data.queries.filter((q: AstQuery) => q.enclosingFunction === selectedFunction.name || q.file === selectedFunction.file);
  }, [data?.queries, selectedFunction]);

  const callers = useMemo(() => {
    if (!data?.edges || !data?.functions || !selectedFunction) return [];
    const callerIds = new Set(data.edges.filter((e: AstEdge) => e.calleeId === selectedFunction.name || e.calleeId === selectedFunction.id).map((e: AstEdge) => e.callerId));
    return data.functions.filter((f: AstFunction) => callerIds.has(f.name) || callerIds.has(f.id));
  }, [data?.edges, data?.functions, selectedFunction]);

  const callees = useMemo(() => {
    if (!data?.edges || !data?.functions || !selectedFunction) return [];
    const calleeIds = new Set(data.edges.filter((e: AstEdge) => e.callerId === selectedFunction.name || e.callerId === selectedFunction.id).map((e: AstEdge) => e.calleeId));
    return data.functions.filter((f: AstFunction) => calleeIds.has(f.name) || calleeIds.has(f.id));
  }, [data?.edges, data?.functions, selectedFunction]);

  return {
    data,
    isLoading,
    isScanning,
    isStreaming,
    streamProgress,
    error,
    selectedFunctionId,
    setSelectedFunctionId,
    selectedFunction,
    selectedFunctionQueries,
    callers,
    callees,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filteredFunctions,
    runScan,
    exportTrace,
    refetchGraph: fetchGraph
  };
}
