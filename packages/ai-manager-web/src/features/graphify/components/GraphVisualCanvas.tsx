import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GraphNode, GraphEdge, GraphNodeType } from '@ai-manager/core';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Sparkles,
  GitBranch,
  Database,
  FileCode,
  AlertTriangle,
  FileText
} from 'lucide-react';

interface GraphVisualCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
  filterType: string;
}

const TYPE_CONFIG: Record<GraphNodeType, { color: string; bg: string; border: string; icon: any }> = {
  route: { color: '#c084fc', bg: '#581c87', border: '#a855f7', icon: GitBranch },
  function: { color: '#38bdf8', bg: '#0369a1', border: '#0284c7', icon: FileCode },
  table: { color: '#34d399', bg: '#065f46', border: '#059669', icon: Database },
  file: { color: '#fbbf24', bg: '#78350f', border: '#d97706', icon: FileCode },
  issue: { color: '#f87171', bg: '#7f1d1d', border: '#dc2626', icon: AlertTriangle },
  prd_spec: { color: '#818cf8', bg: '#312e81', border: '#4f46e5', icon: FileText },
  doc_section: { color: '#a5b4fc', bg: '#3730a3', border: '#4338ca', icon: FileText },
  plan_item: { color: '#6ee7b7', bg: '#064e3b', border: '#047857', icon: Layers },
  progress_item: { color: '#5eead4', bg: '#134e4a', border: '#0f766e', icon: Sparkles },
  audit_finding: { color: '#fca5a5', bg: '#881337', border: '#be123c', icon: AlertTriangle },
  test_suite: { color: '#93c5fd', bg: '#1e3a8a', border: '#2563eb', icon: FileCode },
  ai_trace: { color: '#f472b6', bg: '#831843', border: '#db2777', icon: Sparkles }
};

export const GraphVisualCanvas: React.FC<GraphVisualCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  filterType
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Compute 2D node layout coordinates deterministically
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    const typeBuckets: Record<string, GraphNode[]> = {};

    for (const node of nodes) {
      if (!typeBuckets[node.type]) typeBuckets[node.type] = [];
      typeBuckets[node.type].push(node);
    }

    const typeOrder: GraphNodeType[] = [
      'prd_spec',
      'plan_item',
      'route',
      'file',
      'function',
      'table',
      'issue',
      'ai_trace'
    ];

    let colIndex = 0;
    for (const type of typeOrder) {
      const bucket = typeBuckets[type] || [];
      if (bucket.length === 0) continue;

      const colX = 100 + colIndex * 240;
      bucket.forEach((node, idx) => {
        const rowY = 80 + idx * 85;
        positions.set(node.id, { x: colX, y: rowY });
      });
      colIndex++;
    }

    return positions;
  }, [nodes]);

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="canvas-bg relative w-full h-[580px] bg-card/60 border border-border/80 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}
    >
      {/* Viewport Action Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-card/90 backdrop-blur-md border border-border p-1 rounded-lg shadow-md">
        <button
          onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.4, z - 0.2))}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </button>
        <span className="text-[11px] font-mono px-1.5 text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={resetView}
          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground cursor-pointer"
          title="Reset View"
        >
          <RotateCcw className="size-3.5" />
        </button>
      </div>

      {/* Canvas Elements Layer */}
      <div
        className="w-full h-full transform-gpu transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="absolute inset-0 w-[3000px] h-[3000px] pointer-events-none overflow-visible">
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" opacity="0.6" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const src = nodePositions.get(edge.sourceId);
            const tgt = nodePositions.get(edge.targetId);
            if (!src || !tgt) return null;

            const isHighlighted = edge.sourceId === selectedNodeId || edge.targetId === selectedNodeId;
            const strokeColor = isHighlighted ? '#38bdf8' : '#475569';
            const strokeWidth = isHighlighted ? 2.5 : 1.2;

            // Smooth cubic bezier curves
            const dx = tgt.x - src.x;
            const controlX1 = src.x + dx * 0.5;
            const controlX2 = src.x + dx * 0.5;

            return (
              <path
                key={edge.id}
                d={`M ${src.x + 80} ${src.y + 20} C ${controlX1} ${src.y + 20}, ${controlX2} ${tgt.y + 20}, ${tgt.x} ${tgt.y + 20}`}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={edge.type === 'HAS_ISSUE' ? '4 4' : undefined}
                opacity={isHighlighted ? 0.95 : 0.4}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>

        {/* Node Cards Layer */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isSelected = node.id === selectedNodeId;
          const conf = TYPE_CONFIG[node.type] || TYPE_CONFIG.function;
          const Icon = conf.icon;

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(node.id);
              }}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`
              }}
              className={`absolute w-48 p-2.5 rounded-lg border transition-all duration-150 cursor-pointer shadow-sm hover:scale-105 hover:z-30 ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/40 bg-card z-20 shadow-lg'
                  : 'bg-card/90 border-border/80 hover:border-foreground/40'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="p-1 rounded text-xs flex items-center justify-center shrink-0"
                  style={{ backgroundColor: conf.bg, color: conf.color }}
                >
                  <Icon className="size-3" />
                </span>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground truncate">
                  {node.type.replace('_', ' ')}
                </span>
              </div>
              <div className="text-xs font-semibold text-foreground truncate" title={node.label}>
                {node.label}
              </div>
              {node.file && (
                <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                  {node.file.split('/').pop()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
