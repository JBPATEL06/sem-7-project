import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useQa } from '../hooks/useQa';
import {
  RefreshCw,
  RotateCw,
  Download,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  Terminal,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface QaPageProps {
  projectId?: string;
}

export const QaPage: React.FC<QaPageProps> = ({ projectId = 'acme-api' }) => {
  const {
    diagnostics,
    logs,
    isLoading,
    isRunningCheck,
    error,
    runHealthCheck,
    exportReport
  } = useQa(projectId);

  const issues = diagnostics?.issues || [];
  const summary = diagnostics?.summary;
  const systemHealth = diagnostics?.systemHealth;

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Header & Action Buttons */}
        <div className="flex justify-between items-start flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-2xl tracking-tight text-foreground">
                QA & Diagnostics
              </h1>
              {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground text-sm">
              Local rule-based SQLite schema diagnostics and live server execution logs for <strong className="text-foreground font-mono">{projectId}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={runHealthCheck}
              disabled={isRunningCheck}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-medium text-sm cursor-pointer"
            >
              {isRunningCheck ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Run Health Check
            </Button>
            <Button
              variant="outline"
              onClick={runHealthCheck}
              disabled={isRunningCheck}
              title="Re-inspects current SQLite schema"
              className="gap-2 font-medium text-sm cursor-pointer"
            >
              <RotateCw className="size-4" />
              Re-scan Schema
            </Button>
            <Button
              variant="outline"
              onClick={exportReport}
              className="gap-2 font-medium text-sm cursor-pointer"
            >
              <Download className="size-4" />
              Export QA Report
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Health Metrics Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-5 gap-3 bg-card border-border">
            <CardHeader className="p-0">
              <span className="font-medium text-muted-foreground text-xs">
                Schema Health Score
              </span>
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between">
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
                {(summary?.healthScore ?? 100) >= 80 ? 'Good' : (summary?.healthScore ?? 100) >= 50 ? 'Needs Review' : 'Critical'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="p-5 gap-3 bg-card border-border">
            <CardHeader className="p-0">
              <span className="font-medium text-muted-foreground text-xs">
                Indexer Engine
              </span>
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between">
              <span className="font-bold text-sm text-foreground truncate max-w-[140px]">
                {systemHealth?.indexerEngine || 'Checking...'}
              </span>
              <Badge className="bg-muted text-muted-foreground text-xs">
                Tier 2 Pending
              </Badge>
            </CardContent>
          </Card>

          <Card className="p-5 gap-3 bg-card border-border">
            <CardHeader className="p-0">
              <span className="font-medium text-muted-foreground text-xs">
                Groq API
              </span>
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between">
              <span className="font-bold text-sm text-foreground">
                {systemHealth?.groqApi?.includes('Operational') ? 'Operational' : 'Not Configured'}
              </span>
              <Badge
                className={
                  systemHealth?.groqApi?.includes('Operational')
                    ? 'bg-emerald-500/15 text-emerald-400 text-xs'
                    : 'bg-amber-500/15 text-amber-400 text-xs'
                }
              >
                {systemHealth?.groqApi?.includes('Operational') ? 'Ready' : 'Key Required'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="p-5 gap-3 bg-card border-border">
            <CardHeader className="p-0">
              <span className="font-medium text-muted-foreground text-xs">
                sql.js WASM Runtime
              </span>
            </CardHeader>
            <CardContent className="p-0 flex items-baseline justify-between">
              <span className="font-bold text-sm text-foreground">
                {systemHealth?.sqlJsRuntime || 'Operational'}
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-400 text-xs">
                Active
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* 2-Column Section: Diagnostic Issues & Real Error/Activity Log */}
        <div className="grid items-start gap-6 grid-cols-1 lg:grid-cols-[1.55fr_1fr]">
          {/* Diagnostic Issues List */}
          <Card className="p-6 gap-6 bg-card border-border">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-primary" />
                <CardTitle className="text-base">Diagnostic Issues</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {issues.length} issue(s) detected • {summary?.tablesScanned ?? 0} tables
              </span>
            </CardHeader>
            <CardContent className="flex p-0 flex-col divide-y divide-border">
              {issues.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-foreground">
                      No schema diagnostic issues detected
                    </span>
                    <span className="text-xs text-muted-foreground">
                      All tables have valid primary keys, explicit column types, and relational integrity.
                    </span>
                  </div>
                </div>
              ) : (
                issues.map((issue) => (
                  <div key={issue.id} className="flex py-4 justify-between items-start gap-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={issue.severity === 'critical' ? 'destructive' : 'secondary'}
                          className={`text-xs px-2 py-0.5 capitalize ${
                            issue.severity === 'warning'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : issue.severity === 'minor'
                              ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                              : ''
                          }`}
                        >
                          {issue.severity}
                        </Badge>
                        <span className="font-mono text-foreground text-sm font-semibold truncate">
                          {issue.title}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {issue.description}
                      </p>
                      <div className="p-2 rounded bg-background border border-border text-[11px] text-muted-foreground font-mono">
                        💡 Suggestion: {issue.suggestion}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Real Server Execution & Activity Log */}
          <Card id="logs" className="p-6 gap-6 bg-card border-border">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-primary" />
                <CardTitle className="text-base">Server & Query Log</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {logs.length} entries
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="font-mono rounded-lg bg-background text-xs leading-6 border border-border p-4 h-[380px] overflow-y-auto space-y-1">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground text-center py-8">
                    No log entries captured yet.
                  </div>
                ) : (
                  logs.map((line, idx) => {
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
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
