import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MousePointer,
  Square,
  Circle,
  Type as TypeIcon,
  Layers,
  Layout,
  Hand
} from 'lucide-react';
import {
  SceneGraph,
  SceneNode,
  NodeType,
  Fill,
  Stroke
} from '@open-pencil/scene-graph';
import {
  getNodeAbsoluteBounds
} from './studio/sceneGraphUtils';

export type CanvasTool = 'select' | 'frame' | 'rect' | 'ellipse' | 'text' | 'hand';

export interface OpenPencilCanvasProps {
  graph: SceneGraph;
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<SceneNode>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeDuplicate?: (nodeId: string) => void;
  onNodeAdd?: (node: SceneNode) => void;
  onTriggerAiEdit?: (nodeId?: string) => void;
  className?: string;
  theme?: 'dark' | 'light';
  pageBackground?: string;
  activePageId?: string;
  showGrid?: boolean;
}

type DragMode = 'idle' | 'moving' | 'resizing' | 'drawing' | 'panning' | 'marquee';
type HandleIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // NW, N, NE, E, SE, S, SW, W

export function OpenPencilCanvas({
  graph,
  selectedIds = [],
  onSelectionChange,
  onNodeUpdate,
  onNodeDelete,
  onNodeDuplicate,
  onNodeAdd,
  onTriggerAiEdit,
  className = '',
  theme = 'dark',
  pageBackground = '#F5F5F5',
  activePageId,
  showGrid = true
}: OpenPencilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topRulerRef = useRef<HTMLCanvasElement>(null);
  const leftRulerRef = useRef<HTMLCanvasElement>(null);

  // Active Tool state
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');

  // Viewport State
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 50 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<string>('default');
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1200, height: 800 });

  // ResizeObserver to ensure canvas always has accurate non-zero width & height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth || 1200;
      const h = el.clientHeight || 800;
      setDimensions({ width: w, height: h });
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Render trigger
  const [renderCount, setRenderCount] = useState<number>(0);
  const triggerRepaint = useCallback(() => {
    setRenderCount(c => c + 1);
  }, []);

  // Drag & Resize State Machine
  const [dragMode, setDragMode] = useState<DragMode>('idle');
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartNodes, setDragStartNodes] = useState<Map<string, { x: number; y: number; width: number; height: number }>>(new Map());
  const [activeHandle, setActiveHandle] = useState<HandleIndex | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [drawRect, setDrawRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const getHandles = (x: number, y: number, w: number, h: number) => {
    const handleSize = 7;
    const half = handleSize / 2;
    return [
      { x: x - half, y: y - half, cursor: 'nwse-resize' },           // 0: NW
      { x: x + w / 2 - half, y: y - half, cursor: 'ns-resize' },     // 1: N
      { x: x + w - half, y: y - half, cursor: 'nesw-resize' },       // 2: NE
      { x: x + w - half, y: y + h / 2 - half, cursor: 'ew-resize' }, // 3: E
      { x: x + w - half, y: y + h - half, cursor: 'nwse-resize' },   // 4: SE
      { x: x + w / 2 - half, y: y + h - half, cursor: 'ns-resize' }, // 5: S
      { x: x - half, y: y + h - half, cursor: 'nesw-resize' },       // 6: SW
      { x: x - half, y: y + h / 2 - half, cursor: 'ew-resize' }      // 7: W
    ];
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Stitch 'E' AI Trigger
      if (e.key === 'e' || e.key === 'E') {
        if (!e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          onTriggerAiEdit?.(selectedIds[0]);
          return;
        }
      }

      // Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach(id => {
            graph.deleteNode(id);
            onNodeDelete?.(id);
          });
          onSelectionChange([]);
          triggerRepaint();
          return;
        }
      }

      // Duplicate (Ctrl+D)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          const id = selectedIds[0];
          const node = graph.getNode(id);
          if (node && node.parentId) {
            const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const clone = graph.createNodeWithId(newId, node.type, node.parentId, {
              ...node,
              id: newId,
              name: `${node.name} (Copy)`,
              x: (node.x || 0) + 20,
              y: (node.y || 0) + 20
            });
            onNodeDuplicate?.(id);
            onNodeAdd?.(clone);
            onSelectionChange([newId]);
            triggerRepaint();
          }
        }
        return;
      }

      // Tool selection shortcuts
      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'f' || e.key === 'F') setActiveTool('frame');
      if (e.key === 'r' || e.key === 'R') setActiveTool('rect');
      if (e.key === 'o' || e.key === 'O') setActiveTool('ellipse');
      if (e.key === 't' || e.key === 'T') setActiveTool('text');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'Escape') {
        setActiveTool('select');
        onSelectionChange([]);
      }

      // Arrow key nudges (1px or 10px with Shift)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowUp') dy = -step;
          if (e.key === 'ArrowDown') dy = step;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;

          selectedIds.forEach(id => {
            const node = graph.getNode(id);
            if (node) {
              const newX = (node.x || 0) + dx;
              const newY = (node.y || 0) + dy;
              graph.updateNode(id, { x: newX, y: newY });
              onNodeUpdate?.(id, { x: newX, y: newY });
            }
          });
          triggerRepaint();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [graph, selectedIds, onNodeDelete, onNodeDuplicate, onNodeAdd, onNodeUpdate, onTriggerAiEdit, onSelectionChange, triggerRepaint]);

  // Main Canvas Render Loop (Native OpenPencil Vector Look & Feel)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = dimensions.width;
    const height = dimensions.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Canvas Background: Exact OpenPencil Canvas Color (#F5F5F5)
    ctx.fillStyle = pageBackground || '#F5F5F5';
    ctx.fillRect(0, 0, width, height);

    // Subtle OpenPencil Dot Grid
    if (showGrid) {
      ctx.fillStyle = pageBackground === '#1e1e1e' || pageBackground === '#121212' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
      const gridSize = 20 * zoom;
      const offsetX = (pan.x * zoom) % gridSize;
      const offsetY = (pan.y * zoom) % gridSize;
      for (let x = offsetX; x < width; x += gridSize) {
        for (let y = offsetY; y < height; y += gridSize) {
          ctx.fillRect(x, y, 1.5, 1.5);
        }
      }
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Frame Header Tag Render Helper (Signature OpenPencil Tag above artboards)
    const renderFrameTag = (node: SceneNode, absX: number, absY: number, w: number, h: number) => {
      const isSelected = selectedIds.includes(node.id);
      const isHovered = hoveredNodeId === node.id;
      const tagText = node.name || 'Frame';

      ctx.save();
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      const textWidth = ctx.measureText(tagText).width;
      const tagHeight = 20;
      const tagY = absY - tagHeight - 6;

      // Tag Background (Exact OpenPencil dark pill)
      ctx.fillStyle = isSelected
        ? '#3b82f6'
        : isHovered
          ? '#444444'
          : '#363636';
      ctx.beginPath();
      ctx.roundRect(absX, tagY, textWidth + 18, tagHeight, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#ffffff';
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.fillText(tagText, absX + 9, tagY + 14);

      ctx.restore();
    };

    // Node Render Helper
    const renderNode = (node: SceneNode, parentAbsX = 0, parentAbsY = 0, isRoot = false) => {
      if (node.visible === false) return;

      const absX = parentAbsX + (node.x || 0);
      const absY = parentAbsY + (node.y || 0);
      const w = node.width || 100;
      const h = node.height || 100;
      const radius = node.cornerRadius || 0;

      ctx.save();

      // Render Frame Tag and Drop Shadow if Root Artboard
      if (isRoot && (node.type === 'FRAME' || (node as any).type === 'CANVAS')) {
        renderFrameTag(node, absX, absY, w, h);

        // Artboard Drop Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 12;
        ctx.fillStyle = node.fills && node.fills[0] && (node.fills[0] as any).color
          ? `rgba(${Math.round((node.fills[0] as any).color.r * 255)}, ${Math.round((node.fills[0] as any).color.g * 255)}, ${Math.round((node.fills[0] as any).color.b * 255)}, 1)`
          : '#141418';
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(absX, absY, w, h, radius);
          ctx.fill();
        } else {
          ctx.fillRect(absX, absY, w, h);
        }
        ctx.restore();
      }

      // Fills (Rendered for shapes & frames; for TEXT nodes, fills are applied to text glyphs below)
      if (node.type !== 'TEXT' && node.fills && node.fills.length > 0) {
        for (const fill of node.fills) {
          if (fill.visible !== false && (fill as any).color) {
            const { r, g, b, a = 1 } = (fill as any).color;
            ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

            if (node.type === 'ELLIPSE') {
              ctx.beginPath();
              ctx.ellipse(absX + w / 2, absY + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
              ctx.fill();
            } else if (radius > 0) {
              ctx.beginPath();
              ctx.roundRect(absX, absY, w, h, radius);
              ctx.fill();
            } else {
              ctx.fillRect(absX, absY, w, h);
            }
          }
        }
      }

      // Strokes
      if (node.strokes && node.strokes.length > 0) {
        for (const stroke of node.strokes) {
          if (stroke.visible !== false && (stroke as any).color) {
            const { r, g, b, a = 1 } = (stroke as any).color;
            ctx.strokeStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
            ctx.lineWidth = (stroke as any).weight || (stroke as any).strokeWidth || 1;

            if (node.type === 'ELLIPSE') {
              ctx.beginPath();
              ctx.ellipse(absX + w / 2, absY + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
              ctx.stroke();
            } else if (radius > 0) {
              ctx.beginPath();
              ctx.roundRect(absX, absY, w, h, radius);
              ctx.stroke();
            } else {
              ctx.strokeRect(absX, absY, w, h);
            }
          }
        }
      }

      // Text Node
      const textContent = node.text || (node as any).characters;
      if (node.type === 'TEXT' && textContent) {
        const fontSize = node.fontSize || 14;
        const fontWeight = node.fontWeight || 400;
        const fontFamily = node.fontFamily || 'Inter, system-ui, sans-serif';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'top';

        if (node.fills && (node.fills[0] as any)?.color) {
          const { r, g, b, a = 1 } = (node.fills[0] as any).color;
          ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
        } else {
          ctx.fillStyle = '#ffffff';
        }

        ctx.fillText(textContent, absX, absY);
      }

      // Hover Highlight (OpenPencil Accent #3b82f6)
      if (hoveredNodeId === node.id && !selectedIds.includes(node.id)) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        if (node.type === 'ELLIPSE') {
          ctx.beginPath();
          ctx.ellipse(absX + w / 2, absY + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(absX, absY, w, h, radius);
          ctx.stroke();
        } else {
          ctx.strokeRect(absX, absY, w, h);
        }
      }

      // Selection Bounding Box & 8-point Handles (OpenPencil Figma Blue #3b82f6)
      if (selectedIds.includes(node.id)) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        if (node.type === 'ELLIPSE') {
          ctx.beginPath();
          ctx.ellipse(absX + w / 2, absY + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.strokeRect(absX - 1, absY - 1, w + 2, h + 2);
        } else if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(absX - 1, absY - 1, w + 2, h + 2, radius);
          ctx.stroke();
        } else {
          ctx.strokeRect(absX - 1, absY - 1, w + 2, h + 2);
        }

        // 8 Perimeter Handles
        const handleSize = 6.5;
        const handles = getHandles(absX, absY, w, h);

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;

        handles.forEach(hItem => {
          ctx.fillRect(hItem.x, hItem.y, handleSize, handleSize);
          ctx.strokeRect(hItem.x, hItem.y, handleSize, handleSize);
        });

        // Dimensions HUD Pill (OpenPencil #3b82f6 badge)
        ctx.fillStyle = 'rgba(59, 130, 246, 0.95)';
        ctx.beginPath();
        ctx.roundRect(absX + w / 2 - 32, absY + h + 6, 64, 16, 3);
        ctx.fill();

        ctx.font = '600 9px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(w)} × ${Math.round(h)}`, absX + w / 2, absY + h + 14);
        ctx.textAlign = 'left';
      }

      // Render Children with Clipping
      if (node.childIds && node.childIds.length > 0) {
        if (node.clipsContent || node.type === 'FRAME') {
          ctx.save();
          ctx.beginPath();
          if (radius > 0) {
            ctx.roundRect(absX, absY, w, h, radius);
          } else {
            ctx.rect(absX, absY, w, h);
          }
          ctx.clip();
          for (const childId of node.childIds) {
            const childNode = graph.getNode(childId);
            if (childNode) {
              renderNode(childNode, absX, absY, false);
            }
          }
          ctx.restore();
        } else {
          for (const childId of node.childIds) {
            const childNode = graph.getNode(childId);
            if (childNode) {
              renderNode(childNode, absX, absY, false);
            }
          }
        }
      }

      ctx.restore();
    };

    // Draw Pages / Root Items
    const pages = graph.getPages ? graph.getPages() : [];
    const activePages = activePageId
      ? (pages.filter(p => p.id === activePageId).length > 0 ? pages.filter(p => p.id === activePageId) : pages)
      : (pages.length > 0 ? [pages[0]] : []);

    for (const page of activePages) {
      if (page.childIds) {
        for (const childId of page.childIds) {
          const rootNode = graph.getNode(childId);
          if (rootNode) {
            renderNode(rootNode, 0, 0, true);
          }
        }
      }
    }

    // Draw Interactive Drawing Box
    if (dragMode === 'drawing' && drawRect) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.fillStyle = activeTool === 'frame' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(151, 71, 255, 0.15)';
      if (activeTool === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(drawRect.x + drawRect.width / 2, drawRect.y + drawRect.height / 2, Math.abs(drawRect.width / 2), Math.abs(drawRect.height / 2), 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillRect(drawRect.x, drawRect.y, drawRect.width, drawRect.height);
        ctx.strokeRect(drawRect.x, drawRect.y, drawRect.width, drawRect.height);
      }
      ctx.setLineDash([]);
    }

    // Draw Marquee Selection Box
    if (dragMode === 'marquee' && marqueeRect) {
      const mx = Math.min(marqueeRect.x1, marqueeRect.x2);
      const my = Math.min(marqueeRect.y1, marqueeRect.y2);
      const mw = Math.abs(marqueeRect.x2 - marqueeRect.x1);
      const mh = Math.abs(marqueeRect.y2 - marqueeRect.y1);

      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeRect(mx, my, mw, mh);
    }

    ctx.restore();

    // Render Top & Left Rulers
    renderRulers(width, height);
  }, [graph, renderCount, zoom, pan, selectedIds, hoveredNodeId, theme, dragMode, drawRect, marqueeRect, activeTool, mousePos, dimensions]);

  // Pixel Rulers Render Function
  const renderRulers = (width: number, height: number) => {
    const topCanvas = topRulerRef.current;
    const leftCanvas = leftRulerRef.current;
    if (!topCanvas || !leftCanvas) return;

    const topCtx = topCanvas.getContext('2d');
    const leftCtx = leftCanvas.getContext('2d');
    if (!topCtx || !leftCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const rulerBg = '#242424';
    const tickColor = '#555555';
    const textColor = '#8c8c8c';
    const activeLine = '#3b82f6';

    // Top Ruler
    topCanvas.width = width * dpr;
    topCanvas.height = 20 * dpr;
    topCanvas.style.width = `${width}px`;
    topCanvas.style.height = '20px';
    topCtx.scale(dpr, dpr);
    topCtx.fillStyle = rulerBg;
    topCtx.fillRect(0, 0, width, 20);

    // Left Ruler
    leftCanvas.width = 20 * dpr;
    leftCanvas.height = height * dpr;
    leftCanvas.style.width = '20px';
    leftCanvas.style.height = `${height}px`;
    leftCtx.scale(dpr, dpr);
    leftCtx.fillStyle = rulerBg;
    leftCtx.fillRect(0, 0, 20, height);

    const step = zoom > 1.5 ? 50 : zoom > 0.5 ? 100 : 200;

    // Draw Top Ruler Ticks & Numbers
    topCtx.strokeStyle = tickColor;
    topCtx.fillStyle = textColor;
    topCtx.font = '8px monospace';
    topCtx.textBaseline = 'top';

    const startX = -Math.floor(pan.x / (step * zoom)) * step - step * 2;
    const endX = startX + Math.ceil(width / (step * zoom)) * step + step * 4;

    for (let pos = startX; pos <= endX; pos += step / 2) {
      const screenX = pan.x + pos * zoom;
      if (screenX >= 20 && screenX <= width) {
        const isMajor = pos % step === 0;
        topCtx.beginPath();
        topCtx.moveTo(screenX, isMajor ? 6 : 12);
        topCtx.lineTo(screenX, 20);
        topCtx.stroke();
        if (isMajor) {
          topCtx.fillText(String(pos), screenX + 2, 2);
        }
      }
    }

    // Top Ruler Cursor Indicator
    if (mousePos.x >= 20) {
      topCtx.strokeStyle = activeLine;
      topCtx.lineWidth = 1.5;
      topCtx.beginPath();
      topCtx.moveTo(mousePos.x, 0);
      topCtx.lineTo(mousePos.x, 20);
      topCtx.stroke();
    }

    // Draw Left Ruler Ticks & Numbers
    leftCtx.strokeStyle = tickColor;
    leftCtx.fillStyle = textColor;
    leftCtx.font = '8px monospace';
    leftCtx.textBaseline = 'top';

    const startY = -Math.floor(pan.y / (step * zoom)) * step - step * 2;
    const endY = startY + Math.ceil(height / (step * zoom)) * step + step * 4;

    for (let pos = startY; pos <= endY; pos += step / 2) {
      const screenY = pan.y + pos * zoom;
      if (screenY >= 20 && screenY <= height) {
        const isMajor = pos % step === 0;
        leftCtx.beginPath();
        leftCtx.moveTo(isMajor ? 6 : 12, screenY);
        leftCtx.lineTo(20, screenY);
        leftCtx.stroke();
        if (isMajor) {
          leftCtx.save();
          leftCtx.translate(2, screenY + 2);
          leftCtx.rotate(-Math.PI / 2);
          leftCtx.fillText(String(pos), -14, 0);
          leftCtx.restore();
        }
      }
    }

    // Left Ruler Cursor Indicator
    if (mousePos.y >= 20) {
      leftCtx.strokeStyle = activeLine;
      leftCtx.lineWidth = 1.5;
      leftCtx.beginPath();
      leftCtx.moveTo(0, mousePos.y);
      leftCtx.lineTo(20, mousePos.y);
      leftCtx.stroke();
    }
  };

  // Mouse Down Event Handler
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    // Pan with Middle Mouse or Hand Tool or Alt Key or Space
    if (e.button === 1 || activeTool === 'hand' || e.altKey) {
      setDragMode('panning');
      setDragStartMouse({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setCursorStyle('grabbing');
      return;
    }

    // Drawing Mode (Frame / Rect / Ellipse / Text creation)
    if (activeTool === 'frame' || activeTool === 'rect' || activeTool === 'ellipse' || activeTool === 'text') {
      setDragMode('drawing');
      setDragStartMouse({ x: canvasX, y: canvasY });
      setDrawRect({ x: canvasX, y: canvasY, width: 0, height: 0 });
      return;
    }

    // 1. Check Handle Hits on Currently Selected Node
    if (selectedIds.length === 1) {
      const bounds = getNodeAbsoluteBounds(graph, selectedIds[0]);
      if (bounds) {
        const handles = getHandles(bounds.x, bounds.y, bounds.width, bounds.height);
        const handleSize = 10;
        for (let i = 0; i < handles.length; i++) {
          const hItem = handles[i];
          if (
            canvasX >= hItem.x - 2 &&
            canvasX <= hItem.x + handleSize + 2 &&
            canvasY >= hItem.y - 2 &&
            canvasY <= hItem.y + handleSize + 2
          ) {
            setDragMode('resizing');
            setActiveHandle(i as HandleIndex);
            setDragStartMouse({ x: canvasX, y: canvasY });
            const snapshot = new Map<string, { x: number; y: number; width: number; height: number }>();
            const selectedNode = graph.getNode(selectedIds[0]);
            if (selectedNode) {
              snapshot.set(selectedIds[0], { x: selectedNode.x || 0, y: selectedNode.y || 0, width: selectedNode.width || 100, height: selectedNode.height || 100 });
            }
            setDragStartNodes(snapshot);
            return;
          }
        }
      }
    }

    // 2. Hit Test Frame Tags (Above artboards)
    let hitTagId: string | null = null;
    const pages = graph.getPages ? graph.getPages() : [];
    for (const page of pages) {
      if (page.childIds) {
        for (const childId of page.childIds) {
          const rootNode = graph.getNode(childId);
          if (rootNode && (rootNode.type === 'FRAME' || (rootNode as any).type === 'CANVAS')) {
            const rx = rootNode.x || 0;
            const ry = rootNode.y || 0;
            if (canvasX >= rx && canvasX <= rx + 200 && canvasY >= ry - 24 && canvasY <= ry) {
              hitTagId = rootNode.id;
              break;
            }
          }
        }
      }
    }

    if (hitTagId) {
      onSelectionChange([hitTagId]);
      setDragMode('moving');
      setDragStartMouse({ x: canvasX, y: canvasY });
      const snapshot = new Map<string, { x: number; y: number; width: number; height: number }>();
      const node = graph.getNode(hitTagId);
      if (node) {
        snapshot.set(hitTagId, { x: node.x || 0, y: node.y || 0, width: node.width || 100, height: node.height || 100 });
      }
      setDragStartNodes(snapshot);
      return;
    }

    // 3. Hit Test Node for Selection & Dragging (Deepest child first)
    let hitNodeId: string | null = null;
    const hitTest = (node: SceneNode, parentAbsX = 0, parentAbsY = 0) => {
      const absX = parentAbsX + (node.x || 0);
      const absY = parentAbsY + (node.y || 0);
      const w = node.width || 100;
      const h = node.height || 100;

      if (node.childIds) {
        for (let i = node.childIds.length - 1; i >= 0; i--) {
          const child = graph.getNode(node.childIds[i]);
          if (child) hitTest(child, absX, absY);
          if (hitNodeId) return;
        }
      }

      if (canvasX >= absX && canvasX <= absX + w && canvasY >= absY && canvasY <= absY + h) {
        hitNodeId = node.id;
      }
    };

    for (const page of pages) {
      if (page.childIds) {
        for (let i = page.childIds.length - 1; i >= 0; i--) {
          const root = graph.getNode(page.childIds[i]);
          if (root) hitTest(root, 0, 0);
          if (hitNodeId) break;
        }
      }
    }

    if (hitNodeId) {
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
      let nextSelected = isMulti ? (selectedIds.includes(hitNodeId) ? selectedIds.filter(id => id !== hitNodeId) : [...selectedIds, hitNodeId]) : [hitNodeId];
      onSelectionChange(nextSelected);

      // Start Moving Mode
      setDragMode('moving');
      setDragStartMouse({ x: canvasX, y: canvasY });
      const snapshot = new Map<string, { x: number; y: number; width: number; height: number }>();
      nextSelected.forEach(id => {
        const n = graph.getNode(id);
        if (n) {
          snapshot.set(id, { x: n.x || 0, y: n.y || 0, width: n.width || 100, height: n.height || 100 });
        }
      });
      setDragStartNodes(snapshot);
      setCursorStyle('move');
    } else {
      // Empty Canvas clicked: Marquee Selection
      onSelectionChange([]);
      setDragMode('marquee');
      setMarqueeRect({ x1: canvasX, y1: canvasY, x2: canvasX, y2: canvasY });
    }
  };

  // Mouse Move Event Handler (Ultra-Smooth 60FPS In-Memory Translation)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    setMousePos({ x: clientX, y: clientY });

    const canvasX = (clientX - pan.x) / zoom;
    const canvasY = (clientY - pan.y) / zoom;

    // 1. Panning
    if (dragMode === 'panning') {
      setPan({ x: e.clientX - dragStartMouse.x, y: e.clientY - dragStartMouse.y });
      return;
    }

    // 2. Moving Nodes (Instant 60fps in-memory)
    if (dragMode === 'moving' && dragStartNodes.size > 0) {
      const rawDx = canvasX - dragStartMouse.x;
      const rawDy = canvasY - dragStartMouse.y;
      const snapDx = Math.round(rawDx / 4) * 4;
      const snapDy = Math.round(rawDy / 4) * 4;

      dragStartNodes.forEach((startPos, id) => {
        const newX = startPos.x + snapDx;
        const newY = startPos.y + snapDy;
        graph.updateNode(id, { x: newX, y: newY });
      });
      triggerRepaint();
      return;
    }

    // 3. Resizing Handles
    if (dragMode === 'resizing' && activeHandle !== null && dragStartNodes.size > 0) {
      const id = Array.from(dragStartNodes.keys())[0];
      const orig = dragStartNodes.get(id)!;
      const rawDx = canvasX - dragStartMouse.x;
      const rawDy = canvasY - dragStartMouse.y;
      const dx = Math.round(rawDx / 4) * 4;
      const dy = Math.round(rawDy / 4) * 4;

      let newX = orig.x;
      let newY = orig.y;
      let newW = orig.width;
      let newH = orig.height;

      switch (activeHandle) {
        case 0: // NW
          newX = Math.min(orig.x + dx, orig.x + orig.width - 20);
          newY = Math.min(orig.y + dy, orig.y + orig.height - 20);
          newW = orig.width - (newX - orig.x);
          newH = orig.height - (newY - orig.y);
          break;
        case 1: // N
          newY = Math.min(orig.y + dy, orig.y + orig.height - 20);
          newH = orig.height - (newY - orig.y);
          break;
        case 2: // NE
          newY = Math.min(orig.y + dy, orig.y + orig.height - 20);
          newW = Math.max(20, orig.width + dx);
          newH = orig.height - (newY - orig.y);
          break;
        case 3: // E
          newW = Math.max(20, orig.width + dx);
          break;
        case 4: // SE
          newW = Math.max(20, orig.width + dx);
          newH = Math.max(20, orig.height + dy);
          break;
        case 5: // S
          newH = Math.max(20, orig.height + dy);
          break;
        case 6: // SW
          newX = Math.min(orig.x + dx, orig.x + orig.width - 20);
          newW = orig.width - (newX - orig.x);
          newH = Math.max(20, orig.height + dy);
          break;
        case 7: // W
          newX = Math.min(orig.x + dx, orig.x + orig.width - 20);
          newW = orig.width - (newX - orig.x);
          break;
      }

      graph.updateNode(id, { x: newX, y: newY, width: newW, height: newH });
      triggerRepaint();
      return;
    }

    // 4. Drawing Shape
    if (dragMode === 'drawing') {
      const x = Math.min(dragStartMouse.x, canvasX);
      const y = Math.min(dragStartMouse.y, canvasY);
      const w = Math.abs(canvasX - dragStartMouse.x);
      const h = Math.abs(canvasY - dragStartMouse.y);
      setDrawRect({ x: Math.round(x / 4) * 4, y: Math.round(y / 4) * 4, width: Math.round(w / 4) * 4, height: Math.round(h / 4) * 4 });
      return;
    }

    // 5. Marquee Selection
    if (dragMode === 'marquee') {
      setMarqueeRect(prev => prev ? { ...prev, x2: canvasX, y2: canvasY } : null);
      return;
    }

    // Hover Cursor Detection on Handles & Corner Rotation
    if (selectedIds.length === 1) {
      const bounds = getNodeAbsoluteBounds(graph, selectedIds[0]);
      if (bounds) {
        const handles = getHandles(bounds.x, bounds.y, bounds.width, bounds.height);
        const handleSize = 8;
        let matchedCursor: string | null = null;
        for (let i = 0; i < handles.length; i++) {
          const hItem = handles[i];
          if (
            canvasX >= hItem.x - 2 &&
            canvasX <= hItem.x + handleSize + 2 &&
            canvasY >= hItem.y - 2 &&
            canvasY <= hItem.y + handleSize + 2
          ) {
            matchedCursor = hItem.cursor;
            break;
          }
        }
        if (matchedCursor) {
          setCursorStyle(matchedCursor);
          return;
        }
      }
    }

    if (activeTool === 'hand') {
      setCursorStyle('grab');
    } else if (['frame', 'rect', 'ellipse', 'text'].includes(activeTool)) {
      setCursorStyle('crosshair');
    } else {
      setCursorStyle('default');
    }
  };

  // Mouse Up Event Handler
  const handleMouseUp = () => {
    // Notify final position on drag end
    if (dragMode === 'moving' && dragStartNodes.size > 0) {
      dragStartNodes.forEach((_, id) => {
        const node = graph.getNode(id);
        if (node) {
          onNodeUpdate?.(id, { x: node.x, y: node.y });
        }
      });
    }

    // Notify final dimensions on resize end
    if (dragMode === 'resizing' && activeHandle !== null && dragStartNodes.size > 0) {
      const id = Array.from(dragStartNodes.keys())[0];
      const node = graph.getNode(id);
      if (node) {
        onNodeUpdate?.(id, { x: node.x, y: node.y, width: node.width, height: node.height });
      }
    }

    // Finalize Drawing (Supports both drag-drawing and single-click creation)
    if (dragMode === 'drawing' && drawRect) {
      const page = graph.getPages()[0];
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      let newNodeType: NodeType = 'RECTANGLE';
      let fills: Fill[] = [{ type: 'SOLID', color: { r: 0.14, g: 0.14, b: 0.18, a: 1 }, opacity: 1, visible: true }];
      let strokes: Stroke[] = [{ color: { r: 0.28, g: 0.32, b: 0.42, a: 0.8 }, weight: 1, opacity: 0.8, visible: true, align: 'INSIDE' }];
      let w = drawRect.width;
      let h = drawRect.height;
      let textVal = '';

      if (activeTool === 'frame') {
        newNodeType = 'FRAME';
        fills = [{ type: 'SOLID', color: { r: 0.12, g: 0.12, b: 0.15, a: 0.95 }, opacity: 0.95, visible: true }];
        w = Math.max(280, w);
        h = Math.max(180, h);
      } else if (activeTool === 'ellipse') {
        newNodeType = 'ELLIPSE';
        fills = [{ type: 'SOLID', color: { r: 0.23, g: 0.51, b: 0.96, a: 1 }, opacity: 1, visible: true }];
        w = Math.max(80, w);
        h = Math.max(80, h);
      } else if (activeTool === 'text') {
        newNodeType = 'TEXT';
        fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }];
        strokes = [];
        w = Math.max(180, w);
        h = Math.max(32, h);
        textVal = 'Type text here';
      } else {
        w = Math.max(100, w);
        h = Math.max(60, h);
      }

      const newNode = graph.createNodeWithId(newId, newNodeType, page.id, {
        name: activeTool === 'frame' ? 'New Frame' : activeTool === 'text' ? 'New Text' : activeTool === 'ellipse' ? 'New Ellipse' : 'New Rectangle',
        x: drawRect.x,
        y: drawRect.y,
        width: w,
        height: h,
        fills,
        strokes,
        cornerRadius: activeTool === 'frame' ? 10 : activeTool === 'rect' ? 6 : 0,
        text: textVal,
        fontSize: 16,
        fontWeight: 400
      });

      onNodeAdd?.(newNode);
      onSelectionChange([newId]);
      setActiveTool('select');
      triggerRepaint();
    }

    // Finalize Marquee Multi-Selection
    if (dragMode === 'marquee' && marqueeRect) {
      const minX = Math.min(marqueeRect.x1, marqueeRect.x2);
      const maxX = Math.max(marqueeRect.x1, marqueeRect.x2);
      const minY = Math.min(marqueeRect.y1, marqueeRect.y2);
      const maxY = Math.max(marqueeRect.y1, marqueeRect.y2);

      if (Math.abs(maxX - minX) > 4 || Math.abs(maxY - minY) > 4) {
        const matchingIds: string[] = [];
        const pages = graph.getPages ? graph.getPages() : [];
        pages.forEach(p => {
          if (p.childIds) {
            p.childIds.forEach(cid => {
              const bounds = getNodeAbsoluteBounds(graph, cid);
              if (bounds) {
                const overlaps =
                  bounds.x < maxX &&
                  bounds.x + bounds.width > minX &&
                  bounds.y < maxY &&
                  bounds.y + bounds.height > minY;
                if (overlaps) matchingIds.push(cid);
              }
            });
          }
        });
        if (matchingIds.length > 0) {
          onSelectionChange(matchingIds);
        }
      }
    }

    setDragMode('idle');
    setActiveHandle(null);
    setDrawRect(null);
    setMarqueeRect(null);
    setCursorStyle(activeTool === 'hand' ? 'grab' : activeTool !== 'select' ? 'crosshair' : 'default');
  };

  // Wheel Zoom / Pan
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.2), 3));
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleCanvasDoubleClick = () => {
    if (selectedIds.length === 1) {
      const node = graph.getNode(selectedIds[0]);
      if (node && (node.type === 'TEXT' || node.text !== undefined)) {
        const currentText = node.text || '';
        const newText = window.prompt('Edit Text:', currentText);
        if (newText !== null) {
          graph.updateNode(node.id, { text: newText });
          onNodeUpdate?.(node.id, { text: newText });
          triggerRepaint();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-w-0 min-h-0 overflow-hidden select-none bg-[#1e1e1e] ${className}`}
      onWheel={handleWheel}
      style={{ cursor: cursorStyle }}
    >
      {/* Top Ruler (20px) */}
      <canvas
        ref={topRulerRef}
        className="absolute top-0 left-0 right-0 z-20 pointer-events-none border-b border-[#333333]"
      />

      {/* Left Ruler (20px) */}
      <canvas
        ref={leftRulerRef}
        className="absolute top-0 left-0 bottom-0 z-20 pointer-events-none border-r border-[#333333]"
      />

      {/* Top Left Ruler Corner Box */}
      <div className="absolute top-0 left-0 w-5 h-5 bg-[#242424] border-r border-b border-[#333333] z-30 flex items-center justify-center pointer-events-none">
        <span className="text-[7px] text-[#666666] font-mono">px</span>
      </div>

      {/* Main Interactive Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleCanvasDoubleClick}
      />

      {/* Floating OpenPencil UI 3 Bottom Toolbar Dock */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-1 bg-[#2a2a2a]/95 border border-[#3a3a3a] backdrop-blur-xl px-2 py-1.5 rounded-2xl shadow-2xl z-40 text-slate-200 text-xs">
        {/* Select Tool (V) */}
        <button
          onClick={() => setActiveTool('select')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Select Tool (V)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* Frame Tool (F) */}
        <button
          onClick={() => setActiveTool('frame')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'frame'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Frame Tool (F)"
        >
          <Layout className="w-4 h-4" />
        </button>

        {/* Rectangle Tool (R) */}
        <button
          onClick={() => setActiveTool('rect')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'rect'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Rectangle Tool (R)"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Ellipse Tool (O) */}
        <button
          onClick={() => setActiveTool('ellipse')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'ellipse'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Ellipse Tool (O)"
        >
          <Circle className="w-4 h-4" />
        </button>

        {/* Text Tool (T) */}
        <button
          onClick={() => setActiveTool('text')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'text'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Text Tool (T)"
        >
          <TypeIcon className="w-4 h-4" />
        </button>

        {/* Hand Tool (H) */}
        <button
          onClick={() => setActiveTool('hand')}
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            activeTool === 'hand'
              ? 'bg-[#3b82f6] text-white shadow-md shadow-blue-500/30'
              : 'hover:bg-[#383838] text-slate-400 hover:text-white'
          }`}
          title="Hand / Pan Tool (H)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-[#3a3a3a] mx-1" />

        {/* Stitch AI Pill (E) */}
        <button
          onClick={() => onTriggerAiEdit?.(selectedIds[0])}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            selectedIds.length > 0
              ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-500 text-white shadow-lg shadow-violet-600/30 animate-pulse'
              : 'bg-[#383838] hover:bg-[#404040] text-slate-300 hover:text-white'
          }`}
          title="Edit Selection with AI (E)"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-300" />
          <span>Edit AI</span>
          <kbd className="px-1 py-0.2 rounded bg-black/40 text-[10px] font-mono text-violet-200">E</kbd>
        </button>

        <div className="w-[1px] h-5 bg-[#3a3a3a] mx-1" />

        {/* Zoom Controls */}
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.85, 0.2))}
          className="p-1.5 hover:bg-[#383838] rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] px-1 font-semibold text-slate-200 min-w-[36px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.15, 3))}
          className="p-1.5 hover:bg-[#383838] rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setZoom(0.85); setPan({ x: 80, y: 60 }); }}
          className="p-1.5 hover:bg-[#383838] rounded-lg transition-colors text-slate-400 hover:text-white"
          title="Zoom to 100% / Reset"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left Selection Info Pill (Non-intrusive) */}
      {selectedIds.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-[#242424]/90 border border-[#3b82f6]/40 backdrop-blur-md px-3 py-1 rounded-lg shadow-lg flex items-center space-x-2 text-[11px] text-white animate-in fade-in duration-150 z-20 pointer-events-none">
          <Layers className="w-3 h-3 text-[#3b82f6]" />
          <span className="font-medium">{selectedIds.length} Selected</span>
          <span className="text-slate-400 font-mono text-[10px]">({selectedIds[0]})</span>
        </div>
      )}
    </div>
  );
}
