import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  GitCommitHorizontal,
  FolderOpen,
  Folder,
  FileCode2,
  RefreshCw,
  GitBranch as GitBranchIcon,
  CheckCircle2,
  Database,
  ArrowUpRight,
  Clock,
  GitMerge,
  ShieldAlert,
  Code,
  Layers,
  Flag,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
  History,
  FolderTree
} from 'lucide-react';
import { useGit } from '../hooks/useGit';
import { BranchFlagBadge } from '../components/git/BranchFlagBadge';
import { CodeViewerPane } from '../components/git/CodeViewerPane';
import { MergeConflictStudio } from '../components/git/MergeConflictStudio';
import { BranchHealthBoard } from '../components/git/BranchHealthBoard';
import { HierarchicalFileTree } from '../components/git/HierarchicalFileTree';

interface GitViewPageProps {
  projectId?: string;
  initialEmpty?: boolean;
}

export const GitViewPage: React.FC<GitViewPageProps> = ({
  projectId = 'acme-api',
  initialEmpty = false
}) => {
  const [forceEmpty, setForceEmpty] = useState(initialEmpty);
  const [activeTab, setActiveTab] = useState<'inspector' | 'conflicts' | 'health'>('inspector');
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(false);

  const {
    branches,
    currentBranch,
    selectBranch,
    commits,
    selectedCommit,
    setSelectedCommit,
    treeFiles,
    treeStats,
    changedFiles,
    // File code inspection
    selectedFile,
    setSelectedFile,
    fetchFileContent,
    isFileLoading,
    // Branch flags
    branchFlags,
    updateBranchFlag,
    // Merge conflict studio
    mergeResult,
    isCheckingMerge,
    checkMerge,
    resolveConflict,
    // Status
    isLoading,
    isSyncing,
    error,
    syncGit
  } = useGit(projectId);

  const isEmpty = forceEmpty || (!isLoading && commits.length === 0);
  const currentFlag = branchFlags[currentBranch];

  const handleFileClick = async (filePath: string) => {
    setSelectedFilePath(filePath);
    try {
      await fetchFileContent(filePath, selectedCommit || currentBranch);
    } catch (e) {
      console.error('Failed to open file', e);
    }
  };

  const getBranchDotClass = (branchName: string) => {
    const st = branchFlags[branchName]?.status;
    if (st === 'green') return 'bg-emerald-400';
    if (st === 'red') return 'bg-rose-400';
    if (st === 'problem') return 'bg-amber-400';
    return 'bg-muted-foreground';
  };

  return (
    <main className="p-6 md:p-8 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-5 max-w-7xl mx-auto">
        {/* Top Header & Project Bar */}
        <div className="flex justify-between items-center flex-wrap gap-4 pb-3 border-b border-border/60">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <GitBranchIcon className="size-4.5" />
              </div>
              <h1 className="font-bold text-foreground text-xl tracking-tight">
                Git Visualizer & Studio
              </h1>
              <Badge variant="outline" className="text-xs font-mono">
                {projectId}
              </Badge>
              {/* Branch Status Badge */}
              <BranchFlagBadge
                branch={currentBranch}
                flag={currentFlag}
                onUpdateFlag={(status, note) => updateBranchFlag(currentBranch, status, note)}
                align="left"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Live commit tree, branch governance flags, schema-linked file explorer, and merge conflict solver.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Branch Picker */}
            <Select value={currentBranch} onValueChange={selectBranch}>
              <SelectTrigger className="w-[190px] text-xs h-9" disabled={isLoading || branches.length === 0}>
                <div className="flex items-center gap-2 truncate">
                  <span className={`size-2 rounded-full shrink-0 ${getBranchDotClass(currentBranch)}`} />
                  <GitBranchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder={`Branch: ${currentBranch || 'main'}`} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {branches.length > 0 ? (
                  branches.map((b) => (
                    <SelectItem key={b.name} value={b.name}>
                      <div className="flex items-center gap-2">
                        <span className={`size-1.5 rounded-full ${getBranchDotClass(b.name)}`} />
                        <span>Branch: {b.name} {b.current ? '(HEAD)' : ''}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="main">Branch: main</SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Sync Repository Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncGit()}
              disabled={isSyncing || isLoading}
              className="gap-2 text-xs h-9 px-3.5 text-foreground cursor-pointer shadow-xs"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Git'}
            </Button>
          </div>
        </div>

        {/* Studio View Navigation Toolbar */}
        <div className="flex items-center justify-between border-b border-border gap-2 pb-px">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === 'inspector'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Code className="size-3.5" />
              <span>Inspector & Code Studio</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === 'conflicts'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <GitMerge className="size-3.5" />
              <span>Merge Conflict Studio</span>
              {mergeResult && mergeResult.conflictCount > 0 && (
                <Badge className="bg-rose-500/20 text-rose-400 text-[9px] px-1 py-0 ml-1">
                  {mergeResult.conflictCount}
                </Badge>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('health')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 ${
                activeTab === 'health'
                  ? 'border-primary text-primary bg-primary/10'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Flag className="size-3.5" />
              <span>Branch Flags Matrix</span>
              <Badge variant="secondary" className="text-[9px] font-mono ml-1">
                {branches.length}
              </Badge>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'inspector' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                className="text-xs h-7 px-2.5 gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/50"
                title={isHistoryCollapsed ? 'Show commit history pane' : 'Collapse commit history to expand code view'}
              >
                {isHistoryCollapsed ? (
                  <>
                    <PanelLeftOpen className="size-3.5 text-primary" />
                    <span>Show Commits</span>
                  </>
                ) : (
                  <>
                    <PanelLeftClose className="size-3.5" />
                    <span>Collapse Commits</span>
                  </>
                )}
              </Button>
            )}

            <button
              type="button"
              onClick={() => setForceEmpty(!forceEmpty)}
              className="text-[10px] font-mono text-muted-foreground/80 border border-border/60 px-2 py-0.5 rounded hover:bg-muted cursor-pointer transition-colors"
              title="Toggle empty state view"
            >
              {forceEmpty ? 'Live' : 'Simulate Empty'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* TAB 1: Unified Workbench Layout */}
        {activeTab === 'inspector' && (
          <div className="border border-border/80 rounded-2xl bg-card overflow-hidden shadow-xl flex h-[calc(100vh-230px)] min-h-[560px]">
            {/* PANE 1: Commit History List */}
            {!isHistoryCollapsed && (
              <div className="w-80 min-w-[270px] max-w-[310px] border-r border-border flex flex-col bg-card/50 select-none">
                {/* Pane Header */}
                <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-2">
                    <History className="size-3.5 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Commits</span>
                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                      {commits.length}
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsHistoryCollapsed(true)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted/60 transition-colors cursor-pointer"
                    title="Collapse history pane"
                  >
                    <PanelLeftClose className="size-3.5" />
                  </button>
                </div>

                {/* Pane Content */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2">
                      <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] text-muted-foreground font-mono">Loading commits...</span>
                    </div>
                  ) : isEmpty ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center p-4 gap-2">
                      <GitCommitHorizontal className="size-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">No commits indexed</span>
                    </div>
                  ) : (
                    commits.map((c) => {
                      const isSelected = selectedCommit === c.sha;
                      return (
                        <div
                          key={c.sha}
                          onClick={() => setSelectedCommit(c.sha)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all border text-left flex flex-col gap-1.5 ${
                            isSelected
                              ? 'bg-primary/10 border-primary/40 shadow-xs'
                              : 'border-transparent hover:bg-muted/40 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-foreground">
                              {c.sha}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {c.time}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
                            {c.message}
                          </p>

                          <div className="flex items-center justify-between pt-1 gap-1">
                            <span
                              className={`font-semibold rounded-full text-[9px] flex justify-center items-center size-5 shrink-0 ${c.authorColor}`}
                              title={`${c.authorName} <${c.authorEmail}>`}
                            >
                              {c.author}
                            </span>

                            {c.tag && (
                              <span
                                className={`font-medium rounded-full text-[9px] py-0.2 px-2 shrink-0 ${
                                  c.isDbRelated
                                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-primary/15 text-primary'
                                }`}
                              >
                                {c.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* PANE 2: Hierarchical Folder & File Explorer */}
            <div className="w-72 min-w-[240px] max-w-[290px] border-r border-border flex flex-col bg-muted/10">
              {/* Explorer Header */}
              <div className="px-4 py-2.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2">
                  <FolderTree className="size-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-foreground">Files</span>
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                    {treeFiles.length}
                  </Badge>
                </div>
                {treeStats.dbRelatedCount > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 text-[9px] gap-1 px-1.5 py-0">
                    <Database className="size-2.5" />
                    {treeStats.dbRelatedCount} DB
                  </Badge>
                )}
              </div>

              {/* Hierarchical File Tree */}
              <div className="flex-1 overflow-hidden">
                <HierarchicalFileTree
                  files={treeFiles}
                  changedFiles={changedFiles}
                  selectedFilePath={selectedFilePath}
                  selectedCommitSha={selectedCommit}
                  onSelectFile={handleFileClick}
                />
              </div>
            </div>

            {/* PANE 3: Code Viewer & Editor (Takes All Remaining Space) */}
            <div className="flex-1 flex flex-col bg-card min-w-0 overflow-hidden">
              <CodeViewerPane
                file={selectedFile}
                isLoading={isFileLoading}
                onClose={() => {
                  setSelectedFile(null);
                  setSelectedFilePath(null);
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Merge Conflict Studio */}
        {activeTab === 'conflicts' && (
          <MergeConflictStudio
            branches={branches}
            currentBranch={currentBranch}
            branchFlags={branchFlags}
            mergeResult={mergeResult}
            isCheckingMerge={isCheckingMerge}
            onCheckMerge={checkMerge}
            onResolveConflict={resolveConflict}
          />
        )}

        {/* TAB 3: Branch Flags Board */}
        {activeTab === 'health' && (
          <BranchHealthBoard
            branches={branches}
            currentBranch={currentBranch}
            branchFlags={branchFlags}
            onUpdateFlag={updateBranchFlag}
            onSelectBranch={(b) => {
              selectBranch(b);
              setActiveTab('inspector');
            }}
            onOpenMergeStudio={(b) => {
              selectBranch(b);
              setActiveTab('conflicts');
            }}
          />
        )}
      </div>
    </main>
  );
};
