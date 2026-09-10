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
  Sidebar
} from 'lucide-react';
import { useScreens, ScreenLayoutSpec, PenpotComponent } from '../hooks/useScreens';
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
    error,
    selectScreen,
    createScreen,
    updateScreen,
    deleteScreen,
    generateAiLayout,
    exportPenpotJson,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent
  } = useScreens(selectedProject?.id);

  // Studio Tools & View States
  const [activeTool, setActiveTool] = useState<'select' | 'frame' | 'rect' | 'circle' | 'text' | 'component' | 'hand'>('select');
  const [activeTab, setActiveTab] = useState<'design' | 'prototype' | 'code'>('design');
  const [leftTab, setLeftTab] = useState<'layers' | 'assets' | 'pages'>('layers');
  const [codeTab, setCodeTab] = useState<'penpot' | 'react' | 'tokens'>('penpot');
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

  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [hoveredCompId, setHoveredCompId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(75);
  const [prompt, setPrompt] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPresentModal, setShowPresentModal] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('saas-dashboard');
  const [copiedCode, setCopiedCode] = useState(false);
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

  // Keyboard shortcuts (Figma standard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
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

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCompId) {
        e.preventDefault();
        deleteComponent(selectedCompId);
        setSelectedCompId(null);
      }

      // Duplicate: Ctrl+D / Cmd+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedCompId) {
        e.preventDefault();
        duplicateComponent(selectedCompId);
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
        setSelectedCompId(null);
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
  }, [selectedCompId, selectedComponent, selectedParent, copiedComponent, deleteComponent, duplicateComponent, updateComponent, getChildRelativeCoords]);

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
    setSelectedCompId(null);
  };

  // Start dragging component
  const startDrag = (e: React.MouseEvent, comp: PenpotComponent, parent?: PenpotComponent) => {
    if (e.button !== 0) return;
    if (lockedNodes[comp.id] || isHandMode) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedCompId(comp.id);

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

  // Handle AI spec generation
  const handleAiGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;
    try {
      await generateAiLayout(prompt);
      setPrompt('');
      setShowAiModal(false);
    } catch {}
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
    const isSelected = selectedCompId === comp.id;
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
          setSelectedCompId(comp.id);
        }}
        onDoubleClick={(e) => {
          if (isHandMode) return;
          e.stopPropagation();
          setSelectedCompId(comp.id);
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
  const renderLayerTreeNode = (comp: PenpotComponent, depth: number = 0) => {
    const isSelected = selectedCompId === comp.id;
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
          onClick={() => setSelectedCompId(comp.id)}
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

            <span className="truncate">{comp.name}</span>
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
        {/* LEFT PANEL: Layers Tree, UI Kit, Pages */}
        <div
          className={`border-r ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d1322]'} flex flex-col overflow-hidden shrink-0 transition-all duration-200 ${
            showLeftSidebar
              ? 'w-64 min-w-[256px] opacity-100'
              : 'w-0 min-w-0 border-r-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className={`h-10 border-b ${isLight ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-[#090d16]'} px-2 flex items-center justify-between text-xs font-semibold`}>
            <div className="flex space-x-1">
              <button
                onClick={() => setLeftTab('layers')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  leftTab === 'layers'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-slate-800 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Layers
              </button>
              <button
                onClick={() => setLeftTab('assets')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  leftTab === 'assets'
                    ? isLight ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'bg-slate-800 text-white'
                    : isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Assets
              </button>
              <button
                onClick={() => setLeftTab('pages')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
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

              {/* Preset Templates */}
              <div className={`pt-2 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 flex items-center space-x-1.5`}>
                  <Layout className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Preset Templates</span>
                </div>
                <div className="space-y-2">
                  {templates.map(t => (
                    <div
                      key={t.key}
                      onClick={() => createScreen({ name: t.name, templateKey: t.key })}
                      className={`p-2.5 rounded-lg ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200' : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800/80'} border cursor-pointer transition-all group`}
                    >
                      <div className={`text-xs font-semibold ${isLight ? 'text-slate-800 group-hover:text-violet-600' : 'text-slate-200 group-hover:text-violet-300'}`}>{t.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{t.dimensions.width} × {t.dimensions.height}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Pages */}
          {leftTab === 'pages' && (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {screens.map(s => {
                const isActive = currentScreen?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => selectScreen(s.id)}
                    className={`group flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-violet-600 text-white font-semibold shadow-sm'
                        : isLight
                          ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Monitor className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-white' : isLight ? 'text-slate-500' : 'text-slate-500'}`} />
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
                    boxShadow: isLight
                      ? '0 20px 50px -10px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)'
                      : '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    position: 'relative'
                  }}
                  className="select-none"
                >
                  {/* Figma Artboard Header */}
                  <div className={`absolute -top-7 left-0 flex items-center space-x-2 text-xs font-mono font-semibold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <span className="text-violet-500">#</span>
                    <span>{currentScreen.board.name}</span>
                    <span className={`${isLight ? 'text-slate-400' : 'text-slate-600'} font-normal`}>({currentScreen.board.width} × {currentScreen.board.height})</span>
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
                  {selectedComponent ? selectedComponent.type : 'Artboard'}
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

          {/* AI Generator Trigger */}
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-violet-600/20 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Gen</span>
          </button>

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

      {/* AI Prompt Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-xl ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0d1322] border-slate-800 text-white'} border rounded-2xl p-6 shadow-2xl space-y-4`}>
            <div className={`flex items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-slate-800'} pb-3`}>
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>AI Layout Spec Generator</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className={`${isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'}`}>✕</button>
            </div>

            <div>
              <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1.5`}>Describe your UI layout requirement:</label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Modern SaaS Analytics dashboard with 4 KPI cards, live AST telemetry chart, navigation sidebar, and schema migration data table..."
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-violet-500'} border rounded-xl p-3 text-xs focus:outline-none font-sans`}
              />
            </div>

            <div>
              <span className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-500'} font-semibold uppercase tracking-wider block mb-2`}>Preset Prompts:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'SaaS Analytics Dashboard with 4 KPI cards and chart',
                  'Enterprise Auth Login Portal with GitHub SSO',
                  'DevOps Sprint Kanban Agile Board with 4 columns'
                ].map((p, idx) => (
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
              <button onClick={() => setShowAiModal(false)} className={`px-4 py-2 text-xs ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                Cancel
              </button>
              <button
                onClick={() => handleAiGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-all"
              >
                {isGenerating ? 'Generating Spec AST...' : 'Generate Layout Spec'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Screen Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#0d1322] border-slate-800 text-white'} border rounded-2xl p-6 shadow-2xl space-y-4`}>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Create New Artboard</h3>
            <div>
              <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1`}>Artboard Name</label>
              <input
                type="text"
                value={newScreenName}
                onChange={(e) => setNewScreenName(e.target.value)}
                placeholder="e.g. Mobile User Profile"
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-800 focus:border-violet-600' : 'bg-slate-950 border-slate-800 text-white focus:border-violet-500'} border rounded-lg px-3 py-2 text-xs focus:outline-none`}
              />
            </div>
            <div>
              <label className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'} block mb-1`}>Starting Template</label>
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
              <button onClick={() => setShowNewModal(false)} className={`px-4 py-2 text-xs ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                Cancel
              </button>
              <button
                onClick={handleCreateNew}
                disabled={!newScreenName.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow cursor-pointer disabled:opacity-50"
              >
                Create Artboard
              </button>
            </div>
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
