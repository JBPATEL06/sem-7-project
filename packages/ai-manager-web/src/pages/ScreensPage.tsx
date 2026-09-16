import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Key,
  Sparkles,
  Check,
  Copy,
  Plus,
  Layers,
  Sliders,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Settings as SettingsIcon,
  Send,
  Sidebar as SidebarIcon,
  ChevronLeft,
  ChevronRight,
  FileCode,
  FolderOpen,
  Share2,
  Grid,
  FileText,
  Home,
  LayoutGrid,
  Upload,
  Save,
  HardDrive,
  Folder,
  Search
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { useScreens, ScreenLayoutSpec, LayoutComponent } from '../hooks/useScreens';
import { OpenPencilCanvas } from '../components/OpenPencilCanvas';
import { createDemoSceneGraph, createSceneGraphFromComponents } from '../components/studio/sceneGraphUtils';
import { LayersPanel } from '../components/studio/LayersPanel';
import { PropertyInspector } from '../components/studio/PropertyInspector';
import { SceneGraph, SceneNode } from '@open-pencil/scene-graph';
import { ApiClient } from '../api/client';

interface ScreensPageProps {
  selectedProject?: { id: string; name: string };
  onNavigateDashboard?: () => void;
}

export function ScreensPage({ selectedProject, onNavigateDashboard }: ScreensPageProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { keysData, revealedValues } = useSettings();

  // Full Screen management via useScreens hook
  const {
    screens,
    currentScreen,
    setCurrentScreen,
    isLoading: isLoadingScreens,
    isGenerating,
    selectScreen,
    createScreen,
    updateScreen,
    deleteScreen,
    exportFigFile,
    generateStitchScreen
  } = useScreens(selectedProject?.id);

  // Tabs state with independent SceneGraph
  interface FileTab {
    id: string;
    name: string;
    screenId?: string;
    graph: SceneGraph;
  }

  const [openTabs, setOpenTabs] = useState<FileTab[]>(() => {
    const demo = createDemoSceneGraph();
    return [
      { id: 'tab_default', name: 'Untitled 1', graph: demo }
    ];
  });
  const [activeTabId, setActiveTabId] = useState<string>('tab_default');

  // Page background color (OpenPencil canvas surface color)
  const [pageBackground, setPageBackground] = useState<string>('#F5F5F5');

  // Panel Collapsible State
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [copiedKeyType, setCopiedKeyType] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Stitch Quick 'E' AI Prompt Modal & Dock State
  const [showAiCommandBar, setShowAiCommandBar] = useState(false);
  const [prompt, setPrompt] = useState('');

  // Active SceneGraph in Canvas
  const [activeGraph, setActiveGraph] = useState<SceneGraph>(() => {
    if (currentScreen?.board?.components && currentScreen.board.components.length > 0) {
      return createSceneGraphFromComponents(
        currentScreen.board.components,
        currentScreen.board.width || 1440,
        currentScreen.board.height || 900,
        currentScreen.name,
        false,
        currentScreen
      );
    }
    return createDemoSceneGraph();
  });
  const [, setGraphVersion] = useState(0);
  const [activePageId, setActivePageId] = useState<string>('');

  // Grid and Settings Modal state
  const [showGrid, setShowGrid] = useState(true);
  const [showDocSettingsModal, setShowDocSettingsModal] = useState(false);
  const [docModalName, setDocModalName] = useState('Untitled 1');

  // Project Root Files Browser Modal state
  const [showProjectFilesModal, setShowProjectFilesModal] = useState(false);
  const [projectRootFiles, setProjectRootFiles] = useState<Array<{ name: string; sizeBytes: number; modifiedAt: string; type: string }>>([]);
  const [isLoadingProjectFiles, setIsLoadingProjectFiles] = useState(false);
  const [projectFileSearch, setProjectFileSearch] = useState('');
  const pcFileInputRef = useRef<HTMLInputElement>(null);

  // Active dropdown menu: file | view | object | text | arrange
  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'object' | 'text' | 'arrange' | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Create real new Figma file / screen
  const handleCreateNewFile = async () => {
    const newFileName = `Untitled ${openTabs.length + 1}`;
    const newTabId = `tab_${Date.now()}`;

    // Create fresh empty SceneGraph with 1 default Frame
    const freshGraph = new SceneGraph();
    const page = freshGraph.getPages()[0];
    const frameId = `frame_root_${Date.now()}`;
    freshGraph.createNodeWithId(frameId, 'FRAME', page.id, {
      name: `${newFileName} Screen`,
      x: 100,
      y: 80,
      width: 1200,
      height: 760,
      fills: [{ type: 'SOLID', color: { r: 0.14, g: 0.14, b: 0.18, a: 1 }, opacity: 1, visible: true }],
      strokes: [{ color: { r: 0.3, g: 0.3, b: 0.35, a: 0.8 }, weight: 1, opacity: 0.8, visible: true, align: 'INSIDE' }],
      cornerRadius: 12,
      clipsContent: true
    });

    const newTab: FileTab = {
      id: newTabId,
      name: newFileName,
      graph: freshGraph
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(newTabId);
    setActiveGraph(freshGraph);
    setSelectedIds([frameId]);
    setDocModalName(newFileName);

    try {
      const created = await createScreen({ name: newFileName });
      if (created) {
        newTab.screenId = created.id;
      }
    } catch {}

    setStatusMessage(`Created new file "${newFileName}"`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const targetTab = openTabs.find(t => t.id === tabId);
    if (targetTab) {
      setActiveGraph(targetTab.graph);
      setSelectedIds([]);
      setDocModalName(targetTab.name);
      if (targetTab.screenId && targetTab.screenId !== currentScreen?.id) {
        selectScreen(targetTab.screenId);
      }
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabs.length <= 1) return;
    const nextTabs = openTabs.filter(t => t.id !== tabId);
    setOpenTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[nextTabs.length - 1];
      setActiveTabId(fallback.id);
      setActiveGraph(fallback.graph);
      setDocModalName(fallback.name);
      if (fallback.screenId) selectScreen(fallback.screenId);
    }
  };

  const handleAddPage = () => {
    const pages = activeGraph.getPages ? activeGraph.getPages() : [];
    const newPageName = `Page ${pages.length + 1}`;
    const newPageId = `page_${Date.now()}`;
    const rootId = (activeGraph as any).rootId || 'document';

    // Create new canvas page attached to scene graph root
    activeGraph.createNodeWithId(newPageId, 'CANVAS' as any, rootId, {
      name: newPageName
    });

    // Create default starter artboard on the new page
    const frameId = `frame_${Date.now()}`;
    activeGraph.createNodeWithId(frameId, 'FRAME' as any, newPageId, {
      name: `${newPageName} Frame`,
      x: 100,
      y: 80,
      width: 1200,
      height: 760,
      fills: [{ type: 'SOLID', color: { r: 0.14, g: 0.14, b: 0.18, a: 1 }, opacity: 1, visible: true }],
      strokes: [{ color: { r: 0.3, g: 0.3, b: 0.35, a: 0.8 }, weight: 1, opacity: 0.8, visible: true, align: 'INSIDE' }],
      cornerRadius: 12,
      clipsContent: true
    });

    setActivePageId(newPageId);
    setGraphVersion(v => v + 1);
    setStatusMessage(`Created ${newPageName}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Open File from PC
  const handleOpenFileFromPc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let components: LayoutComponent[] = [];
        let docTitle = file.name.replace(/\.[^/.]+$/, '');

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (parsed.board?.components) {
            components = parsed.board.components;
            if (parsed.name) docTitle = parsed.name;
          } else if (Array.isArray(parsed.components)) {
            components = parsed.components;
          } else if (Array.isArray(parsed)) {
            components = parsed;
          }
        }

        const newTabId = `tab_${Date.now()}`;
        const newGraph = components.length > 0 
          ? createSceneGraphFromComponents(components, 1440, 900, docTitle)
          : createDemoSceneGraph();

        const newTab: FileTab = {
          id: newTabId,
          name: docTitle,
          graph: newGraph
        };

        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
        setActiveGraph(newGraph);
        setSelectedIds([]);
        setDocModalName(docTitle);
        setStatusMessage(`Opened "${file.name}" from PC`);
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err: any) {
        setStatusMessage(`❌ Error parsing file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Open from Project Root (ui/) modal loader
  const handleLoadProjectRootFiles = async () => {
    setIsLoadingProjectFiles(true);
    setShowProjectFilesModal(true);
    try {
      const res = await ApiClient.get<{ success: boolean; files: Array<{ name: string; sizeBytes: number; modifiedAt: string; type: string }> }>('/api/screens/project-root/files');
      if (res.files) {
        setProjectRootFiles(res.files);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Failed to list project files: ${err.message}`);
    } finally {
      setIsLoadingProjectFiles(false);
    }
  };

  // Open a specific file from project root (ui/)
  const handleOpenProjectRootFile = async (filename: string) => {
    try {
      setStatusMessage(`Opening ui/${filename}...`);
      const res = await ApiClient.post<{ success: boolean; format: string; name: string; data?: any }>('/api/screens/project-root/open', { filename });
      if (res.success && res.data) {
        const components: LayoutComponent[] = res.data.board?.components || res.data.components || [];
        const docTitle = res.data.name || filename.replace(/\.[^/.]+$/, '');
        const newTabId = `tab_${Date.now()}`;
        const newGraph = components.length > 0
          ? createSceneGraphFromComponents(components, 1440, 900, docTitle)
          : createDemoSceneGraph();

        const newTab: FileTab = {
          id: newTabId,
          name: docTitle,
          graph: newGraph
        };

        setOpenTabs(prev => [...prev, newTab]);
        setActiveTabId(newTabId);
        setActiveGraph(newGraph);
        setSelectedIds([]);
        setDocModalName(docTitle);
        setShowProjectFilesModal(false);
        setStatusMessage(`Opened ui/${filename}`);
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        // Binary .fig file or generic
        handleCreateNewFile();
        setShowProjectFilesModal(false);
        setStatusMessage(`Opened ${filename}`);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Error opening ${filename}: ${err.message}`);
    }
  };

  // Save current screen directly into project root ui/ directory
  const handleSaveToProjectRoot = async () => {
    const docName = activeTab ? activeTab.name : (currentScreen?.name || 'Untitled');
    const comps = currentScreen?.board?.components || [];
    try {
      setStatusMessage(`Saving ${docName} to project root (ui/)...`);
      const res = await ApiClient.post<{ success: boolean; message: string; files: string[] }>('/api/screens/project-root/save', {
        name: docName,
        board: {
          id: `board_${Date.now()}`,
          name: docName,
          width: 1440,
          height: 900,
          background: pageBackground,
          components: comps
        }
      });
      if (res.success) {
        setStatusMessage(`💾 Saved to project root (${res.files.join(', ')})`);
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Error saving to project root: ${err.message}`);
    }
  };

  // Sync SceneGraph whenever currentScreen id changes
  useEffect(() => {
    if (currentScreen?.board?.components && currentScreen.board.components.length > 0) {
      const g = createSceneGraphFromComponents(
        currentScreen.board.components,
        currentScreen.board.width || 1440,
        currentScreen.board.height || 900,
        currentScreen.name,
        false,
        currentScreen
      );
      setActiveGraph(g);
      setDocModalName(currentScreen.name);
      setOpenTabs(prev => {
        const found = prev.find(t => t.id === activeTabId);
        if (found) {
          return prev.map(t => t.id === activeTabId ? { ...t, name: currentScreen.name, screenId: currentScreen.id, graph: g } : t);
        }
        return prev;
      });
    }
  }, [currentScreen?.id, currentScreen?.updatedAt]);

  // Selected node for Property Inspector
  const selectedNode = selectedIds.length > 0 ? activeGraph.getNode(selectedIds[0]) || null : null;

  // Node Mutation Handlers
  const handleUpdateNode = (nodeId: string, updates: Partial<SceneNode>) => {
    activeGraph.updateNode(nodeId, updates);
    setGraphVersion(v => v + 1);

    if (currentScreen) {
      if (nodeId === 'frame_root' || nodeId === currentScreen.board?.id) {
        updateScreen(currentScreen.id, {
          board: {
            ...currentScreen.board,
            x: updates.x !== undefined ? updates.x : (currentScreen.board.x || 100),
            y: updates.y !== undefined ? updates.y : (currentScreen.board.y || 80),
            width: updates.width !== undefined ? updates.width : (currentScreen.board.width || 1440),
            height: updates.height !== undefined ? updates.height : (currentScreen.board.height || 900)
          }
        });
        return;
      }

      const updatedComps = currentScreen.board.components.map(c => {
        if (c.id === nodeId) {
          return { ...c, ...updates };
        }
        return c;
      });
      updateScreen(currentScreen.id, {
        board: { ...currentScreen.board, components: updatedComps as any }
      });
    }
  };

  const handleDeleteNode = (nodeId: string) => {
    activeGraph.deleteNode(nodeId);
    setSelectedIds(prev => prev.filter(id => id !== nodeId));
    setGraphVersion(v => v + 1);

    if (currentScreen) {
      const updatedComps = currentScreen.board.components.filter(c => c.id !== nodeId);
      updateScreen(currentScreen.id, {
        board: { ...currentScreen.board, components: updatedComps as any }
      });
    }
  };

  const handleDuplicateNode = (nodeId: string) => {
    const node = activeGraph.getNode(nodeId);
    if (!node) return;
    const page = activeGraph.getPages()[0];
    const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    activeGraph.createNodeWithId(newId, node.type, node.parentId || page.id, {
      ...node,
      id: newId,
      name: `${node.name} (Copy)`,
      x: (node.x || 0) + 20,
      y: (node.y || 0) + 20
    });
    setSelectedIds([newId]);
    setGraphVersion(v => v + 1);
  };

  const handleBringToFront = (nodeId: string) => {
    const node = activeGraph.getNode(nodeId);
    if (!node || !node.parentId) return;
    const parent = activeGraph.getNode(node.parentId);
    if (parent && parent.childIds) {
      const filtered = parent.childIds.filter(id => id !== nodeId);
      parent.childIds = [...filtered, nodeId];
      setGraphVersion(v => v + 1);
    }
  };

  const handleSendToBack = (nodeId: string) => {
    const node = activeGraph.getNode(nodeId);
    if (!node || !node.parentId) return;
    const parent = activeGraph.getNode(node.parentId);
    if (parent && parent.childIds) {
      const filtered = parent.childIds.filter(id => id !== nodeId);
      parent.childIds = [nodeId, ...filtered];
      setGraphVersion(v => v + 1);
    }
  };

  const handleDownloadJson = () => {
    const screenData = currentScreen || { name: activeTab?.name || 'screen', board: { components: [] } };
    const blob = new Blob([JSON.stringify(screenData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${screenData.name || 'screen'}.json`;
    a.click();
  };

  const handleTriggerAiEdit = (nodeId?: string) => {
    if (nodeId && !selectedIds.includes(nodeId)) {
      setSelectedIds([nodeId]);
    }
    setShowAiCommandBar(true);
  };

  // AI Generation (Stitch targeted or full synthesis)
  const handleAiGenerate = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt;
    if (!textPrompt || !textPrompt.trim() || isGenerating) return;

    const isTargetedModify = selectedIds.length > 0;
    setStatusMessage(isTargetedModify 
      ? `⚡ Modifying ${selectedIds.length} element(s) with AI...`
      : `⚡ Synthesizing layout from scratch with AI...`
    );

    try {
      const res = await generateStitchScreen({
        prompt: textPrompt.trim(),
        mode: isTargetedModify ? 'modify' : 'create',
        screenId: currentScreen?.id,
        selectedCompIds: selectedIds,
        theme: 'dark'
      });

      if (res) {
        setStatusMessage(isTargetedModify
          ? `✨ Updated ${selectedIds.length} element(s) in "${res.name}"`
          : `✨ Synthesized "${res.name}" (${res.board?.components?.length || 0} components)`
        );
        setShowAiCommandBar(false);
        setPrompt('');
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleDownloadFig = () => {
    if (currentScreen?.id) {
      exportFigFile(currentScreen.id, currentScreen.name);
    } else {
      window.open('/api/screens/export?format=fig', '_blank');
    }
  };

  const activeTab = openTabs.find(t => t.id === activeTabId) || openTabs[0];

  return (
    <div className="w-screen h-screen flex flex-col bg-[#1e1e1e] text-slate-200 select-none overflow-hidden font-sans">
      {/* Hidden File Input for Opening from PC */}
      <input
        type="file"
        ref={pcFileInputRef}
        onChange={handleOpenFileFromPc}
        accept=".fig,.json"
        className="hidden"
      />

      {/* 1. Top Tabs Bar (Exact OpenPencil Tab Strip) */}
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
            onClick={() => handleSelectTab(t.id)}
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
                onClick={(e) => handleCloseTab(t.id, e)}
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
          onClick={handleCreateNewFile}
          className="p-1 hover:bg-[#2a2a2a] rounded text-slate-400 hover:text-white cursor-pointer ml-1"
          title="New Document (Create new Figma file)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Top Sub-Menu Bar (Exact OpenPencil Menu Header) */}
      <div className="relative h-10 bg-[#242424] border-b border-[#333333] px-3 flex items-center justify-between shrink-0 z-50 overflow-visible">
        {/* Left: Document Name, Settings Gear, Layout Grid, Menu Options */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-[12px] text-slate-400">📁</span>
            <span className="text-xs font-semibold text-white">
              {activeTab ? activeTab.name : (currentScreen ? currentScreen.name : 'Untitled')}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                setDocModalName(activeTab ? activeTab.name : (currentScreen?.name || 'Untitled'));
                setShowDocSettingsModal(true);
              }}
              className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Document Settings"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setShowGrid(v => !v);
                setStatusMessage(!showGrid ? 'Grid enabled' : 'Grid hidden');
                setTimeout(() => setStatusMessage(null), 2000);
              }}
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

          {/* Figma/OpenPencil Interactive Dropdown Menu List (Edit removed per user request) */}
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
                  <button onClick={() => { handleCreateNewFile(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <Plus className="w-3.5 h-3.5 text-slate-400" />
                      <span>New File</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+N</span>
                  </button>
                  <button onClick={() => { handleAddPage(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <FileCode className="w-3.5 h-3.5 text-slate-400" />
                      <span>New Page</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+N</span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />

                  {/* Open from PC & Open from Project Root */}
                  <button onClick={() => { pcFileInputRef.current?.click(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <Upload className="w-3.5 h-3.5 text-slate-400" />
                      <span>Open from PC (.fig / .json)...</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+O</span>
                  </button>
                  <button onClick={() => { handleLoadProjectRootFiles(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>Open from Project Root (ui/)...</span>
                    </span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />

                  {/* Save As to PC & Save to Project Root */}
                  <button onClick={() => { handleDownloadFig(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      <span>Save As to PC (.fig / .json)...</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                  </button>
                  <button onClick={() => { handleSaveToProjectRoot(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save to Project Root (ui/)</span>
                    </span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />

                  {/* Direct Exports */}
                  <button onClick={() => { handleDownloadFig(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export .fig</span>
                    </span>
                  </button>
                  <button onClick={() => { handleDownloadJson(); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Export JSON</span>
                    </span>
                  </button>
                  <div className="h-[1px] bg-[#383838] my-1" />

                  <button onClick={() => { setShowDocSettingsModal(true); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span className="flex items-center space-x-2">
                      <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Document Settings</span>
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
                  <button onClick={() => { setShowLeftSidebar(v => !v); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Toggle Layers Panel</span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+\</span>
                  </button>
                  <button onClick={() => { setShowRightSidebar(v => !v); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Toggle Inspector</span>
                    <span className="text-[10px] text-slate-400 font-mono">Ctrl+Alt+\</span>
                  </button>
                  <button onClick={() => { setShowGrid(v => !v); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
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
                  <button onClick={() => { if (selectedIds[0]) handleBringToFront(selectedIds[0]); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Bring to Front</span>
                    <span className="text-[10px] text-slate-400 font-mono">]</span>
                  </button>
                  <button onClick={() => { if (selectedIds[0]) handleSendToBack(selectedIds[0]); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
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
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { fontSize: 24, fontWeight: 700 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Heading 1 (24px)</span>
                  </button>
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { fontSize: 16, fontWeight: 600 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Subtitle (16px)</span>
                  </button>
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { fontSize: 14, fontWeight: 400 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
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
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { x: 50 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Align Left</span>
                  </button>
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { x: 300 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
                    <span>Align Center</span>
                  </button>
                  <button onClick={() => { if (selectedIds[0]) handleUpdateNode(selectedIds[0], { y: 50 }); setActiveMenu(null); }} className="w-full px-3 py-1.5 text-left text-xs text-slate-200 hover:bg-[#0d99ff] hover:text-white flex items-center justify-between cursor-pointer">
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

        {/* Right: Avatar 'Y', Share Button, Mode Switcher Tabs, Zoom % */}
        <div className="flex items-center space-x-3">
          {/* User Avatar Circle 'Y' */}
          <div className="w-6 h-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-[11px] shadow-sm">
            Y
          </div>

          {/* Share Button (Blue) */}
          <button
            onClick={handleDownloadFig}
            className="flex items-center space-x-1.5 px-3 py-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-medium rounded-md shadow-sm cursor-pointer transition-colors"
          >
            <Share2 className="w-3 h-3" />
            <span>Share</span>
          </button>

          {/* Stitch AI Pill ('E') */}
          <button
            onClick={() => handleTriggerAiEdit()}
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

      {/* 3. Main 3-Panel Studio Layout (Left Layers, Center Canvas, Right Inspector) */}
      <div className="relative flex-1 flex w-full h-full overflow-hidden min-w-0 min-h-0">
        {/* Left Sidebar */}
        {showLeftSidebar && (
          <LayersPanel
            graph={activeGraph}
            selectedIds={selectedIds}
            onSelectNode={(id, multi) => {
              let next = multi ? (selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]) : [id];
              setSelectedIds(next);
            }}
            onUpdateNode={handleUpdateNode}
            onAddPage={handleAddPage}
            activePageId={activePageId}
            onSelectPage={setActivePageId}
            isLight={false}
          />
        )}

        {/* Center Vector Canvas */}
        <div className="relative flex-1 w-full h-full min-w-0 min-h-0 bg-[#F5F5F5] overflow-hidden">
          <OpenPencilCanvas
            graph={activeGraph}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onNodeUpdate={handleUpdateNode}
            onNodeDelete={handleDeleteNode}
            onNodeDuplicate={handleDuplicateNode}
            onTriggerAiEdit={handleTriggerAiEdit}
            pageBackground={pageBackground}
            activePageId={activePageId}
            showGrid={showGrid}
            className="w-full h-full"
          />

          {/* Quick AI Command Prompt Bar (When 'E' is pressed) */}
          {showAiCommandBar && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 animate-in fade-in zoom-in-95 duration-150">
              <div className="bg-[#242424]/95 border border-[#3b82f6]/60 backdrop-blur-2xl rounded-2xl shadow-2xl p-3.5 space-y-2.5 ring-4 ring-blue-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-[#2563EB] text-white shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Stitch AI Studio</h4>
                      <p className="text-[10px] text-slate-400">
                        {selectedIds.length > 0 ? `Modifying ${selectedIds.length} element(s)` : 'Synthesizing native vector components'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAiCommandBar(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#333333] transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form
                  onSubmit={e => { e.preventDefault(); handleAiGenerate(); }}
                  className="flex items-center space-x-2 bg-[#1e1e1e] border border-[#333333] focus-within:border-[#3b82f6] rounded-xl px-3 py-2"
                >
                  <Sparkles className={`w-4 h-4 ${isGenerating ? 'text-[#3b82f6] animate-spin' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe UI layout, cards, navbar, buttons..."
                    className="flex-1 bg-transparent text-xs text-white outline-none placeholder-slate-500 font-sans"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="px-3 py-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-40 transition-all flex items-center space-x-1"
                  >
                    <Send className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Right Property Inspector */}
        {showRightSidebar && (
          <PropertyInspector
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onTriggerAiEdit={handleTriggerAiEdit}
            pageBackground={pageBackground}
            onPageBackgroundChange={setPageBackground}
          />
        )}
      </div>

      {/* 4. Document Settings Modal */}
      {showDocSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#242424] border border-[#444444] rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <div className="flex items-center space-x-2">
                <SettingsIcon className="w-4 h-4 text-[#0d99ff]" />
                <h3 className="text-sm font-bold text-white">Document Settings</h3>
              </div>
              <button
                onClick={() => setShowDocSettingsModal(false)}
                className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1 font-medium">Document Title</label>
                <input
                  type="text"
                  value={docModalName}
                  onChange={e => {
                    const newName = e.target.value;
                    setDocModalName(newName);
                    setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, name: newName } : t));
                    if (currentScreen?.id) {
                      updateScreen(currentScreen.id, { name: newName });
                    }
                  }}
                  className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#0d99ff] rounded px-3 py-1.5 text-xs text-white outline-none"
                  placeholder="Untitled Document"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1.5 font-medium">Canvas Background Surface</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Light', color: '#F5F5F5' },
                    { label: 'Dark', color: '#1E1E1E' },
                    { label: 'Navy', color: '#0E131F' },
                    { label: 'White', color: '#FFFFFF' }
                  ].map(preset => (
                    <button
                      key={preset.color}
                      onClick={() => setPageBackground(preset.color)}
                      className={`flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer ${
                        pageBackground.toLowerCase() === preset.color.toLowerCase()
                          ? 'border-[#0d99ff] bg-[#0d99ff]/10 text-white'
                          : 'border-[#383838] bg-[#1e1e1e] text-slate-400 hover:text-white hover:border-[#555555]'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-md mb-1 border border-black/20" style={{ backgroundColor: preset.color }} />
                      <span className="text-[10px]">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-[#333333]">
                <div>
                  <div className="font-medium text-white text-xs">Canvas Dot Grid</div>
                  <div className="text-[10px] text-slate-400">Show background alignment grid dots</div>
                </div>
                <button
                  onClick={() => setShowGrid(v => !v)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                    showGrid ? 'bg-[#0d99ff]' : 'bg-[#383838]'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    showGrid ? 'left-5' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-[#333333]">
              <button
                onClick={() => setShowDocSettingsModal(false)}
                className="px-4 py-1.5 bg-[#0d99ff] hover:bg-[#007be5] text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Open from Project Root (ui/) Modal */}
      {showProjectFilesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#242424] border border-[#444444] rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Open from Project Root (<code className="text-amber-300 font-mono">ui/</code>)</h3>
              </div>
              <button
                onClick={() => setShowProjectFilesModal(false)}
                className="p-1 hover:bg-[#333333] rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={projectFileSearch}
                onChange={e => setProjectFileSearch(e.target.value)}
                placeholder="Search .fig and .json files in ui/..."
                className="w-full bg-[#1e1e1e] border border-[#383838] focus:border-[#0d99ff] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none"
                autoFocus
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#2d2d2d]">
              {isLoadingProjectFiles ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading project files...</div>
              ) : projectRootFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No .fig or .json files found in ui/</div>
              ) : (
                projectRootFiles
                  .filter(f => f.name.toLowerCase().includes(projectFileSearch.toLowerCase()))
                  .map(f => (
                    <div
                      key={f.name}
                      onClick={() => handleOpenProjectRootFile(f.name)}
                      className="pt-1.5 first:pt-0 flex items-center justify-between p-2 rounded-lg hover:bg-[#2e2e2e] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          f.type === 'fig' ? 'bg-[#9747FF]/20 text-[#c084fc] border border-[#9747FF]/40' : 'bg-[#0d99ff]/20 text-[#60a5fa] border border-[#0d99ff]/40'
                        }`}>
                          {f.type.toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                            {f.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {(f.sizeBytes / 1024).toFixed(1)} KB • {new Date(f.modifiedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenProjectRootFile(f.name);
                        }}
                        className="px-2.5 py-1 bg-[#333333] group-hover:bg-[#0d99ff] text-slate-300 group-hover:text-white text-xs font-medium rounded transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-[#333333] text-[11px] text-slate-400">
              <span>{projectRootFiles.length} files located in <code className="text-slate-300">ui/</code></span>
              <button
                onClick={() => setShowProjectFilesModal(false)}
                className="px-3 py-1 bg-[#333333] hover:bg-[#444444] text-white text-xs font-medium rounded-lg cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
