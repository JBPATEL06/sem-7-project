import React, { useState } from 'react';
import {
  Layers,
  Search,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ChevronRight,
  ChevronDown,
  Square,
  Circle,
  Type,
  Layout,
  Component,
  Plus,
  Trash2,
  ChevronUp,
  FileText,
  Folder
} from 'lucide-react';
import { SceneGraph, SceneNode } from '@open-pencil/scene-graph';

interface LayersPanelProps {
  graph: SceneGraph;
  selectedIds: string[];
  onSelectNode: (nodeId: string, multi?: boolean) => void;
  onUpdateNode: (nodeId: string, updates: Partial<SceneNode>) => void;
  onReorderNode?: (nodeId: string, direction: 'up' | 'down') => void;
  onAddPage?: () => void;
  activePageId?: string;
  onSelectPage?: (pageId: string) => void;
  isLight?: boolean;
}

export function LayersPanel({
  graph,
  selectedIds,
  onSelectNode,
  onUpdateNode,
  onReorderNode,
  onAddPage,
  activePageId,
  onSelectPage,
  isLight = false
}: LayersPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'layers' | 'assets'>('layers');

  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (node: SceneNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditName(node.name || '');
  };

  const commitRename = (id: string) => {
    if (editName.trim()) {
      onUpdateNode(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'FRAME':
        return <Layout className="w-3.5 h-3.5 text-[#9747ff]" />;
      case 'TEXT':
        return <Type className="w-3.5 h-3.5 text-[#f59e0b]" />;
      case 'RECTANGLE':
        return <Square className="w-3.5 h-3.5 text-[#3b82f6]" />;
      case 'ELLIPSE':
        return <Circle className="w-3.5 h-3.5 text-[#10b981]" />;
      case 'COMPONENT':
      case 'INSTANCE':
        return <Component className="w-3.5 h-3.5 text-[#a855f7]" />;
      default:
        return <Square className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Recursive tree walker
  const renderLayerItem = (node: SceneNode, depth: number = 0): React.ReactNode => {
    const isSelected = selectedIds.includes(node.id);
    const hasChildren = node.childIds && node.childIds.length > 0;
    const isCollapsed = collapsedNodes.has(node.id);

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = (node.name || '').toLowerCase().includes(q) || (node.type || '').toLowerCase().includes(q);
      if (!matches && !hasChildren) return null;
    }

    return (
      <div key={node.id} className="flex flex-col">
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(node.id, e.shiftKey || e.metaKey || e.ctrlKey);
          }}
          onDoubleClick={(e) => startRename(node, e)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between h-7 pr-2 cursor-pointer transition-colors text-xs ${
            isSelected
              ? 'bg-[#0d99ff] text-white font-medium'
              : 'text-slate-300 hover:bg-[#2e2e2e] hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-1.5 min-w-0 flex-1">
            {/* Collapse toggle arrow */}
            {hasChildren ? (
              <button
                onClick={(e) => toggleCollapse(node.id, e)}
                className="p-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-white cursor-pointer"
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <span className="w-3" />
            )}

            {/* Type Icon */}
            <span className="shrink-0">{getNodeIcon(node.type)}</span>

            {/* Title / Inline Rename Input */}
            {editingId === node.id ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => commitRename(node.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(node.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                autoFocus
                className="bg-[#1e1e1e] text-white border border-[#0d99ff] px-1 py-0.5 rounded text-xs outline-none w-full"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate text-[12px]" title={node.name}>
                {node.name || node.type}
              </span>
            )}
          </div>

          {/* Action Icons on Hover */}
          <div className="hidden group-hover:flex items-center space-x-1 opacity-80">
            {/* Visibility Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateNode(node.id, { visible: node.visible !== false ? false : true });
              }}
              className="p-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-white"
              title={node.visible === false ? 'Show Layer' : 'Hide Layer'}
            >
              {node.visible === false ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>

            {/* Lock Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateNode(node.id, { locked: !node.locked });
              }}
              className="p-0.5 rounded hover:bg-black/20 text-slate-400 hover:text-white"
              title={node.locked ? 'Unlock Layer' : 'Lock Layer'}
            >
              {node.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Child items if expanded */}
        {hasChildren && !isCollapsed && (
          <div className="flex flex-col">
            {node.childIds.map(childId => {
              const childNode = graph.getNode(childId);
              return childNode ? renderLayerItem(childNode, depth + 1) : null;
            })}
          </div>
        )}
      </div>
    );
  };

  const pages = graph.getPages ? graph.getPages() : [];

  return (
    <div className="w-[240px] h-full border-r border-[#333333] bg-[#242424] flex flex-col select-none text-xs text-slate-200">
      {/* Tab Switcher: Layers | Assets */}
      <div className="p-2 border-b border-[#333333] bg-[#242424]">
        <div className="flex bg-[#1e1e1e] p-0.5 rounded-lg border border-[#333333] text-[11px] font-medium">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
              activeTab === 'layers'
                ? 'bg-[#2a2a2a] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Layers
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer ${
              activeTab === 'assets'
                ? 'bg-[#2a2a2a] text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Assets
          </button>
        </div>
      </div>

      {activeTab === 'layers' ? (
        <>
          {/* Pages Header */}
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Pages</span>
            <button
              onClick={() => onAddPage?.()}
              className="p-0.5 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer"
              title="Add Page (+)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic Pages List */}
          <div className="px-2 py-0.5 space-y-0.5">
            {pages.map((p, idx) => {
              const isPageActive = activePageId ? activePageId === p.id : idx === 0;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPage?.(p.id)}
                  className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer transition-colors ${
                    isPageActive
                      ? 'bg-[#2e2e2e] text-white font-medium shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#282828]'
                  }`}
                >
                  <FileText className={`w-3 h-3 ${isPageActive ? 'text-[#3b82f6]' : 'text-slate-500'}`} />
                  <span className="text-[11px] truncate">{p.name || `Page ${idx + 1}`}</span>
                </div>
              );
            })}
          </div>

          <div className="h-[1px] bg-[#333333] my-2 mx-2" />

          {/* Layers Header */}
          <div className="px-3 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Layers</span>
          </div>

          {/* Layers Tree */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin">
            {pages.length > 0 ? (
              (() => {
                const currentPage = activePageId ? (pages.find(p => p.id === activePageId) || pages[0]) : pages[0];
                if (!currentPage || !currentPage.childIds || currentPage.childIds.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500 text-[11px]">
                      No layers on this page
                    </div>
                  );
                }
                return currentPage.childIds.map(rootId => {
                  const rootNode = graph.getNode(rootId);
                  return rootNode ? renderLayerItem(rootNode, 0) : null;
                });
              })()
            ) : (
              <div className="text-center py-8 text-slate-500 text-[11px]">
                Empty canvas
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-slate-400 space-y-3 flex-1 flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-xl bg-[#2c2c2c] border border-[#383838] flex items-center justify-center mx-auto text-[#3b82f6]">
            <Component className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-medium text-slate-200">Component Assets</p>
          <p className="text-[10px] text-slate-400 max-w-[180px]">
            Reusable vector components and design tokens generated by Stitch AI appear here.
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-2 border-t border-[#333333] bg-[#242424] flex items-center justify-between text-[10px] text-slate-400">
        <span>{pages[0]?.childIds?.length || 0} Root Layers</span>
        <span className="font-mono text-[#3b82f6]">{selectedIds.length} active</span>
      </div>
    </div>
  );
}
