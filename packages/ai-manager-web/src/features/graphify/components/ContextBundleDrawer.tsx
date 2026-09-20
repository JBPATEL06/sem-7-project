import React, { useState } from 'react';
import { GraphNode, FileContextReport, ImpactAnalysis, ProjectContextBundle } from '@ai-manager/core';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/shared/ui';
import {
  FileCode,
  Layers,
  Sparkles,
  GitBranch,
  Database,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Bot
} from 'lucide-react';

interface ContextBundleDrawerProps {
  node: GraphNode | null;
  fileReport: FileContextReport | null;
  impact: ImpactAnalysis | null;
  bundle: ProjectContextBundle | null;
  onGetAiContext: () => Promise<string>;
}

export const ContextBundleDrawer: React.FC<ContextBundleDrawerProps> = ({
  node,
  fileReport,
  impact,
  bundle,
  onGetAiContext
}) => {
  const [activeTab, setActiveTab] = useState<'360' | 'docs' | 'ai_lineage' | 'impact'>('360');
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyAiContext = async () => {
    const text = await onGetAiContext();
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!node) {
    return (
      <Card className="h-full border-border/80 bg-card/60 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <Layers className="size-8 mb-2 opacity-40" />
        <div className="text-sm font-semibold">Select a Node to Inspect</div>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Click any symbol, route, database table, or document in the graph to view 360° context and edit lineage.
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full border-border/80 bg-card flex flex-col overflow-hidden shadow-lg">
      {/* Header */}
      <CardHeader className="p-4 border-b border-border/80 bg-muted/20 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0.5">
              {node.type}
            </Badge>
            {node.file && (
              <span className="text-xs text-muted-foreground font-mono truncate max-w-[160px]">
                {node.file.split('/').pop()}
              </span>
            )}
          </div>
          <CardTitle className="text-sm font-bold text-foreground break-all">
            {node.label}
          </CardTitle>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyAiContext}
          className="text-xs h-7 gap-1.5 cursor-pointer shrink-0"
          title="Copy Token-Efficient Context for AI Prompts"
        >
          {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied!' : 'AI Context'}
        </Button>
      </CardHeader>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center border-b border-border text-xs bg-muted/10 px-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('360')}
          className={`px-3 py-2 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === '360'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          360° Node View
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-3 py-2 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'docs'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          PRD & Specs
        </button>
        <button
          onClick={() => setActiveTab('ai_lineage')}
          className={`px-3 py-2 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'ai_lineage'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          AI Lineage
        </button>
        <button
          onClick={() => setActiveTab('impact')}
          className={`px-3 py-2 border-b-2 font-medium cursor-pointer transition-colors ${
            activeTab === 'impact'
              ? 'border-primary text-foreground font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Blast Radius
        </button>
      </div>

      {/* Content Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {activeTab === '360' && (
          <div className="space-y-3">
            {/* Coordinates */}
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/60 space-y-1 font-mono text-[11px]">
              <div><span className="text-muted-foreground">ID:</span> {node.id}</div>
              {node.file && <div><span className="text-muted-foreground">File:</span> {node.file}</div>}
              {node.line && <div><span className="text-muted-foreground">Line Range:</span> L{node.line} - L{node.endLine || node.line}</div>}
            </div>

            {/* DB Touches */}
            {fileReport && fileReport.dbTouches.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1.5">
                  Database Operations ({fileReport.dbTouches.length})
                </span>
                <div className="space-y-1">
                  {fileReport.dbTouches.map(db => (
                    <div key={db.id} className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-2">
                      <Database className="size-3.5 shrink-0" />
                      <span className="truncate">{db.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Issues */}
            {fileReport && fileReport.linkedIssues.length > 0 && (
              <div>
                <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1.5">
                  Open Issues ({fileReport.linkedIssues.length})
                </span>
                <div className="space-y-1">
                  {fileReport.linkedIssues.map(iss => (
                    <div key={iss.id} className="p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-2">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      <span className="truncate">{iss.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-3">
            {bundle && (
              <>
                <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1">
                    PRD Overview
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {bundle.prd.overview || 'AI Manager cockpit integration specs.'}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
                    Core Value Props
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                    {bundle.prd.valueProps.slice(0, 4).map((vp, idx) => (
                      <li key={idx}>{vp}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
                    Active Milestones
                  </span>
                  <div className="space-y-1">
                    {bundle.plans.nextUp.map((plan, idx) => (
                      <div key={idx} className="p-1.5 rounded bg-muted/30 border border-border/60 text-foreground">
                        {plan}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ai_lineage' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center gap-2 text-pink-300">
              <Bot className="size-4 shrink-0" />
              <div>
                <div className="font-semibold">AI Assistant History</div>
                <div className="text-[11px] opacity-80">Track which models generated and modified this project</div>
              </div>
            </div>

            {fileReport?.aiHistory && fileReport.aiHistory.length > 0 ? (
              <div className="space-y-2">
                {fileReport.aiHistory.map((hist, idx) => (
                  <div key={idx} className="p-2 rounded bg-muted/40 border border-border/60 space-y-0.5">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{hist.model}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{new Date(hist.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {hist.promptPreview && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {hist.promptPreview}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No direct AI modifications logged for this specific node.
              </div>
            )}
          </div>
        )}

        {activeTab === 'impact' && (
          <div className="space-y-3">
            {impact ? (
              <>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase font-mono">Blast Radius Score</div>
                    <div className="text-xl font-bold text-foreground">{impact.blastRadiusScore} / 100</div>
                  </div>
                  <Badge variant={impact.blastRadiusScore > 50 ? 'destructive' : 'outline'}>
                    {impact.blastRadiusScore > 50 ? 'High Impact' : 'Moderate Impact'}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
                    Direct Callers ({impact.directCallers.length})
                  </span>
                  <div className="space-y-1">
                    {impact.directCallers.map(c => (
                      <div key={c.id} className="p-1.5 rounded bg-muted/30 border border-border/60 text-foreground truncate">
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block mb-1">
                    Affected Routes ({impact.affectedRoutes.length})
                  </span>
                  <div className="space-y-1">
                    {impact.affectedRoutes.map(r => (
                      <div key={r.id} className="p-1.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 truncate">
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Click a symbol to compute blast radius.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
