import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Button, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/ui';
import {
  FileCode2,
  Plus,
  Save,
  Trash2,
  Download,
  Upload,
  Layers,
  RefreshCw,
  FileCheck,
  ExternalLink,
  Sparkles,
  Zap,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { useDiagrams, Diagram } from '../hooks/useDiagrams';
import { useTheme } from '@/shared/context';

interface DiagramsPageProps {
  projectId?: string;
  onNavigateDashboard?: () => void;
}

const DEFAULT_ARCHITECTURE_XML = `<mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850" background="#090d16">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="client" value="Client App&#xa;(Vite + React :5173)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#3b82f6;strokeWidth=2;fontColor=#ffffff;fontStyle=1;fontSize=13;" vertex="1" parent="1">
      <mxGeometry x="120" y="200" width="170" height="70" as="geometry"/>
    </mxCell>
    <mxCell id="gateway" value="API Gateway / Server&#xa;(Express :3000)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#1e293b;strokeColor=#10b981;strokeWidth=2;fontColor=#ffffff;fontStyle=1;fontSize=13;" vertex="1" parent="1">
      <mxGeometry x="380" y="200" width="180" height="70" as="geometry"/>
    </mxCell>
    <mxCell id="pglite" value="Postgres WASM&#xa;(PGlite :1337)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#1e293b;strokeColor=#8b5cf6;strokeWidth=2;fontColor=#ffffff;fontStyle=1;fontSize=13;" vertex="1" parent="1">
      <mxGeometry x="660" y="100" width="150" height="90" as="geometry"/>
    </mxCell>
    <mxCell id="atlas" value="MongoDB Atlas&#xa;(Auth &amp; Session Store)" style="shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#1e293b;strokeColor=#f59e0b;strokeWidth=2;fontColor=#ffffff;fontStyle=1;fontSize=13;" vertex="1" parent="1">
      <mxGeometry x="660" y="270" width="160" height="90" as="geometry"/>
    </mxCell>
    <mxCell id="edge1" value="REST / SSE" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;strokeColor=#60a5fa;strokeWidth=2;fontColor=#93c5fd;" edge="1" parent="1" source="client" target="gateway">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
    <mxCell id="edge2" value="SQL Queries" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;strokeColor=#a78bfa;strokeWidth=2;fontColor=#c4b5fd;" edge="1" parent="1" source="gateway" target="pglite">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
    <mxCell id="edge3" value="Mongoose / Auth" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;entryX=0;entryY=0.5;strokeColor=#fbbf24;strokeWidth=2;fontColor=#fde68a;" edge="1" parent="1" source="gateway" target="atlas">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>
  </root>
</mxGraphModel>`;

const BLANK_DIAGRAM_XML = `<mxGraphModel dx="1000" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="850">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
  </root>
</mxGraphModel>`;

const getDiagramXml = (diagram: Diagram | null): string => {
  if (!diagram) return BLANK_DIAGRAM_XML;
  if (diagram.files?.xml && typeof diagram.files.xml === 'string' && diagram.files.xml.trim().length > 0) {
    return diagram.files.xml;
  }
  if ((diagram as any).xml && typeof (diagram as any).xml === 'string' && (diagram as any).xml.trim().length > 0) {
    return (diagram as any).xml;
  }
  if (diagram.type === 'scratchpad' || diagram.name.toLowerCase().includes('blank') || diagram.name.toLowerCase().includes('scratchpad')) {
    return BLANK_DIAGRAM_XML;
  }
  return DEFAULT_ARCHITECTURE_XML;
};

export const DiagramsPage: React.FC<DiagramsPageProps> = ({ projectId = 'acme-api', onNavigateDashboard }) => {
  const DRAWIO_URL = 'http://localhost:8085/index.html?embed=1&proto=json&spin=1&dev=1';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadedDiagramIdRef = useRef<string | null>(null);
  const currentXmlRef = useRef<string>('');

  const {
    diagrams,
    activeDiagram,
    setActiveDiagram,
    isLoading,
    isSaving,
    error,
    createDiagram,
    saveDiagram,
    deleteDiagram,
    refetch
  } = useDiagrams(projectId);

  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedFilePath, setCopiedFilePath] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState('');
  const [newDiagramType, setNewDiagramType] = useState<Diagram['type']>('architecture');

  const slug = activeDiagram
    ? activeDiagram.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    : 'architecture_flow';
  const currentFilePath = `diagrams/${slug}.drawio`;

  // Send load action to iframe
  const sendLoadDiagram = useCallback((xmlData?: string) => {
    const xmlToLoad = xmlData || currentXmlRef.current || BLANK_DIAGRAM_XML;
    console.log('[DiagramsPage] postMessage -> sending load action, XML length:', xmlToLoad.length);
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ action: 'load', xml: xmlToLoad, autosave: 1 }),
      '*'
    );
  }, []);

  // Reload iframe editor
  const handleRefreshStudio = () => {
    setIsIframeLoaded(false);
    loadedDiagramIdRef.current = null;
    setIframeKey((k) => k + 1);
    setStatusMessage('Reloading draw.io Studio Engine...');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Perform atomic save (does NOT re-trigger iframe load)
  const executeSave = useCallback(async (xmlData?: string) => {
    if (!activeDiagram) return;
    try {
      const xmlToSave = xmlData || currentXmlRef.current;
      if (!xmlToSave) return;
      currentXmlRef.current = xmlToSave;
      await saveDiagram(activeDiagram.id, [], activeDiagram.appState || {}, { xml: xmlToSave });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      console.error('[draw.io AutoSave Error]:', err);
    }
  }, [activeDiagram?.id, activeDiagram?.appState, saveDiagram]);

  // Handle draw.io Embed Protocol postMessages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || typeof data !== 'object') return;

      console.log('[DiagramsPage] Incoming draw.io event:', data.event);

      if (data.event === 'configure') {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ action: 'configure', config: { defaultFonts: ['Helvetica'] } }),
          '*'
        );
      } else if (data.event === 'init') {
        setIsIframeLoaded(true);
        if (activeDiagram) {
          const xmlToLoad = getDiagramXml(activeDiagram);
          loadedDiagramIdRef.current = activeDiagram.id;
          currentXmlRef.current = xmlToLoad;
          sendLoadDiagram(xmlToLoad);
        }
      } else if (data.event === 'autosave' || data.event === 'change' || data.event === 'save') {
        if (data.xml) {
          currentXmlRef.current = data.xml;
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = setTimeout(() => {
            executeSave(data.xml);
          }, 1200);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeDiagram, sendLoadDiagram, executeSave]);

  // When switching to a DIFFERENT diagram, load its XML into the iframe
  useEffect(() => {
    if (isIframeLoaded && activeDiagram) {
      if (loadedDiagramIdRef.current !== activeDiagram.id) {
        console.log(`[DiagramsPage] Switching active diagram from ${loadedDiagramIdRef.current} to ${activeDiagram.id}`);
        const xmlToLoad = getDiagramXml(activeDiagram);
        loadedDiagramIdRef.current = activeDiagram.id;
        currentXmlRef.current = xmlToLoad;
        sendLoadDiagram(xmlToLoad);
      }
    }
  }, [activeDiagram?.id, isIframeLoaded, sendLoadDiagram]);

  // Handle Create New Diagram
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramName.trim()) return;
    const initialXml = newDiagramType === 'scratchpad' ? BLANK_DIAGRAM_XML : DEFAULT_ARCHITECTURE_XML;
    const created = await createDiagram(newDiagramName.trim(), newDiagramType, [], initialXml);
    setNewDiagramName('');
    setIsCreateModalOpen(false);
    if (created && isIframeLoaded) {
      loadedDiagramIdRef.current = created.id;
      currentXmlRef.current = initialXml;
      sendLoadDiagram(initialXml);
    }
  };

  return (
    <main className="w-screen h-screen flex flex-col bg-[#121214] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header & Control Bar */}
      <header className="h-12 bg-[#18181b] border-b border-zinc-800 px-4 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Branding & Status */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center font-bold text-white text-xs shadow-xs">
              D
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">draw.io Diagram Studio</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-amber-400" />
              v24.7.17 Upstream mxGraph Engine
            </span>
          </div>

          {/* Repo File Path Badge */}
          <div
            onClick={() => {
              navigator.clipboard.writeText(currentFilePath);
              setCopiedFilePath(true);
              setTimeout(() => setCopiedFilePath(false), 2000);
            }}
            title="Click to copy repository file path"
            className={`flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md border cursor-pointer transition-all ${
              copiedFilePath
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold'
                : 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-300'
            }`}
          >
            <span>📁 {currentFilePath}</span>
            {copiedFilePath ? <FileCheck className="w-3 h-3 text-emerald-400" /> : <Download className="w-3 h-3 opacity-60" />}
          </div>
        </div>

        {/* Center: Toast Status */}
        {statusMessage && (
          <div className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs animate-fade-in flex items-center space-x-1.5">
            <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {/* Diagram Selector */}
          <Select
            value={activeDiagram?.id || ''}
            onValueChange={(val) => {
              const found = diagrams.find((d) => d.id === val);
              if (found) setActiveDiagram(found);
            }}
          >
            <SelectTrigger className="w-[200px] text-xs h-8 bg-zinc-800 border-zinc-700 text-zinc-200">
              <SelectValue placeholder="Select Diagram">
                {activeDiagram ? `${activeDiagram.name} (${activeDiagram.type})` : 'Select Diagram'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {diagrams.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name} ({d.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* New Diagram Button */}
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs h-8 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>

          {/* Save Button */}
          {activeDiagram && (
            <Button
              size="sm"
              onClick={() => executeSave()}
              disabled={isSaving}
              className="gap-1.5 text-xs h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save File'}
                </>
              )}
            </Button>
          )}

          {/* Refresh Editor */}
          <button
            onClick={handleRefreshStudio}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition cursor-pointer"
            title="Reload draw.io Engine"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Open Standalone */}
          <a
            href={DRAWIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md transition cursor-pointer"
            title="Open Upstream draw.io Web App in standalone tab"
          >
            <span>Open Standalone</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Studio Viewport: Authentic Upstream draw.io mxGraph Editor */}
      <main className="relative flex-1 w-full h-full bg-[#18181b] overflow-hidden">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={DRAWIO_URL}
          title="draw.io Official Editor App"
          className="w-full h-full border-0"
          onLoad={() => setIsIframeLoaded(true)}
          allow="clipboard-read; clipboard-write"
        />

        {/* Loading Overlay */}
        {!isIframeLoaded && (
          <div className="absolute inset-0 bg-[#121214] flex flex-col items-center justify-center space-y-4 z-20">
            <div className="w-10 h-10 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
            <div className="text-sm font-medium text-zinc-300 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Connecting to Upstream draw.io mxGraph Engine at port 8085...</span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm text-center">
              Loading stencil libraries, XML serializer, and vector shapes from <code className="text-amber-400">packages/drawio-repo</code>.
            </p>
          </div>
        )}
      </main>

      {/* New Diagram Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-white">Create New draw.io Diagram</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Diagram Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. system_architecture"
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded bg-zinc-800 border border-zinc-700 text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-1">Diagram Type</label>
                <Select value={newDiagramType} onValueChange={(val: any) => setNewDiagramType(val)}>
                  <SelectTrigger className="w-full text-xs bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="architecture">System Architecture Flow</SelectItem>
                    <SelectItem value="er_diagram">Entity Relationship Diagram</SelectItem>
                    <SelectItem value="activity_flow">Process Activity Flow</SelectItem>
                    <SelectItem value="scratchpad">Blank Canvas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
                  Create Diagram
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
};
