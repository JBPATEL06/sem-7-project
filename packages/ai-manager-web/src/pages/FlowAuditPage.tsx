import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  GitBranch,
  Search,
  RefreshCw,
  Download,
  Database,
  ArrowRight,
  Activity,
  Layers,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Code2,
  ChevronRight,
  Share2,
  Server,
  Play
} from 'lucide-react';
import { useFlowAudit, AstFunction } from '../hooks/useFlowAudit';

interface FlowAuditPageProps {
  onNavigate?: (route: any) => void;
  projectId?: string;
}

export const FlowAuditPage: React.FC<FlowAuditPageProps> = ({ onNavigate, projectId = 'sem-7-project' }) => {
  const {
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
    exportTrace
  } = useFlowAudit(projectId);

  const [copiedSpan, setCopiedSpan] = useState(false);

  const stats = data?.stats || {
    totalFunctions: 0,
    totalQueries: 0,
    totalEdges: 0,
    totalClients: 0,
    totalUnresolved: 0,
    healthScore: 0
  };

  const copySpanJson = () => {
    if (!selectedFunction) return;
    const spanData = {
      traceId: `trace-${selectedFunction.id}`,
      spanId: `span-${selectedFunction.id}`,
      name: selectedFunction.name,
      attributes: {
        'code.filepath': selectedFunction.file,
        'code.lineno': selectedFunction.line,
        'code.end_lineno': selectedFunction.endLine,
        'db.touches': selectedFunction.touchesDb,
        'db.transitive_touches': selectedFunction.transitiveTouchesDb,
        'queries.count': selectedFunctionQueries.length
      }
    };
    navigator.clipboard.writeText(JSON.stringify(spanData, null, 2));
    setCopiedSpan(true);
    setTimeout(() => setCopiedSpan(false), 2000);
  };

  return (
    <main className="p-6 sm:p-8 flex-1 overflow-y-auto bg-background min-h-screen">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-2xl tracking-tight text-foreground">
                Flow Auditor & AST Stream
              </h1>
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 font-mono text-xs px-2 py-0.5">
                AST Live
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Source code AST traversal and function call graph visualization for{' '}
              <strong className="text-foreground font-mono">{projectId}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={exportTrace}
              className="text-xs gap-1.5 border-border hover:bg-muted"
            >
              <Download className="size-3.5" />
              Export Trace (OTel)
            </Button>
            <Button
              size="sm"
              onClick={runScan}
              disabled={isScanning || isStreaming}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`size-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning AST...' : 'Run AST Scan'}
            </Button>
          </div>
        </div>

        {/* Real-time SSE Scan Banner */}
        {isStreaming && streamProgress && (
          <Card className="p-4 bg-primary/5 border-primary/20 animate-pulse">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-primary font-semibold flex items-center gap-2">
                  <Zap className="size-3.5 animate-bounce" />
                  Step {streamProgress.step}/5: {streamProgress.name}
                </span>
                <span className="font-mono text-foreground font-bold">{streamProgress.percent}%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden border border-border">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${streamProgress.percent}%` }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">{streamProgress.message}</span>
            </div>
          </Card>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Functions</span>
              <FileCode className="size-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {isLoading ? '...' : stats.totalFunctions}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              ts-morph AST extracted
            </span>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">DB Queries</span>
              <Database className="size-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {isLoading ? '...' : stats.totalQueries}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Direct & ORM calls
            </span>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Call Edges</span>
              <GitBranch className="size-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {isLoading ? '...' : stats.totalEdges}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Caller ➔ Callee edges
            </span>
          </Card>

          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Graph Health</span>
              <ShieldCheck className="size-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground">
              {isLoading ? '...' : `${stats.healthScore}%`}
            </div>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              {stats.totalClients} DB Clients active
            </span>
          </Card>
        </div>

        {/* Main 3-Pane Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
          {/* Left Pane: Symbol Explorer (Col 3) */}
          <Card className="lg:col-span-4 p-4 flex flex-col gap-4 bg-card border-border h-[720px]">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Symbol Explorer
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {filteredFunctions.length} of {stats.totalFunctions}
                </Badge>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter functions, files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8 bg-background border-border"
                />
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-background rounded-lg border border-border text-[11px]">
                {(['all', 'routes', 'db-callers', 'async'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFilterType(tab)}
                    className={`py-1 rounded font-medium transition-colors text-center capitalize ${
                      filterType === tab
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'db-callers' ? 'DB' : tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Function List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs gap-2">
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>Loading AST symbols...</span>
                </div>
              ) : filteredFunctions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs text-center p-4">
                  <span>No matching functions found</span>
                  <span className="text-[10px] mt-1">Try clearing your search query</span>
                </div>
              ) : (
                filteredFunctions.map((fn) => {
                  const isSelected = selectedFunctionId === fn.id;
                  const hasDb = fn.touchesDb && fn.touchesDb.length > 0;
                  const hasTransitive = fn.transitiveTouchesDb && fn.transitiveTouchesDb.length > 0;

                  return (
                    <button
                      key={fn.id}
                      onClick={() => setSelectedFunctionId(fn.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-primary/10 border-primary shadow-sm text-foreground'
                          : 'bg-background hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-xs font-semibold truncate text-foreground">
                          {fn.name}
                        </span>
                        {hasDb && (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 font-mono">
                            DB
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span className="truncate max-w-[170px]">
                          {fn.file.split(/[\\/]/).pop()}:{fn.line}
                        </span>
                        {hasTransitive && !hasDb && (
                          <span className="text-purple-400 text-[9px]">Transitive</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Center Pane: Interactive Call Graph Canvas (Col 5) */}
          <Card className="lg:col-span-5 p-4 flex flex-col gap-4 bg-card border-border h-[720px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Call Graph Flow
                </span>
              </div>
              {selectedFunction && (
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30 bg-primary/5">
                    {selectedFunction.name}()
                  </Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    L{selectedFunction.line}-{selectedFunction.endLine}
                  </span>
                </div>
              )}
            </div>

            {/* Visual Node-and-Edge Flow Diagram */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar">
              {!selectedFunction ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2">
                  <Activity className="size-6 text-muted-foreground/50" />
                  <span>Select a function from the symbol explorer to view its AST call graph</span>
                </div>
              ) : (
                <div className="flex flex-col gap-0 p-1">
                  {/* Stage 1: Incoming Callers */}
                  <div className="flex flex-col gap-2 bg-muted/20 border border-border/80 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
                        <Layers className="size-3.5 text-blue-400" />
                        Incoming Callers
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-blue-400 border-blue-500/30 bg-blue-500/10">
                        {callers.length} {callers.length === 1 ? 'caller' : 'callers'}
                      </Badge>
                    </div>

                    {callers.length === 0 ? (
                      <div className="p-3 bg-background/60 border border-dashed border-border rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <ShieldCheck className="size-3.5 text-blue-400" />
                        <span>Root Entrypoint · Top-level handler with 0 incoming callers</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {callers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedFunctionId(c.id)}
                            className="group p-2.5 bg-background/80 hover:bg-blue-500/10 border border-border hover:border-blue-500/40 rounded-lg cursor-pointer transition-all flex items-center justify-between shadow-xs"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-mono text-xs text-blue-400 font-semibold group-hover:underline truncate">
                                {c.name}()
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate">
                                {c.file.split(/[\\/]/).pop()}:{c.line}
                              </span>
                            </div>
                            <div className="p-1 rounded-md bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
                              <ArrowRight className="size-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connecting Flow Line 1 */}
                  <div className="h-6 flex items-center justify-center my-1">
                    <div className="w-0.5 h-full bg-gradient-to-b from-blue-500/60 to-primary relative flex items-center justify-center">
                      <div className="size-1.5 rounded-full bg-primary ring-2 ring-primary/30" />
                    </div>
                  </div>

                  {/* Stage 2: Selected Focus Node (Hero Node) */}
                  <div className="p-4 bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary/50 shadow-lg shadow-primary/5 rounded-xl flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-md bg-primary/20 text-primary shrink-0">
                          <Code2 className="size-4" />
                        </div>
                        <span className="font-mono text-sm font-bold text-foreground truncate">
                          {selectedFunction.name}()
                        </span>
                      </div>
                      <Badge className="bg-primary text-primary-foreground text-[10px] font-mono px-2 py-0.5 shrink-0">
                        Active Node
                      </Badge>
                    </div>

                    <div className="bg-background/80 border border-border/80 rounded-lg p-2.5 flex flex-col gap-1.5 text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <FileCode className="size-3 text-primary shrink-0" />
                        <span className="truncate text-[11px] text-foreground/90 font-medium">
                          {selectedFunction.file.replace(/^[a-zA-Z]:[\\/].*?sem-7-project[\\/]/, '').replace(/\\/g, '/')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>Lines: <strong className="text-foreground">{selectedFunction.line} – {selectedFunction.endLine}</strong></span>
                        <span>Class: <strong className="text-foreground">{selectedFunction.className || 'Global'}</strong></span>
                      </div>
                    </div>

                    {((selectedFunction.touchesDb && selectedFunction.touchesDb.length > 0) ||
                      (selectedFunction.transitiveTouchesDb && selectedFunction.transitiveTouchesDb.length > 0)) && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-mono">Touches DB:</span>
                        {selectedFunction.touchesDb?.map((db) => (
                          <Badge key={db} className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono px-2 py-0">
                            {db}
                          </Badge>
                        ))}
                        {selectedFunction.transitiveTouchesDb?.filter(db => !selectedFunction.touchesDb?.includes(db)).map((db) => (
                          <Badge key={db} className="bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-mono px-2 py-0">
                            {db} (transitive)
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Connecting Flow Line 2 */}
                  <div className="h-6 flex items-center justify-center my-1">
                    <div className="w-0.5 h-full bg-gradient-to-b from-primary to-emerald-500/60 relative flex items-center justify-center">
                      <div className="size-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
                    </div>
                  </div>

                  {/* Stage 3: Outgoing Calls & DB Operations */}
                  <div className="flex flex-col gap-2 bg-muted/20 border border-border/80 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-semibold text-foreground/80">
                        <Database className="size-3.5 text-emerald-400" />
                        Outgoing Calls & DB Queries
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                        {callees.length + selectedFunctionQueries.length} {callees.length + selectedFunctionQueries.length === 1 ? 'target' : 'targets'}
                      </Badge>
                    </div>

                    {callees.length === 0 && selectedFunctionQueries.length === 0 ? (
                      <div className="p-3 bg-background/60 border border-dashed border-border rounded-lg text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-400" />
                        <span>Leaf Function · Pure node with no outgoing function calls or DB queries</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Direct Queries */}
                        {selectedFunctionQueries.map((q) => (
                          <div
                            key={q.id}
                            className="p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col gap-1.5 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Database className="size-3" />
                                {q.dbType}.{q.operation}()
                              </span>
                              <Badge variant="outline" className="text-[9px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                {q.target || 'generic'}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              line {q.line} {q.resolved ? '• resolved target' : '• dynamic target'}
                            </span>
                          </div>
                        ))}

                        {/* Outgoing Callee Functions */}
                        {callees.map((callee) => (
                          <div
                            key={callee.id}
                            onClick={() => setSelectedFunctionId(callee.id)}
                            className="group p-2.5 bg-background/80 hover:bg-primary/10 border border-border hover:border-primary/40 rounded-lg cursor-pointer transition-all flex items-center justify-between shadow-xs"
                          >
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="font-mono text-xs text-foreground font-semibold group-hover:text-primary group-hover:underline truncate">
                                {callee.name}()
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate">
                                {callee.file.split(/[\\/]/).pop()}:{callee.line}
                              </span>
                            </div>
                            <div className="p-1 rounded-md bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors shrink-0">
                              <ArrowRight className="size-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Right Pane: AST Inspector (Col 3) */}
          <Card className="lg:col-span-3 p-4 flex flex-col gap-4 bg-card border-border h-[720px] overflow-hidden">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AST Inspector
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copySpanJson}
                className="h-6 text-[10px] px-2 gap-1 text-muted-foreground hover:text-foreground"
              >
                {copiedSpan ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Share2 className="size-3" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 custom-scrollbar text-xs">
              {!selectedFunction ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center p-4">
                  <span>No symbol selected</span>
                </div>
              ) : (
                <>
                  {/* Symbol Metadata */}
                  <div className="flex flex-col gap-2 bg-background p-3 rounded-lg border border-border font-mono text-[11px]">
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Symbol:</span>
                      <span className="font-bold text-foreground truncate max-w-[140px]">{selectedFunction.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">File:</span>
                      <span className="text-foreground truncate max-w-[140px]" title={selectedFunction.file}>
                        {selectedFunction.file.replace(/^[a-zA-Z]:[\\/].*?sem-7-project[\\/]/, '').replace(/\\/g, '/')}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Span:</span>
                      <span className="text-foreground">L{selectedFunction.line} - L{selectedFunction.endLine}</span>
                    </div>
                    <div className="flex justify-between border-b border-border/50 pb-1.5">
                      <span className="text-muted-foreground">Class:</span>
                      <span className="text-foreground">{selectedFunction.className || 'Global'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Queries:</span>
                      <span className="text-foreground font-bold">{selectedFunctionQueries.length}</span>
                    </div>
                  </div>

                  {/* OpenTelemetry JSON Preview */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      OpenTelemetry Span
                    </span>
                    <pre className="p-3 bg-background border border-border rounded-lg text-[10px] font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(
                        {
                          name: selectedFunction.name,
                          file: selectedFunction.file.replace(/^[a-zA-Z]:[\\/].*?sem-7-project[\\/]/, '').replace(/\\/g, '/'),
                          lines: [selectedFunction.line, selectedFunction.endLine],
                          touchesDb: selectedFunction.touchesDb,
                          transitiveTouchesDb: selectedFunction.transitiveTouchesDb
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  {/* DB Clients Active */}
                  {data?.clients && data.clients.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                        Active Database Clients ({data.clients.length})
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {data.clients.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            className="p-2 bg-background border border-border rounded text-[10px] font-mono flex justify-between items-center"
                          >
                            <span className="text-foreground font-semibold">{c.variableName}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {c.dbType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
};
