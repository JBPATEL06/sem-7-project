import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Sparkles, ZoomIn, ZoomOut, Maximize2, MousePointer, Square, Type, Layers, CheckCircle2 } from 'lucide-react';

export type NodeType = 'PAGE' | 'FRAME' | 'RECTANGLE' | 'ELLIPSE' | 'TEXT' | 'COMPONENT' | 'INSTANCE';

export interface SceneColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface SceneFill {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'IMAGE';
  color?: SceneColor;
  visible?: boolean;
}

export interface SceneStroke {
  type: 'SOLID';
  color?: SceneColor;
  visible?: boolean;
}

export interface SceneNode {
  id: string;
  name: string;
  type: NodeType;
  parentId?: string | null;
  childIds?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  locked?: boolean;
  fills?: SceneFill[];
  strokes?: SceneStroke[];
  strokeWeight?: number;
  cornerRadius?: number;
  clipsContent?: boolean;
  text?: string;
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number | string;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
}

export class SceneGraph {
  nodes: Map<string, SceneNode> = new Map();
  rootId: string = 'page_default';

  constructor() {
    this.nodes.set(this.rootId, {
      id: this.rootId,
      name: 'Page 1',
      type: 'PAGE',
      parentId: null,
      childIds: [],
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      visible: true
    });
  }

  getPages(): SceneNode[] {
    const page = this.nodes.get(this.rootId);
    return page ? [page] : [];
  }

  getNode(id: string): SceneNode | undefined {
    return this.nodes.get(id);
  }

  createNodeWithId(id: string, type: NodeType, parentId: string | null, overrides: Partial<SceneNode> = {}): SceneNode {
    const node: SceneNode = {
      id,
      name: overrides.name || `${type.charAt(0) + type.slice(1).toLowerCase()}`,
      type,
      parentId,
      childIds: [],
      x: overrides.x || 0,
      y: overrides.y || 0,
      width: overrides.width || 100,
      height: overrides.height || 100,
      visible: overrides.visible !== undefined ? overrides.visible : true,
      fills: overrides.fills || [],
      strokes: overrides.strokes || [],
      strokeWeight: overrides.strokeWeight || 1,
      cornerRadius: overrides.cornerRadius || 0,
      text: overrides.text || overrides.characters || '',
      fontSize: overrides.fontSize || 14,
      fontFamily: overrides.fontFamily || 'Inter',
      fontWeight: overrides.fontWeight || 400,
      ...overrides
    };

    this.nodes.set(id, node);

    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        parent.childIds = parent.childIds || [];
        if (!parent.childIds.includes(id)) {
          parent.childIds.push(id);
        }
      }
    }

    return node;
  }

  updateNode(id: string, updates: Partial<SceneNode>) {
    const node = this.nodes.get(id);
    if (node) {
      Object.assign(node, updates);
    }
  }

  deleteNode(id: string) {
    const node = this.nodes.get(id);
    if (!node) return;

    // Remove from parent
    if (node.parentId) {
      const parent = this.nodes.get(node.parentId);
      if (parent && parent.childIds) {
        parent.childIds = parent.childIds.filter(cId => cId !== id);
      }
    }

    // Recursively delete children
    if (node.childIds) {
      for (const childId of node.childIds) {
        this.deleteNode(childId);
      }
    }

    this.nodes.delete(id);
  }
}

/**
 * Creates initial demo SceneGraph with modern Figma-compatible nodes
 */
