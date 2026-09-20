import React, { useState, useRef } from 'react';
import { ApiClient } from '@/shared/api';
import { ProjectFilesModal } from '../components/ProjectFilesModal';
import {
  ExternalLink,
  FolderOpen,
  RefreshCw,
  ArrowLeft,
  Layers,
  CheckCircle2
} from 'lucide-react';

interface ScreensPageProps {
  selectedProject?: { id: string; name: string };
  onNavigateDashboard?: () => void;
}

export function ScreensPage({ selectedProject, onNavigateDashboard }: ScreensPageProps) {
  const OPENPENCIL_URL = 'http://localhost:1420';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);
  
  // Modals state
  const [showProjectFilesModal, setShowProjectFilesModal] = useState(false);
  const [projectRootFiles, setProjectRootFiles] = useState<Array<{ name: string; sizeBytes: number; modifiedAt: string; type: string }>>([]);
  const [isLoadingProjectFiles, setIsLoadingProjectFiles] = useState(false);
  const [projectFileSearch, setProjectFileSearch] = useState('');

  const handleRefreshStudio = () => {
    setIsIframeLoaded(false);
    setIframeKey(k => k + 1);
    setStatusMessage('Reloading OpenPencil Web App...');
    setTimeout(() => setStatusMessage(null), 2500);
  };

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

  const handleOpenProjectRootFile = async (filename: string) => {
    try {
      setStatusMessage(`Opening ui/${filename}...`);
      setShowProjectFilesModal(false);
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'OPEN_PENCIL_LOAD_FILE', file: filename },
          '*'
        );
      }
      setTimeout(() => setStatusMessage(`Loaded ui/${filename}`), 1000);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message}`);
    }
  };

  const handleDeleteProjectRootFile = async (filename: string) => {
    try {
      setStatusMessage(`Deleting ${filename}...`);
      const res = await ApiClient.delete<{ success: boolean; message: string }>(`/api/screens/project-root/files/${encodeURIComponent(filename)}`);
      if (res.success) {
        setProjectRootFiles(prev => prev.filter(f => f.name !== filename));
        setStatusMessage(`🗑️ Deleted ui/${filename}`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage(`❌ Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#121214] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Navigation & Status Bar */}
      <header className="h-12 bg-[#18181b] border-b border-zinc-800 px-4 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Project & Branding */}
        <div className="flex items-center space-x-3">
          {onNavigateDashboard && (
            <button
              onClick={onNavigateDashboard}
              className="flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 rounded-md transition border border-zinc-700/50 cursor-pointer"
              title="Return to AI Manager Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}

          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 rounded bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs">
              P
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">OpenPencil Studio</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              v0.15.0 Upstream Skia WASM
            </span>
          </div>
        </div>

        {/* Center: Live Status or Notification */}
        {statusMessage && (
          <div className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs animate-fade-in flex items-center space-x-1.5">
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Right: Studio Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLoadProjectRootFiles}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition cursor-pointer"
            title="Browse and open project ui/ files"
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>Project Files</span>
          </button>

          <button
            onClick={handleRefreshStudio}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition cursor-pointer"
            title="Reload Studio Viewport"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={OPENPENCIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-md transition cursor-pointer"
            title="Open Upstream OpenPencil Web App in full standalone tab"
          >
            <span>Open Standalone</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Studio Viewport: Authentic Upstream OpenPencil Web App */}
      <main className="relative flex-1 w-full h-full bg-[#18181b] overflow-hidden">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={OPENPENCIL_URL}
          title="OpenPencil Official Web App"
          className="w-full h-full border-0"
          onLoad={() => setIsIframeLoaded(true)}
          allow="clipboard-read; clipboard-write"
        />

        {/* Loading Overlay */}
        {!isIframeLoaded && (
          <div className="absolute inset-0 bg-[#121214] flex flex-col items-center justify-center space-y-4 z-20">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <div className="text-sm font-medium text-zinc-300 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Connecting to Upstream OpenPencil Engine...</span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm text-center">
              Loading Skia GPU Vector Engine, Kiwi Figma serializer, and typography fonts at {OPENPENCIL_URL}.
            </p>
          </div>
        )}
      </main>

      {/* Project Root Files Modal */}
      <ProjectFilesModal
        isOpen={showProjectFilesModal}
        onClose={() => setShowProjectFilesModal(false)}
        files={projectRootFiles}
        isLoading={isLoadingProjectFiles}
        search={projectFileSearch}
        setSearch={setProjectFileSearch}
        onOpenFile={handleOpenProjectRootFile}
        onDeleteFile={handleDeleteProjectRootFile}
      />
    </div>
  );
}
