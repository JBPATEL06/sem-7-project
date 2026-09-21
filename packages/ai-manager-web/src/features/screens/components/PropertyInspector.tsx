import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type as TypeIcon,
  Palette,
  Square,
  Sliders,
  Move,
  CornerUpRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ArrowUpToLine,
  ArrowDownToLine,
  Plus,
  Minus,
  Settings2,
  SlidersHorizontal,
  Code2,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Link,
  Maximize2
} from 'lucide-react';
import { SceneNode } from '@open-pencil/scene-graph';

interface PropertyInspectorProps {
  selectedNode: SceneNode | null;
  onUpdateNode: (nodeId: string, updates: Partial<SceneNode>) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDuplicateNode?: (nodeId: string) => void;
  onBringToFront?: (nodeId: string) => void;
  onSendToBack?: (nodeId: string) => void;
  onTriggerAiEdit?: (nodeId?: string) => void;
  pageBackground?: string;
  onPageBackgroundChange?: (color: string) => void;
  isLight?: boolean;
}

export function PropertyInspector({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onBringToFront,
  onSendToBack,
  onTriggerAiEdit,
  pageBackground = '#F5F5F5',
  onPageBackgroundChange,
  isLight = false
}: PropertyInspectorProps) {
  const [activeTab, setActiveTab] = useState<'design' | 'code' | 'ai'>('design');

  // Extract primary fill color
  const primaryFill = selectedNode?.fills && selectedNode.fills.length > 0 ? selectedNode.fills[0] : null;
  const fillColorObj = (primaryFill as any)?.color || { r: 0.14, g: 0.14, b: 0.17, a: 1 };
  const hexColor = rgbToHex(fillColorObj.r, fillColorObj.g, fillColorObj.b);
  const opacityPercent = Math.round(((fillColorObj.a !== undefined ? fillColorObj.a : 1) * 100));

  // Extract stroke color & width
  const primaryStroke = selectedNode?.strokes && selectedNode.strokes.length > 0 ? selectedNode.strokes[0] : null;
  const strokeColorObj = (primaryStroke as any)?.color || { r: 0.24, g: 0.26, b: 0.32, a: 1 };
  const hexStrokeColor = rgbToHex(strokeColorObj.r, strokeColorObj.g, strokeColorObj.b);
  const strokeWidth = (selectedNode as any)?.strokeWeight || (primaryStroke as any)?.weight || (primaryStroke as any)?.strokeWidth || 1;

  // Local state for smooth editing
  const [localX, setLocalX] = useState('');
  const [localY, setLocalY] = useState('');
  const [localW, setLocalW] = useState('');
  const [localH, setLocalH] = useState('');
  const [localRadius, setLocalRadius] = useState('');
  const [localAngle, setLocalAngle] = useState('0');
  const [localSmoothing, setLocalSmoothing] = useState('0');
  const [blendMode, setBlendMode] = useState('PASS_THROUGH');
  const [fillBlendMode, setFillBlendMode] = useState('Normal');
  const [selectedEffectType, setSelectedEffectType] = useState('Layer blur');
  const [localText, setLocalText] = useState('');
  const [localFontSize, setLocalFontSize] = useState('');

  // Code Tab state
  const [codeLang, setCodeLang] = useState<'react' | 'html' | 'css' | 'svg' | 'flutter' | 'swiftui'>('react');
  const [copiedCode, setCopiedCode] = useState(false);
  const [aiPromptLocal, setAiPromptLocal] = useState('');

  useEffect(() => {
    if (selectedNode) {
      setLocalX(String(Math.round(selectedNode.x || 0)));
      setLocalY(String(Math.round(selectedNode.y || 0)));
      setLocalW(String(Math.round(selectedNode.width || 100)));
      setLocalH(String(Math.round(selectedNode.height || 100)));
      setLocalRadius(String(selectedNode.cornerRadius || 0));
      setLocalAngle(String(Math.round(selectedNode.rotation || 0)));
      setLocalText(selectedNode.text || (selectedNode as any).characters || '');
      setLocalFontSize(String(selectedNode.fontSize || 14));
    }
  }, [
    selectedNode?.id,
    selectedNode?.x,
    selectedNode?.y,
    selectedNode?.width,
    selectedNode?.height,
    selectedNode?.cornerRadius,
    selectedNode?.rotation,
    selectedNode?.text,
    (selectedNode as any)?.characters,
    selectedNode?.fontSize
  ]);

  const commitDim = (field: 'x' | 'y' | 'width' | 'height' | 'cornerRadius' | 'rotation' | 'fontSize', val: string) => {
    if (!selectedNode) return;
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onUpdateNode(selectedNode.id, { [field]: num });
    }
  };

  const handleFillChange = (newHex: string) => {
    if (!selectedNode) return;
    const { r, g, b } = hexToRgb(newHex);
    const updatedFills = [{
      type: 'SOLID' as const,
      color: { r, g, b, a: fillColorObj.a !== undefined ? fillColorObj.a : 1 },
      visible: true
    }];
    onUpdateNode(selectedNode.id, { fills: updatedFills as any });
  };

  const handleOpacityChange = (pct: number) => {
    if (!selectedNode) return;
    const alpha = Math.min(1, Math.max(0, pct / 100));
    const updatedFills = [{
      type: 'SOLID' as const,
      color: { ...fillColorObj, a: alpha },
      visible: true
    }];
    onUpdateNode(selectedNode.id, { fills: updatedFills as any });
  };

  const handleStrokeChange = (newHex: string) => {
    if (!selectedNode) return;
    const { r, g, b } = hexToRgb(newHex);
    const updatedStrokes = [{
      type: 'SOLID' as const,
      color: { r, g, b, a: 1 },
      visible: true,
      weight: strokeWidth,
      strokeWidth: strokeWidth,
      opacity: 1,
      align: 'INSIDE' as const
    }];
    onUpdateNode(selectedNode.id, { strokes: updatedStrokes as any });
  };

  const handleStrokeWidthChange = (w: number) => {
    if (!selectedNode) return;
    const updatedStrokes = [{
      type: 'SOLID' as const,
      color: strokeColorObj,
      visible: true,
      weight: w,
      strokeWidth: w,
      opacity: 1,
      align: 'INSIDE' as const
    }];
    onUpdateNode(selectedNode.id, { strokes: updatedStrokes as any });
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const generateCode = (): string => {
    const name = selectedNode?.name || 'OpenPencilElement';
    const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
    const w = selectedNode?.width || 240;
    const h = selectedNode?.height || 160;
    const x = selectedNode?.x || 0;
    const y = selectedNode?.y || 0;
    const radius = selectedNode?.cornerRadius || 8;
    const textContent = selectedNode?.text || (selectedNode as any)?.characters || name;
    const fontSize = selectedNode?.fontSize || 14;

    switch (codeLang) {
      case 'react':
        return `import React from 'react';

export const ${cleanName || 'Element'}: React.FC = () => {
  return (
    <div 
      className="relative flex flex-col justify-between p-4 shadow-xl transition-all"
      style={{
        width: '${w}px',
        height: '${h}px',
        backgroundColor: '${hexColor}',
        borderRadius: '${radius}px',
        border: '${strokeWidth > 0 ? `${strokeWidth}px solid ${hexStrokeColor}` : 'none'}'
      }}
    >
      <span style={{ fontSize: '${fontSize}px', color: '#ffffff', fontWeight: 600 }}>
        ${textContent}
      </span>
    </div>
  );
};
export default ${cleanName || 'Element'};`;

      case 'html':
        return `<!-- ${name} Component -->
<div class="openpencil-element" style="
  position: relative;
  width: ${w}px;
  height: ${h}px;
  background-color: ${hexColor};
  border-radius: ${radius}px;
  ${strokeWidth > 0 ? `border: ${strokeWidth}px solid ${hexStrokeColor};` : ''}
  padding: 16px;
  box-sizing: border-box;
">
  <p style="margin: 0; font-family: Inter, sans-serif; font-size: ${fontSize}px; color: #ffffff; font-weight: 600;">
    ${textContent}
  </p>
</div>`;

      case 'css':
        return `.${(name || 'element').toLowerCase().replace(/\s+/g, '-')} {
  position: absolute;
  left: ${x}px;
  top: ${y}px;
  width: ${w}px;
  height: ${h}px;
  background-color: ${hexColor};
  border-radius: ${radius}px;
  ${strokeWidth > 0 ? `border: ${strokeWidth}px solid ${hexStrokeColor};` : ''}
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: ${fontSize}px;
  color: #ffffff;
  padding: 16px;
  box-sizing: border-box;
}`;

      case 'svg':
        return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect 
    x="0.5" 
    y="0.5" 
    width="${w - 1}" 
    height="${h - 1}" 
    rx="${radius}" 
    fill="${hexColor}" 
    ${strokeWidth > 0 ? `stroke="${hexStrokeColor}" stroke-width="${strokeWidth}"` : ''} 
  />
  <text 
    x="16" 
    y="${Math.round(h / 2) + 4}" 
    fill="#FFFFFF" 
    font-family="Inter, system-ui, sans-serif" 
    font-size="${fontSize}" 
    font-weight="600"
  >
    ${textContent}
  </text>
</svg>`;

      case 'flutter':
        return `import 'package:flutter/material.dart';

class ${cleanName || 'Element'} extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: ${w}.0,
      height: ${h}.0,
      decoration: BoxDecoration(
        color: Color(0xFF${hexColor.replace('#', '')}),
        borderRadius: BorderRadius.circular(${radius}.0),
      ),
      padding: EdgeInsets.all(16.0),
      child: Text(
        '${textContent}',
        style: TextStyle(color: Colors.white, fontSize: ${fontSize}.0, fontWeight: FontWeight.w600),
      ),
    );
  }
}`;

      case 'swiftui':
        return `import SwiftUI

