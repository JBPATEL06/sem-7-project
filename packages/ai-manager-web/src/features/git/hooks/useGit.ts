import { useState, useEffect, useCallback } from 'react';
import { ApiClient } from '@/shared/api';

export interface GitBranch {
  name: string;
  current: boolean;
  commit: string;
  label: string;
}

export interface GitCommit {
  sha: string;
  hash: string;
  message: string;
  body?: string;
  author: string;
  authorName: string;
  authorEmail: string;
  authorColor: string;
  date: string;
  time: string;
  isHead?: boolean;
  tag?: string;
  isDbRelated?: boolean;
}

export interface GitTreeFile {
  path: string;
  name: string;
  dir: string;
  extension: string;
  isDbRelated: boolean;
}

export interface GitTreeStats {
  totalFiles: number;
  dbRelatedCount: number;
}

export interface GitSyncResult {
  success: boolean;
  branch: string;
  ahead: number;
  behind: number;
  modified: string[];
  staged: string[];
  created: string[];
  deleted: string[];
  isClean: boolean;
  fetched: boolean;
  lastSynced: string;
}

export interface BranchFlagItem {
  projectId: string;
  branch: string;
  status: 'green' | 'red' | 'problem' | 'neutral';
  note?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface GitFileContent {
  path: string;
  ref: string;
  content: string;
  lineCount: number;
  extension: string;
  isDbRelated: boolean;
  sizeBytes: number;
}

export interface ConflictChunk {
  id: string;
  file: string;
  lineStart: number;
  currentCode: string;   // HEAD / Ours
  incomingCode: string;  // Target / Theirs
  baseCode?: string;     // Ancestor
  resolvedCode?: string; // Resolution output
  isResolved: boolean;
  resolutionChoice?: 'current' | 'incoming' | 'both' | 'custom';
}

export interface MergeCheckResult {
  baseBranch: string;
  targetBranch: string;
  canAutoMerge: boolean;
  conflictCount: number;
  conflicts: ConflictChunk[];
  targetFlag?: 'green' | 'red' | 'problem' | 'neutral';
  summary: string;
}

export function useGit(projectId: string = 'acme-api') {
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>('main');
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [treeFiles, setTreeFiles] = useState<GitTreeFile[]>([]);
  const [treeStats, setTreeStats] = useState<GitTreeStats>({ totalFiles: 0, dbRelatedCount: 0 });
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  
  // File inspection
  const [selectedFile, setSelectedFile] = useState<GitFileContent | null>(null);
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);

  // Branch flags
  const [branchFlags, setBranchFlags] = useState<Record<string, BranchFlagItem>>({});

  // Merge Conflict Studio
  const [mergeResult, setMergeResult] = useState<MergeCheckResult | null>(null);
  const [isCheckingMerge, setIsCheckingMerge] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<GitSyncResult | null>(null);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const data = await ApiClient.get<{
        current: string;
        all: string[];
        branches: GitBranch[];
      }>(`/api/git/branches?projectId=${encodeURIComponent(projectId)}`);

