import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  GitBranch as GitBranchIcon,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Flag,
  Clock,
  User,
  ArrowRight
} from 'lucide-react';
import { GitBranch, BranchFlagItem } from '../../hooks/useGit';
import { BranchFlagBadge } from './BranchFlagBadge';

interface BranchHealthBoardProps {
  branches: GitBranch[];
  currentBranch: string;
  branchFlags: Record<string, BranchFlagItem>;
  onUpdateFlag: (branch: string, status: 'green' | 'red' | 'problem' | 'neutral', note?: string) => Promise<any>;
  onSelectBranch: (branch: string) => void;
  onOpenMergeStudio: (branch: string) => void;
}

export const BranchHealthBoard: React.FC<BranchHealthBoardProps> = ({
  branches,
  currentBranch,
  branchFlags,
  onUpdateFlag,
  onSelectBranch,
  onOpenMergeStudio
}) => {
  const getFlagSummary = () => {
    let green = 0;
    let red = 0;
    let problem = 0;
    let neutral = 0;

    branches.forEach((b) => {
      const f = branchFlags[b.name]?.status || 'neutral';
      if (f === 'green') green++;
      else if (f === 'red') red++;
      else if (f === 'problem') problem++;
      else neutral++;
    });

    return { green, red, problem, neutral };
  };

  const summary = getFlagSummary();

  return (
    <div className="flex flex-col gap-6">
      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">{summary.green}</span>
            <p className="text-[11px] text-muted-foreground">Green Flags (Ready)</p>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <div className="size-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">{summary.red}</span>
            <p className="text-[11px] text-muted-foreground">Red Flags (Blocking)</p>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">{summary.problem}</span>
            <p className="text-[11px] text-muted-foreground">Problem / Warning</p>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border flex items-center gap-3">
          <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
            <Flag className="size-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-foreground">{summary.neutral}</span>
            <p className="text-[11px] text-muted-foreground">Neutral / Pending</p>
          </div>
        </Card>
      </div>

      {/* Branch Cards Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((b) => {
          const flag = branchFlags[b.name];
          const isCurrent = b.name === currentBranch;

          return (
            <Card
              key={b.name}
              className={`p-5 bg-card border transition-all flex flex-col justify-between gap-4 ${
                isCurrent ? 'border-primary/50 shadow-md ring-1 ring-primary/20' : 'border-border'
              }`}
            >
              <div className="flex flex-col gap-3">
                {/* Branch Name & Current Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GitBranchIcon className="size-4 text-primary shrink-0" />
                    <span className="font-semibold text-sm text-foreground truncate" title={b.name}>
                      {b.name}
                    </span>
                  </div>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/40 shrink-0">
                      HEAD
                    </Badge>
                  )}
                </div>

                {/* Branch Flag Controller */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">Status Flag:</span>
                  <BranchFlagBadge
                    branch={b.name}
                    flag={flag}
                    onUpdateFlag={(status, note) => onUpdateFlag(b.name, status, note)}
                  />
                </div>

                {/* Flag Note / Reason */}
                {flag?.note ? (
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-xs text-foreground italic">
                    "{flag.note}"
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground/60 italic">
                    No status notes recorded.
                  </div>
                )}
              </div>

              {/* Card Footer Info & Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border text-[11px] text-muted-foreground flex-wrap gap-2">
                {flag?.updatedAt ? (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="size-3" />
                    {new Date(flag.updatedAt).toLocaleDateString()}
                  </span>
                ) : (
                  <span>Standard branch</span>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectBranch(b.name)}
                    className="text-xs h-7 px-2.5 cursor-pointer"
                  >
                    View Code
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenMergeStudio(b.name)}
                    className="text-xs h-7 px-2.5 text-primary hover:bg-primary/10 cursor-pointer"
                  >
                    Compare Merge
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