struct ${cleanName || 'Element'}: View {
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: ${radius})
                .fill(Color(hex: "${hexColor}"))
                .frame(width: ${w}, height: ${h})
            Text("${textContent}")
                .font(.system(size: ${fontSize}, weight: .semibold))
                .foregroundColor(.white)
        }
    }
}`;
    }
  };

  // Top Tabs: Design | <> Code | ✨ AI | 100%
  const renderTopTabs = () => (
    <div className="h-10 border-b border-[#2d2d2d] flex items-center justify-between px-3 bg-[#1e1e1e]">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setActiveTab('design')}
          className={`h-10 relative flex items-center text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'design'
              ? 'text-white border-b-2 border-[#0d99ff]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setActiveTab('code')}
          className={`h-10 relative flex items-center text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'code'
              ? 'text-white border-b-2 border-[#0d99ff]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          &lt;&gt; Code
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`h-10 relative flex items-center space-x-1 text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'ai'
              ? 'text-white border-b-2 border-[#0d99ff]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3 h-3 text-[#0d99ff]" />
          <span>AI</span>
        </button>
      </div>

      <span className="text-[11px] font-mono text-slate-400">100%</span>
    </div>
  );

  // RENDER CODE TAB
  if (activeTab === 'code') {
    const codeContent = generateCode();
    return (
      <div className="w-[280px] h-full border-l border-[#2d2d2d] bg-[#1e1e1e] flex flex-col select-none text-xs text-slate-200">
        {renderTopTabs()}

        <div className="p-2 border-b border-[#2d2d2d] flex items-center justify-between bg-[#1e1e1e]">
          <select
            value={codeLang}
            onChange={(e: any) => setCodeLang(e.target.value)}
            className="bg-[#2a2a2a] border border-[#383838] text-white rounded px-2 py-1 text-xs outline-none cursor-pointer"
          >
            <option value="react">React (TSX)</option>
            <option value="html">HTML + Tailwind</option>
            <option value="css">Pure CSS</option>
            <option value="svg">Vector SVG</option>
            <option value="flutter">Flutter (Dart)</option>
            <option value="swiftui">SwiftUI</option>
          </select>

          <button
            onClick={() => handleCopyCode(codeContent)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#383838] text-white text-[11px] font-medium transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3 text-[#0d99ff]" />
            <span>{copiedCode ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 bg-[#141414] font-mono text-[11px] text-slate-300 leading-relaxed scrollbar-thin select-text">
          <pre className="whitespace-pre font-mono selection:bg-blue-600 selection:text-white">
            {codeContent}
          </pre>
        </div>
      </div>
    );
  }

  // RENDER AI TAB
  if (activeTab === 'ai') {
    return (
      <div className="w-[280px] h-full border-l border-[#2d2d2d] bg-[#1e1e1e] flex flex-col select-none text-xs text-slate-200 overflow-y-auto">
        {renderTopTabs()}

        <div className="p-3 border-b border-[#2d2d2d] flex items-center space-x-2 bg-[#1e1e1e]">
          <div className="p-1 rounded-lg bg-gradient-to-r from-violet-600 to-[#0d99ff] text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-[11px] text-white">Stitch AI Studio</h4>
            <p className="text-[10px] text-slate-400">Targeted UI Generation</p>
          </div>
        </div>

        <div className="p-3 space-y-3">
          <textarea
            value={aiPromptLocal}
            onChange={e => setAiPromptLocal(e.target.value)}
            placeholder="e.g. Modern dark glassmorphic card with gradient glow and badges..."
            rows={4}
            className="w-full bg-[#2a2a2a] border border-[#383838] focus:border-[#0d99ff] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 outline-none resize-none font-sans"
          />

          <button
            onClick={() => onTriggerAiEdit?.(selectedNode?.id)}
            className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-[#0d99ff] hover:opacity-90 text-white font-semibold text-xs shadow-lg shadow-blue-500/20 cursor-pointer transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate with AI ('E')</span>
          </button>
        </div>
      </div>
    );
  }

  // IF NO SELECTION: Exact OpenPencil Default Empty State
  if (!selectedNode) {
    return (
      <div className="w-[280px] h-full border-l border-[#2d2d2d] bg-[#1e1e1e] flex flex-col select-none text-xs text-slate-200">
        {renderTopTabs()}

        {/* Page Section */}
        <div className="p-3 border-b border-[#2d2d2d] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Page</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="color"
              value={pageBackground}
              onChange={e => onPageBackgroundChange?.(e.target.value)}
              className="w-5 h-5 rounded border border-[#444444] cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={pageBackground.replace('#', '').toUpperCase()}
              onChange={e => onPageBackgroundChange?.(`#${e.target.value}`)}
              className="flex-1 bg-[#2c2c2c] border border-[#383838] rounded px-2 py-1 font-mono text-[11px] text-white outline-none focus:border-[#0d99ff]"
            />
            <span className="text-[11px] text-slate-400 font-mono">100%</span>
          </div>
        </div>

        {/* Variables Section */}
        <div className="p-3 border-b border-[#2d2d2d] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Variables</span>
            <button className="text-slate-400 hover:text-white p-0.5" title="Manage variables">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>25 / 3</span>
            <span className="text-slate-500 text-[10px]">Local</span>
          </div>
        </div>

        {/* Export Section */}
        <div className="p-3 border-b border-[#2d2d2d] space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Export</span>
            <button className="text-slate-400 hover:text-white p-0.5" title="Add export preset">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EXACT OPENPENCIL DESIGN INSPECTOR (Pixel-Matched to Screenshot 2)
  return (
    <div className="w-[280px] h-full border-l border-[#2d2d2d] bg-[#1e1e1e] flex flex-col text-xs select-none overflow-y-auto text-slate-200">
      {renderTopTabs()}

      {/* 1. POSITION SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <h4 className="text-[11px] font-semibold text-white">Position</h4>

        {/* 6 Alignment Icons Row */}
        <div className="flex items-center justify-between bg-[#1e1e1e] pt-0.5">
          <button
            onClick={() => commitDim('x', '0')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commitDim('x', '100')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Horizontal Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commitDim('x', '200')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-[#383838]" />
          <button
            onClick={() => commitDim('y', '0')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Top"
          >
            <ArrowUpToLine className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commitDim('y', '100')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Vertical Center"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => commitDim('y', '200')}
            className="p-1 rounded hover:bg-[#2e2e2e] text-slate-400 hover:text-white cursor-pointer"
            title="Align Bottom"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* X and Y Inputs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 focus-within:border-[#0d99ff]">
            <span className="text-[11px] text-slate-400 font-mono mr-2">X</span>
            <input
              type="number"
              value={localX}
              onChange={e => setLocalX(e.target.value)}
              onBlur={e => commitDim('x', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitDim('x', localX)}
              className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
            />
          </div>
          <div className="flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 focus-within:border-[#0d99ff]">
            <span className="text-[11px] text-slate-400 font-mono mr-2">Y</span>
            <input
              type="number"
              value={localY}
              onChange={e => setLocalY(e.target.value)}
              onBlur={e => commitDim('y', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitDim('y', localY)}
              className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
            />
          </div>
        </div>

        {/* Angle & Flip Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 w-[116px] focus-within:border-[#0d99ff]">
            <RotateCw className="w-3 h-3 text-slate-400 mr-2 shrink-0" />
            <input
              type="number"
              value={localAngle}
              onChange={e => setLocalAngle(e.target.value)}
              onBlur={e => commitDim('rotation', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && commitDim('rotation', localAngle)}
              className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
            />
            <span className="text-[10px] text-slate-400 ml-1">°</span>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                const currentW = selectedNode.width || 100;
                onUpdateNode(selectedNode.id, { width: currentW });
              }}
              className="p-1.5 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#383838] text-slate-400 hover:text-white cursor-pointer"
              title="Flip horizontal"
            >
              <FlipHorizontal className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                const currentH = selectedNode.height || 100;
                onUpdateNode(selectedNode.id, { height: currentH });
              }}
              className="p-1.5 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#383838] text-slate-400 hover:text-white cursor-pointer"
              title="Flip vertical"
            >
              <FlipVertical className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. LAYOUT SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <h4 className="text-[11px] font-semibold text-white">Layout</h4>
        <span className="text-[10px] text-slate-400 block font-medium">Dimensions</span>

        <div className="grid grid-cols-2 gap-2">
          {/* Width */}
          <div className="flex items-center justify-between bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 focus-within:border-[#0d99ff]">
            <div className="flex items-center min-w-0 flex-1">
              <span className="text-[11px] text-slate-400 font-mono mr-2">W</span>
              <input
                type="number"
                value={localW}
                onChange={e => setLocalW(e.target.value)}
                onBlur={e => commitDim('width', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitDim('width', localW)}
                className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
              />
            </div>
            <div className="text-[10px] text-slate-500 font-mono">❖ ▾</div>
          </div>

          {/* Height */}
          <div className="flex items-center justify-between bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 focus-within:border-[#0d99ff]">
            <div className="flex items-center min-w-0 flex-1">
              <span className="text-[11px] text-slate-400 font-mono mr-2">H</span>
              <input
                type="number"
                value={localH}
                onChange={e => setLocalH(e.target.value)}
                onBlur={e => commitDim('height', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitDim('height', localH)}
                className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
              />
            </div>
            <div className="text-[10px] text-slate-500 font-mono">❖ ▾</div>
          </div>
        </div>
      </div>

      {/* 3. APPEARANCE SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-white">Appearance</h4>
          <button className="text-slate-400 hover:text-white p-0.5">
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Blend mode & Opacity */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Blend mode</span>
            <select
              value={blendMode}
              onChange={e => setBlendMode(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-[#383838] rounded-md px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
            >
              <option value="PASS_THROUGH">Pass through</option>
              <option value="NORMAL">Normal</option>
              <option value="MULTIPLY">Multiply</option>
              <option value="SCREEN">Screen</option>
              <option value="OVERLAY">Overlay</option>
            </select>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 block mb-1">Opacity</span>
            <div className="flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2 py-1.5">
              <Link className="w-3 h-3 text-slate-500 mr-1.5 shrink-0" />
              <input
                type="number"
                min="0"
                max="100"
                value={opacityPercent}
                onChange={e => handleOpacityChange(Number(e.target.value))}
                className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
              />
              <span className="text-[10px] text-slate-400 mr-1">%</span>
              <span className="text-[10px] text-slate-500 font-mono">❖</span>
            </div>
          </div>
        </div>

        {/* Radius */}
        <div className="pt-1">
          <span className="text-[10px] text-slate-400 block mb-1">Radius</span>
          <div className="flex items-center space-x-2">
            <div className="flex-1 flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5">
              <Square className="w-3 h-3 text-slate-500 mr-1.5 shrink-0" />
              <input
                type="number"
                min="0"
                max="100"
                value={localRadius}
                onChange={e => setLocalRadius(e.target.value)}
                onBlur={e => commitDim('cornerRadius', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && commitDim('cornerRadius', localRadius)}
                className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
              />
              <span className="text-[10px] text-slate-500 font-mono">❖</span>
            </div>
            <button className="p-2 rounded bg-[#2a2a2a] border border-[#383838] text-slate-400 hover:text-white" title="Independent corners">
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Corner smoothing */}
        <div className="pt-1">
          <span className="text-[10px] text-slate-400 block mb-1">Corner smoothing</span>
          <div className="flex items-center bg-[#2a2a2a] border border-[#383838] rounded-md px-2.5 py-1.5 w-[116px]">
            <Square className="w-3 h-3 text-slate-500 mr-1.5 shrink-0" />
            <input
              type="number"
              min="0"
              max="100"
              value={localSmoothing}
              onChange={e => setLocalSmoothing(e.target.value)}
              className="w-full bg-transparent text-left outline-none font-mono text-xs text-white"
            />
            <span className="text-[10px] text-slate-400">%</span>
          </div>
        </div>
      </div>

      {/* 4. FILL SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-white">Fill</h4>
          <button
            onClick={() => handleFillChange('#3B82F6')}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            title="Add fill (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Fill Swatch Row */}
        <div className="flex items-center space-x-2 bg-[#2a2a2a] border border-[#383838] rounded-md p-1.5">
          <div className="relative w-6 h-6 rounded border border-white/20 shrink-0 overflow-hidden cursor-pointer" style={{ backgroundColor: hexColor }}>
            <input
              type="color"
              value={hexColor}
              onChange={e => handleFillChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
          </div>

          <span className="text-[11px] font-mono text-white font-medium flex-1">
            {primaryFill?.type === 'GRADIENT_LINEAR' ? 'LINEAR' : hexColor.toUpperCase()}
          </span>

          <div className="h-4 w-[1px] bg-[#383838]" />

          <span className="text-[11px] font-mono text-slate-300 mr-1">
            {opacityPercent}%
          </span>

          <button className="text-slate-400 hover:text-white p-0.5">
            <Eye className="w-3 h-3" />
          </button>
          <button
            onClick={() => onUpdateNode(selectedNode.id, { fills: [] } as any)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <Minus className="w-3 h-3" />
          </button>
        </div>

        {/* Fill Blend Mode */}
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">Blend mode</span>
          <select
            value={fillBlendMode}
            onChange={e => setFillBlendMode(e.target.value)}
            className="w-full bg-[#2a2a2a] border border-[#383838] rounded-md px-2 py-1.5 text-xs text-white outline-none cursor-pointer"
          >
            <option value="Normal">Normal</option>
            <option value="Multiply">Multiply</option>
            <option value="Screen">Screen</option>
            <option value="Overlay">Overlay</option>
          </select>
        </div>
      </div>

      {/* 5. STROKE SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-white">Stroke</h4>
          <button
            onClick={() => handleStrokeChange('#FFFFFF')}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            title="Add stroke (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {strokeWidth > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 bg-[#2a2a2a] border border-[#383838] rounded-md p-1.5">
              <div className="relative w-6 h-6 rounded border border-white/20 shrink-0 overflow-hidden cursor-pointer" style={{ backgroundColor: hexStrokeColor }}>
                <input
                  type="color"
                  value={hexStrokeColor}
                  onChange={e => handleStrokeChange(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </div>

              <span className="text-[11px] font-mono text-white font-medium flex-1">
                {hexStrokeColor.toUpperCase()}
              </span>

              <div className="h-4 w-[1px] bg-[#383838]" />

              <div className="flex items-center space-x-1 w-12">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={strokeWidth}
                  onChange={e => handleStrokeWidthChange(Number(e.target.value))}
                  className="w-full bg-transparent text-right outline-none font-mono text-[11px] text-white"
                />
                <span className="text-[10px] text-slate-400">px</span>
              </div>

              <button className="text-slate-400 hover:text-white p-0.5">
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={() => onUpdateNode(selectedNode.id, { strokes: [] } as any)}
                className="text-slate-400 hover:text-white p-0.5"
              >
                <Minus className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500">No stroke applied. Click + to add.</p>
        )}
      </div>

      {/* 6. EFFECTS SECTION */}
      <div className="p-3 border-b border-[#2d2d2d] space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-white">Effects</h4>
          <button
            onClick={() => {
              const currentEffects = (selectedNode as any).effects || [];
              onUpdateNode(selectedNode.id, {
                effects: [
                  ...currentEffects,
                  { type: 'LAYER_BLUR', radius: 10, visible: true }
                ]
              } as any);
            }}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            title="Add effect (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-2 bg-[#2a2a2a] border border-[#383838] rounded-md p-1.5">
          <Link className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
          <select
            value={selectedEffectType}
            onChange={e => setSelectedEffectType(e.target.value)}
            className="bg-transparent text-xs text-white outline-none flex-1 cursor-pointer"
          >
            <option value="Layer blur">Layer blur</option>
            <option value="Drop shadow">Drop shadow</option>
            <option value="Inner shadow">Inner shadow</option>
            <option value="Background blur">Background blur</option>
          </select>
          <button className="text-slate-400 hover:text-white p-0.5">
            <Eye className="w-3 h-3" />
          </button>
          <button className="text-slate-400 hover:text-white p-0.5">
            <Minus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 7. EXPORT SECTION */}
      <div className="p-3 space-y-2 bg-[#1e1e1e]">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-semibold text-white">Export</h4>
          <button className="text-slate-400 hover:text-white p-0.5">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const svgData = generateCode();
              const blob = new Blob([svgData], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${selectedNode.name || 'export'}.svg`;
              a.click();
            }}
            className="flex-1 py-1.5 px-2 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#383838] text-[11px] font-medium text-slate-200 hover:text-white text-center cursor-pointer"
          >
            Export SVG
          </button>
          <button
            onClick={() => {
              const codeData = generateCode();
              navigator.clipboard.writeText(codeData);
            }}
            className="flex-1 py-1.5 px-2 rounded bg-[#2a2a2a] hover:bg-[#383838] border border-[#383838] text-[11px] font-medium text-slate-200 hover:text-white text-center cursor-pointer"
          >
            Copy 1x
          </button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function rgbToHex(r?: number, g?: number, b?: number): string {
  const safeR = typeof r === 'number' && !isNaN(r) ? (r > 1 ? r / 255 : r) : 0.14;
  const safeG = typeof g === 'number' && !isNaN(g) ? (g > 1 ? g / 255 : g) : 0.14;
  const safeB = typeof b === 'number' && !isNaN(b) ? (b > 1 ? b / 255 : b) : 0.17;
  const toHex = (n: number) => {
    const hex = Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(safeR)}${toHex(safeG)}${toHex(safeB)}`;
}

function hexToRgb(hex?: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== 'string') return { r: 0.14, g: 0.14, b: 0.17 };
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  const num = parseInt(clean, 16) || 0;
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}
