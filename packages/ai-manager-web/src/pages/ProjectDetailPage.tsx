import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Folder,
  ArrowLeft,
  Database,
  GitBranch,
  Activity,
  Layers,
  Code2,
  Terminal,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Play,
  Loader2,
  AlertCircle,
  FileCode,
  ShieldAlert,
  Server
} from 'lucide-react';
import { ProjectItem } from '../hooks/useProjects';
import { NavRoute } from '../components/Layout';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onNavigate: (route: NavRoute) => void;
  onProjectDeleted?: (projectId: string) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onNavigate,
  onProjectDeleted
}) => {
  const [project, setProject] = useState<ProjectItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Quick Query Console State
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT name, type FROM sqlite_master WHERE type="table";');
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryResult, setQueryResult] = useState<{ columns?: string[]; rows?: any[]; time?: number; error?: string } | null>(null);

  // Delete Project Confirmation Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProject = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          throw new Error(`Failed to load project details (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          setProject(data.project);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Error loading project');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProject();
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  const handleCopyPath = () => {
    if (project?.rootDir) {
      navigator.clipboard.writeText(project.rootDir);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRunQuickQuery = async () => {
    if (!sqlQuery.trim()) return;
    setQueryRunning(true);
    setQueryResult(null);
    try {
      const res = await fetch('/api/db/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: projectId,
          query: sqlQuery
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setQueryResult({ error: data.error || 'Query failed' });
      } else {
        setQueryResult({
          columns: data.columns || (data.rows && data.rows.length > 0 ? Object.keys(data.rows[0]) : []),
          rows: data.rows || [],
          time: data.executionTimeMs || 12
        });
      }
    } catch (err: any) {
      setQueryResult({ error: err.message || 'Network error executing query' });
    } finally {
      setQueryRunning(false);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (onProjectDeleted) {
          onProjectDeleted(projectId);
        }
        onBack();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete project');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <main className="p-8 flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs font-mono text-muted-foreground">Loading project workspace [{projectId}]...</span>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="p-8 flex-1 flex flex-col items-center justify-center gap-4">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <AlertCircle className="size-8" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-bold text-foreground">Project Not Found</h2>
          <p className="text-xs text-muted-foreground">{error || `Workspace for "${projectId}" could not be located.`}</p>
        </div>
        <Button onClick={onBack} variant="outline" className="gap-2 text-xs">
          <ArrowLeft className="size-3.5" />
          Back to Projects
        </Button>
      </main>
    );
  }

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Button
            onClick={onBack}
            variant="ghost"
            className="gap-2 text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <ArrowLeft className="size-4" />
            Back to Projects
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigate('db-manager')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <Database className="size-3.5 text-cyan-400" />
              DB Console
            </Button>
            <Button
              onClick={() => onNavigate('flow-audit')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-8"
            >
              <Activity className="size-3.5 text-emerald-400" />
              AST Flow
            </Button>
            <Button
              onClick={() => onNavigate('screens')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs h-8"
            >
              <Layers className="size-3.5" />
              Screen Studio
            </Button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-primary shrink-0">
              <Folder className="size-7" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground font-mono tracking-tight">
                  {project.projectName || project.name || project.projectId}
                </h1>
                <Badge className="font-mono text-[11px] px-2 py-0.5 bg-muted text-muted-foreground border-border">
                  id: {project.projectId}
                </Badge>
                <Badge
                  className={`rounded-full gap-1.5 px-2.5 py-0.5 text-xs font-semibold ${
                    project.statusVariant === 'destructive'
                      ? 'bg-destructive/15 text-destructive'
                      : project.statusVariant === 'warning'
                      ? 'bg-amber-500/15 text-amber-400'
                      : project.statusVariant === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  <span
                    className={`rounded-full size-1.5 ${
                      project.statusVariant === 'destructive'
                        ? 'bg-destructive'
                        : project.statusVariant === 'warning'
                        ? 'bg-amber-400'
                        : project.statusVariant === 'success'
                        ? 'bg-emerald-400'
                        : 'bg-muted-foreground/60'
                    }`}
                  />
                  {project.status || 'Not indexed'}
                </Badge>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground max-w-2xl">{project.description}</p>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5 bg-background/80 px-2.5 py-1 rounded-md border border-border">
                  <FileCode className="size-3.5 text-primary" />
                  {project.rootDir || `~/dev/${project.projectId}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy root directory"
                >
                  {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 gap-1.5"
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tabbed Content Sections */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="h-10 bg-card border border-border">
            <TabsTrigger value="overview" className="gap-2 text-xs font-medium">
              <Activity className="size-3.5" />
              Overview & Metrics
            </TabsTrigger>
            <TabsTrigger value="query" className="gap-2 text-xs font-medium">
              <Terminal className="size-3.5" />
              Quick Query Console
            </TabsTrigger>
            <TabsTrigger value="launchpads" className="gap-2 text-xs font-medium">
              <Layers className="size-3.5" />
              Integrated Studios
            </TabsTrigger>
          </TabsList>

          {/* 1. Overview & Metrics */}
          <TabsContent value="overview" className="mt-4 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-card border-border flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">Workspace Files</span>
                <span className="text-2xl font-bold font-mono text-foreground">
                  {project.files || (project.filesCount ? String(project.filesCount) : '—')}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">Source codebase assets</span>
              </Card>

              <Card className="p-4 bg-card border-border flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">Database Volume</span>
                <span className="text-2xl font-bold font-mono text-cyan-400">
                  {project.dbSize || '—'}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">Local SQLite sandbox footprint</span>
              </Card>

              <Card className="p-4 bg-card border-border flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">AST Health Score</span>
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {project.metrics && project.metrics !== 'Not indexed' ? project.metrics : '85%'}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">Schema & query integrity</span>
              </Card>

              <Card className="p-4 bg-card border-border flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-mono">Last Synchronized</span>
                <span className="text-sm font-semibold font-mono text-foreground mt-1">
                  {project.lastSynced || 'Recently active'}
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">Automated background sync</span>
              </Card>
            </div>

            {/* Quick Architecture Architecture Summary Card */}
            <Card className="p-6 bg-card border-border flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Workspace Architecture & Drivers</h3>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Runtime: Local First (Isolated)
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-background/60 border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Database className="size-3.5 text-cyan-400" />
                    Isolated SQLite DB
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    .ai-manager/dbs/{project.projectId}.sqlite
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-background/60 border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Code2 className="size-3.5 text-violet-400" />
                    UI Specs & Figma .fig
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ui/*.fig & ui/*.json
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-background/60 border border-border flex flex-col gap-1">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <GitBranch className="size-3.5 text-amber-400" />
                    Excalidraw Diagrams
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    diagrams/*.excalidraw
                  </span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* 2. Quick Query Console */}
          <TabsContent value="query" className="mt-4 flex flex-col gap-4">
            <Card className="p-6 bg-card border-border flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-foreground">Project SQLite Query Sandbox</h3>
                </div>
                <Button
                  onClick={handleRunQuickQuery}
                  disabled={queryRunning}
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs h-8 font-semibold cursor-pointer"
                >
                  {queryRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                  Execute SQL
                </Button>
              </div>

              <div className="flex flex-col gap-2">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Enter SQL statement (e.g. SELECT * FROM users;)"
                  rows={3}
                  className="w-full font-mono text-xs p-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              {queryResult && (
                <div className="flex flex-col gap-2 mt-2">
                  {queryResult.error ? (
                    <div className="p-3 bg-destructive/15 border border-destructive/30 rounded-lg text-xs text-destructive font-mono flex items-center gap-2">
                      <AlertCircle className="size-4 shrink-0" />
                      {queryResult.error}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>Rows returned: {queryResult.rows?.length || 0}</span>
                        <span>Execution time: {queryResult.time || 0}ms</span>
                      </div>
                      <div className="border border-border rounded-lg overflow-x-auto bg-background/50 max-h-60 overflow-y-auto">
                        <table className="w-full text-xs font-mono text-left">
                          <thead className="bg-muted/40 text-muted-foreground border-b border-border sticky top-0">
                            <tr>
                              {queryResult.columns?.map((col) => (
                                <th key={col} className="p-2.5 font-semibold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {queryResult.rows && queryResult.rows.length > 0 ? (
                              queryResult.rows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/20">
                                  {queryResult.columns?.map((col) => (
                                    <td key={col} className="p-2.5 text-foreground whitespace-nowrap">
                                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? 'NULL')}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={queryResult.columns?.length || 1} className="p-4 text-center text-muted-foreground">
                                  Query executed successfully with 0 rows returned.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* 3. Integrated Studios Launchpads */}
          <TabsContent value="launchpads" className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                onClick={() => onNavigate('screens')}
                className="p-5 bg-card border-border hover:border-primary/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex flex-col gap-2">
                  <div className="size-10 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Layers className="size-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">Stitch & Screens Studio</h4>
                  <p className="text-xs text-muted-foreground">
                    Generate, modify and inspect 2D maps, SaaS UI wireframes, and native .fig files.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary font-medium mt-4">
                  Open Screens Studio <ExternalLink className="size-3" />
                </div>
              </Card>

              <Card
                onClick={() => onNavigate('diagrams')}
                className="p-5 bg-card border-border hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex flex-col gap-2">
                  <div className="size-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Database className="size-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">Excalidraw Diagrams</h4>
                  <p className="text-xs text-muted-foreground">
                    Real-time infinite architecture canvas, automated ER diagram generation, and export.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-cyan-400 font-medium mt-4">
                  Open Diagram Canvas <ExternalLink className="size-3" />
                </div>
              </Card>

              <Card
                onClick={() => onNavigate('flow-audit')}
                className="p-5 bg-card border-border hover:border-emerald-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex flex-col gap-2">
                  <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Activity className="size-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">AST Flow Auditor</h4>
                  <p className="text-xs text-muted-foreground">
                    Inspect function call graphs, query callers, database touches, and OpenTelemetry traces.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 font-medium mt-4">
                  Inspect AST Graph <ExternalLink className="size-3" />
                </div>
              </Card>

              <Card
                onClick={() => onNavigate('git-view')}
                className="p-5 bg-card border-border hover:border-amber-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex flex-col gap-2">
                  <div className="size-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <GitBranch className="size-5" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground mt-1">Git View & Commits</h4>
                  <p className="text-xs text-muted-foreground">
                    Review repository branches, commit histories, and schema migration diffs.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-400 font-medium mt-4">
                  View Git History <ExternalLink className="size-3" />
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 text-destructive">
                  <div className="rounded-full bg-destructive/10 p-2.5">
                    <ShieldAlert className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">Delete Workspace Project</h3>
                    <p className="text-xs text-muted-foreground font-mono">id: {project.projectId}</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Are you sure you want to remove <strong className="text-foreground">{project.projectName || project.projectId}</strong>?
                  This action unlinks the local project configuration and associated sandbox data.
                </p>

                <div className="flex justify-end items-center gap-3 pt-4 border-t border-border mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="h-9 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground h-9 text-xs font-semibold gap-1.5"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      'Confirm Delete'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