export function createDemoSceneGraph(): SceneGraph {
  const graph = new SceneGraph();
  const pageId = graph.rootId;

  // 1. Root Artboard / Frame
  const frameId = 'frame_root';
  graph.createNodeWithId(frameId, 'FRAME', pageId, {
    name: 'OpenPencil Native Dashboard',
    x: 80,
    y: 60,
    width: 1200,
    height: 760,
    fills: [{ type: 'SOLID', color: { r: 0.05, g: 0.08, b: 0.14, a: 1 }, visible: true }],
    strokes: [{ type: 'SOLID', color: { r: 0.2, g: 0.25, b: 0.35, a: 0.8 }, visible: true }],
    strokeWeight: 1,
    cornerRadius: 20,
    clipsContent: true
  });

  // 2. Header Bar Frame
  const headerId = 'header_bar';
  graph.createNodeWithId(headerId, 'FRAME', frameId, {
    name: 'Top Navigation Header',
    x: 32,
    y: 32,
    width: 1136,
    height: 72,
    fills: [{ type: 'SOLID', color: { r: 0.08, g: 0.12, b: 0.22, a: 0.9 }, visible: true }],
    strokes: [{ type: 'SOLID', color: { r: 0.25, g: 0.32, b: 0.45, a: 0.5 }, visible: true }],
    strokeWeight: 1,
    cornerRadius: 14
  });

  // Header Title Text
  const titleTextId = 'text_title';
  graph.createNodeWithId(titleTextId, 'TEXT', headerId, {
    name: 'App Title',
    x: 24,
    y: 22,
    width: 380,
    height: 28,
    text: '⚡ OpenPencil Native Scene Engine',
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.95, g: 0.98, b: 1, a: 1 }, visible: true }]
  });

  // 3. Three Metric Cards
  const metrics = [
    { title: 'Total Revenue', value: '$128,450.00', change: '+14.2%', color: { r: 0.55, g: 0.35, b: 0.95, a: 1 } },
    { title: 'Active AI Agents', value: '1,429 Online', change: '+8.7%', color: { r: 0.05, g: 0.72, b: 0.55, a: 1 } },
    { title: 'Design Mutations', value: '48,920 Ops', change: '+22.5%', color: { r: 0.15, g: 0.55, b: 0.95, a: 1 } }
  ];

  metrics.forEach((m, idx) => {
    const cardId = `card_metric_${idx}`;
    const cardWidth = 356;
    const cardX = 32 + idx * (cardWidth + 34);
    const cardY = 128;

    graph.createNodeWithId(cardId, 'FRAME', frameId, {
      name: `Metric Card: ${m.title}`,
      x: cardX,
      y: cardY,
      width: cardWidth,
      height: 160,
      fills: [{ type: 'SOLID', color: { r: 0.08, g: 0.12, b: 0.22, a: 0.7 }, visible: true }],
      strokes: [{ type: 'SOLID', color: { r: 0.2, g: 0.25, b: 0.38, a: 0.6 }, visible: true }],
      strokeWeight: 1,
      cornerRadius: 16
    });

    // Card Title
    const cardTitleId = `card_title_${idx}`;
    graph.createNodeWithId(cardTitleId, 'TEXT', cardId, {
      name: 'Metric Title',
      x: 20,
      y: 20,
      width: 200,
      height: 20,
      text: m.title,
      fontSize: 13,
      fontFamily: 'Inter',
      fontWeight: 500,
      fills: [{ type: 'SOLID', color: { r: 0.6, g: 0.68, b: 0.8, a: 1 }, visible: true }]
    });

    // Card Value
    const cardValueId = `card_value_${idx}`;
    graph.createNodeWithId(cardValueId, 'TEXT', cardId, {
      name: 'Metric Value',
      x: 20,
      y: 54,
      width: 280,
      height: 36,
      text: m.value,
      fontSize: 26,
      fontFamily: 'Inter',
      fontWeight: 700,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true }]
    });

    // Card Badge
    const cardBadgeId = `card_badge_${idx}`;
    graph.createNodeWithId(cardBadgeId, 'RECTANGLE', cardId, {
      name: 'Change Badge',
      x: 20,
      y: 104,
      width: 80,
      height: 26,
      fills: [{ type: 'SOLID', color: m.color, visible: true }],
      cornerRadius: 6
    });
  });

  // 4. Main Content / Chart Area
  const chartFrameId = 'frame_main_chart';
  graph.createNodeWithId(chartFrameId, 'FRAME', frameId, {
    name: 'Performance Analytics Grid',
    x: 32,
    y: 312,
    width: 1136,
    height: 400,
    fills: [{ type: 'SOLID', color: { r: 0.08, g: 0.12, b: 0.22, a: 0.8 }, visible: true }],
    strokes: [{ type: 'SOLID', color: { r: 0.2, g: 0.25, b: 0.38, a: 0.6 }, visible: true }],
    strokeWeight: 1,
    cornerRadius: 16
  });

  // Chart Title
  const chartTitleId = 'chart_title';
  graph.createNodeWithId(chartTitleId, 'TEXT', chartFrameId, {
    name: 'Chart Header',
    x: 24,
    y: 24,
    width: 450,
    height: 24,
    text: '📈 Real-time Multi-Agent Synthesis Telemetry',
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: 600,
    fills: [{ type: 'SOLID', color: { r: 0.9, g: 0.95, b: 1, a: 1 }, visible: true }]
  });

  return graph;
}