      if (data.branches) {
        setBranches(data.branches);
        if (data.current) {
          setCurrentBranch(data.current);
        }
      }
    } catch (err: any) {
      console.warn('[useGit] Failed to fetch branches:', err.message);
    }
  }, [projectId]);

  // Fetch branch flags
  const fetchBranchFlags = useCallback(async () => {
    try {
      const res = await ApiClient.get<{ flags: BranchFlagItem[] }>(
        `/api/git/branch-flags?projectId=${encodeURIComponent(projectId)}`
      );
      if (res.flags) {
        const flagMap: Record<string, BranchFlagItem> = {};
        res.flags.forEach((f: BranchFlagItem) => {
          flagMap[f.branch] = f;
        });
        setBranchFlags(flagMap);
      }
    } catch (err: any) {
      console.warn('[useGit] Failed to fetch branch flags:', err.message);
    }
  }, [projectId]);

  // Update a branch flag
  const updateBranchFlag = useCallback(
    async (branch: string, status: 'green' | 'red' | 'problem' | 'neutral', note?: string) => {
      try {
        const res = await ApiClient.post<{ success: boolean; flag: BranchFlagItem }>(
          '/api/git/branch-flags',
          {
            projectId,
            branch,
            status,
            note
          }
        );
        if (res.flag) {
          setBranchFlags((prev) => ({
            ...prev,
            [branch]: res.flag
          }));
        }
        return res.flag;
      } catch (err: any) {
        console.error('[useGit] Failed to update branch flag:', err.message);
        throw err;
      }
    },
    [projectId]
  );

  // Fetch commits for selected branch
  const fetchCommits = useCallback(async (branchName?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const targetBranch = branchName || currentBranch;
      const data = await ApiClient.get<{
        commits: GitCommit[];
        total: number;
        branch: string;
      }>(`/api/git/commits?projectId=${encodeURIComponent(projectId)}&branch=${encodeURIComponent(targetBranch)}`);

      setCommits(data.commits || []);
      if (data.commits && data.commits.length > 0 && !selectedCommit) {
        setSelectedCommit(data.commits[0].sha);
      }
    } catch (err: any) {
      console.error('[useGit] Failed to fetch commits:', err.message);
      setError(err.message || 'Failed to load git commits');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentBranch, selectedCommit]);

  // Fetch tree / changed files for selected commit
  const fetchTree = useCallback(async (commitSha?: string) => {
    try {
      const targetSha = commitSha || selectedCommit || 'HEAD';
      const data = await ApiClient.get<{
        commit: string;
        files: GitTreeFile[];
        changedFiles: string[];
        stats: GitTreeStats;
      }>(`/api/git/tree?projectId=${encodeURIComponent(projectId)}&commit=${encodeURIComponent(targetSha)}`);

      setTreeFiles(data.files || []);
      setTreeStats(data.stats || { totalFiles: 0, dbRelatedCount: 0 });
      setChangedFiles(data.changedFiles || []);
    } catch (err: any) {
      console.warn('[useGit] Failed to fetch git tree:', err.message);
    }
  }, [projectId, selectedCommit]);

  // Fetch specific file code content
  const fetchFileContent = useCallback(
    async (filePath: string, refOverride?: string) => {
      try {
        setIsFileLoading(true);
        const ref = refOverride || selectedCommit || currentBranch || 'HEAD';
        const data = await ApiClient.get<GitFileContent>(
          `/api/git/file?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(
            filePath
          )}&ref=${encodeURIComponent(ref)}`
        );
        setSelectedFile(data);
        return data;
      } catch (err: any) {
        console.error('[useGit] Failed to fetch file content:', err.message);
        throw err;
      } finally {
        setIsFileLoading(false);
      }
    },
    [projectId, selectedCommit, currentBranch]
  );

  // Check merge & detect conflicts
  const checkMerge = useCallback(
    async (baseBranch: string, targetBranch: string) => {
      try {
        setIsCheckingMerge(true);
        const res = await ApiClient.post<MergeCheckResult>('/api/git/merge-check', {
          projectId,
          baseBranch,
          targetBranch
        });
        setMergeResult(res);
        return res;
      } catch (err: any) {
        console.error('[useGit] Merge check error:', err.message);
        throw err;
      } finally {
        setIsCheckingMerge(false);
      }
    },
    [projectId]
  );

  // Resolve conflict
  const resolveConflict = useCallback(
    async (params: {
      baseBranch: string;
      targetBranch: string;
      conflictId: string;
      resolutionChoice: 'current' | 'incoming' | 'both' | 'custom';
      resolvedCode: string;
      file: string;
    }) => {
      try {
        const res = await ApiClient.post<{
          success: boolean;
          conflictId: string;
          isResolved: boolean;
          resolvedCode: string;
        }>('/api/git/resolve-conflict', {
          projectId,
          ...params
        });

        if (res.success && mergeResult) {
          setMergeResult((prev) => {
            if (!prev) return null;
            const updatedConflicts = prev.conflicts.map((c) =>
              c.id === params.conflictId
                ? {
                    ...c,
                    isResolved: true,
                    resolutionChoice: params.resolutionChoice,
                    resolvedCode: params.resolvedCode
                  }
                : c
            );
            const remaining = updatedConflicts.filter((c) => !c.isResolved).length;
            return {
              ...prev,
              conflicts: updatedConflicts,
              conflictCount: remaining,
              canAutoMerge: remaining === 0
            };
          });
        }
        return res;
      } catch (err: any) {
        console.error('[useGit] Resolve conflict error:', err.message);
        throw err;
      }
    },
    [projectId, mergeResult]
  );

  // Initial load
  useEffect(() => {
    fetchBranches();
    fetchBranchFlags();
  }, [fetchBranches, fetchBranchFlags]);

  useEffect(() => {
    fetchCommits(currentBranch);
  }, [fetchCommits, currentBranch]);

  useEffect(() => {
    if (selectedCommit) {
      fetchTree(selectedCommit);
    }
  }, [fetchTree, selectedCommit]);

  // Handle branch switch
  const selectBranch = useCallback((newBranch: string) => {
    setCurrentBranch(newBranch);
    setSelectedCommit(null);
    setSelectedFile(null);
  }, []);

  // Sync action
  const syncGit = useCallback(async () => {
    try {
      setIsSyncing(true);
      setError(null);
      const res = await ApiClient.post<GitSyncResult>('/api/git/sync', { projectId });
      setSyncStatus(res);
      await fetchBranches();
      await fetchBranchFlags();
      await fetchCommits(currentBranch);
      if (selectedCommit) {
        await fetchTree(selectedCommit);
      }
      return res;
    } catch (err: any) {
      console.error('[useGit] Sync error:', err.message);
      setError(err.message || 'Git sync failed');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [projectId, currentBranch, selectedCommit, fetchBranches, fetchBranchFlags, fetchCommits, fetchTree]);

  return {
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
    fetchBranchFlags,
    // Merge conflict studio
    mergeResult,
    setMergeResult,
    isCheckingMerge,
    checkMerge,
    resolveConflict,
    // Status
    isLoading,
    isSyncing,
    error,
    syncStatus,
    syncGit,
    refetch: () => fetchCommits(currentBranch)
  };
}

