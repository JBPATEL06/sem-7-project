import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Sparkles,
  Grid,
  Plus,
  FileCode,
  Upload,
  FolderOpen,
  HardDrive,
  Save,
  Download,
  FileText,
  Share2
} from 'lucide-react';

interface StudioMenuBarProps {
  activeTabName: string;
  showGrid: boolean;
  statusMessage: string | null;
  selectedIds: string[];
  onToggleGrid: () => void;
  onOpenDocSettings: () => void;
  onOpenAiSettings: () => void;
  onCreateNewFile: () => void;
  onAddPage: () => void;
  onOpenFileFromPc: () => void;
  onOpenProjectRootFiles: () => void;
  onSaveToProjectRoot: () => void;
  onDownloadFig: () => void;
  onDownloadJson: () => void;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onUpdateSelectedNode: (updates: any) => void;
  onTriggerAiEdit: () => void;
}

export const StudioMenuBar: React.FC<StudioMenuBarProps> = ({
  activeTabName,
  showGrid,
  statusMessage,
  selectedIds,
  onToggleGrid,
  onOpenDocSettings,
  onOpenAiSettings,
  onCreateNewFile,
  onAddPage,
  onOpenFileFromPc,
  onOpenProjectRootFiles,
  onSaveToProjectRoot,
  onDownloadFig,
  onDownloadJson,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onBringToFront,
  onSendToBack,
  onUpdateSelectedNode,
  onTriggerAiEdit
}) => {
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'object' | 'text' | 'arrange' | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative h-10 bg-[#242424] border-b border-[#333333] px-3 flex items-center justify-between shrink-0 z-50 overflow-visible">
      {/* Left: Document Name, Settings Gear, Layout Grid, Menu Options */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-[12px] text-slate-400">📁</span>
          <span className="text-xs font-semibold text-white">
            {activeTabName || 'Untitled'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onOpenDocSettings}
            className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer transition-colors"
            title="Document Settings"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenAiSettings}
            className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-[#3b82f6] cursor-pointer transition-colors"
            title="OpenPencil AI & Agents Model Settings"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
          </button>
          <button
            onClick={onToggleGrid}
            className={`p-1 rounded cursor-pointer transition-colors ${
              showGrid
                ? 'bg-[#333333] text-[#0d99ff]'
                : 'text-slate-400 hover:bg-[#333333] hover:text-white'
            }`}
            title={showGrid ? 'Hide Dot Grid' : 'Show Dot Grid'}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-[#333333]" />

        {/* Figma/OpenPencil Dropdown Menu List */}
        <div className="relative flex items-center space-x-1 text-xs text-slate-300">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === 'file' ? null : 'file'); }}
              className={`px-2.5 py-1 rounded hover:bg-[#333333] hover:text-white cursor-pointer ${activeMenu === 'file' ? 'bg-[#333333] text-white font-medium' : ''}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="absolute left-0 top-full mt-1.5 min-w-[240px] bg-[#242424] border border-[#444444] rounded-lg shadow-2xl py-1.5 z-[9999] animate-in fade-in-50 whitespace-nowrap">
                <button onClick={() => { onCreateNewFile(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                    <span>New File</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+N</span>
                </button>
                <button onClick={() => { onAddPage(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-slate-400" />
                    <span>New Page</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+N</span>
                </button>
                <div className="h-[1px] bg-[#383838] my-1" />

                {/* Open from PC & Open from Project Root */}
                <button onClick={() => { onOpenFileFromPc(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <Upload className="w-3.5 h-3.5 text-slate-400" />
                    <span>Open from PC (.fig / .json)...</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+O</span>
                </button>
                <button onClick={() => { onOpenProjectRootFiles(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Open from Project Root (ui/)...</span>
                  </span>
                </button>
                <div className="h-[1px] bg-[#383838] my-1" />

                {/* Save As to PC & Save to Project Root */}
                <button onClick={() => { onDownloadFig(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    <span>Save As to PC (.fig / .json)...</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>
                <button onClick={() => { onSaveToProjectRoot(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <Save className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to Project Root (ui/)</span>
                  </span>
                </button>
                <div className="h-[1px] bg-[#383838] my-1" />

                {/* Direct Exports */}
                <button onClick={() => { onDownloadFig(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export .fig</span>
                  </span>
                </button>
                <button onClick={() => { onDownloadJson(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export JSON</span>
                  </span>
                </button>
                <div className="h-[1px] bg-[#383838] my-1" />

                <button onClick={() => { onOpenDocSettings(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Document Settings</span>
                  </span>
                </button>

                <button onClick={() => { onOpenAiSettings(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#3b82f6]" />
                    <span>AI & Agents Model Settings...</span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === 'view' ? null : 'view'); }}
              className={`px-2.5 py-1 rounded hover:bg-[#333333] hover:text-white cursor-pointer ${activeMenu === 'view' ? 'bg-[#333333] text-white font-medium' : ''}`}
            >
              View
            </button>
            {activeMenu === 'view' && (
              <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-[#242424] border border-[#444444] rounded-lg shadow-2xl py-1.5 z-[9999] animate-in fade-in-50 whitespace-nowrap">
                <button onClick={() => { onToggleLeftSidebar(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Toggle Layers Panel</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+\</span>
                </button>
                <button onClick={() => { onToggleRightSidebar(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Toggle Inspector</span>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+\</span>
                </button>
                <button onClick={() => { onToggleGrid(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Toggle Dot Grid</span>
                  <span className="text-[10px] text-slate-400 font-mono">{showGrid ? 'On' : 'Off'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Object Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === 'object' ? null : 'object'); }}
              className={`px-2.5 py-1 rounded hover:bg-[#333333] hover:text-white cursor-pointer ${activeMenu === 'object' ? 'bg-[#333333] text-white font-medium' : ''}`}
            >
              Object
            </button>
            {activeMenu === 'object' && (
              <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-[#242424] border border-[#444444] rounded-lg shadow-2xl py-1.5 z-[9999] animate-in fade-in-50 whitespace-nowrap">
                <button onClick={() => { onBringToFront(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Bring to Front</span>
                  <span className="text-[10px] text-slate-400 font-mono">]</span>
                </button>
                <button onClick={() => { onSendToBack(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Send to Back</span>
                  <span className="text-[10px] text-slate-400 font-mono">[</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === 'text' ? null : 'text'); }}
              className={`px-2.5 py-1 rounded hover:bg-[#333333] hover:text-white cursor-pointer ${activeMenu === 'text' ? 'bg-[#333333] text-white font-medium' : ''}`}
            >
              Text
            </button>
            {activeMenu === 'text' && (
              <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-[#242424] border border-[#444444] rounded-lg shadow-2xl py-1.5 z-[9999] animate-in fade-in-50 whitespace-nowrap">
                <button onClick={() => { onUpdateSelectedNode({ fontSize: 24, fontWeight: 700 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Heading 1 (24px)</span>
                </button>
                <button onClick={() => { onUpdateSelectedNode({ fontSize: 16, fontWeight: 600 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Subtitle (16px)</span>
                </button>
                <button onClick={() => { onUpdateSelectedNode({ fontSize: 14, fontWeight: 400 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Body (14px)</span>
                </button>
              </div>
            )}
          </div>

          {/* Arrange Menu */}
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === 'arrange' ? null : 'arrange'); }}
              className={`px-2.5 py-1 rounded hover:bg-[#333333] hover:text-white cursor-pointer ${activeMenu === 'arrange' ? 'bg-[#333333] text-white font-medium' : ''}`}
            >
              Arrange
            </button>
            {activeMenu === 'arrange' && (
              <div className="absolute left-0 top-full mt-1.5 min-w-[220px] bg-[#242424] border border-[#444444] rounded-lg shadow-2xl py-1.5 z-[9999] animate-in fade-in-50 whitespace-nowrap">
                <button onClick={() => { onUpdateSelectedNode({ x: 50 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Align Left</span>
                </button>
                <button onClick={() => { onUpdateSelectedNode({ x: 300 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Align Center</span>
                </button>
                <button onClick={() => { onUpdateSelectedNode({ y: 50 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                  <span>Align Top</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {statusMessage && (
          <span className="text-[11px] text-[#3b82f6] font-medium animate-in fade-in">
            — {statusMessage}
          </span>
        )}
      </div>

      {/* Right: Avatar 'Y', Share Button, Zoom % */}
      <div className="flex items-center space-x-3">
        {/* User Avatar Circle */}
        <div className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
          Y
        </div>

        {/* Share Button (Blue) */}
        <button
          onClick={onDownloadFig}
          className="flex items-center space-x-1.5 px-3 py-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-medium rounded-md shadow-sm cursor-pointer transition-colors"
        >
          <Share2 className="w-3 h-3" />
          <span>Share</span>
        </button>

        {/* Stitch AI Pill */}
        <button
          onClick={onTriggerAiEdit}
          className="flex items-center space-x-1 px-2.5 py-1 bg-gradient-to-r from-violet-600 to-[#2563EB] hover:opacity-90 text-white text-xs font-medium rounded-md shadow-sm cursor-pointer transition-opacity"
          title="Press 'E' to prompt Stitch AI"
        >
          <Sparkles className="w-3 h-3" />
          <span>Stitch AI</span>
        </button>

        <div className="h-4 w-[1px] bg-[#333333]" />

        {/* Zoom % Indicator */}
        <span className="text-xs font-mono text-slate-300">
          100%
        </span>
      </div>
    </div>
  );
};
