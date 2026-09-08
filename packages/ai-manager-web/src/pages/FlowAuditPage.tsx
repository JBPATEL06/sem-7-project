import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { GitBranch, Clock, AlertCircle, ArrowRight, Activity, Terminal } from 'lucide-react';

interface FlowAuditPageProps {
  onNavigate?: (route: any) => void;
  projectId?: string;
}

export const FlowAuditPage: React.FC<FlowAuditPageProps> = ({ onNavigate, projectId = 'acme-api' }) => {
  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-bold text-2xl tracking-tight text-foreground">
              Flow Auditor & AST Stream
            </h1>
            <p className="text-muted-foreground text-sm">
              Source code AST traversal and function call graph visualization for <strong className="text-foreground font-mono">{projectId}</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-muted text-muted-foreground font-mono text-xs px-3 py-1">
              Tier 2 Pipeline Pending
            </Badge>
          </div>
        </div>

        {/* Honest Pending DBCI State Card (Zero Fabricated Timelines) */}
        <Card className="p-12 gap-6 bg-card border-border border-dashed flex flex-col items-center text-center max-w-3xl mx-auto my-6">
          <div className="rounded-2xl bg-primary/10 text-primary p-4 border border-primary/20">
            <GitBranch className="size-8" />
          </div>

          <div className="flex flex-col gap-2 max-w-lg">
            <h2 className="text-lg font-bold text-foreground">
              AST Parsing Pipeline Pending (Tier 2)
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The <code className="font-mono text-xs bg-background px-1.5 py-0.5 rounded border border-border">ts-morph</code> AST parser and live flow streaming engine are scheduled for implementation in Tier 2.
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Rather than rendering fabricated step times or fake progress percentages, this screen will activate when the real AST compiler traverses functions, clients, and database queries.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mt-2">
            <div className="p-3 bg-background border border-border rounded-xl flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground">Compiler Engine</span>
              <span className="text-xs font-semibold text-foreground">ts-morph</span>
              <Badge className="bg-muted text-muted-foreground text-[10px] mt-1">Pending</Badge>
            </div>
            <div className="p-3 bg-background border border-border rounded-xl flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground">AST Stream</span>
              <span className="text-xs font-semibold text-foreground">SSE / EventSource</span>
              <Badge className="bg-muted text-muted-foreground text-[10px] mt-1">Offline</Badge>
            </div>
            <div className="p-3 bg-background border border-border rounded-xl flex flex-col items-center gap-1">
              <span className="text-[11px] text-muted-foreground">SQLite Storage</span>
              <span className="text-xs font-semibold text-foreground">sql.js (WASM)</span>
              <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px] mt-1">Ready</Badge>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            {onNavigate && (
              <>
                <Button
                  onClick={() => onNavigate('db-manager')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs gap-2 cursor-pointer"
                >
                  <Activity className="size-3.5" />
                  Explore SQLite DB
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onNavigate('qa')}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Terminal className="size-3.5" />
                  View QA Logs
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
};
