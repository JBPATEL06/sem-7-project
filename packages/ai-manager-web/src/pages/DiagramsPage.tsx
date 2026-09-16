import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Excalidraw, exportToBlob, exportToSvg } from '@excalidraw/excalidraw';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  FileCode2,
  Plus,
  Save,
  Trash2,
  Download,
  Upload,
  Layers,
  Image,
  RefreshCw,
  LayoutGrid,
  Database,
  GitBranch,
  FileCheck,
  Maximize2,
  Sparkles,
  Zap
} from 'lucide-react';
import { useDiagrams, Diagram } from '../hooks/useDiagrams';
import { useTheme } from '../context/ThemeContext';

interface DiagramsPageProps {
  projectId?: string;
}

export const DiagramsPage: React.FC<DiagramsPageProps> = ({ projectId = 'acme-api' }) => {
  const { theme } = useTheme();
  const {
    diagrams,
    activeDiagram,
    setActiveDiagram,
    isLoading,
    isSaving,
    error,
    createDiagram,
    generateAiDiagram,
    saveDiagram,
    deleteDiagram,
    importDiagramJson,
    refetch
  } = useDiagrams(projectId);

  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [newDiagramName, setNewDiagramName] = useState('');
  const [newDiagramType, setNewDiagramType] = useState<Diagram['type']>('architecture');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDiagramType, setAiDiagramType] = useState<Diagram['type']>('architecture');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedFilePath, setCopiedFilePath] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync active diagram data to canvas when switching diagrams
  useEffect(() => {
    if (excalidrawAPI && activeDiagram) {
      excalidrawAPI.updateScene({
        elements: activeDiagram.elements || [],
        appState: {
          ...(activeDiagram.appState || {}),
          viewBackgroundColor: theme === 'dark' ? '#090d16' : '#ffffff',
          theme: theme === 'dark' ? 'dark' : 'light'
        }
      });
      if (activeDiagram.elements && activeDiagram.elements.length > 0) {
        setTimeout(() => {
          excalidrawAPI.scrollToContent(activeDiagram.elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
        }, 60);
      }
    }
  }, [activeDiagram?.id, activeDiagram?.updatedAt, excalidrawAPI, theme]);

  // Handle Save
  const handleSave = async () => {
    if (!excalidrawAPI || !activeDiagram) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    await saveDiagram(activeDiagram.id, elements, {
      viewBackgroundColor: appState.viewBackgroundColor,
      theme: appState.theme
    }, files);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Handle Create New
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiagramName.trim()) return;

    // Provide initial starter elements based on type
    let initialElements: any[] = [];
    if (newDiagramType === 'architecture') {
      initialElements = [
        {
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 220,
          height: 90,
          backgroundColor: '#3b82f620',
          strokeColor: '#3b82f6',
          strokeWidth: 2,
          roughness: 1
        },
        {
          type: 'text',
          x: 120,
          y: 130,
          text: 'Client Web (React 18)',
          fontSize: 16,
          fontFamily: 1
        },
        {
          type: 'rectangle',
          x: 420,
          y: 100,
          width: 220,
          height: 90,
          backgroundColor: '#10b98120',
          strokeColor: '#10b981',
          strokeWidth: 2,
          roughness: 1
        },
        {
          type: 'text',
          x: 440,
          y: 130,
          text: 'API Server (Express)',
          fontSize: 16,
          fontFamily: 1
        },
        {
          type: 'arrow',
          x: 320,
          y: 145,
          width: 100,
          height: 0,
          points: [[0, 0], [100, 0]],
          strokeColor: '#8b5cf6',
          strokeWidth: 2
        }
      ];
    } else if (newDiagramType === 'er_diagram') {
      initialElements = [
        {
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 140,
          backgroundColor: '#f59e0b20',
          strokeColor: '#f59e0b',
          strokeWidth: 2
        },
        {
          type: 'text',
          x: 115,
          y: 115,
          text: 'TABLE: users\n- id: INTEGER PK\n- email: TEXT\n- role: TEXT',
          fontSize: 14,
          fontFamily: 3
        }
      ];
    }

    await createDiagram(newDiagramName.trim(), newDiagramType, initialElements);
    setNewDiagramName('');
    setIsCreateModalOpen(false);
  };

  // Handle AI Generate Diagram
  const handleAiGenerateDiagram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      setIsAiGenerating(true);
      const newDiagram = await generateAiDiagram(aiPrompt.trim(), aiDiagramType);
      setAiPrompt('');
      setIsAiModalOpen(false);

      if (newDiagram && excalidrawAPI) {
        excalidrawAPI.updateScene({
          elements: newDiagram.elements || [],
          appState: {
            viewBackgroundColor: '#090d16',
            theme: theme === 'dark' ? 'dark' : 'light'
          }
        });
        setTimeout(() => {
          if (excalidrawAPI && newDiagram.elements && newDiagram.elements.length > 0) {
            excalidrawAPI.scrollToContent(newDiagram.elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
          }
        }, 80);
      }
    } catch (err: any) {
      console.error('AI Diagram Generation failed:', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Export JSON (.excalidraw)
  const handleExportJson = () => {
    if (!excalidrawAPI || !activeDiagram) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();

    const data = {
      type: 'excalidraw',
      version: 2,
      source: 'https://ai-manager.local',
      name: activeDiagram.name,
      elements,
      appState,
      files
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDiagram.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_${activeDiagram.id}.excalidraw`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PNG
  const handleExportPng = async () => {
    if (!excalidrawAPI || !activeDiagram) return;
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor || (theme === 'dark' ? '#1e1e24' : '#ffffff')
        },
        files,
        mimeType: 'image/png'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDiagram.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PNG export failed:', err);
    }
  };

  // Export SVG
  const handleExportSvg = async () => {
    if (!excalidrawAPI || !activeDiagram) return;
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();

      const svg = await exportToSvg({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: appState.viewBackgroundColor || (theme === 'dark' ? '#1e1e24' : '#ffffff')
        },
        files
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDiagram.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('SVG export failed:', err);
    }
  };

  // Handle Import File
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const name = file.name.replace(/\.(json|excalidraw)$/i, '');
        await importDiagramJson(json, name);
      } catch (err: any) {
        alert(`Failed to parse Excalidraw JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Zoom to Fit / Reset Canvas View
  const handleZoomToFit = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    if (elements && elements.length > 0) {
      excalidrawAPI.scrollToContent(elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
    }
  };

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-background">
      {/* Top Header & Toolbar */}
      <div className="flex justify-between items-center px-4 py-2.5 bg-card/95 backdrop-blur-md border-b border-border z-10 shrink-0 gap-3 flex-wrap shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Layers className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-foreground text-sm tracking-tight">
                Diagram Studio & Canvas
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono">
                {projectId}
              </Badge>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Infinite Excalidraw architecture, ER diagrams, and system flows
            </p>
          </div>

          {/* Repo File Path Badge with 1-Click Copy */}
          <div
            onClick={() => {
              const slug = activeDiagram ? activeDiagram.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : 'system_architecture';
              navigator.clipboard.writeText(`diagrams/${slug}.excalidraw`);
              setCopiedFilePath(true);
              setTimeout(() => setCopiedFilePath(false), 2000);
            }}
            title="Click to copy repository file path"
            className={`flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
              copiedFilePath
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-semibold'
                : 'bg-muted/60 hover:bg-muted border-border text-foreground'
            }`}
          >
            <span>📁 diagrams/{activeDiagram ? activeDiagram.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : 'system_architecture'}.excalidraw</span>
            {copiedFilePath ? <FileCheck className="size-3 text-emerald-500" /> : <Download className="size-3 opacity-60 hover:opacity-100" />}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Diagram Picker */}
          <Select
            value={activeDiagram?.id || ''}
            onValueChange={(val) => {
              const found = diagrams.find((d) => d.id === val);
              if (found) setActiveDiagram(found);
            }}
          >
            <SelectTrigger className="w-[210px] text-xs h-8">
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

          {/* AI Generate Diagram Button */}
          <Button
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="gap-1.5 text-xs h-8 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white cursor-pointer shadow-xs font-semibold"
          >
            <Sparkles className="size-3.5" />
            AI Generate
          </Button>

          {/* New Diagram Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCreateModalOpen(true)}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <Plus className="size-3.5" />
            New
          </Button>

          {/* Save Changes Button */}
          {activeDiagram && (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <FileCheck className="size-3.5 text-emerald-300" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  {isSaving ? 'Saving...' : 'Save Canvas'}
                </>
              )}
            </Button>
          )}

          {/* Fit to Content */}
          {activeDiagram && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleZoomToFit}
              title="Fit to Content"
              className="gap-1.5 text-xs h-8 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <Maximize2 className="size-3.5" />
              Fit View
            </Button>
          )}

          {/* Export Dropdown / Buttons */}
          {activeDiagram && (
            <div className="flex items-center gap-1 border-l border-border pl-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportJson}
                title="Export .excalidraw JSON"
                className="text-xs h-8 gap-1 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Download className="size-3.5" />
                JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportPng}
                title="Export PNG Image"
                className="text-xs h-8 gap-1 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <Image className="size-3.5" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleExportSvg}
                title="Export SVG Vector"
                className="text-xs h-8 gap-1 px-2 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                SVG
              </Button>
            </div>
          )}

          {/* Import Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json,.excalidraw"
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs h-8 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Upload className="size-3.5" />
            Import
          </Button>

          {/* Delete Active Diagram */}
          {activeDiagram && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete diagram '${activeDiagram.name}'?`)) {
                  deleteDiagram(activeDiagram.id);
                }
              }}
              className="text-xs h-8 text-destructive hover:bg-destructive/10 px-2 cursor-pointer"
              title="Delete Diagram"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Edge-to-Edge Infinite Canvas Area or Empty State */}
      <div className="flex-1 w-full h-full overflow-hidden relative bg-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="size-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-muted-foreground">Loading diagrams...</span>
          </div>
        ) : diagrams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Layers className="size-8" />
            </div>
            <div className="max-w-md">
              <h2 className="text-base font-bold text-foreground">No diagrams created yet</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Create system architectures, entity-relationship diagrams, or activity workflows for{' '}
                <strong className="text-foreground">{projectId}</strong>.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-primary-foreground text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5" />
              Create First Diagram
            </Button>
          </div>
        ) : (
          <div className="w-full h-full">
            <Excalidraw
              key={activeDiagram?.id || 'empty-diagram'}
              initialData={{
                elements: activeDiagram?.elements || [],
                appState: {
                  ...(activeDiagram?.appState || {}),
                  theme: theme === 'dark' ? 'dark' : 'light',
                  viewBackgroundColor: theme === 'dark' ? '#090d16' : '#ffffff'
                },
                files: activeDiagram?.files || {}
              }}
              excalidrawAPI={(api: any) => {
                setExcalidrawAPI(api);
                if (activeDiagram?.elements && activeDiagram.elements.length > 0) {
                  setTimeout(() => {
                    api?.scrollToContent?.(activeDiagram.elements, { fitToViewport: true, viewportZoomFactor: 0.85 });
                  }, 80);
                }
              }}
              theme={theme === 'dark' ? 'dark' : 'light'}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  saveToActiveFile: false,
                  toggleTheme: true
                }
              }}
            />
          </div>
        )}
      </div>

      {/* New Diagram Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-xl">
            <h2 className="text-base font-bold text-foreground mb-1">Create New Diagram</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Initialize a canvas layout with preset templates
            </p>

            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Diagram Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microservices Architecture"
                  value={newDiagramName}
                  onChange={(e) => setNewDiagramName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Diagram Type / Template
                </label>
                <Select
                  value={newDiagramType}
                  onValueChange={(val: any) => setNewDiagramType(val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="architecture">System Architecture (Services & Nodes)</SelectItem>
                    <SelectItem value="er_diagram">ER Diagram (Database Tables & Keys)</SelectItem>
                    <SelectItem value="activity_flow">Activity Flow (Process & Gateway)</SelectItem>
                    <SelectItem value="scratchpad">Blank Canvas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-primary text-primary-foreground text-xs cursor-pointer"
                >
                  Create Diagram
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* AI Diagram Generator Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-violet-500" />
                <h2 className="text-base font-bold text-foreground">AI Diagram Synthesis Engine</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAiGenerateDiagram} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Diagram Architecture Type
                </label>
                <Select
                  value={aiDiagramType}
                  onValueChange={(val: any) => setAiDiagramType(val)}
                >
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="architecture">Microservices Architecture Flow</SelectItem>
                    <SelectItem value="er_diagram">Relational Database ER Schema</SelectItem>
                    <SelectItem value="activity_flow">Event-Driven Telemetry Pipeline</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Describe the system architecture or schema:
                </label>
                <textarea
                  rows={4}
                  required
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Distributed high-throughput microservices architecture with API Gateway, JWT Auth Service, Kafka Event Bus, and MongoDB Cluster with bidirectional sync arrows..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
                />
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-2">
                  Preset Architectures:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Full-Stack Cloud Architecture with Gateway, Auth & Cache',
                    'E-Commerce Relational ER Diagram with Users & Orders',
                    'Real-Time WebSocket Analytics Pipeline with Redis Stream'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAiPrompt(preset)}
                      className="text-[11px] px-2.5 py-1 bg-muted/60 hover:bg-muted border border-border rounded-lg text-foreground transition-colors text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAiModalOpen(false)}
                  className="text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isAiGenerating || !aiPrompt.trim()}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="size-3.5" />
                  {isAiGenerating ? 'Synthesizing Architecture...' : 'Generate Diagram'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </main>
  );
};