export function parseHexColor(hex?: string): SceneColor {
  if (!hex) return { r: 0.1, g: 0.1, b: 0.1, a: 1 };
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const num = parseInt(h.slice(0, 6), 16) || 0;
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  let a = 1;
  if (h.length >= 8) {
    a = (parseInt(h.slice(6, 8), 16) || 255) / 255;
  }
  return { r, g, b, a };
}

export function createSceneGraphFromComponents(
  components: any[],
  boardWidth = 1440,
  boardHeight = 900,
  title = 'AI Generated Screen',
  isDark = true
): SceneGraph {
  const graph = new SceneGraph();
  const pageId = graph.rootId;

  // Root Artboard
  const rootFrameId = 'frame_root';
  graph.createNodeWithId(rootFrameId, 'FRAME', pageId, {
    name: title,
    x: 60,
    y: 40,
    width: boardWidth,
    height: boardHeight,
    fills: [{ type: 'SOLID', color: isDark ? { r: 0.04, g: 0.06, b: 0.1, a: 1 } : { r: 0.98, g: 0.98, b: 1, a: 1 }, visible: true }],
    strokes: [{ type: 'SOLID', color: isDark ? { r: 0.15, g: 0.2, b: 0.3, a: 0.8 } : { r: 0.8, g: 0.85, b: 0.9, a: 0.8 }, visible: true }],
    strokeWeight: 1,
    cornerRadius: 20,
    clipsContent: true
  });

  // Recursive component mapper
  const mapComp = (c: any, parentId: string) => {
    let nodeType: NodeType = 'FRAME';
    if (c.type === 'text') nodeType = 'TEXT';
    else if (c.type === 'rect' || c.type === 'button' || c.type === 'badge' || c.type === 'input') nodeType = 'RECTANGLE';
    else if (c.type === 'circle' || c.type === 'avatar') nodeType = 'ELLIPSE';
    else nodeType = 'FRAME';

    const fills: SceneFill[] = [];
    if (c.fills && c.fills.length > 0) {
      c.fills.forEach((f: any) => {
        if (f.fillColor) fills.push({ type: 'SOLID', color: parseHexColor(f.fillColor), visible: true });
      });
    } else if (c.color && nodeType === 'TEXT') {
      fills.push({ type: 'SOLID', color: parseHexColor(c.color), visible: true });
    } else if (nodeType === 'TEXT') {
      fills.push({ type: 'SOLID', color: isDark ? { r: 0.95, g: 0.98, b: 1, a: 1 } : { r: 0.05, g: 0.08, b: 0.15, a: 1 }, visible: true });
    } else if (nodeType === 'FRAME' || nodeType === 'RECTANGLE') {
      fills.push({ type: 'SOLID', color: isDark ? { r: 0.08, g: 0.12, b: 0.22, a: 0.95 } : { r: 1, g: 1, b: 1, a: 0.98 }, visible: true });
    }

    const strokes: SceneStroke[] = [];
    if (c.strokes && c.strokes.length > 0) {
      c.strokes.forEach((s: any) => {
        if (s.strokeColor) strokes.push({ type: 'SOLID', color: parseHexColor(s.strokeColor), visible: true });
      });
    } else if (nodeType === 'FRAME' || nodeType === 'RECTANGLE') {
      strokes.push({ type: 'SOLID', color: isDark ? { r: 0.2, g: 0.26, b: 0.38, a: 0.6 } : { r: 0.85, g: 0.88, b: 0.92, a: 0.8 }, visible: true });
    }

    const nodeId = c.id || `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    graph.createNodeWithId(nodeId, nodeType, parentId, {
      name: c.name || c.text || c.type,
      x: c.x || 0,
      y: c.y || 0,
      width: c.width || 120,
      height: c.height || 40,
      fills,
      strokes,
      strokeWeight: c.strokes?.[0]?.strokeWidth || 1,
      cornerRadius: c.borderRadius || 0,
      text: c.text || '',
      fontSize: c.fontSize || 14,
      fontFamily: 'Inter',
      fontWeight: c.fontWeight === 'bold' || c.fontWeight === '700' ? 700 : c.fontWeight === '600' ? 600 : 400
    });

    // Map children if present
    if (c.children && Array.isArray(c.children)) {
      c.children.forEach((child: any) => mapComp(child, nodeId));
    }
  };

  components.forEach(comp => mapComp(comp, rootFrameId));

  return graph;
}

export interface OpenPencilCanvasProps {
  graph?: SceneGraph;
  components?: any[];
  boardWidth?: number;
  boardHeight?: number;
  title?: string;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<SceneNode>) => void;
  className?: string;
  theme?: 'dark' | 'light';
}

export function OpenPencilCanvas({
  graph: initialGraph,
  components,
  boardWidth = 1440,
  boardHeight = 900,
  title = 'OpenPencil Native Dashboard',
  selectedIds = [],
  onSelectionChange,
  onNodeUpdate,
  className = '',
  theme = 'dark'
}: OpenPencilCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [graph, setGraph] = useState<SceneGraph>(() => {
    if (initialGraph) return initialGraph;
    if (components && components.length > 0) {
      return createSceneGraphFromComponents(components, boardWidth, boardHeight, title, theme === 'dark');
    }
    return createDemoSceneGraph();
  });

  useEffect(() => {
    if (initialGraph) {
      setGraph(initialGraph);
    } else if (components && components.length > 0) {
      setGraph(createSceneGraphFromComponents(components, boardWidth, boardHeight, title, theme === 'dark'));
    }
  }, [initialGraph, components, boardWidth, boardHeight, title, theme]);
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(selectedIds);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    setInternalSelectedIds(selectedIds);
  }, [selectedIds]);

  const selectNode = useCallback((id: string | null, multi = false) => {
    let next: string[] = [];
    if (id) {
      if (multi) {
        next = internalSelectedIds.includes(id)
          ? internalSelectedIds.filter(i => i !== id)
          : [...internalSelectedIds, id];
      } else {
        next = [id];
      }
    }
    setInternalSelectedIds(next);
    onSelectionChange?.(next);
  }, [internalSelectedIds, onSelectionChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = containerRef.current?.clientWidth || 1200;
    const height = containerRef.current?.clientHeight || 800;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Canvas Background
    ctx.fillStyle = theme === 'dark' ? '#080b12' : '#f1f5f9';
    ctx.fillRect(0, 0, width, height);

    // Grid dots
    ctx.fillStyle = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const gridSize = 24 * zoom;
    const offsetX = (pan.x * zoom) % gridSize;
    const offsetY = (pan.y * zoom) % gridSize;
    for (let x = offsetX; x < width; x += gridSize) {
      for (let y = offsetY; y < height; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const renderNode = (node: SceneNode, parentAbsX = 0, parentAbsY = 0) => {
      if (node.visible === false) return;

      const absX = parentAbsX + (node.x || 0);
      const absY = parentAbsY + (node.y || 0);
      const w = node.width || 100;
      const h = node.height || 100;
      const radius = node.cornerRadius || 0;

      ctx.save();

      // Fills
      if (node.fills && node.fills.length > 0) {
        for (const fill of node.fills) {
          if (fill.visible !== false && fill.color) {
            const { r, g, b, a = 1 } = fill.color;
            ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;

            if (radius > 0) {
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
          if (stroke.visible !== false && stroke.color) {
            const { r, g, b, a = 1 } = stroke.color;
            ctx.strokeStyle = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
            ctx.lineWidth = node.strokeWeight || 1;

            if (radius > 0) {
              ctx.beginPath();
              ctx.roundRect(absX, absY, w, h, radius);
              ctx.stroke();
            } else {
              ctx.strokeRect(absX, absY, w, h);
            }
          }
        }
      }

      // Text Rendering for all node types (TEXT, Button, Badge, Card, Input)
      const textContent = node.text || node.characters;
      if (textContent && textContent.trim()) {
        const fontSize = node.fontSize || 14;
        const fontWeight = node.fontWeight || 400;
        const fontFamily = node.fontFamily || 'Inter, -apple-system, sans-serif';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

        let textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
        if (node.fills && node.fills.length > 0 && node.type === 'TEXT') {
          const { r, g, b, a = 1 } = node.fills[0].color;
          textColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
        } else if (node.color) {
          const { r, g, b, a = 1 } = parseHexColor(node.color);
          textColor = `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`;
        }

        ctx.fillStyle = textColor;

        if (node.type === 'TEXT') {
          ctx.textBaseline = 'top';
          ctx.textAlign = 'left';
          // Support multi-line text if \n present
          const lines = textContent.split('\n');
          lines.forEach((line, lineIdx) => {
            ctx.fillText(line, absX, absY + lineIdx * (fontSize * 1.35));
          });
        } else {
          // Label inside button, badge, or container
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(textContent, absX + w / 2, absY + h / 2);
          ctx.textAlign = 'left'; // reset
        }
      }

      // Hover Highlight
      if (hoveredNodeId === node.id && !internalSelectedIds.includes(node.id)) {
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.5;
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(absX, absY, w, h, radius);
          ctx.stroke();
        } else {
          ctx.strokeRect(absX, absY, w, h);
        }
      }

      // Selection Bounding Box & 8-point Handles
      if (internalSelectedIds.includes(node.id)) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        if (radius > 0) {
          ctx.beginPath();
          ctx.roundRect(absX - 1, absY - 1, w + 2, h + 2, radius);
          ctx.stroke();
        } else {
          ctx.strokeRect(absX - 1, absY - 1, w + 2, h + 2);
        }

        const handleSize = 7;
        const half = handleSize / 2;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;

        const handles = [
          [absX - half, absY - half],
          [absX + w / 2 - half, absY - half],
          [absX + w - half, absY - half],
          [absX + w - half, absY + h / 2 - half],
          [absX + w - half, absY + h - half],
          [absX + w / 2 - half, absY + h - half],
          [absX - half, absY + h - half],
          [absX - half, absY + h / 2 - half]
        ];

        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx, hy, handleSize, handleSize);
          ctx.strokeRect(hx, hy, handleSize, handleSize);
        });
      }

      // Render Children
      if (node.childIds && node.childIds.length > 0) {
        for (const childId of node.childIds) {
          const childNode = graph.getNode(childId);
          if (childNode) {
            renderNode(childNode, absX, absY);
          }
        }
      }

      ctx.restore();
    };

    const pages = graph.getPages();
    for (const page of pages) {
      if (page.childIds) {
        for (const childId of page.childIds) {
          const rootNode = graph.getNode(childId);
          if (rootNode) {
            renderNode(rootNode, 0, 0);
          }
        }
      }
    }

    ctx.restore();
  }, [graph, zoom, pan, internalSelectedIds, hoveredNodeId, theme]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = (e.clientX - rect.left - pan.x) / zoom;
    const mouseY = (e.clientY - rect.top - pan.y) / zoom;

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

      if (mouseX >= absX && mouseX <= absX + w && mouseY >= absY && mouseY <= absY + h) {
        hitNodeId = node.id;
      }
    };

    const pages = graph.getPages();
    for (const page of pages) {
      if (page.childIds) {
        for (let i = page.childIds.length - 1; i >= 0; i--) {
          const root = graph.getNode(page.childIds[i]);
          if (root) hitTest(root, 0, 0);
          if (hitNodeId) break;
        }
      }
    }

    selectNode(hitNodeId, e.shiftKey);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.2), 3));
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-default"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="absolute bottom-4 right-4 flex items-center space-x-1.5 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-2xl text-slate-200 text-xs">
        <button
          onClick={() => setZoom(prev => Math.max(prev * 0.85, 0.2))}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="font-mono text-[11px] px-1.5 font-semibold text-violet-400">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(prev * 1.15, 3))}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => { setZoom(0.85); setPan({ x: 40, y: 30 }); }}
          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white ml-1"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {internalSelectedIds.length > 0 && (
        <div className="absolute top-4 left-4 bg-slate-900/90 border border-violet-500/40 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2 text-xs text-white animate-in fade-in duration-150">
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          <span className="font-semibold">{internalSelectedIds.length} Selected</span>
          <span className="text-slate-400 font-mono text-[11px]">({internalSelectedIds[0]})</span>
        </div>
      )}
    </div>
  );
}
