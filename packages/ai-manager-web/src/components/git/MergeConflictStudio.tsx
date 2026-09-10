import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import {
  GitMerge,
  AlertTriangle,
  CheckCircle2,
  GitBranch as GitBranchIcon,
  ShieldAlert,
  ArrowRight,
  FileCode2,
  Check,
  RotateCcw,
  Sparkles,
  SplitSquareVertical
} from 'lucide-react';
import { GitBranch, ConflictChunk, MergeCheckResult, BranchFlagItem } from '../../hooks/useGit';

interface MergeConflictStudioProps {
  branches: GitBranch[];
  currentBranch: string;
  branchFlags: Record<string, BranchFlagItem>;
  mergeResult: MergeCheckResult | null;
  isCheckingMerge: boolean;
  onCheckMerge: (baseBranch: string, targetBranch: string) => Promise<MergeCheckResult>;
  onResolveConflict: (params: {
    baseBranch: string;
    targetBranch: string;
    conflictId: string;
    resolutionChoice: 'current' | 'incoming' | 'both' | 'custom';
    resolvedCode: string;
    file: string;
  }) => Promise<any>;
}

export const MergeConflictStudio: React.FC<MergeConflictStudioProps> = ({
  branches,
  currentBranch,
  branchFlags,
  mergeResult,
  isCheckingMerge,
  onCheckMerge,
  onResolveConflict
}) => {
  const [baseBranch, setBaseBranch] = useState<string>(currentBranch || 'main');
  const [targetBranch, setTargetBranch] = useState<string>(
    branches.find((b) => b.name !== (currentBranch || 'main'))?.name || currentBranch || 'main'
  );

  const [activeConflictId, setActiveConflictId] = useState<string | null>(null);
  const [customResolutions, setCustomResolutions] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolutionSuccessMessage, setResolutionSuccessMessage] = useState<string | null>(null);

  // When branches load or update
  useEffect(() => {
    if (branches.length > 0) {
      if (!baseBranch) setBaseBranch('main');
      const other = branches.find((b) => b.name !== baseBranch);
      if (other && (!targetBranch || targetBranch === baseBranch)) {
        setTargetBranch(other.name);
      }
    }
  }, [branches, baseBranch]);

  const handleRunCheck = async () => {
    if (!baseBranch || !targetBranch) return;
    const res = await onCheckMerge(baseBranch, targetBranch);
    if (res.conflicts && res.conflicts.length > 0) {
      setActiveConflictId(res.conflicts[0].id);
      // Initialize resolution draft
      const drafts: Record<string, string> = {};
      res.conflicts.forEach((c) => {
        drafts[c.id] = c.resolvedCode || c.currentCode;
      });
      setCustomResolutions(drafts);
    }
  };

  const currentConflict = mergeResult?.conflicts.find((c) => c.id === activeConflictId);

  const handleApplyResolution = async (
    choice: 'current' | 'incoming' | 'both' | 'custom'
  ) => {
    if (!currentConflict) return;
    setIsResolving(true);
    setResolutionSuccessMessage(null);

    let resolvedCode = '';
    if (choice === 'current') {
      resolvedCode = currentConflict.currentCode;
    } else if (choice === 'incoming') {
      resolvedCode = currentConflict.incomingCode;
    } else if (choice === 'both') {
      resolvedCode = `${currentConflict.currentCode}\n\n// --- Merged from ${targetBranch} ---\n${currentConflict.incomingCode}`;
    } else {
      resolvedCode = customResolutions[currentConflict.id] || currentConflict.currentCode;
    }

    try {
      await onResolveConflict({
        baseBranch,
        targetBranch,
        conflictId: currentConflict.id,
        resolutionChoice: choice,
        resolvedCode,
        file: currentConflict.file
      });

      setCustomResolutions((prev) => ({ ...prev, [currentConflict.id]: resolvedCode }));
      setResolutionSuccessMessage(`Successfully resolved conflict in ${currentConflict.file}`);
      setTimeout(() => setResolutionSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to resolve', e);
    } finally {
      setIsResolving(false);
    }
  };

  const baseFlag = branchFlags[baseBranch];
  const targetFlag = branchFlags[targetBranch];

  return (
    <div className="flex flex-col gap-6">
      {/* Branch Comparator Header Card */}
      <Card className="p-6 bg-card border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 flex-wrap w-full md:w-auto">
            {/* Base Branch Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <GitBranchIcon className="size-3.5 text-primary" />
                Base Branch (Ours)
              </label>
              <div className="flex items-center gap-2">
                <Select value={baseBranch} onValueChange={setBaseBranch}>
                  <SelectTrigger className="w-[180px] text-xs">
                    <SelectValue placeholder="Base Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name} {b.current ? '(HEAD)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {baseFlag?.status === 'green' && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">🟢 Ready</Badge>
                )}
                {baseFlag?.status === 'red' && (
                  <Badge className="bg-rose-500/15 text-rose-400 text-[10px]">🔴 Blocking</Badge>
                )}
                {baseFlag?.status === 'problem' && (
                  <Badge className="bg-amber-500/15 text-amber-400 text-[10px]">🟡 Problem</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center p-2 rounded-full bg-muted mt-5">
              <ArrowRight className="size-4 text-muted-foreground" />
            </div>

            {/* Target / Incoming Branch Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <GitBranchIcon className="size-3.5 text-indigo-400" />
                Incoming Branch (Theirs)
              </label>
              <div className="flex items-center gap-2">
                <Select value={targetBranch} onValueChange={setTargetBranch}>
                  <SelectTrigger className="w-[180px] text-xs">
                    <SelectValue placeholder="Incoming Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {targetFlag?.status === 'green' && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 text-[10px]">🟢 Ready</Badge>
                )}
                {targetFlag?.status === 'red' && (
                  <Badge className="bg-rose-500/15 text-rose-400 text-[10px]">🔴 Blocking</Badge>
                )}
                {targetFlag?.status === 'problem' && (
                  <Badge className="bg-amber-500/15 text-amber-400 text-[10px]">🟡 Problem</Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleRunCheck}
            disabled={isCheckingMerge || baseBranch === targetBranch}
            className="gap-2 text-xs bg-primary text-primary-foreground font-semibold px-5 h-10 shrink-0 cursor-pointer shadow-sm"
          >
            <GitMerge className={`size-4 ${isCheckingMerge ? 'animate-spin' : ''}`} />
            {isCheckingMerge ? 'Analyzing Diff...' : 'Run Merge Conflict Analysis'}
          </Button>
        </div>

        {/* Merge status summary bar */}
        {mergeResult && (
          <div
            className={`mt-4 p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
              mergeResult.canAutoMerge
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {mergeResult.canAutoMerge ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertTriangle className="size-4 shrink-0" />
              )}
              <span className="font-medium">{mergeResult.summary}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px]">
                {mergeResult.conflictCount} conflict(s) remaining
              </Badge>
            </div>
          </div>
        )}
      </Card>

      {/* Conflict Resolution Workspace */}
      {mergeResult && mergeResult.conflicts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Conflicted Files List */}
          <Card className="p-4 bg-card border-border flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold text-foreground">Conflicted Files</span>
              <Badge className="bg-rose-500/15 text-rose-400 text-[10px]">
                {mergeResult.conflicts.filter((c) => !c.isResolved).length} pending
              </Badge>
            </div>

            <div className="flex flex-col gap-1.5">
              {mergeResult.conflicts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveConflictId(c.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-mono text-left transition-colors cursor-pointer border ${
                    activeConflictId === c.id
                      ? 'bg-primary/10 border-primary/40 text-foreground'
                      : 'border-transparent hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode2 className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate text-[11px]">{c.file.split('/').pop()}</span>
                  </div>
                  {c.isResolved ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] px-1 py-0">
                      Resolved
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/15 text-rose-400 text-[9px] px-1 py-0">
                      Conflict
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* 3-Way Side-by-Side Resolver */}
          {currentConflict && (
            <div className="flex flex-col gap-4">
              {/* Conflict File Header */}
              <div className="flex items-center justify-between bg-card border border-border p-3.5 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <SplitSquareVertical className="size-4 text-primary shrink-0" />
                  <span className="text-xs font-mono font-semibold text-foreground truncate">
                    {currentConflict.file}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    (Line ~{currentConflict.lineStart})
                  </span>
                </div>

                {resolutionSuccessMessage && (
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 animate-in fade-in">
                    <Check className="size-3.5" /> {resolutionSuccessMessage}
                  </span>
                )}
              </div>

              {/* Side-by-Side Comparison Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current / Ours */}
                <div className="flex flex-col bg-card border border-blue-500/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-blue-500/10 border-b border-blue-500/20">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-400" />
                      <span className="text-xs font-semibold text-blue-400">
                        Current Change ({baseBranch} / HEAD)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyResolution('current')}
                      disabled={isResolving}
                      className="text-[11px] h-6 px-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                    >
                      Accept Current
                    </Button>
                  </div>
                  <pre className="p-3 text-xs font-mono bg-[#0d1117] text-[#c9d1d9] overflow-auto max-h-[220px] leading-relaxed">
                    {currentConflict.currentCode}
                  </pre>
                </div>

                {/* Incoming / Theirs */}
                <div className="flex flex-col bg-card border border-indigo-500/30 rounded-xl overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-3.5 py-2 bg-indigo-500/10 border-b border-indigo-500/20">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-indigo-400" />
                      <span className="text-xs font-semibold text-indigo-400">
                        Incoming Change ({targetBranch})
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyResolution('incoming')}
                      disabled={isResolving}
                      className="text-[11px] h-6 px-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
                    >
                      Accept Incoming
                    </Button>
                  </div>
                  <pre className="p-3 text-xs font-mono bg-[#0d1117] text-[#c9d1d9] overflow-auto max-h-[220px] leading-relaxed">
                    {currentConflict.incomingCode}
                  </pre>
                </div>
              </div>

              {/* Resolved Output Editor */}
              <div className="flex flex-col bg-card border border-emerald-500/30 rounded-xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-400">
                      Resolved Output (Result to be committed)
                    </span>
                    {currentConflict.isResolved && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px]">
                        Marked as Resolved [{currentConflict.resolutionChoice}]
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleApplyResolution('both')}
                      disabled={isResolving}
                      className="text-xs h-7 px-2.5 border-border cursor-pointer"
                    >
                      Accept Both Changes
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApplyResolution('custom')}
                      disabled={isResolving}
                      className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium cursor-pointer"
                    >
                      <Check className="size-3.5 mr-1" />
                      Save & Mark Resolved
                    </Button>
                  </div>
                </div>

                <div className="p-3 bg-[#0d1117]">
                  <textarea
                    rows={6}
                    value={customResolutions[currentConflict.id] ?? currentConflict.currentCode}
                    onChange={(e) =>
                      setCustomResolutions((prev) => ({
                        ...prev,
                        [currentConflict.id]: e.target.value
                      }))
                    }
                    className="w-full bg-transparent text-[#c9d1d9] font-mono text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y leading-relaxed border border-border/30"
                    placeholder="Edit merged code here..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State / Initial Guide */}
      {(!mergeResult || mergeResult.conflicts.length === 0) && (
        <Card className="p-12 text-center bg-card border-border flex flex-col items-center justify-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <GitMerge className="size-7" />
          </div>
          <div className="flex flex-col gap-1 max-w-md">
            <h3 className="text-base font-semibold text-foreground">Merge Conflict Studio</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Select a Base and Incoming branch above, then click <strong>Run Merge Conflict Analysis</strong> to detect conflicting database schema changes, migrations, and source code.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};
