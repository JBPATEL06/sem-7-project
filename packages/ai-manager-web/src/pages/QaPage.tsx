import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useQa, QaIssue } from '../hooks/useQa';
import {
  RefreshCw,
  Download,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Play,
  Check,
  Copy,
  Code2,
  Database,
  FlaskConical,
  Activity,
  Layers,
  Wrench,
  Search,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface QaPageProps {
  projectId?: string;
}

export const QaPage: React.FC<QaPageProps> = ({ projectId = 'acme-api' }) => {
  const {
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
    applyRemediation,
    exportReport
  } = useQa(projectId);

  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'minor'>('all');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [logSearch, setLogSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSuites, setExpandedSuites] = useState<Record<string, boolean>>({});

  const issues = diagnostics?.issues || [];
  const summary = diagnostics?.summary;
  const systemHealth = diagnostics?.systemHealth;

  const filteredIssues = issues.filter((issue) => {
    if (severityFilter === 'all') return true;
    return issue.severity === severityFilter;
  });

  const filteredLogs = logs.filter((line) => {
    const isError = line.includes('[ERROR]') || line.includes('[destructive]');
    const isWarn = line.includes('[WARN]') || line.includes('warning');
    if (logFilter === 'error' && !isError) return false;
    if (logFilter === 'warn' && !isWarn) return false;
    if (logFilter === 'info' && (isError || isWarn)) return false;
    if (logSearch && !line.toLowerCase().includes(logSearch.toLowerCase())) return false;
    return true;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSuite = (name: string) => {
    setExpandedSuites((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <main className="p-6 lg:p-8 flex-1 overflow-y-auto bg-background text-foreground">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header & Main Actions */}
        <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-3">
                  QA & Diagnostics Studio
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {diagnostics?.dialect?.toUpperCase() || 'SQLITE'}
                  </Badge>
                </h1>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Multi-dialect schema integrity audits, live Vitest test execution, AST safety analysis, and telemetry for <span className="font-mono text-foreground font-semibold">{projectId}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={runHealthCheck}
              disabled={isRunningCheck || isLoading}
              className="gap-2 font-medium text-xs h-9 cursor-pointer"
            >
              {isRunningCheck ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Run Health Check
            </Button>
            <Button
              variant="outline"
              onClick={() => runTests()}
              disabled={isRunningTests}
              className="gap-2 font-medium text-xs h-9 cursor-pointer"
            >
              {isRunningTests ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5 text-primary" />}
              Run All Tests
            </Button>
            <Button
              variant="outline"
              onClick={exportReport}
              className="gap-2 font-medium text-xs h-9 cursor-pointer"
            >
              <Download className="size-3.5" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 4 KPI Metrics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 gap-2 bg-card border-border">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs">Schema Health Score</span>
              <Database className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between mt-2">
              <span className="font-bold text-2xl text-foreground">
                {isLoading ? '—' : `${summary?.healthScore ?? 100}%`}
              </span>
              <Badge
                className={
                  (summary?.healthScore ?? 100) >= 80
                    ? 'bg-emerald-500/15 text-emerald-400 text-xs'
                    : (summary?.healthScore ?? 100) >= 50
                    ? 'bg-amber-500/15 text-amber-400 text-xs'
                    : 'bg-destructive/15 text-destructive text-xs'
                }
              >
                {(summary?.healthScore ?? 100) >= 80 ? 'Optimal' : (summary?.healthScore ?? 100) >= 50 ? 'Needs Review' : 'Critical'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="p-4 gap-2 bg-card border-border">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs">Vitest Pass Rate</span>
              <FlaskConical className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between mt-2">
              <span className="font-bold text-2xl text-foreground">
                {testReport?.summary ? testReport.summary.passRate : '100%'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {testReport?.summary ? `${testReport.summary.passedTests}/${testReport.summary.totalTests} tests` : 'Ready'}
              </span>
            </CardContent>
          </Card>

          <Card className="p-4 gap-2 bg-card border-border">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs">AST Code Safety</span>
              <Code2 className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between mt-2">
              <span className="font-bold text-2xl text-foreground">
                {astReport ? `${astReport.safetyScore}%` : '95%'}
              </span>
              <Badge className="bg-sky-500/15 text-sky-400 text-xs">
                {astReport ? `${astReport.findings.length} findings` : 'Clean'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="p-4 gap-2 bg-card border-border">
            <CardHeader className="p-0 flex flex-row items-center justify-between">
              <span className="font-medium text-muted-foreground text-xs">System Runtimes</span>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between mt-2">
              <span className="font-bold text-sm text-foreground truncate max-w-[130px]">
                {systemHealth?.sqlJsRuntime || 'Operational'}
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">
                {systemHealth?.groqApi?.includes('Operational') ? 'Groq Ready' : 'Local WASM'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* 4-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 border-b border-border/80 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'schema'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Database className="size-4" />
            Schema & Integrity Audits
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {issues.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'tests'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <FlaskConical className="size-4" />
            Vitest Test Runner
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {testReport?.suites.length ?? 0}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('ast')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'ast'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Code2 className="size-4" />
            AST Query Safety
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {astReport?.findings.length ?? 0}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === 'logs'
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            <Terminal className="size-4" />
            Telemetry & Server Logs
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {logs.length}
            </Badge>
          </button>
        </div>

        {/* TAB 1: Schema & Data Integrity Audits */}
        {activeTab === 'schema' && (
          <div className="flex flex-col gap-6">
            {/* Filter pills & table stats */}
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-1.5">
                {(['all', 'critical', 'warning', 'minor'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-colors cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {summary?.tablesScanned ?? 0} table(s) • {summary?.columnsScanned ?? 0} column(s) scanned
              </span>
            </div>

            {/* Issues List */}
            <div className="flex flex-col gap-4">
              {filteredIssues.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-foreground">No schema integrity issues detected</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All tables have primary keys, valid type affinities, and indexed foreign keys.
                  </p>
                </Card>
              ) : (
                filteredIssues.map((issue) => (
                  <Card key={issue.id} className="p-5 bg-card border-border flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge
                          variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                          className={`text-xs capitalize ${
                            issue.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : issue.severity === 'minor'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : ''
                          }`}
                        >
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {issue.code}
                        </Badge>
                        {issue.tableName && (
                          <Badge variant="secondary" className="font-mono text-[11px]">
                            table: {issue.tableName}
                          </Badge>
                        )}
                        {issue.columnName && (
                          <Badge variant="secondary" className="font-mono text-[11px]">
                            col: {issue.columnName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{issue.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{issue.description}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background/60 border border-border text-xs text-muted-foreground flex items-center gap-2">
                      <Wrench className="size-3.5 text-primary shrink-0" />
                      <span><strong>Recommendation:</strong> {issue.suggestion}</span>
                    </div>

                    {issue.remediationSql && (
                      <div className="rounded-lg bg-background border border-border/80 overflow-hidden mt-1">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/60 text-[11px] font-mono text-muted-foreground">
                          <span>1-Click Remediation SQL</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(issue.id, issue.remediationSql!)}
                              className="flex items-center gap-1 hover:text-foreground cursor-pointer"
                            >
                              {copiedId === issue.id ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
                              <span>{copiedId === issue.id ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              onClick={() => applyRemediation(issue.remediationSql!)}
                              disabled={isApplyingFix}
                              className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-sans text-[11px] font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                            >
                              {isApplyingFix ? 'Applying...' : 'Apply Fix'}
                            </button>
                          </div>
                        </div>
                        <pre className="p-3 text-xs font-mono overflow-x-auto text-emerald-400 leading-5">
                          {issue.remediationSql}
                        </pre>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>

            {/* Schema Inventory Table */}
            {diagnostics?.tables && diagnostics.tables.length > 0 && (
              <Card className="p-5 bg-card border-border">
                <CardHeader className="p-0 mb-3">
                  <CardTitle className="text-sm font-semibold">Schema Inventory ({diagnostics.tables.length} tables)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b border-border text-muted-foreground uppercase font-mono">
                        <tr>
                          <th className="py-2.5 px-3">Table Name</th>
                          <th className="py-2.5 px-3">Columns</th>
                          <th className="py-2.5 px-3">Row Count</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {diagnostics.tables.map((t) => (
                          <tr key={t.name} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-mono font-medium text-foreground">{t.name}</td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{t.columnCount}</td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">{t.rowCount}</td>
                            <td className="py-2.5 px-3">
                              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                                Introspected
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* TAB 2: Vitest Test Runner */}
        {activeTab === 'tests' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-500/15 text-emerald-400 text-xs px-2.5 py-1">
                  ✓ {testReport?.summary ? testReport.summary.passedTests : 0} of {testReport?.summary ? testReport.summary.totalTests : 0} Passing
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {testReport?.summary?.totalSuites ?? 0} Test Suites • {((testReport?.summary?.totalDurationMs || 400) / 1000).toFixed(2)}s Duration
                </span>
              </div>
              <Button
                onClick={() => runTests()}
                disabled={isRunningTests}
                className="gap-2 font-medium text-xs h-8 cursor-pointer"
              >
                {isRunningTests ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                Re-run Test Suites
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {testReport?.suites.map((suite) => {
                const isExpanded = expandedSuites[suite.name] !== false; // expanded by default
                return (
                  <Card key={suite.name} className="bg-card border-border overflow-hidden">
                    <div
                      onClick={() => toggleSuite(suite.name)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                        <Badge
                          className={`text-xs ${
                            suite.status === 'PASS'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-destructive/15 text-destructive border-destructive/30'
                          }`}
                        >
                          {suite.status}
                        </Badge>
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {suite.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-mono">
                          {suite.passed}/{suite.total} passed • {suite.duration}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            runTests(suite.name);
                          }}
                          disabled={isRunningTests}
                          className="h-7 text-xs px-2"
                        >
                          Run
                        </Button>
                      </div>
                    </div>

                    {isExpanded && suite.tests && suite.tests.length > 0 && (
                      <div className="border-t border-border bg-background/50 divide-y divide-border/60">
                        {suite.tests.map((test) => (
                          <div key={test.id} className="p-3 pl-11 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className={`size-3.5 ${test.status === 'passed' ? 'text-emerald-400' : 'text-destructive'}`} />
                                <span className="text-xs font-mono text-foreground">{test.name}</span>
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">{test.durationMs}ms</span>
                            </div>
                            {test.errorMessage && (
                              <pre className="mt-1.5 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                                {test.errorMessage}
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: AST Query & Code Safety */}
        {activeTab === 'ast' && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Badge className="bg-sky-500/15 text-sky-400 text-xs px-2.5 py-1">
                  Safety Score: {astReport?.safetyScore ?? 95}%
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {astReport?.scannedFilesCount ?? 0} files • {astReport?.scannedQueriesCount ?? 0} queries scanned
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {astReport?.findings && astReport.findings.length === 0 ? (
                <Card className="p-8 text-center bg-card border-border">
                  <CheckCircle2 className="size-8 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-sm font-semibold text-foreground">Codebase query safety is clean</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    No N+1 query patterns or unparameterized queries were detected across source files.
                  </p>
                </Card>
              ) : (
                astReport?.findings.map((f) => (
                  <Card key={f.id} className="p-5 bg-card border-border flex flex-col gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={f.severity === 'critical' ? 'destructive' : 'secondary'}
                        className={`text-xs capitalize ${
                          f.severity === 'warning' ? 'bg-amber-500/15 text-amber-400' : ''
                        }`}
                      >
                        {f.severity}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[11px]">
                        {f.rule}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {f.filePath}:{f.lineNumber}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{f.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                    </div>

                    {f.codeSnippet && (
                      <pre className="p-2.5 rounded bg-background border border-border text-xs font-mono text-amber-300 overflow-x-auto">
                        {f.codeSnippet}
                      </pre>
                    )}

                    <div className="p-2.5 rounded bg-muted/40 text-xs text-muted-foreground font-mono">
                      💡 Fix: {f.recommendation}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Telemetry & Server Logs */}
        {activeTab === 'logs' && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(['all', 'error', 'warn', 'info'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogFilter(lvl)}
                    className={`text-xs px-3 py-1 rounded-full font-medium uppercase transition-colors cursor-pointer ${
                      logFilter === lvl
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[240px]">
                <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <Card className="bg-card border-border p-4">
              <div className="font-mono rounded-lg bg-background text-xs leading-6 border border-border p-4 h-[440px] overflow-y-auto space-y-1">
                {filteredLogs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-16">
                    No log entries matching the selected filter.
                  </div>
                ) : (
                  filteredLogs.map((line, idx) => {
                    const isError = line.includes('[ERROR]') || line.includes('[destructive]');
                    const isWarn = line.includes('[WARN]') || line.includes('warning');
                    return (
                      <div
                        key={idx}
                        className={`break-all ${
                          isError ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-muted-foreground'
                        }`}
                      >
                        {line}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
};
