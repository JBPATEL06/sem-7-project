import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Github } from '@/shared/ui';
import { useDashboard } from '../hooks/useDashboard';
import {
  Folder,
  CircleCheck,
  Database,
  Plus,
  Play,
  FileText,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (route: any) => void;
}

function timeAgo(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'recently';
  }
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { stats, activities, isLoading, error, refetch } = useDashboard();

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start gap-6 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="font-bold text-3xl tracking-tight text-foreground">Dashboard</h1>
              {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground text-sm">
              Overview of your indexed projects and live system status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigate('projects')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-sm gap-2 h-9 cursor-pointer"
            >
              <Plus className="size-4" />
              New Project
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('flow-audit')}
              className="font-medium text-sm gap-2 h-9 cursor-pointer"
            >
              <Play className="size-4" />
              Run Indexer
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate('qa')}
              className="font-medium text-sm gap-2 h-9 cursor-pointer"
            >
              <FileText className="size-4" />
              View Logs
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={refetch}
              title="Refresh Dashboard"
              className="h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Stat Cards Row */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Active Projects */}
          <Card className="rounded-xl bg-card border border-border p-5">
            <CardContent className="flex p-0 flex-col gap-4">
              <div className="rounded-lg bg-primary/15 text-primary flex justify-center items-center size-9">
                <Folder className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-2xl text-foreground">
                  {isLoading ? '—' : stats?.activeProjects ?? 0}
                </span>
                <span className="text-muted-foreground text-sm">Active Projects</span>
                <span className="text-muted-foreground text-xs font-medium">
                  {isLoading ? 'Loading...' : `${stats?.indexedProjects ?? 0} indexed`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Last Sync Status */}
          <Card className="rounded-xl bg-card border border-border p-5">
            <CardContent className="flex p-0 flex-col gap-4">
              <div className="rounded-lg bg-emerald-500/15 text-emerald-400 flex justify-center items-center size-9">
                <CircleCheck className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-2xl text-foreground">
                  {isLoading ? '—' : stats?.lastSync ? timeAgo(stats.lastSync) : 'Never'}
                </span>
                <span className="text-muted-foreground text-sm">Last Sync Status</span>
                <span className="text-muted-foreground text-xs">
                  {isLoading ? '...' : stats?.lastSync ? `Latest sync ${timeAgo(stats.lastSync)}` : 'No syncs recorded yet'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* DB Size */}
          <Card className="rounded-xl bg-card border border-border p-5">
            <CardContent className="flex p-0 flex-col gap-4">
              <div className="rounded-lg bg-sky-500/15 text-sky-400 flex justify-center items-center size-9">
                <Database className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-2xl text-foreground">
                  {isLoading ? '—' : stats?.totalDbSize ?? '0 KB'}
                </span>
                <span className="text-muted-foreground text-sm">DB Size (sql.js)</span>
                <span className="text-muted-foreground text-xs">
                  {isLoading ? '...' : `across ${stats?.sqliteFilesCount ?? 0} SQLite files`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Connected Repos */}
          <Card className="rounded-xl bg-card border border-border p-5">
            <CardContent className="flex p-0 flex-col gap-4">
              <div className="rounded-lg bg-violet-500/15 text-violet-400 flex justify-center items-center size-9">
                <Github className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-2xl text-foreground">
                  {isLoading ? '—' : stats?.connectedRepos.total ?? 0}
                </span>
                <span className="text-muted-foreground text-sm">Connected Workspaces</span>
                <span className="text-muted-foreground text-xs">
                  {isLoading ? '...' : `${stats?.connectedRepos.github ?? 0} GitHub · ${stats?.connectedRepos.local ?? 0} local`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2 Column Layout: Recent Activity & System Health */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
          {/* Recent Activity */}
          <Card className="rounded-xl bg-card border border-border p-6 gap-6">
            <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
              <span className="text-xs text-muted-foreground font-mono">
                {activities.length} events logged
              </span>
            </CardHeader>
            <CardContent className="flex p-0 flex-col gap-0 divide-y divide-border">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  No activity recorded yet. Create a project or run a query to see activity stream.
                </div>
              ) : (
                activities.slice(0, 7).map((act) => (
                  <div key={act.id} className="flex py-3.5 justify-between items-center gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`rounded-full size-2 shrink-0 ${
                          act.status === 'success'
                            ? 'bg-emerald-400'
                            : act.status === 'warning'
                            ? 'bg-amber-400'
                            : 'bg-sky-400'
                        }`}
                      />
                      <span className="font-mono text-xs font-semibold text-foreground shrink-0 truncate max-w-[120px]">
                        {act.projectName}
                      </span>
                      <span className="text-muted-foreground text-xs truncate">
                        — {act.action}: {act.detail}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-xs shrink-0 font-mono">
                      {timeAgo(act.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="rounded-xl bg-card border border-border p-6 gap-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-lg">System Health</CardTitle>
            </CardHeader>
            <CardContent className="flex p-0 flex-col gap-4">
              <div className="flex justify-between items-center gap-3 py-1">
                <span className="text-sm text-foreground font-medium">Indexer Engine</span>
                <span
                  className={`font-medium rounded-full text-xs px-2.5 py-1 ${
                    stats?.systemHealth.indexerEngine === 'Operational'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stats?.systemHealth.indexerEngine || 'Checking...'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1">
                <span className="text-sm text-foreground font-medium">Groq API</span>
                <span
                  className={`font-medium rounded-full text-xs px-2.5 py-1 ${
                    stats?.systemHealth.groqApi === 'Operational'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {stats?.systemHealth.groqApi || 'Checking...'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1">
                <span className="text-sm text-foreground font-medium">sql.js Runtime</span>
                <span
                  className={`font-medium rounded-full text-xs px-2.5 py-1 ${
                    stats?.systemHealth.sqlJsRuntime === 'Operational'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {stats?.systemHealth.sqlJsRuntime || 'Checking...'}
                </span>
              </div>
              <div className="flex justify-between items-center gap-3 py-1">
                <span className="text-sm text-foreground font-medium">Encryption Layer</span>
                <span
                  className={`font-medium rounded-full text-xs px-2.5 py-1 ${
                    stats?.systemHealth.encryptionLayer === 'AES-256-GCM Active'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {stats?.systemHealth.encryptionLayer || 'Checking...'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
