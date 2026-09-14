import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Plus,
  Download,
  Sparkles,
  Trash2,
  Code2,
  Eye,
  EyeOff,
  Layers,
  Palette,
  CheckCircle2,
  RefreshCw,
  Box,
  Type,
  Maximize2,
  Minimize2,
  Sliders,
  ChevronRight,
  ChevronDown,
  FolderTree,
  FileJson,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  MousePointer,
  Square,
  Circle,
  Move,
  Lock,
  Unlock,
  Copy,
  Check,
  Play,
  Share2,
  FileCode,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowRight,
  ArrowDown,
  Grid,
  Search,
  Zap,
  TrendingUp,
  Shield,
  Activity,
  BarChart3,
  Columns,
  Table as TableIcon,
  Hand,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Sidebar,
  MessageSquare,
  Bot,
  User as UserIcon,
  Send,
  CornerDownLeft
} from 'lucide-react';
import { useScreens, ScreenLayoutSpec, PenpotComponent, ChatMessage } from '../hooks/useScreens';
import { useTheme } from '../context/ThemeContext';

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export function ScreensPage({ selectedProject }: { selectedProject?: { id: string; name: string } }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const {
    screens,
    currentScreen,
    templates,
    isLoading,
    isGenerating,
    animatingStep,
    animationProgress,
    error,
    selectScreen,
    createScreen,
    updateScreen,
    deleteScreen,
    generateAiLayout,
    generateStitchScreen,
    sendChatMessage,
    exportPenpotJson,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent
  } = useScreens(selectedProject?.id);

  // Studio Tools & View States
  const [activeTool, setActiveTool] = useState<'select' | 'frame' | 'rect' | 'circle' | 'text' | 'component' | 'hand'>('select');
  const [activeTab, setActiveTab] = useState<'design' | 'prototype' | 'code'>('design');
  const [leftTab, setLeftTab] = useState<'layers' | 'assets' | 'pages' | 'chat'>('chat');
  const [codeTab, setCodeTab] = useState<'penpot' | 'react' | 'tokens'>('penpot');
  const [chatInput, setChatInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useState<boolean>(() => {
    return localStorage.getItem('penpot_left_sidebar_visible') !== 'false';
  });
  const [showRightInspector, setShowRightInspector] = useState<boolean>(() => {
    return localStorage.getItem('penpot_right_inspector_visible') !== 'false';
  });

  const toggleLeftSidebar = () => {
    setShowLeftSidebar((prev) => {
      const next = !prev;
      localStorage.setItem('penpot_left_sidebar_visible', String(next));
      return next;
    });
  };

  const toggleRightInspector = () => {
    setShowRightInspector((prev) => {
      const next = !prev;
      localStorage.setItem('penpot_right_inspector_visible', String(next));
      return next;
    });
  };

  const toggleZenMode = () => {
    if (showLeftSidebar || showRightInspector) {
      setShowLeftSidebar(false);
      setShowRightInspector(false);
      localStorage.setItem('penpot_left_sidebar_visible', 'false');
      localStorage.setItem('penpot_right_inspector_visible', 'false');
    } else {
      setShowLeftSidebar(true);
      setShowRightInspector(true);
      localStorage.setItem('penpot_left_sidebar_visible', 'true');
      localStorage.setItem('penpot_right_inspector_visible', 'true');
    }
  };

  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [showQuickAiBar, setShowQuickAiBar] = useState<boolean>(false);
  const [quickPrompt, setQuickPrompt] = useState<string>('');
  const quickInputRef = useRef<HTMLInputElement>(null);

  // Backward-compatible alias for single active selection
  const selectedCompId = selectedCompIds[0] || null;
  const setSelectedCompId = useCallback((id: string | null) => {
    setSelectedCompIds(id ? [id] : []);
  }, []);

  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(75);
  const [prompt, setPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMode, setAiMode] = useState<'create' | 'modify'>('create');
  const [aiTheme, setAiTheme] = useState<'dark' | 'light' | 'cyberpunk' | 'minimal'>('dark');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('saas-dashboard');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFilePath, setCopiedFilePath] = useState(false);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState<string>('');
  const [layerSearch, setLayerSearch] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [hiddenNodes, setHiddenNodes] = useState<Record<string, boolean>>({});
  const [lockedNodes, setLockedNodes] = useState<Record<string, boolean>>({});
  const [copiedComponent, setCopiedComponent] = useState<PenpotComponent | null>(null);

  // High-performance Drag, Resize & Canvas Pan references
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number } | null>(null);
  const isHandMode = activeTool === 'hand' || isSpacePressed;

  const dragRef = useRef<{
    compId: string;
    startX: number;
    startY: number;
    startCompX: number;
    startCompY: number;
    width?: number;
    height?: number;
  } | null>(null);

  const resizeRef = useRef<{
    compId: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startCompX: number;
    startCompY: number;
  } | null>(null);

  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);

  const rafRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const initialCenteredRef = useRef<string | null>(null);

  // Center Artboard in the infinite canvas field
  const centerArtboard = useCallback((smooth = false) => {
    if (!canvasRef.current) return;
    const canvasEl = canvasRef.current;
    const artboardEl = artboardRef.current;
    if (artboardEl) {
      const artboardRect = artboardEl.getBoundingClientRect();
      const canvasRect = canvasEl.getBoundingClientRect();
      const targetLeft = canvasEl.scrollLeft + (artboardRect.left + artboardRect.width / 2) - (canvasRect.left + canvasRect.width / 2);
      const targetTop = canvasEl.scrollTop + (artboardRect.top + artboardRect.height / 2) - (canvasRect.top + canvasRect.height / 2);
      if (smooth) {
        canvasEl.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
      } else {
        canvasEl.scrollLeft = targetLeft;
        canvasEl.scrollTop = targetTop;
      }
    } else {
      const targetLeft = (canvasEl.scrollWidth - canvasEl.clientWidth) / 2;
      const targetTop = (canvasEl.scrollHeight - canvasEl.clientHeight) / 2;
      if (smooth) {
        canvasEl.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' });
      } else {
        canvasEl.scrollLeft = targetLeft;
        canvasEl.scrollTop = targetTop;
      }
    }
  }, []);

  // Auto-center artboard when screen changes or on first mount
  useEffect(() => {
    if (currentScreen && canvasRef.current && initialCenteredRef.current !== currentScreen.id) {
      initialCenteredRef.current = currentScreen.id;
      const timer = setTimeout(() => {
        centerArtboard(false);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [currentScreen?.id, centerArtboard]);

  // Auto-scroll chat conversation to latest message
  useEffect(() => {
    if (leftTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentScreen?.chatHistory, leftTab]);

  const handleChatSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customPrompt || chatInput).trim();
    if (!textToSend || isGenerating) return;

    setChatInput('');
    const hasSelection = selectedCompIds.length > 0;
    const targetMode = hasSelection ? 'modify' : (aiMode === 'modify' ? 'modify' : 'create');

    await generateStitchScreen({
      prompt: textToSend,
      mode: targetMode,
      selectedCompIds,
      selectedScreenIds,
      theme: aiTheme
    });
  };

  // Find component recursively
  const findComponent = useCallback((comps: PenpotComponent[], id: string): PenpotComponent | null => {
    for (const c of comps) {
      if (c.id === id) return c;
      if (c.children && c.children.length > 0) {
        const found = findComponent(c.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedComponent = currentScreen ? findComponent(currentScreen.board.components, selectedCompId || '') : null;

  // Find parent component of selected component
  const selectedParent = useMemo(() => {
    if (!currentScreen || !selectedCompId) return null;
    const findParentNode = (comps: PenpotComponent[], targetId: string, parent?: PenpotComponent): PenpotComponent | null => {
      for (const c of comps) {
        if (c.id === targetId) return parent || null;
        if (c.children && c.children.length > 0) {
          const p = findParentNode(c.children, targetId, c);
          if (p !== null) return p;
        }
      }
      return null;
    };
    return findParentNode(currentScreen.board.components, selectedCompId);
  }, [currentScreen, selectedCompId]);

  // Helper to compute frame-relative coordinates for rendering and dragging
  const getChildRelativeCoords = useCallback((comp: PenpotComponent, parent?: PenpotComponent) => {
    if (!parent) {
      return { x: comp.x ?? 0, y: comp.y ?? 0 };
    }
    let x = comp.x ?? 0;
    let y = comp.y ?? 0;

    // Handle legacy coordinates where child was authored with canvas-absolute values
    if (parent.x !== undefined && x >= parent.x && x <= parent.x + (parent.width || 4000)) {
      x = x - parent.x;
    }
    if (parent.y !== undefined && y >= parent.y && y <= parent.y + (parent.height || 4000)) {
      y = y - parent.y;
    }

    return { x, y };
  }, []);

  const selectedCompPos = useMemo(() => {
    if (!selectedComponent) return { x: 0, y: 0 };
    return getChildRelativeCoords(selectedComponent, selectedParent || undefined);
  }, [selectedComponent, selectedParent, getChildRelativeCoords]);

  // Scrubbable label dragging for Inspector values
  const startScrubbing = (e: React.MouseEvent, prop: 'x' | 'y' | 'width' | 'height' | 'borderRadius' | 'padding') => {
    if (!selectedComponent) return;
    e.preventDefault();
    const startVal = selectedComponent[prop] || 0;
    const startX = e.clientX;

    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      const mult = me.shiftKey ? 10 : 1;
      const newVal = Math.max(0, startVal + delta * mult);
      updateComponent(selectedComponent.id, { [prop]: Math.round(newVal) });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Keyboard shortcuts (Figma standard + Stitch 'E' Quick Edit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // 'E' Key Shortcut: Open Instant Quick AI Edit Bar
      if ((e.key === 'e' || e.key === 'E') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShowQuickAiBar(true);
        setTimeout(() => quickInputRef.current?.focus(), 50);
        return;
      }

      // Spacebar: Instant Figma Hand/Pan mode
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if (e.key === 'Alt') {
        setIsAltPressed(true);
      }

      // Delete / Backspace (Multi-element support)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCompIds.length > 0) {
        e.preventDefault();
        selectedCompIds.forEach(id => deleteComponent(id));
        setSelectedCompIds([]);
      }

      // Duplicate: Ctrl+D / Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedCompIds.length > 0) {
        e.preventDefault();
        selectedCompIds.forEach(id => duplicateComponent(id));
      }

      // Copy: Ctrl+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedComponent) {
        setCopiedComponent(selectedComponent);
      }

      // Paste: Ctrl+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && copiedComponent) {
        e.preventDefault();
        duplicateComponent(copiedComponent.id);
      }

      // Escape to deselect / return to select tool
      if (e.key === 'Escape') {
        setSelectedCompIds([]);
        setShowQuickAiBar(false);
        setShowAiModal(false);
        setShowNewModal(false);
        setShowPresentModal(false);
        setActiveTool('select');
      }

      // Arrow Keys to nudge position
      if (selectedCompId && selectedComponent && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let deltaX = 0;
        let deltaY = 0;
        if (e.key === 'ArrowUp') deltaY = -step;
        if (e.key === 'ArrowDown') deltaY = step;
        if (e.key === 'ArrowLeft') deltaX = -step;
        if (e.key === 'ArrowRight') deltaX = step;

        const pos = getChildRelativeCoords(selectedComponent, selectedParent || undefined);
        updateComponent(selectedCompId, {
          x: pos.x + deltaX,
          y: pos.y + deltaY
        });
      }

      // Tool Switching (V, F, R, T, H)
      if (e.key.toLowerCase() === 'v') setActiveTool('select');
      if (e.key.toLowerCase() === 'f') setActiveTool('frame');
      if (e.key.toLowerCase() === 'r') handleInsertComponent('rect');
      if (e.key.toLowerCase() === 't') handleInsertComponent('text');
      if (e.key.toLowerCase() === 'h') setActiveTool(prev => (prev === 'hand' ? 'select' : 'hand'));

      // Center Artboard / Zoom to 100%: Shift + 1 or Shift + 0
      if (e.shiftKey && (e.key === '!' || e.key === '1' || e.key === ')' || e.key === '0')) {
        e.preventDefault();
        setZoom(100);
        centerArtboard(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
      if (e.key === 'Alt') {
        setIsAltPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCompIds, selectedCompId, selectedComponent, selectedParent, copiedComponent, deleteComponent, duplicateComponent, updateComponent, getChildRelativeCoords]);

  // High-performance RAF Mouse Listener for Dragging, Resizing & Canvas Panning
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 0. Hand / Canvas Panning (Hand Tool, Spacebar drag, or Middle-click drag)
      if (panRef.current && canvasRef.current) {
        const deltaX = e.clientX - panRef.current.startX;
        const deltaY = e.clientY - panRef.current.startY;
        canvasRef.current.scrollLeft = panRef.current.scrollLeft - deltaX;
        canvasRef.current.scrollTop = panRef.current.scrollTop - deltaY;
        return;
      }

      if (!dragRef.current && !resizeRef.current) return;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const zoomFactor = Math.max(0.2, zoom / 100);

        // 1. Dragging Element with Smart Snapping & Guides
        if (dragRef.current) {
          const { compId, startX, startY, startCompX, startCompY } = dragRef.current;
          const deltaX = (e.clientX - startX) / zoomFactor;
          const deltaY = (e.clientY - startY) / zoomFactor;

          let newX = Math.round(startCompX + deltaX);
          let newY = Math.round(startCompY + deltaY);

          // Smart Alignment Snap Lines
          let guideX: number | undefined;
          let guideY: number | undefined;
          const snapDistance = 6;

          if (currentScreen) {
            for (const other of currentScreen.board.components) {
              if (other.id === compId) continue;
              if (Math.abs(newX - other.x) < snapDistance) {
                newX = other.x;
                guideX = other.x;
              }
              if (Math.abs(newY - other.y) < snapDistance) {
                newY = other.y;
                guideY = other.y;
              }
            }
          }

          setActiveGuides(guideX !== undefined || guideY !== undefined ? { x: guideX, y: guideY } : null);
          updateComponent(compId, { x: newX, y: newY });
          setIsDragging(true);
        }

        // 2. Resizing Element
        if (resizeRef.current) {
          const { compId, handle, startX, startY, startWidth, startHeight, startCompX, startCompY } = resizeRef.current;
          const deltaX = (e.clientX - startX) / zoomFactor;
          const deltaY = (e.clientY - startY) / zoomFactor;

          let newWidth = startWidth;
          let newHeight = startHeight;
          let newX = startCompX;
          let newY = startCompY;

          if (handle.includes('e')) newWidth = Math.max(20, Math.round(startWidth + deltaX));
          if (handle.includes('s')) newHeight = Math.max(20, Math.round(startHeight + deltaY));
          if (handle.includes('w')) {
            const possibleWidth = startWidth - deltaX;
            if (possibleWidth >= 20) {
              newWidth = Math.round(possibleWidth);
              newX = Math.round(startCompX + deltaX);
            }
          }
          if (handle.includes('n')) {
            const possibleHeight = startHeight - deltaY;
            if (possibleHeight >= 20) {
              newHeight = Math.round(possibleHeight);
              newY = Math.round(startCompY + deltaY);
            }
          }

          updateComponent(compId, {
            width: newWidth,
            height: newHeight,
            x: newX,
            y: newY
          });
          setIsResizing(true);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setActiveGuides(null);
      if (panRef.current) {
        panRef.current = null;
        setIsPanning(false);
      }
      if (dragRef.current || resizeRef.current) {
        const activeCompId = dragRef.current?.compId || resizeRef.current?.compId;
        if (activeCompId) {
          updateComponent(activeCompId, {}, true);
        }
      }
      dragRef.current = null;
      resizeRef.current = null;
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [zoom, currentScreen, updateComponent]);

  // Native non-passive canvas wheel listener for 100% isolated, zero-leak scroll & zoom
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoom(prev => Math.min(200, prev + 10));
        } else {
          setZoom(prev => Math.max(25, prev - 10));
        }
      } else {
        e.preventDefault();
        canvasEl.scrollTop += e.deltaY;
        canvasEl.scrollLeft += e.deltaX;
      }
    };

    canvasEl.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheelNative);
  }, []);

  // Start panning canvas (Hand tool, Spacebar drag, or Middle click)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'hand' || isSpacePressed || e.button === 1) {
      e.preventDefault();
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      panRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: canvasEl.scrollLeft,
        scrollTop: canvasEl.scrollTop
      };
      setIsPanning(true);
      return;
    }
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      setSelectedCompIds([]);
    }
  };

  // Start dragging component
  const startDrag = (e: React.MouseEvent, comp: PenpotComponent, parent?: PenpotComponent) => {
    if (e.button !== 0) return;
    if (lockedNodes[comp.id] || isHandMode) return;
    e.preventDefault();
    e.stopPropagation();

    if (!selectedCompIds.includes(comp.id)) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedCompIds(prev => [...prev, comp.id]);
      } else {
        setSelectedCompIds([comp.id]);
      }
    }

    const pos = getChildRelativeCoords(comp, parent);

    dragRef.current = {
      compId: comp.id,
      startX: e.clientX,
      startY: e.clientY,
      startCompX: pos.x,
      startCompY: pos.y
    };
  };

  // Start resizing component
  const startResize = (e: React.MouseEvent, comp: PenpotComponent, handle: ResizeHandle, parent?: PenpotComponent) => {
    if (e.button !== 0) return;
    if (isHandMode) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = getChildRelativeCoords(comp, parent);

    resizeRef.current = {
      compId: comp.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: comp.width || 100,
      startHeight: comp.height || 100,
      startCompX: pos.x,
      startCompY: pos.y
    };
  };

  // Handle Stitch AI quick inline edit bar (E Shortcut)
  const handleQuickAiEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickPrompt.trim()) return;
    try {
      setShowQuickAiBar(false);
      await generateStitchScreen({
        prompt: quickPrompt,
        mode: 'modify',
        screenId: currentScreen?.id,
        selectedCompIds: selectedCompIds.length > 0 ? selectedCompIds : undefined,
        selectedScreenIds: selectedScreenIds.length > 0 ? selectedScreenIds : undefined,
        theme: aiTheme
      });
      setQuickPrompt('');
    } catch (err: any) {
      console.error('Failed to quick edit with Stitch AI:', err);
    }
  };

  // Handle Stitch AI spec generation & live placement
  const handleAiGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    try {
      setShowAiModal(false);
      await generateStitchScreen({
        prompt,
        mode: aiMode,
        screenId: currentScreen?.id,
        selectedCompIds: selectedCompIds.length > 0 ? selectedCompIds : undefined,
        selectedScreenIds: selectedScreenIds.length > 0 ? selectedScreenIds : undefined,
        theme: aiTheme
      });
      setPrompt('');
    } catch (err: any) {
      console.error('Failed to generate Stitch layout:', err);
    }
  };

  // Handle create new screen
  const handleCreateNew = async () => {
    if (!newScreenName.trim()) return;
    try {
      await createScreen({
        name: newScreenName,
        templateKey: selectedTemplateKey
      });
      setShowNewModal(false);
      setNewScreenName('');
    } catch {}
  };

  // Insert UI kit components directly onto canvas
  const handleInsertComponent = (type: string) => {
    if (!currentScreen) return;
    const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const centerX = Math.max(40, Math.round((currentScreen.board.width - 320) / 2));
    const centerY = Math.max(40, Math.round((currentScreen.board.height - 200) / 2));

    let newComp: PenpotComponent;

    switch (type) {
      case 'kpi-card':
        newComp = {
          id,
          name: 'KPI Metric Card',
          type: 'card',
          x: centerX,
          y: centerY,
          width: 280,
          height: 130,
          fills: [{ fillColor: '#131b2e' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          borderRadius: 12,
          text: 'Active Projects\n12 Workspaces',
          fontSize: 14,
          padding: 16
        };
        break;
      case 'button-primary':
        newComp = {
          id,
          name: 'Primary Button',
          type: 'button',
          x: centerX,
          y: centerY,
          width: 180,
          height: 44,
          fills: [{ fillColor: '#7c3aed' }],
          borderRadius: 8,
          text: 'Get Started Now →',
          fontSize: 14,
          fontWeight: '600',
          color: '#ffffff'
        };
        break;
      case 'input-field':
        newComp = {
          id,
          name: 'Search Input Field',
          type: 'input',
          x: centerX,
          y: centerY,
          width: 320,
          height: 44,
          fills: [{ fillColor: '#0d1322' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          borderRadius: 8,
          text: 'Search database schemas...',
          fontSize: 13,
          color: '#94a3b8'
        };
        break;
      case 'badge-pill':
        newComp = {
          id,
          name: 'Status Badge Pill',
          type: 'badge',
          x: centerX,
          y: centerY,
          width: 120,
          height: 32,
          fills: [{ fillColor: '#10b98122' }],
          strokes: [{ strokeColor: '#10b98144', strokeWidth: 1 }],
          borderRadius: 99,
          text: '● Operational',
          fontSize: 12,
          fontWeight: '600',
          color: '#10b981'
        };
        break;
      case 'chart-container':
        newComp = {
          id,
          name: 'Telemetry Area Chart',
          type: 'chart',
          x: centerX,
          y: centerY,
          width: 600,
          height: 280,
          fills: [{ fillColor: '#131b2e' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          borderRadius: 12,
          text: '📈 Throughput & Real-time AST Symbol Flow'
        };
        break;
      case 'data-table':
        newComp = {
          id,
          name: 'Data Table Grid',
          type: 'table',
          x: centerX,
          y: centerY,
          width: 680,
          height: 240,
          fills: [{ fillColor: '#131b2e' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          borderRadius: 12,
          text: 'Schema Migrations & Verification Audit'
        };
        break;
      case 'text':
        newComp = {
          id,
          name: 'Heading Text',
          type: 'text',
          x: centerX,
          y: centerY,
          width: 340,
          height: 40,
          text: 'Platform Intelligence Overview',
          fontSize: 22,
          fontWeight: 'bold',
          color: '#ffffff'
        };
        break;
      default:
        newComp = {
          id,
          name: 'Container Frame',
          type: 'frame',
          x: centerX,
          y: centerY,
          width: 360,
          height: 220,
          fills: [{ fillColor: '#131b2e' }],
          strokes: [{ strokeColor: '#1e293b', strokeWidth: 1 }],
          borderRadius: 12,
          padding: 16
        };
    }

    addComponent(newComp);
    setSelectedCompId(id);
  };

  // Generate React + Tailwind Component Code
  const generateReactCode = (screen: ScreenLayoutSpec | null) => {
    if (!screen) return '// Select a screen to generate code';
    return `import React from 'react';

export function ${screen.name.replace(/[^a-zA-Z0-9]/g, '')}Layout() {
  return (
    <div className="relative min-h-screen bg-[${screen.board.background || '#090d16'}] text-slate-100 font-sans p-6 overflow-hidden">
      <header className="mb-6 flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">${screen.name}</h1>
          <p className="text-sm text-slate-400 mt-1">${screen.description || 'Exported Penpot & Figma Schema'}</p>
        </div>
      </header>

      {/* Absolute Layout Artboard (W: ${screen.board.width}px, H: ${screen.board.height}px) */}
      <div className="relative w-[${screen.board.width}px] h-[${screen.board.height}px] mx-auto">
        {/* Total Shapes: ${screen.board.components.length} */}
      </div>
    </div>
  );
}`;
  };

  // Dynamic Vast Infinite Canvas Dimensions like Figma and Miro
  const canvasBounds = useMemo(() => {
    if (!currentScreen) return { artboardWidth: 1440, artboardHeight: 900, scrollW: 16000, scrollH: 10000 };
    let maxW = currentScreen.board.width;
    let maxH = currentScreen.board.height;

    for (const comp of currentScreen.board.components) {
      const right = (comp.x || 0) + (comp.width || 200);
      const bottom = (comp.y || 0) + (comp.height || 150);
      if (right > maxW) maxW = right;
      if (bottom > maxH) maxH = bottom;
    }

    return {
      artboardWidth: currentScreen.board.width,
      artboardHeight: Math.max(currentScreen.board.height, maxH + 60),
      scrollW: Math.max(16000, maxW + 10000),
      scrollH: Math.max(10000, maxH + 8000)
    };
  }, [currentScreen]);

  // Mouse Wheel zooming & natural scrolling handler
  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom(prev => Math.min(200, prev + 10));
      } else {
        setZoom(prev => Math.max(25, prev - 10));
      }
    } else {
      if (canvasRef.current) {
        canvasRef.current.scrollTop += e.deltaY;
        canvasRef.current.scrollLeft += e.deltaX;
      }
    }
  };

  // Render Visual Component on Canvas with Absolute Figma Positioning & Zero-Lag Dragging
  const renderVisualComponent = (comp: PenpotComponent, parent?: PenpotComponent) => {
    if (hiddenNodes[comp.id]) return null;

    const isTopLevel = !parent;
    const isSelected = selectedCompIds.includes(comp.id);
    const isHovered = hoveredCompId === comp.id && !isSelected;
    const isLocked = lockedNodes[comp.id];
    const bg = comp.fills && comp.fills[0]?.fillColor ? comp.fills[0].fillColor : 'transparent';
    const border = comp.strokes && comp.strokes[0]?.strokeColor ? `${comp.strokes[0].strokeWidth || 1}px solid ${comp.strokes[0].strokeColor}` : '1px dashed rgba(255,255,255,0.08)';
    const borderRadius = comp.borderRadius || 0;

    const pos = getChildRelativeCoords(comp, parent);

    return (
      <div
        key={comp.id}
        onMouseDown={(e) => {
          if (isHandMode || e.button === 1) {
            handleCanvasMouseDown(e as any);
            return;
          }
          e.stopPropagation();
          startDrag(e, comp, parent);
        }}
        onDragStart={(e) => e.preventDefault()}
        onClick={(e) => {
          if (isHandMode) return;
          e.stopPropagation();
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            setSelectedCompIds(prev =>
              prev.includes(comp.id) ? prev.filter(id => id !== comp.id) : [...prev, comp.id]
            );
          } else {
            setSelectedCompIds([comp.id]);
          }
        }}
        onDoubleClick={(e) => {
          if (isHandMode) return;
          e.stopPropagation();
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            setSelectedCompIds(prev =>
              prev.includes(comp.id) ? prev.filter(id => id !== comp.id) : [...prev, comp.id]
            );
          } else {
            setSelectedCompIds([comp.id]);
          }
        }}
        onMouseEnter={(e) => {
          if (isHandMode) return;
          e.stopPropagation();
          setHoveredCompId(comp.id);
        }}
        onMouseLeave={(e) => {
          if (isHandMode) return;
          e.stopPropagation();
          setHoveredCompId(null);
        }}
        style={{
          position: isTopLevel ? 'absolute' : (pos.x !== undefined && pos.y !== undefined ? 'absolute' : 'relative'),
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          backgroundColor: bg,
          border: isSelected
            ? '1.5px solid #0d99ff'
            : isHovered
            ? '1px dashed rgba(13, 153, 255, 0.7)'
            : border,
          borderRadius: `${borderRadius}px`,
          width: comp.width ? `${comp.width}px` : '100%',
          height: comp.height ? `${comp.height}px` : 'auto',
          padding: comp.padding ? `${comp.padding}px` : '12px',
          display: comp.layout === 'flex' ? 'flex' : 'block',
          flexDirection: comp.flexDir || 'row',
          gap: comp.gap ? `${comp.gap}px` : '12px',
          boxShadow: isSelected
            ? '0 0 0 1px rgba(13, 153, 255, 0.3), 0 12px 32px -4px rgba(0, 0, 0, 0.7)'
            : isHovered
            ? '0 0 0 1px rgba(13, 153, 255, 0.2)'
            : 'none',
          cursor: isHandMode ? (isPanning ? 'grabbing' : 'grab') : isLocked ? 'not-allowed' : 'move',
          zIndex: isSelected ? 30 : 10,
          userSelect: 'none',
          transition: isDragging || isResizing ? 'none' : 'box-shadow 0.15s ease',
          touchAction: isDragging || isResizing || isPanning ? 'none' : 'auto'
        }}
        className="group select-none"
      >
        {/* 4 Crisp Micro Figma Corner Handles */}
        {isSelected && !isLocked && (
          <>
            <div
              onMouseDown={(e) => startResize(e, comp, 'nw', parent)}
              className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border-[1.5px] border-[#0d99ff] rounded-[1px] shadow-sm cursor-nwse-resize z-40 hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => startResize(e, comp, 'ne', parent)}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border-[1.5px] border-[#0d99ff] rounded-[1px] shadow-sm cursor-nesw-resize z-40 hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => startResize(e, comp, 'sw', parent)}
              className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border-[1.5px] border-[#0d99ff] rounded-[1px] shadow-sm cursor-nesw-resize z-40 hover:scale-125 transition-transform"
            />
            <div
              onMouseDown={(e) => startResize(e, comp, 'se', parent)}
              className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border-[1.5px] border-[#0d99ff] rounded-[1px] shadow-sm cursor-nwse-resize z-40 hover:scale-125 transition-transform"
            />

            {/* Figma Live Dragging Coordinate Tooltip */}
            {isDragging && (
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#0d99ff] text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-md z-50 whitespace-nowrap pointer-events-none flex items-center space-x-1.5">
                <span>X: {pos.x}</span>
                <span className="opacity-60">|</span>
                <span>Y: {pos.y}</span>
              </div>
            )}
          </>
        )}

        {/* Sleek Figma Hover Badge */}
        {isHovered && !isDragging && (
          <div className="absolute -top-5 left-0 text-[9px] font-mono px-1.5 py-0.5 bg-[#0d99ff] text-white font-medium rounded-sm shadow z-40 pointer-events-none whitespace-nowrap">
            {comp.name}
          </div>
        )}

        {/* High-Fidelity UI Rendering */}
        {comp.type === 'text' && (
          <div
            style={{
              fontSize: `${comp.fontSize || 14}px`,
              fontWeight: comp.fontWeight || 'normal',
              color: comp.color || '#f8fafc',
              textAlign: comp.textAlign || 'left',
              whiteSpace: 'pre-wrap'
            }}
          >
            {comp.text || comp.name}
          </div>
        )}

        {comp.type === 'button' && (
          <div
            className="flex items-center justify-center font-medium shadow-sm h-full"
            style={{
              fontSize: `${comp.fontSize || 14}px`,
              fontWeight: comp.fontWeight || '600',
              color: comp.color || '#ffffff'
            }}
          >
            {comp.text || comp.name}
          </div>
        )}

        {comp.type === 'input' && (
          <div className="flex items-center justify-between text-slate-400 px-3 py-2 text-xs font-mono border border-slate-800 rounded bg-slate-900/80 h-full">
            <span>{comp.text || 'Enter input value...'}</span>
            <Search className="w-3.5 h-3.5 text-slate-500" />
          </div>
        )}

        {comp.type === 'badge' && (
          <div
            className="inline-flex items-center space-x-1 font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              fontSize: `${comp.fontSize || 11}px`,
              color: comp.color || '#10b981'
            }}
          >
            <span>{comp.text || comp.name}</span>
          </div>
        )}

        {comp.type === 'card' && (
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{comp.name}</span>
              <div className="w-6 h-6 rounded-lg bg-violet-600/20 text-violet-400 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-white mt-2">{comp.text || '1,420 Events'}</div>
            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 mt-1">
              <span>+18.4%</span>
              <span className="text-slate-500 font-normal">vs last commit</span>
            </div>
          </div>
        )}

        {comp.type === 'chart' && (
          <div className="flex flex-col justify-between h-full p-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <span>{comp.text || 'Throughput & Operations'}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                Live AST Stream
              </span>
            </div>
            <div className="flex-1 w-full bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 flex items-end justify-between relative overflow-hidden">
              <svg className="w-full h-24" viewBox="0 0 300 80" fill="none">
                <defs>
                  <linearGradient id={`chartGrad_${comp.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0 60 Q 50 20, 100 45 T 200 15 T 300 35 L 300 80 L 0 80 Z" fill={`url(#chartGrad_${comp.id})`} />
                <path d="M0 60 Q 50 20, 100 45 T 200 15 T 300 35" stroke="#a78bfa" strokeWidth="2.5" />
              </svg>
            </div>
          </div>
        )}

        {comp.type === 'table' && (
          <div className="flex flex-col h-full text-slate-300">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
              <span>{comp.text || 'Database Migrations'}</span>
              <span className="text-[10px] text-slate-500 font-mono">4 Records</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] font-mono font-semibold text-slate-400 border-b border-slate-800 pb-1.5">
              <span>ID</span>
              <span>Event</span>
              <span>Branch</span>
              <span>Status</span>
            </div>
            <div className="space-y-1 mt-2 text-xs font-mono">
              <div className="grid grid-cols-4 gap-2 py-1 border-b border-slate-900/60 text-slate-300">
                <span className="text-slate-500">#0812</span>
                <span className="text-white">schema_init</span>
                <span className="text-violet-400">main</span>
                <span className="text-emerald-400 font-bold">Verified</span>
              </div>
              <div className="grid grid-cols-4 gap-2 py-1 text-slate-300">
                <span className="text-slate-500">#0813</span>
                <span className="text-white">penpot_bridge</span>
                <span className="text-violet-400">feature/day-4</span>
                <span className="text-emerald-400 font-bold">Passing</span>
              </div>
            </div>
          </div>
        )}

        {/* Render nested children */}
        {comp.children && comp.children.map(child => renderVisualComponent(child, comp))}
      </div>
    );
  };

  // Render Layer Tree Node
  const handleStartRename = (comp: PenpotComponent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingLayerId(comp.id);
    setEditingLayerName(comp.name);
  };

  const handleSaveLayerName = (compId: string) => {
    if (editingLayerName.trim()) {
      updateComponent(compId, { name: editingLayerName.trim() });
    }
    setEditingLayerId(null);
  };

  const renderLayerTreeNode = (comp: PenpotComponent, depth: number = 0) => {
    const isSelected = selectedCompIds.includes(comp.id);
    const isCollapsed = collapsedNodes[comp.id];
    const isHidden = hiddenNodes[comp.id];
    const isLocked = lockedNodes[comp.id];
    const hasChildren = comp.children && comp.children.length > 0;

    if (layerSearch && !comp.name.toLowerCase().includes(layerSearch.toLowerCase())) {
      return null;
    }

    return (
      <div key={comp.id} className="select-none">
        <div
          onClick={(e) => {
            if (e.shiftKey || e.ctrlKey || e.metaKey) {
              setSelectedCompIds(prev =>
                prev.includes(comp.id) ? prev.filter(id => id !== comp.id) : [...prev, comp.id]
              );
            } else {
              setSelectedCompIds([comp.id]);
            }
          }}
          className={`group flex items-center justify-between py-1.5 px-2 rounded-md text-xs cursor-pointer transition-colors ${
            isSelected
              ? 'bg-violet-600 text-white font-medium shadow-sm'
              : isLight
                ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsedNodes(prev => ({ ...prev, [comp.id]: !prev[comp.id] }));
                }}
                className={`p-0.5 ${isLight ? 'hover:text-slate-900 text-slate-400' : 'hover:text-white text-slate-400'}`}
              >
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            ) : (
              <div className="w-3" />
            )}

            {comp.type === 'frame' && <Columns className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
            {comp.type === 'text' && <Type className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
            {comp.type === 'button' && <Square className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />}
            {comp.type === 'card' && <Box className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
            {comp.type === 'chart' && <BarChart3 className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />}
            {comp.type === 'table' && <TableIcon className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />}
            {comp.type === 'input' && <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
            {comp.type === 'badge' && <Shield className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}

            {editingLayerId === comp.id ? (
              <input
                type="text"
                value={editingLayerName}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingLayerName(e.target.value)}
                onBlur={() => handleSaveLayerName(comp.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveLayerName(comp.id);
                  if (e.key === 'Escape') setEditingLayerId(null);
                }}
                className={`px-1 py-0.5 text-xs rounded border outline-none font-medium ${
                  isLight ? 'bg-white border-violet-500 text-slate-900' : 'bg-slate-900 border-violet-500 text-white'
                }`}
              />
            ) : (
              <span
                onDoubleClick={(e) => handleStartRename(comp, e)}
                className="truncate cursor-text hover:underline decoration-dotted"
                title="Double-click to rename layer"
              >
                {comp.name}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setHiddenNodes(prev => ({ ...prev, [comp.id]: !prev[comp.id] }));
              }}
              className={`p-1 ${isLight ? 'hover:text-slate-900 text-slate-400' : 'hover:text-white text-slate-400'}`}
              title="Toggle Visibility"
            >
              {isHidden ? <EyeOff className="w-3 h-3 text-red-500" /> : <Eye className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLockedNodes(prev => ({ ...prev, [comp.id]: !prev[comp.id] }));
              }}
              className={`p-1 ${isLight ? 'hover:text-slate-900 text-slate-400' : 'hover:text-white text-slate-400'}`}
              title="Toggle Lock"
            >
              {isLocked ? <Lock className="w-3 h-3 text-amber-500" /> : <Unlock className="w-3 h-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteComponent(comp.id);
              }}
              className="p-1 hover:text-red-500 text-slate-400"
              title="Delete Layer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div>
            {comp.children!.map(child => renderLayerTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col h-full w-full min-h-0 ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#090d16] text-slate-100'} overflow-hidden font-sans select-none`}>
      {/* 1. MINIMAL TOP BAR (Screen Title & Mode Switcher) */}
      <div className={`h-11 border-b ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d1322]'} px-4 flex items-center justify-between z-20 shrink-0 shadow-xs`}>
        {/* Screen Title & Tag & Panel Toggles */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={toggleLeftSidebar}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showLeftSidebar
                ? isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-violet-600/10 border-violet-600/30 text-violet-500 hover:bg-violet-600/20'
            }`}
            title={showLeftSidebar ? 'Hide Layers Sidebar' : 'Show Layers Sidebar'}
          >
            {showLeftSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
            ❖
          </div>
          <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'} truncate max-w-xs`}>
            {currentScreen ? currentScreen.name : 'Untitled Artboard'}
          </span>
          <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500 bg-slate-100 border-slate-200' : 'text-slate-400 bg-slate-900 border-slate-800'} border px-1.5 py-0.5 rounded`}>
            {currentScreen ? `${currentScreen.board.width} × ${currentScreen.board.height}` : '1440 × 900'}
          </span>

          {/* Repo File Path Badge with 1-Click Copy */}
          {currentScreen && (() => {
            const screenSlug = currentScreen.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'untitled';
            const relPath = `ui/${screenSlug}.penpot.json`;
            return (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(relPath);
                  setCopiedFilePath(true);
                  setTimeout(() => setCopiedFilePath(false), 2000);
                }}
                className={`hidden md:flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer ${
                  copiedFilePath
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
                title="Click to copy repo file path"
              >
                <span>📁 {relPath}</span>
                {copiedFilePath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60" />}
              </button>
            );
          })()}
        </div>

        {/* View Switcher (Design vs Code) & Right Inspector Toggle */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'} border rounded-lg p-0.5 text-xs`}>
            <button
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                activeTab === 'design'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              Design Canvas
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1 rounded-md transition-colors font-medium ${
                activeTab === 'code'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
              }`}
            >
              Code & AST
            </button>
          </div>

          <button
            type="button"
            onClick={toggleRightInspector}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showRightInspector
                ? isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                : 'bg-violet-600/10 border-violet-600/30 text-violet-500 hover:bg-violet-600/20'
            }`}
            title={showRightInspector ? 'Hide Property Inspector' : 'Show Property Inspector'}
          >
            {showRightInspector ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. MAIN STUDIO LAYOUT: Left Layers | Center Scrollable Canvas | Right Inspector */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT PANEL: Stitch Chat, Layers Tree, UI Kit, Pages */}
        <div
          className={`border-r ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d1322]'} flex flex-col overflow-hidden shrink-0 transition-all duration-200 ${
            showLeftSidebar
              ? leftTab === 'chat'
                ? 'w-80 min-w-[320px] opacity-100'
                : 'w-64 min-w-[256px] opacity-100'
              : 'w-0 min-w-0 border-r-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className={`h-10 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#090d16]'} px-2 flex items-center justify-between text-xs font-semibold`}>
            <div className="flex space-x-1 overflow-x-auto py-0.5">
              <button
                onClick={() => setLeftTab('chat')}
                className={`px-2.5 py-1 rounded-md transition-all flex items-center space-x-1.5 ${
                  leftTab === 'chat'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs font-bold'
                    : isLight ? 'text-violet-600 hover:bg-violet-50' : 'text-violet-400 hover:bg-slate-800/80'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Stitch AI</span>
                {currentScreen?.chatHistory && currentScreen.chatHistory.length > 0 && (
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-white/20 text-white font-mono">
                    {currentScreen.chatHistory.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setLeftTab('layers')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  leftTab === 'layers'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-slate-800 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Layers
              </button>
              <button
                onClick={() => setLeftTab('assets')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  leftTab === 'assets'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-slate-800 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Assets
              </button>
              <button
                onClick={() => setLeftTab('pages')}
                className={`px-2 py-1 rounded-md transition-colors ${
                  leftTab === 'pages'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-slate-800 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pages ({screens.length})
              </button>
            </div>

            <button
              onClick={() => setShowNewModal(true)}
              className={`p-1 rounded-md ${isLight ? 'hover:bg-slate-100 text-slate-500 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
              title="Add New Screen / Artboard"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Tab 0: Stitch Conversational AI Chat Panel */}
          {leftTab === 'chat' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Chat Subheader with Active Screen & Mode Status */}
              <div className={`p-2.5 border-b ${isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800 bg-slate-950/40'} flex items-center justify-between text-xs`}>
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className={`font-semibold truncate ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {currentScreen ? currentScreen.name : 'New Session'}
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    selectedCompIds.length > 0
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : aiMode === 'modify'
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  }`}>
                    {selectedCompIds.length > 0 ? `Target (${selectedCompIds.length})` : aiMode === 'modify' ? 'Modify' : 'Create'}
                  </span>
                </div>
              </div>

              {/* Chat Message Thread */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
                {(!currentScreen?.chatHistory || currentScreen.chatHistory.length === 0) ? (
                  <div className="py-4 space-y-4">
                    <div className={`p-4 rounded-xl text-center border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-900/60 border-slate-800 text-slate-300'}`}>
                      <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-600/30">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm mb-1">Stitch AI Designer</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Prompt anything to generate 2D game maps, mobile viewports, dashboards, or web interfaces with live progressive AST placement.
                      </p>
                    </div>

                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Quick Starter Prompts:
                      </span>
                      <div className="space-y-1.5">
                        {[
                          '🎮 Hey generate Minimilitia 2D map in mobile view',
                          '🛍️ E-Commerce Storefront with Product Grid & Cart',
                          '💬 Real-Time Team Messaging & Chat Interface',
                          '📊 Modern SaaS Analytics Dashboard with 4 KPI Cards',
                          '📱 Mobile Crypto Wallet with Send & Receive'
                        ].map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleChatSubmit(undefined, suggestion.replace(/^[^\w]+/, ''))}
                            disabled={isGenerating}
                            className={`w-full text-left text-xs p-2 rounded-lg border transition-all ${
                              isLight
                                ? 'bg-white hover:bg-violet-50 border-slate-200 text-slate-700 hover:text-violet-700 hover:border-violet-300'
                                : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  currentScreen.chatHistory.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div key={msg.id || idx} className={`flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 px-1">
                          {isUser ? (
                            <>
                              <span>You</span>
                              <UserIcon className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              <Bot className="w-3 h-3 text-violet-400" />
                              <span className="font-semibold text-violet-400">Stitch AI</span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        <div
                          className={`max-w-[95%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                            isUser
                              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-xs'
                              : isLight
                              ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                              : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-xs'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.text}</div>

                          {!isUser && msg.metadata && (
                            <div className="mt-2.5 pt-2 border-t border-slate-800/40 flex flex-wrap gap-1.5 text-[10px]">
                              {msg.metadata.dimensions && (
                                <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 font-mono">
                                  📐 {msg.metadata.dimensions.width}×{msg.metadata.dimensions.height}
                                </span>
                              )}
                              {msg.stepsCount && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-900/40 text-violet-300 font-mono">
                                  ⚡ {msg.stepsCount} Steps
                                </span>
                              )}
                              {msg.metadata.mode && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-300 font-mono uppercase">
                                  {msg.metadata.mode}
                                </span>
                              )}
                            </div>
                          )}

                          {!isUser && idx === currentScreen.chatHistory!.length - 1 && (
                            <div className="mt-3 pt-2 border-t border-slate-800/40">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-1.5">
                                Suggested Iterations:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  'Add floating tactical platforms',
                                  'Add obstacle crates and ammo cache',
                                  'Switch to Cyberpunk Neon palette',
                                  'Add top combat radar and telemetry',
                                  'Switch to Mobile Portrait view'
                                ].map((sug, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleChatSubmit(undefined, sug)}
                                    disabled={isGenerating}
                                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                                      isLight
                                        ? 'bg-slate-50 hover:bg-violet-50 text-slate-700 border-slate-200 hover:border-violet-300 hover:text-violet-700'
                                        : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                                    }`}
                                  >
                                    + {sug}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}

                {isGenerating && (
                  <div className="flex flex-col space-y-1 items-start">
                    <div className="flex items-center space-x-1.5 text-[10px] text-violet-400 px-1">
                      <Bot className="w-3 h-3 text-violet-400 animate-spin" />
                      <span className="font-semibold">Stitch AI Synthesizing...</span>
                    </div>
                    <div className={`max-w-[95%] rounded-2xl p-3 text-xs border ${
                      isLight ? 'bg-white border-violet-200 text-slate-800' : 'bg-slate-900/90 border-violet-500/40 text-slate-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium text-violet-400">
                          {animatingStep ? animatingStep.action : 'Computing Penpot AST Nodes...'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-emerald-400 h-full transition-all duration-150"
                          style={{ width: `${animationProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Fixed Bottom Input Bar */}
              <form
                onSubmit={handleChatSubmit}
                className={`p-2.5 border-t ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#090d16]'}`}
              >
                {selectedCompIds.length > 0 && (
                  <div className="mb-2 flex items-center justify-between text-[11px] bg-violet-600/10 border border-violet-500/30 text-violet-400 px-2.5 py-1 rounded-lg">
                    <div className="flex items-center space-x-1.5 truncate">
                      <Zap className="w-3 h-3 fill-current" />
                      <span className="truncate font-medium">Targeting {selectedCompIds.length} selected element(s)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCompIds([])}
                      className="text-slate-400 hover:text-white ml-2 text-[10px]"
                    >
                      Clear
                    </button>
                  </div>
                )}

                <div className="relative flex items-center">
                  <textarea
                    rows={2}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleChatSubmit();
                      }
                    }}
                    placeholder={
                      selectedCompIds.length > 0
                        ? `Tell AI to modify ${selectedCompIds.length} element(s)...`
                        : "Ask Stitch to create, change colors, or add platforms..."
                    }
                    disabled={isGenerating}
                    className={`w-full text-xs rounded-xl p-2.5 pr-10 border resize-none focus:outline-none transition-all ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-violet-600'
                        : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isGenerating}
                    className="absolute right-2 p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all shadow-xs cursor-pointer"
                    title="Send prompt to Stitch AI (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 px-1">
                  <span>Press <kbd className="font-mono bg-slate-800 px-1 py-0.2 rounded text-[9px] text-slate-300">Enter ↵</kbd> to send</span>
                  <span><kbd className="font-mono bg-slate-800 px-1 py-0.2 rounded text-[9px] text-slate-300">Shift + Enter</kbd> for newline</span>
                </div>
              </form>
            </div>
          )}

          {/* Tab 1: Layers */}
          {leftTab === 'layers' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className={`p-2 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-slate-500'} absolute left-2.5 top-2`} />
                  <input
                    type="text"
                    value={layerSearch}
                    onChange={(e) => setLayerSearch(e.target.value)}
                    placeholder="Filter layers..."
                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-violet-500'} border rounded-md px-2 pl-8 py-1 text-xs focus:outline-none`}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                {currentScreen && currentScreen.board.components.length > 0 ? (
                  currentScreen.board.components.map(comp => renderLayerTreeNode(comp))
                ) : (
                  <div className={`text-center ${isLight ? 'text-slate-400' : 'text-slate-500'} text-xs mt-10 p-4`}>
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No layers in active artboard.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Assets UI Kit */}
          {leftTab === 'assets' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 flex items-center space-x-1.5`}>
                  <Box className="w-3.5 h-3.5 text-violet-500" />
                  <span>UI Kit Components</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => handleInsertComponent('kpi-card')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <TrendingUp className="w-4 h-4 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>KPI Card</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Metric + trend</span>
                  </button>

                  <button
                    onClick={() => handleInsertComponent('chart-container')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <BarChart3 className="w-4 h-4 text-pink-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Area Chart</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Telemetry wave</span>
                  </button>

                  <button
                    onClick={() => handleInsertComponent('data-table')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <TableIcon className="w-4 h-4 text-cyan-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Data Grid</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Zebra rows</span>
                  </button>

                  <button
                    onClick={() => handleInsertComponent('button-primary')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <Square className="w-4 h-4 text-violet-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Button</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Action trigger</span>
                  </button>

                  <button
                    onClick={() => handleInsertComponent('input-field')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <Search className="w-4 h-4 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Search Input</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Form field</span>
                  </button>

                  <button
                    onClick={() => handleInsertComponent('badge-pill')}
                    className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800'} border rounded-lg text-left flex flex-col justify-between transition-all group`}
                  >
                    <Shield className="w-4 h-4 text-teal-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Status Pill</span>
                    <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Health badge</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Pages */}
          {leftTab === 'pages' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {screens.map(s => {
                const isSelected = selectedScreenIds.includes(s.id) || currentScreen?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={(e) => {
                      if (e.shiftKey || e.ctrlKey || e.metaKey) {
                        setSelectedScreenIds(prev =>
                          prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                        );
                      } else {
                        setSelectedScreenIds([s.id]);
                        selectScreen(s.id);
                      }
                    }}
                    className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-violet-600 text-white font-semibold shadow-sm'
                        : isLight
                          ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Monitor className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : isLight ? 'text-slate-500' : 'text-slate-500'}`} />
                      <span className="truncate">{s.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete screen "${s.name}"?`)) {
                          deleteScreen(s.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CENTER PANEL: Isolated Scrollable Figma Canvas */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
          className={`flex-1 h-full min-h-0 ${isLight ? 'bg-[#f1f5f9]' : 'bg-[#060911]'} overflow-auto relative overscroll-contain select-none focus:outline-none ${
            isPanning ? 'cursor-grabbing' : isHandMode ? 'cursor-grab' : 'cursor-default'
          }`}
          style={{
            backgroundImage: isLight
              ? 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)'
              : 'radial-gradient(#1e293b 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        >
          {/* Floating Stitch Live Generator HUD Notification */}
          {isGenerating && (
            <div className="sticky top-4 left-1/2 -translate-x-1/2 mx-auto z-50 max-w-xl bg-slate-900/95 border border-violet-500/60 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs text-white pointer-events-none transition-all animate-bounce">
              <div className="w-5 h-5 rounded-full bg-violet-600/30 border border-violet-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-3 h-3 text-violet-300 animate-spin" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-violet-200 truncate">
                  {animatingStep
                    ? `Placing: ${animatingStep.name} (${animatingStep.action})`
                    : 'Synthesizing Stitch Layout Schema...'}
                </div>
                {animatingStep && (
                  <div className="text-[10px] font-mono text-slate-400">
                    Pos: ({animatingStep.x}, {animatingStep.y}) • Size: {animatingStep.width} × {animatingStep.height}
                  </div>
                )}
              </div>
              <div className="font-mono text-[11px] font-bold text-violet-300 bg-violet-950/90 px-2 py-0.5 rounded-lg border border-violet-700/50">
                {animationProgress}%
              </div>
            </div>
          )}

          {/* Quick AI Trigger Floating Action Pill */}
          {selectedCompIds.length > 0 && !showQuickAiBar && (
            <div className="sticky top-4 left-1/2 -translate-x-1/2 mx-auto z-40 flex justify-center pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setShowQuickAiBar(true);
                  setTimeout(() => quickInputRef.current?.focus(), 50);
                }}
                className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-full shadow-2xl border border-white/20 flex items-center space-x-2 transition-all hover:scale-105 cursor-pointer backdrop-blur-md animate-pulse"
                title="Press 'E' to prompt AI for selected elements"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Edit {selectedCompIds.length} element{selectedCompIds.length > 1 ? 's' : ''} with AI</span>
                <kbd className="ml-1 px-1.5 py-0.5 bg-black/40 rounded text-[10px] font-mono border border-white/20">E</kbd>
              </button>
            </div>
          )}

          {/* Floating Stitch Quick AI Command Bar (Press E shortcut) */}
          {showQuickAiBar && (
            <div className="sticky top-4 left-1/2 -translate-x-1/2 mx-auto z-50 w-full max-w-xl px-4 pointer-events-auto">
              <div className={`p-3 rounded-2xl shadow-2xl border backdrop-blur-xl transition-all ${
                isLight ? 'bg-white/95 border-violet-300 text-slate-900 shadow-violet-500/10' : 'bg-slate-900/95 border-violet-500/50 text-white shadow-violet-950/80'
              }`}>
                <form onSubmit={handleQuickAiEdit} className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <input
                    ref={quickInputRef}
                    type="text"
                    value={quickPrompt}
                    onChange={(e) => setQuickPrompt(e.target.value)}
                    placeholder={
                      selectedCompIds.length > 0
                        ? `Tell AI to modify ${selectedCompIds.length} selected element${selectedCompIds.length > 1 ? 's' : ''} (e.g. "make glassmorphic", "turn into pricing cards", "emerald theme")...`
                        : selectedScreenIds.length > 1
                        ? `Tell AI to modify ${selectedScreenIds.length} selected screens...`
                        : 'Tell AI what to change or add to this screen...'
                    }
                    className={`flex-1 bg-transparent px-2 py-1.5 text-xs font-sans outline-none ${
                      isLight ? 'text-slate-900 placeholder-slate-400' : 'text-white placeholder-slate-400'
                    }`}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={!quickPrompt.trim() || isGenerating}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow cursor-pointer disabled:opacity-40 transition-all flex items-center space-x-1"
                  >
                    <span>Change</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickAiBar(false)}
                    className={`p-1.5 rounded-lg ${isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-400'} transition-colors cursor-pointer`}
                    title="Close (Esc)"
                  >
                    ✕
                  </button>
                </form>

                {/* Quick suggestions chips */}
                <div className="flex items-center space-x-1.5 mt-2.5 pt-2 border-t border-slate-700/30 overflow-x-auto text-[11px]">
                  <span className={`text-[10px] font-mono shrink-0 ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>Quick:</span>
                  {[
                    'Make glassmorphic glow',
                    'Convert to emerald theme',
                    'Rounded pill corners',
                    'Turn into 3-tier pricing cards',
                    'Add search & filter controls',
                    'Modern cyberpunk dark style'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setQuickPrompt(chip);
                        quickInputRef.current?.focus();
                      }}
                      className={`px-2 py-0.5 rounded-md border whitespace-nowrap transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'design' ? (
            currentScreen ? (
              <div
                style={{
                  minWidth: '100%',
                  minHeight: '100%',
                  width: `${canvasBounds.scrollW}px`,
                  height: `${canvasBounds.scrollH}px`,
                  padding: '3000px 4000px 3000px 4000px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <div
                  ref={artboardRef}
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'top center',
                    width: `${canvasBounds.artboardWidth}px`,
                    minHeight: `${canvasBounds.artboardHeight}px`,
                    backgroundColor: currentScreen.board.background || (isLight ? '#ffffff' : '#090d16'),
                    borderRadius: `${currentScreen.theme.borderRadius || 12}px`,
                    boxShadow: isGenerating
                      ? '0 0 60px rgba(139, 92, 246, 0.4), 0 0 0 2px rgba(167, 139, 250, 0.8)'
                      : isLight
                      ? '0 20px 50px -10px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)'
                      : '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    position: 'relative'
                  }}
                  className={`select-none transition-shadow ${isGenerating ? 'ring-2 ring-violet-400/80 animate-pulse' : ''}`}
                >
                  {/* Figma Artboard Header */}
                  <div className={`absolute -top-7 left-0 flex items-center space-x-2 text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="text-violet-500">#</span>
                    <span>{currentScreen.board.name}</span>
                    <span className={`${isLight ? 'text-slate-400' : 'text-slate-600'} font-normal`}>({currentScreen.board.width} × {currentScreen.board.height})</span>
                    {isGenerating && (
                      <span className="text-[10px] text-violet-400 bg-violet-950/80 border border-violet-700/60 px-1.5 py-0.2 rounded font-sans animate-pulse">
                        ⚡ AI Synthesizing
                      </span>
                    )}
                  </div>

                  {/* Figma Smart Alignment Guide Lines */}
                  {activeGuides?.x !== undefined && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-50 border-l border-[#ff0055] border-dashed"
                      style={{ left: `${activeGuides.x}px` }}
                    />
                  )}
                  {activeGuides?.y !== undefined && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none z-50 border-t border-[#ff0055] border-dashed"
                      style={{ top: `${activeGuides.y}px` }}
                    />
                  )}

                  {/* Live Stitch Ghost Placement Indicator */}
                  {animatingStep && (
                    <div
                      className="absolute pointer-events-none z-50 border-2 border-violet-400 bg-violet-500/15 rounded-lg transition-all duration-150 animate-pulse"
                      style={{
                        left: `${animatingStep.x}px`,
                        top: `${animatingStep.y}px`,
                        width: `${animatingStep.width}px`,
                        height: `${animatingStep.height}px`,
                        boxShadow: '0 0 25px rgba(139, 92, 246, 0.6), inset 0 0 15px rgba(139, 92, 246, 0.3)'
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-violet-600 text-white font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center space-x-1 whitespace-nowrap">
                        <Sparkles className="w-2.5 h-2.5 animate-spin" />
                        <span>{animatingStep.name}</span>
                        <span className="opacity-75">[{animatingStep.x},{animatingStep.y}]</span>
                      </div>
                    </div>
                  )}

                  {/* Render Absolute Positioned Components */}
                  {currentScreen.board.components.map(comp => renderVisualComponent(comp))}
                </div>
              </div>
            ) : (
              <div className={`text-center ${isLight ? 'text-slate-400' : 'text-slate-500'} mt-28`}>
                <Box className="w-16 h-16 mx-auto mb-3 opacity-20 text-violet-500" />
                <p className={`text-base font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>No Artboard Selected</p>
                <p className="text-xs text-slate-500 mt-1">Select a screen or generate a layout using AI</p>
              </div>
            )
          ) : (
            /* Code & AST Inspector */
            <div className={`w-full max-w-4xl h-full ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-[#0d1322] border-slate-800 shadow-2xl'} border rounded-2xl flex flex-col overflow-hidden mb-20`}>
              <div className={`h-12 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#090d16]'} px-4 flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCodeTab('penpot')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${codeTab === 'penpot' ? 'bg-violet-600 text-white' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Penpot Plugin Schema 2.0
                  </button>
                  <button
                    onClick={() => setCodeTab('react')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${codeTab === 'react' ? 'bg-violet-600 text-white' : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    React + Tailwind TSX
                  </button>
                </div>

                <button
                  onClick={() => {
                    const text = codeTab === 'penpot' ? JSON.stringify(currentScreen, null, 2) : generateReactCode(currentScreen);
                    navigator.clipboard.writeText(text);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className={`flex items-center space-x-1.5 px-3 py-1 ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} text-xs font-semibold rounded-md transition-all cursor-pointer`}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <div className={`flex-1 overflow-auto p-6 font-mono text-xs text-emerald-400 ${isLight ? 'bg-slate-900' : 'bg-slate-950'}`}>
                <pre>{codeTab === 'penpot' ? JSON.stringify(currentScreen, null, 2) : generateReactCode(currentScreen)}</pre>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Figma Property Inspector */}
        <div
          className={`border-l ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d1322]'} flex flex-col overflow-y-auto shrink-0 transition-all duration-200 ${
            showRightInspector
              ? 'w-72 min-w-[288px] opacity-100'
              : 'w-0 min-w-0 border-l-0 opacity-0 pointer-events-none'
          }`}
        >
            <div className={`h-10 border-b ${isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-slate-800 bg-[#090d16] text-slate-200'} px-4 flex items-center justify-between text-xs font-bold`}>
              <span>Inspector</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {selectedCompIds.length > 1
                    ? `${selectedCompIds.length} Selected`
                    : selectedComponent
                    ? selectedComponent.type
                    : 'Artboard'}
                </span>
                <button
                  type="button"
                  onClick={toggleRightInspector}
                  className={`p-1 rounded hover:${isLight ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-white'} text-slate-400 cursor-pointer`}
                  title="Hide Inspector"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {selectedCompIds.length > 1 && (
              <div className={`p-3 mx-3 mt-3 rounded-xl border ${
                isLight ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-violet-950/40 border-violet-500/30 text-violet-200'
              } space-y-2 text-xs`}>
                <div className="flex items-center space-x-2 font-bold">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span>{selectedCompIds.length} Elements Multi-Selected</span>
                </div>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Press <kbd className="px-1.5 py-0.5 bg-black/40 text-white rounded font-mono text-[10px]">E</kbd> or click below to ask AI to transform all selected elements together.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAiBar(true);
                    setTimeout(() => quickInputRef.current?.focus(), 50);
                  }}
                  className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Modify Selection with AI (E)</span>
                </button>
              </div>
            )}

            <div className="p-4 space-y-5 text-xs">
              {/* Alignment Tools Bar */}
              <div>
                <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Alignment</label>
                <div className={`grid grid-cols-6 gap-1 ${isLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-950 border-slate-800 text-slate-400'} border p-1 rounded-lg`}>
                  <button
                    title="Align Left"
                    onClick={() => selectedComponent && updateComponent(selectedComponent.id, { x: 0 })}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Align Center"
                    onClick={() => {
                      if (!selectedComponent || !currentScreen) return;
                      const containerWidth = selectedParent ? (selectedParent.width || 300) : currentScreen.board.width;
                      updateComponent(selectedComponent.id, {
                        x: Math.round((containerWidth - (selectedComponent.width || 0)) / 2)
                      });
                    }}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Align Right"
                    onClick={() => {
                      if (!selectedComponent || !currentScreen) return;
                      const containerWidth = selectedParent ? (selectedParent.width || 300) : currentScreen.board.width;
                      updateComponent(selectedComponent.id, {
                        x: containerWidth - (selectedComponent.width || 0)
                      });
                    }}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Align Top"
                    onClick={() => selectedComponent && updateComponent(selectedComponent.id, { y: 0 })}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <ArrowRight className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                  <button
                    title="Align Middle"
                    onClick={() => {
                      if (!selectedComponent || !currentScreen) return;
                      const containerHeight = selectedParent ? (selectedParent.height || 300) : currentScreen.board.height;
                      updateComponent(selectedComponent.id, {
                        y: Math.round((containerHeight - (selectedComponent.height || 0)) / 2)
                      });
                    }}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title="Align Bottom"
                    onClick={() => {
                      if (!selectedComponent || !currentScreen) return;
                      const containerHeight = selectedParent ? (selectedParent.height || 300) : currentScreen.board.height;
                      updateComponent(selectedComponent.id, {
                        y: containerHeight - (selectedComponent.height || 0)
                      });
                    }}
                    className={`p-1 ${isLight ? 'hover:text-slate-900 hover:bg-slate-200/60' : 'hover:text-white hover:bg-slate-800/60'} rounded flex justify-center`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {selectedComponent ? (
                <>
                  {/* 1. Geometry Coordinates & Dimensions */}
                  <div>
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Position & Size</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'x')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub X"
                        >
                          X (px) ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedCompPos.x}
                          onChange={(e) => updateComponent(selectedComponent.id, { x: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 focus:outline-none focus:border-[#0d99ff] font-mono text-xs`}
                        />
                      </div>
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'y')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub Y"
                        >
                          Y (px) ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedCompPos.y}
                          onChange={(e) => updateComponent(selectedComponent.id, { y: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 focus:outline-none focus:border-[#0d99ff] font-mono text-xs`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'width')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub Width"
                        >
                          W (px) ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedComponent.width || 0}
                          onChange={(e) => updateComponent(selectedComponent.id, { width: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 focus:outline-none focus:border-[#0d99ff] font-mono text-xs`}
                        />
                      </div>
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'height')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub Height"
                        >
                          H (px) ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedComponent.height || 0}
                          onChange={(e) => updateComponent(selectedComponent.id, { height: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 focus:outline-none focus:border-[#0d99ff] font-mono text-xs`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. Text & Typography */}
                  {selectedComponent.text !== undefined && (
                    <div>
                      <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Typography & Content</label>
                      <textarea
                        rows={2}
                        value={selectedComponent.text}
                        onChange={(e) => updateComponent(selectedComponent.id, { text: e.target.value })}
                        className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1.5 focus:outline-none focus:border-[#0d99ff]`}
                      />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Font Size</span>
                          <input
                            type="number"
                            value={selectedComponent.fontSize || 14}
                            onChange={(e) => updateComponent(selectedComponent.id, { fontSize: Number(e.target.value) })}
                            className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2 py-1 font-mono text-xs`}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Font Weight</span>
                          <select
                            value={selectedComponent.fontWeight || 'normal'}
                            onChange={(e) => updateComponent(selectedComponent.id, { fontWeight: e.target.value })}
                            className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2 py-1 text-xs`}
                          >
                            <option value="normal">Regular</option>
                            <option value="500">Medium</option>
                            <option value="600">Semibold</option>
                            <option value="bold">Bold</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. Corner Radius & Padding */}
                  <div>
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Corner Radius & Padding</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'borderRadius')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub Radius"
                        >
                          Radius ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedComponent.borderRadius || 0}
                          onChange={(e) => updateComponent(selectedComponent.id, { borderRadius: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 font-mono text-xs`}
                        />
                      </div>
                      <div>
                        <span
                          onMouseDown={(e) => startScrubbing(e, 'padding')}
                          className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-1 font-mono font-semibold cursor-ew-resize hover:text-[#0d99ff] select-none`}
                          title="Drag left/right to scrub Padding"
                        >
                          Padding ⇄
                        </span>
                        <input
                          type="number"
                          value={selectedComponent.padding || 0}
                          onChange={(e) => updateComponent(selectedComponent.id, { padding: Number(e.target.value) })}
                          className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 font-mono text-xs`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. Fill Color Picker & Swatches */}
                  <div>
                    <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Fill & Background</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={selectedComponent.fills?.[0]?.fillColor || '#131b2e'}
                        onChange={(e) => updateComponent(selectedComponent.id, { fills: [{ fillColor: e.target.value }] })}
                        className={`w-8 h-8 rounded border ${isLight ? 'border-slate-300' : 'border-slate-700'} bg-transparent cursor-pointer`}
                      />
                      <input
                        type="text"
                        value={selectedComponent.fills?.[0]?.fillColor || '#131b2e'}
                        onChange={(e) => updateComponent(selectedComponent.id, { fills: [{ fillColor: e.target.value }] })}
                        className={`flex-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 font-mono text-xs`}
                      />
                    </div>

                    <div className="flex items-center space-x-1.5 mt-2.5">
                      {['#0d1322', '#131b2e', '#1e293b', '#7c3aed', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#ffffff'].map(c => (
                        <button
                          key={c}
                          onClick={() => updateComponent(selectedComponent.id, { fills: [{ fillColor: c }] })}
                          style={{ backgroundColor: c }}
                          className={`w-5 h-5 rounded border ${isLight ? 'border-slate-300' : 'border-slate-700'} hover:scale-110 transition-transform cursor-pointer`}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Component Actions */}
                  <div className={`pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} flex items-center justify-between`}>
                    <button
                      onClick={() => duplicateComponent(selectedComponent.id)}
                      className={`flex items-center space-x-1 ${isLight ? 'text-slate-700 hover:text-slate-900 bg-slate-100 border-slate-200' : 'text-slate-400 hover:text-white bg-slate-950 border-slate-800'} px-2 py-1 rounded border cursor-pointer`}
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={() => deleteComponent(selectedComponent.id)}
                      className={`flex items-center space-x-1 ${isLight ? 'text-red-600 hover:text-red-700 bg-red-50 border-red-200' : 'text-red-400 hover:text-red-300 bg-red-950/40 border-red-900/50'} px-2 py-1 rounded border cursor-pointer`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Artboard Canvas Controls */
                currentScreen && (
                  <div className="space-y-4">
                    <div>
                      <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Artboard Canvas</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Canvas Width</span>
                          <input
                            type="number"
                            value={currentScreen.board.width}
                            onChange={(e) => updateScreen(currentScreen.id, {
                              board: { ...currentScreen.board, width: Number(e.target.value) }
                            })}
                            className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2 py-1 font-mono`}
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-1">Canvas Height</span>
                          <input
                            type="number"
                            value={currentScreen.board.height}
                            onChange={(e) => updateScreen(currentScreen.id, {
                              board: { ...currentScreen.board, height: Number(e.target.value) }
                            })}
                            className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2 py-1 font-mono`}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} block mb-2`}>Artboard Background</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="color"
                          value={currentScreen.board.background || (isLight ? '#ffffff' : '#090d16')}
                          onChange={(e) => updateScreen(currentScreen.id, {
                            board: { ...currentScreen.board, background: e.target.value }
                          })}
                          className={`w-8 h-8 rounded border ${isLight ? 'border-slate-300' : 'border-slate-700'} bg-transparent cursor-pointer`}
                        />
                        <input
                          type="text"
                          value={currentScreen.board.background || (isLight ? '#ffffff' : '#090d16')}
                          onChange={(e) => updateScreen(currentScreen.id, {
                            board: { ...currentScreen.board, background: e.target.value }
                          })}
                          className={`flex-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded px-2.5 py-1 font-mono text-xs`}
                        />
                      </div>
                    </div>

                    <div className={`p-3 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-950/60 border-slate-800/80 text-slate-400'} border rounded-lg text-xs`}>
                      <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'} block mb-1`}>💡 Figma Drag & Move</span>
                      Click and drag any element on canvas to move it freely. Use 8 anchor handles to resize.
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* 3. FIGMA UI 3 FLOATING BOTTOM TOOLBAR */}
        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center ${isLight ? 'bg-white/95 border-slate-200 shadow-xl text-slate-700' : 'bg-[#0d1322]/90 border-slate-700/70 shadow-2xl text-slate-200'} backdrop-blur-xl border rounded-2xl px-3.5 py-2 space-x-2`}>
          {/* Tool Palette */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTool('select')}
              title="Select / Move (V)"
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'select'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MousePointer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTool('frame')}
              title="Frame / Artboard (F)"
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'frame'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertComponent('rect')}
              title="Rectangle / Card (R)"
              className={`p-2 rounded-xl ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'} transition-all`}
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleInsertComponent('text')}
              title="Text (T)"
              className={`p-2 rounded-xl ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'} transition-all`}
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowLeftSidebar(true);
                setLeftTab('assets');
              }}
              title="UI Kit Components"
              className={`p-2 rounded-xl ${isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'} transition-all`}
            >
              <Box className="w-4 h-4 text-violet-500" />
            </button>
            <button
              onClick={() => setActiveTool(activeTool === 'hand' ? 'select' : 'hand')}
              title="Hand / Pan Tool (H / Spacebar)"
              className={`p-2 rounded-xl transition-all ${
                activeTool === 'hand'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Hand className="w-4 h-4" />
            </button>
          </div>

          <div className={`h-5 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-slate-700'} mx-1`} />

          {/* Zen / Panel Toggle Button */}
          <button
            onClick={toggleZenMode}
            title={showLeftSidebar || showRightInspector ? 'Zen Mode: Hide Panels' : 'Show Panels'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              !showLeftSidebar && !showRightInspector
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sidebar className="w-4 h-4" />
          </button>

          <div className={`h-5 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-slate-700'} mx-1`} />

          {/* Stitch AI Conversational Chat Trigger */}
          <button
            onClick={() => {
              setShowLeftSidebar(true);
              setLeftTab('chat');
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg ${
              leftTab === 'chat' && showLeftSidebar
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-violet-600/30'
                : 'bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 border border-violet-500/40'
            }`}
            title="Open Stitch AI Chat (Prompt & Modify)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Stitch Chat</span>
          </button>

          {/* AI Generator Trigger */}
          <button
            onClick={() => {
              setAiMode('create');
              setShowAiModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/20 cursor-pointer transition-all"
            title="Generate new layout using AI"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Gen</span>
          </button>

          {/* AI In-Place Modify Trigger */}
          {currentScreen && (
            <button
              onClick={() => {
                setAiMode('modify');
                setShowAiModal(true);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/20 cursor-pointer transition-all"
              title="Modify current screen with AI in-place"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>AI Edit</span>
            </button>
          )}

          {/* Present Prototype Trigger */}
          <button
            onClick={() => setShowPresentModal(true)}
            title="Present Interactive Prototype"
            className={`flex items-center space-x-1 px-3 py-1.5 ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-emerald-600' : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-emerald-400'} border text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-xs`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present</span>
          </button>

          {/* Export to Penpot */}
          <button
            onClick={() => currentScreen && exportPenpotJson(currentScreen.id, currentScreen.name)}
            disabled={!currentScreen}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          <div className={`h-5 w-[1px] ${isLight ? 'bg-slate-200' : 'bg-slate-700'} mx-1`} />

          {/* Zoom & Center View Controller */}
          <div className={`flex items-center text-xs font-mono px-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            <button onClick={() => setZoom(prev => Math.max(30, prev - 15))} className={`px-1.5 py-0.5 rounded ${isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800 hover:text-white'} font-bold`}>-</button>
            <span className="w-10 text-center font-semibold">{zoom}%</span>
            <button onClick={() => setZoom(prev => Math.min(200, prev + 15))} className={`px-1.5 py-0.5 rounded ${isLight ? 'hover:bg-slate-100 hover:text-slate-900' : 'hover:bg-slate-800 hover:text-white'} font-bold`}>+</button>
            <button
              onClick={() => { setZoom(100); centerArtboard(true); }}
              title="Center Artboard (Shift + 1)"
              className={`p-1 ml-1 rounded ${isLight ? 'hover:bg-slate-100 text-slate-600 hover:text-slate-900' : 'hover:bg-slate-800 text-slate-400 hover:text-white'} transition-colors cursor-pointer`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      {/* 4. MODALS */}

      {/* Unified Screen Creation & AI Generator Modal */}
      {(showAiModal || showNewModal) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-xl ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0d1322] border-slate-800 text-white'} border rounded-2xl p-6 shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-3`}>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {aiMode === 'modify' ? '⚡ Modify Screen with Stitch AI' : '✨ New Screen & AI Generator'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAiModal(false);
                  setShowNewModal(false);
                }}
                className={`${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}
              >
                ✕
              </button>
            </div>

            {/* Mode / Type Switcher Tabs */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowNewModal(false);
                  setShowAiModal(true);
                  setAiMode('create');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1.5 ${
                  showAiModal && aiMode === 'create'
                    ? 'bg-violet-600 border-violet-500 text-white shadow-sm'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ AI Layout Generator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowNewModal(false);
                  setShowAiModal(true);
                  setAiMode('modify');
                }}
                disabled={!currentScreen}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1.5 disabled:opacity-40 ${
                  showAiModal && aiMode === 'modify'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-sm'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>⚡ Modify Active Screen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAiModal(false);
                  setShowNewModal(true);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1.5 ${
                  showNewModal
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                    : isLight
                    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>🎨 Blank / Template</span>
              </button>
            </div>

            {/* TAB 1 & 2: AI PROMPT WORKFLOW */}
            {showAiModal && (
              <div className="space-y-4">
                <div>
                  <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1.5 font-medium`}>
                    {aiMode === 'modify'
                      ? 'Describe changes or elements to add/restyle in the current layout:'
                      : 'Describe your UI layout requirement (Auth, E-Commerce, Chat, Video, Kanban, Pricing, Dashboard):'}
                  </label>
                  <textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      aiMode === 'modify'
                        ? 'e.g. Add 2 new KPI metric cards for monthly churn and active clusters, and insert a diagnostics log table below...'
                        : 'e.g. Modern E-Commerce product catalog with hero banner, 4 hardware product cards with prices, ratings, and Add to Cart buttons...'
                    }
                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500'} border rounded-xl p-3 text-xs focus:outline-none font-sans`}
                  />
                </div>

                {/* Theme Selector */}
                <div className="flex items-center space-x-2">
                  <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Theme:</span>
                  {(['dark', 'light', 'cyberpunk', 'minimal'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTheme(t)}
                      className={`text-[11px] font-mono capitalize px-2.5 py-1 rounded-md border transition-all ${
                        aiTheme === t
                          ? 'bg-violet-600 border-violet-400 text-white font-bold'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-600'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'} font-semibold uppercase tracking-wider block mb-2`}>
                    Diverse Prompt Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(aiMode === 'modify'
                      ? [
                          'Add 2 KPI metric cards for Cluster Latency and Memory Usage',
                          'Add a real-time diagnostics data table with 4 columns',
                          'Restyle header with search bar and filter dropdown buttons'
                        ]
                      : [
                          'E-Commerce Storefront with Product Grid & Add to Cart',
                          'Enterprise SSO Auth Login Portal with GitHub OAuth',
                          'DevOps Sprint Kanban Agile Board with 4 Status Columns',
                          'Real-Time Team Messaging & Chat Interface',
                          'SaaS 3-Tier Pricing Comparison Matrix with CTAs'
                        ]
                    ).map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => setPrompt(p)}
                        className={`text-[11px] px-2.5 py-1 ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'} border rounded-lg transition-colors text-left`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAiModal(false);
                      setShowNewModal(false);
                    }}
                    className={`px-4 py-2 text-xs ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAiGenerate()}
                    disabled={isGenerating || !prompt.trim()}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-all flex items-center space-x-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGenerating ? 'Synthesizing Spec AST...' : aiMode === 'modify' ? 'Apply Stitch AI Edits' : 'Generate Screen AST'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: BLANK / TEMPLATE WORKFLOW */}
            {showNewModal && (
              <div className="space-y-4">
                <div>
                  <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1 font-medium`}>Artboard Title</label>
                  <input
                    type="text"
                    value={newScreenName}
                    onChange={(e) => setNewScreenName(e.target.value)}
                    placeholder="e.g. Mobile User Profile"
                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'} border rounded-lg px-3 py-2 text-xs focus:outline-none`}
                  />
                </div>
                <div>
                  <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1 font-medium`}>Canvas Dimension Preset</label>
                  <select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                    className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'} border rounded-lg px-3 py-2 text-xs focus:outline-none`}
                  >
                    {templates.map(t => (
                      <option key={t.key} value={t.key}>{t.name} ({t.dimensions.width} × {t.dimensions.height})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAiModal(false);
                      setShowNewModal(false);
                    }}
                    className={`px-4 py-2 text-xs ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNew}
                    disabled={!newScreenName.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer disabled:opacity-50"
                  >
                    Create Blank Artboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Prototype Presenter Modal */}
      {showPresentModal && currentScreen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col z-50 overflow-hidden">
          <div className="h-12 border-b border-slate-800 bg-[#0d1322] px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-bold text-white">{currentScreen.name} — Interactive Prototype</span>
            </div>
            <button
              onClick={() => setShowPresentModal(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200"
            >
              Exit Prototype (Esc)
            </button>
          </div>

          <div className="flex-1 overflow-auto p-8 flex items-center justify-center overscroll-contain">
            <div
              style={{
                width: `${currentScreen.board.width}px`,
                minHeight: `${currentScreen.board.height}px`,
                height: `${currentScreen.board.height}px`,
                backgroundColor: currentScreen.board.background || '#090d16',
                borderRadius: '16px',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9)',
                position: 'relative'
              }}
              className="relative"
            >
              {currentScreen.board.components.map(comp => renderVisualComponent(comp))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
