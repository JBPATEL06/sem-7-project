import React, { useState, useRef } from 'react';
import {
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Database,
  CheckCircle2,
  Table as TableIcon,
  Server,
  Zap,
  Lock,
  Search,
  Sparkles
} from 'lucide-react';

interface DbManagerPageProps {
  projectId?: string;
  onNavigateDashboard?: () => void;
}

export const DbManagerPage: React.FC<DbManagerPageProps> = ({
  projectId = 'acme-api',
  onNavigateDashboard
}) => {
  const SUPABASE_STUDIO_URL = 'http://localhost:8082';
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  const handleRefreshStudio = () => {
    setIsIframeLoaded(false);
    setIframeKey((k) => k + 1);
    setStatusMessage('Reloading Supabase Studio Viewport...');
    setTimeout(() => setStatusMessage(null), 2500);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#121214] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Navigation & Control Bar */}
      <header className="h-12 bg-[#18181b] border-b border-zinc-800 px-4 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Left: Branding & Isolated Project Status */}
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
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-bold text-black text-xs shadow-xs">
              ⚡
            </div>
            <span className="font-semibold text-sm tracking-tight text-white">Supabase Studio</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Local PGlite Engine (pglite_data/{projectId}/)
            </span>
          </div>
        </div>

        {/* Center: Status Toast */}
        {statusMessage && (
          <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs animate-fade-in flex items-center space-x-1.5">
            <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefreshStudio}
            className="p-1.5 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md transition cursor-pointer"
            title="Reload Studio Viewport"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={SUPABASE_STUDIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-md transition cursor-pointer"
            title="Open Supabase Studio in full standalone tab"
          >
            <span>Open Standalone Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Studio Viewport: Authentic Supabase Studio UI */}
      <main className="relative flex-1 w-full h-full bg-[#18181b] overflow-hidden">
        <iframe
          key={iframeKey}
          ref={iframeRef}
          src={SUPABASE_STUDIO_URL}
          title="Supabase Studio Local Dashboard"
          className="w-full h-full border-0"
          onLoad={() => setIsIframeLoaded(true)}
          allow="clipboard-read; clipboard-write"
        />

        {/* Loading Overlay */}
        {!isIframeLoaded && (
          <div className="absolute inset-0 bg-[#121214] flex flex-col items-center justify-center space-y-4 z-20">
            <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <div className="text-sm font-medium text-zinc-300 flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Connecting Supabase Studio to local postgres-meta & PGlite...</span>
            </div>
            <p className="text-xs text-zinc-500 max-w-sm text-center">
              Targeting isolated WASM Postgres instance at <code className="text-emerald-400">pglite_data/{projectId}/</code> via local REST introspection layer at port 1337.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
