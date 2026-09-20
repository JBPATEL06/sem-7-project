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
  remediationSql?: string;
}

export interface QaTableSummary {
  name: string;
  columnCount: number;
  rowCount: number;
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
  dialect: 'sqlite' | 'postgres' | 'mongodb' | 'redis';
  indexed: boolean;
  dbPath?: string;
  issues: QaIssue[];
  tables: QaTableSummary[];
  summary: QaSummary;
  systemHealth: {
    indexerEngine: string;
    groqApi: string;
    sqlJsRuntime: string;
    encryptionLayer: string;
  };
  scannedAt: string;
}

export interface TestCaseItem {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  errorMessage?: string;
}

export interface TestSuiteItem {
  name: string;
  package: string;
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'QUEUED';
  duration: string;
  passed: number;
  failed: number;
  total: number;
  tests: TestCaseItem[];
}

export interface TestRunReport {
  suites: TestSuiteItem[];
  summary: {
    totalSuites: number;
    passedSuites: number;
    failedSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    passRate: string;
    totalDurationMs: number;
  };
  executedAt: string;
}

export interface AstSafetyFinding {
  id: string;
  rule: string;
  severity: 'critical' | 'warning' | 'minor';
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  codeSnippet?: string;
  recommendation: string;
}

export interface AstSafetyReport {
  projectId: string;
  safetyScore: number;
  scannedFilesCount: number;
  scannedQueriesCount: number;
  findings: AstSafetyFinding[];
  scannedAt: string;
}

export function useQa(projectId: string = 'acme-api') {
  const [activeTab, setActiveTab] = useState<'schema' | 'tests' | 'ast' | 'logs'>('schema');
  const [diagnostics, setDiagnostics] = useState<QaDiagnosticsResponse | null>(null);
  const [testReport, setTestReport] = useState<TestRunReport | null>(null);
  const [astReport, setAstReport] = useState<AstSafetyReport | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [isLoadingAst, setIsLoadingAst] = useState<boolean>(false);
  const [isApplyingFix, setIsApplyingFix] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchDiagnostics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch(`/api/qa/diagnostics?projectId=${encodeURIComponent(projectId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Diagnostics fetch failed (${res.status})`);
      const data: QaDiagnosticsResponse = await res.json();
      setDiagnostics(data);
    } catch (err: any) {
      console.error('[useQa] Diagnostics fetch error:', err);
      setError(err.message || 'Failed to load diagnostics');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchLogs = useCallback(async () => {
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/qa/logs', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {}
  }, []);

  const fetchAstSafety = useCallback(async () => {
    setIsLoadingAst(true);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch(`/api/qa/ast-safety?projectId=${encodeURIComponent(projectId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAstReport(data);
      }
    } catch (err: any) {
      console.error('[useQa] AST Safety fetch error:', err);
    } finally {
      setIsLoadingAst(false);
    }
  }, [projectId]);

  const runHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      await Promise.all([fetchDiagnostics(), fetchLogs(), fetchAstSafety()]);
      setSuccessMessage('Health check and schema scan completed.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } finally {
      setIsRunningCheck(false);
    }
  };

  const runTests = async (targetSuite?: string) => {
    setIsRunningTests(true);
    setError(null);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/qa/run-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ targetSuite, projectId })
      });
      if (!res.ok) throw new Error(`Test run failed (${res.status})`);
      const data: TestRunReport = await res.json();
      setTestReport(data);
      setSuccessMessage(`Executed ${data.summary.totalTests} tests (${data.summary.passRate} passed).`);
      setTimeout(() => setSuccessMessage(null), 4000);
      fetchLogs();
    } catch (err: any) {
      console.error('[useQa] Run tests error:', err);
      setError(err.message || 'Failed to execute test runner');
    } finally {
      setIsRunningTests(false);
    }
  };

  const applyRemediation = async (sql: string) => {
    setIsApplyingFix(true);
    setError(null);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/qa/apply-remediation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ projectId, sql })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to apply remediation');
      }
      setSuccessMessage('Remediation applied successfully! Re-scanning schema...');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchDiagnostics();
      await fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Remediation error');
    } finally {
      setIsApplyingFix(false);
    }
  };

  const exportReport = () => {
    window.open(`/api/qa/export-report?projectId=${encodeURIComponent(projectId)}`, '_blank');
  };

  useEffect(() => {
    fetchDiagnostics();
    fetchLogs();
    fetchAstSafety();
    runTests(); // initial test suites discovery
  }, [projectId]);

  return {
    activeTab,
    setActiveTab,
    diagnostics,
    testReport,
    astReport,
    logs,
    isLoading,
    isRunningCheck,
    isRunningTests,
    isLoadingAst,
    isApplyingFix,
    error,
    successMessage,
    runHealthCheck,
    runTests,
    fetchAstSafety,
    applyRemediation,
    exportReport,
    refetch: fetchDiagnostics
  };
}
