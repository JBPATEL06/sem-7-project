import { useState, useEffect, useCallback } from 'react';

export interface QaIssue {
  id: string;
  code: string;
  severity: 'critical' | 'warning' | 'minor';
  title: string;
  description: string;
  tableName?: string;
  columnName?: string;
  suggestion: string;
}

export interface QaSummary {
  total: number;
  critical: number;
  warning: number;
  minor: number;
  tablesScanned: number;
  columnsScanned: number;
  healthScore: number;
}

export interface QaDiagnosticsResponse {
  projectId: string;
  indexed: boolean;
  dbPath?: string;
  issues: QaIssue[];
  summary: QaSummary;
  systemHealth: {
    indexerEngine: string;
    groqApi: string;
    sqlJsRuntime: string;
    encryptionLayer: string;
  };
  scannedAt: string;
}

export function useQa(projectId: string = 'acme-api') {
  const [diagnostics, setDiagnostics] = useState<QaDiagnosticsResponse | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnosticsAndLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [diagRes, logRes] = await Promise.all([
        fetch(`/api/qa/diagnostics?projectId=${encodeURIComponent(projectId)}`),
        fetch('/api/qa/logs')
      ]);

      if (!diagRes.ok) throw new Error(`Diagnostics fetch failed (${diagRes.status})`);
      if (!logRes.ok) throw new Error(`Logs fetch failed (${logRes.status})`);

      const diagData: QaDiagnosticsResponse = await diagRes.json();
      const logData = await logRes.json();

      setDiagnostics(diagData);
      setLogs(logData.logs || []);
    } catch (err: any) {
      console.error('[useQa] Fetch error:', err);
      setError(err.message || 'Failed to run QA diagnostics');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const runHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      await fetchDiagnosticsAndLogs();
    } finally {
      setIsRunningCheck(false);
    }
  };

  const exportReport = () => {
    window.open(`/api/qa/export-report?projectId=${encodeURIComponent(projectId)}`, '_blank');
  };

  useEffect(() => {
    fetchDiagnosticsAndLogs();
  }, [fetchDiagnosticsAndLogs]);

  return {
    diagnostics,
    logs,
    isLoading,
    isRunningCheck,
    error,
    runHealthCheck,
    exportReport,
    refetch: fetchDiagnosticsAndLogs
  };
}
