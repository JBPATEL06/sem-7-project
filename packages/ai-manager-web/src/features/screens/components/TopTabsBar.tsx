import React from 'react';
import { Home, Plus, X } from 'lucide-react';
import { SceneGraph } from '@open-pencil/scene-graph';

export interface FileTab {
  id: string;
  name: string;
  screenId?: string;
  graph: SceneGraph;
}

interface TopTabsBarProps {
  openTabs: FileTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string, e: React.MouseEvent) => void;
  onCreateNewFile: () => void;
  onNavigateDashboard?: () => void;
}

export const TopTabsBar: React.FC<TopTabsBarProps> = ({
  openTabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCreateNewFile,
  onNavigateDashboard
}) => {
  return (
    <div className="h-9 bg-[#1e1e1e] border-b border-[#2d2d2d] flex items-center px-2 space-x-1 shrink-0 z-30">
      {onNavigateDashboard && (
        <button
          onClick={onNavigateDashboard}
          className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white hover:bg-[#2a2a2a] transition-colors mr-2 cursor-pointer"
          title="Return to AI Manager Dashboard"
        >
          <Home className="w-3.5 h-3.5 text-[#3b82f6]" />
          <span className="font-semibold text-[11px]">Dashboard</span>
        </button>
      )}

      {/* Tab Items */}
      {openTabs.map((t) => (
        <div
          key={t.id}
          onClick={() => onSelectTab(t.id)}
          className={`flex items-center space-x-2 px-3 py-1 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
            activeTabId === t.id
              ? 'bg-[#242424] text-white border-[#3b82f6] font-medium'
              : 'bg-transparent text-slate-400 hover:text-slate-200 border-transparent hover:bg-[#2a2a2a]/60'
          }`}
        >
          <span className="text-[11px] text-slate-400">📁</span>
          <span className="text-[11px] truncate max-w-[120px]">
            {t.name}
          </span>
          {openTabs.length > 1 && (
            <button
              onClick={(e) => onCloseTab(t.id, e)}
              className="hover:text-white p-0.5 rounded ml-1 text-slate-400 hover:bg-[#383838]"
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}

      {/* New Tab / New File Button */}
      <button
        onClick={onCreateNewFile}
        className="p-1 hover:bg-[#2a2a2a] rounded text-slate-400 hover:text-white cursor-pointer ml-1"
        title="New Document (Create new Figma file)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
