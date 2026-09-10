import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode2,
  Database,
  ChevronRight,
  ChevronDown,
  FileText,
  FileJson,
  Search,
  Filter
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { GitTreeFile } from '../../hooks/useGit';

interface HierarchicalFileTreeProps {
  files: GitTreeFile[];
  changedFiles?: string[];
  selectedFilePath: string | null;
  selectedCommitSha?: string | null;
  onSelectFile: (filePath: string) => void;
}

interface TreeNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  isDbRelated: boolean;
  children: TreeNode[];
}

function buildTree(files: GitTreeFile[]): TreeNode[] {
  const root: TreeNode = {
    id: 'root',
    name: 'root',
    path: '',
    isFolder: true,
    isDbRelated: false,
    children: []
  };

  files.forEach((file) => {
    const parts = file.path.replace(/\\/g, '/').split('/');
    let current = root;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');

      let existing = current.children.find((c) => c.name === part && c.isFolder === !isLast);

      if (!existing) {
        existing = {
          id: currentPath,
          name: part,
          path: currentPath,
          isFolder: !isLast,
          isDbRelated: isLast ? file.isDbRelated : false,
          children: []
        };
        current.children.push(existing);
      }

      if (isLast && file.isDbRelated) {
        existing.isDbRelated = true;
      }

      current = existing;
    });
  });

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });
    nodes.forEach((n) => {
      if (n.children.length > 0) {
        sortNodes(n.children);
      }
    });
  }

  sortNodes(root.children);
  return root.children;
}

function getFileIcon(filename: string, isDb: boolean) {
  if (isDb) return <Database className="size-3.5 text-emerald-400 shrink-0" />;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'json') return <FileJson className="size-3.5 text-amber-400/90 shrink-0" />;
  if (ext === 'md' || ext === 'txt') return <FileText className="size-3.5 text-cyan-400/90 shrink-0" />;
  if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx')
    return <FileCode2 className="size-3.5 text-indigo-400 shrink-0" />;
  return <FileCode2 className="size-3.5 text-muted-foreground shrink-0" />;
}

export const HierarchicalFileTree: React.FC<HierarchicalFileTreeProps> = ({
  files,
  changedFiles = [],
  selectedFilePath,
  onSelectFile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const tree = useMemo(() => buildTree(files), [files]);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    function collectFolders(nodes: TreeNode[]) {
      nodes.forEach((n) => {
        if (n.isFolder) {
          initial[n.path] = true;
          collectFolders(n.children);
        }
      });
    }
    collectFolders(buildTree(files));
    return initial;
  });

  const toggleFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return tree;
    const q = searchQuery.toLowerCase();

    function filterNode(node: TreeNode): TreeNode | null {
      if (node.name.toLowerCase().includes(q) || node.path.toLowerCase().includes(q)) {
        return node;
      }
      if (node.isFolder) {
        const matchingChildren = node.children
          .map(filterNode)
          .filter((n): n is TreeNode => n !== null);
        if (matchingChildren.length > 0) {
          return { ...node, children: matchingChildren };
        }
      }
      return null;
    }

    return tree.map(filterNode).filter((n): n is TreeNode => n !== null);
  }, [tree, searchQuery]);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.isFolder) {
      const isExpanded = !!expandedFolders[node.path] || searchQuery.length > 0;
      return (
        <div key={node.path} className="flex flex-col">
          <button
            type="button"
            onClick={(e) => toggleFolder(node.path, e)}
            className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-muted/40 transition-colors text-left cursor-pointer group text-foreground font-mono text-[11px]"
            style={{ paddingLeft: `${depth * 12 + 6}px` }}
          >
            {isExpanded ? (
              <ChevronDown className="size-3 text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-transform" />
            ) : (
              <ChevronRight className="size-3 text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-transform" />
            )}
            {isExpanded ? (
              <FolderOpen className="size-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="size-3.5 text-amber-400/80 shrink-0" />
            )}
            <span className="truncate font-medium text-foreground/90">{node.name}</span>
          </button>

          {isExpanded && (
            <div className="flex flex-col">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf File Node
    const isSelected = selectedFilePath === node.path;
    const isChangedInCommit = changedFiles.includes(node.path);

    return (
      <button
        key={node.path}
        type="button"
        onClick={() => onSelectFile(node.path)}
        className={`flex items-center justify-between py-1 px-2 rounded-md transition-colors text-left cursor-pointer font-mono text-[11px] group ${
          isSelected
            ? 'bg-primary/15 text-primary font-semibold shadow-xs'
            : isChangedInCommit
            ? 'text-cyan-300 hover:bg-cyan-500/10'
            : node.isDbRelated
            ? 'text-emerald-400 hover:bg-emerald-500/10'
            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 18}px` }}
        title={node.path}
      >
        <div className="flex items-center gap-1.5 truncate">
          {getFileIcon(node.name, node.isDbRelated)}
          <span className="truncate">{node.name}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {isChangedInCommit && (
            <span className="size-1.5 rounded-full bg-cyan-400" title="Modified in this commit" />
          )}
          {node.isDbRelated && (
            <span className="rounded bg-emerald-500/20 text-emerald-400 text-[8px] px-1 py-0 font-sans">
              db
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Search filter bar */}
      <div className="p-2 border-b border-border/50">
        <div className="relative flex items-center">
          <Search className="size-3 text-muted-foreground absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files..."
            className="w-full bg-background/80 border border-border/60 rounded-md pl-7 pr-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {filteredTree.length > 0 ? (
          filteredTree.map((node) => renderNode(node, 0))
        ) : (
          <div className="p-4 text-center text-xs text-muted-foreground font-mono">
            No matching files found
          </div>
        )}
      </div>
    </div>
  );
};
