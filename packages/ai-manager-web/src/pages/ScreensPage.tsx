import React, { useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Key,
  Sparkles,
  Check,
  Copy,
  Cpu,
  CheckCircle2,
  AlertCircle,
  X,
  Settings as SettingsIcon,
  Send,
  Download,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';
import { OpenPencilCanvas } from '../components/OpenPencilCanvas';

export function ScreensPage({ selectedProject }: { selectedProject?: { id: string; name: string } }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const { keysData, revealedValues } = useSettings();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [copiedKeyType, setCopiedKeyType] = useState<string | null>(null);

  // AI Prompt & Generation State
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScreen, setGeneratedScreen] = useState<{
    id: string;
    name: string;
    width: number;
    height: number;
    components: any[];
    filePath?: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleCopyKey = async (keyType: 'groq' | 'openai') => {
    try {
      let plaintext = revealedValues[keyType];
      if (!plaintext) {
        const res = await fetch(`/api/settings/keys/${keyType}/reveal`);
        if (res.ok) {
          const data = await res.json();
          plaintext = data.value;
        }
      }
      if (plaintext) {
        await navigator.clipboard.writeText(plaintext);
        setCopiedKeyType(keyType);
        setTimeout(() => setCopiedKeyType(null), 2500);
      }
    } catch (e) {
      console.error('Failed to copy key:', e);
    }
  };

  const handleGenerate = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt;
    if (!textPrompt || !textPrompt.trim() || isGenerating) return;

    const isTargetedModify = selectedIds.length > 0 && !!generatedScreen;
    setIsGenerating(true);
    setStatusMessage(isTargetedModify 
      ? `⚡ Modifying ${selectedIds.length} selected element(s) with Groq AI...`
      : `⚡ Synthesizing custom layout from scratch with Groq AI...`
    );

    try {
      const payload: any = {
        prompt: textPrompt.trim(),
        mode: isTargetedModify ? 'modify' : 'create',
        projectId: selectedProject?.id || 'acme-api',
        theme: isLight ? 'light' : 'dark'
      };

      if (isTargetedModify && generatedScreen) {
        payload.screenId = generatedScreen.id;
        payload.selectedCompIds = selectedIds;
        payload.existingBoard = {
          id: generatedScreen.id,
          width: generatedScreen.width,
          height: generatedScreen.height,
          components: generatedScreen.components
        };
      }

      const res = await fetch('/api/screens/generate-stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.details || 'Synthesis failed');
      }

      const screen = data.screen;
      setGeneratedScreen({
        id: screen.id,
        name: screen.name,
        width: screen.board?.width || 1440,
        height: screen.board?.height || 900,
        components: screen.board?.components || [],
        filePath: screen.filePath
      });

      setStatusMessage(isTargetedModify
        ? `✨ Successfully updated ${selectedIds.length} element(s) in "${screen.name}"`
        : `✨ Successfully synthesized "${screen.name}" (${screen.board?.components?.length || 0} components)`
      );
      setPrompt('');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Generation error:', err);
      setStatusMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFig = () => {
    if (generatedScreen?.id) {
      window.open(`/api/screens/${generatedScreen.id}/export?format=fig`, '_blank');
    }
  };

  const hasGroq = keysData?.keys?.groq?.isConfigured;
  const hasOpenAI = keysData?.keys?.openai?.isConfigured;
  const hasAnyKey = hasGroq || hasOpenAI;

  const quickChips = [
    { label: '📊 SaaS Dashboard', prompt: 'Modern Dark SaaS Metrics Dashboard with 4 KPI cards, line chart, and transactions table' },
    { label: '🪙 Crypto Trading', prompt: 'Dark Cyberpunk Crypto Trading Terminal with live order book, candlestick chart, and buy/sell panel' },
    { label: '🛒 E-Commerce', prompt: 'Clean Minimalist E-Commerce Storefront with product grid, search filters, and checkout cart sidebar' },
    { label: '🔐 Auth Portal', prompt: 'Modern Glassmorphic Authentication Portal with OAuth SSO options and security badges' }
  ];

  return (
    <div className={`h-[calc(100vh-4rem)] flex flex-col ${isLight ? 'bg-slate-100 text-slate-900' : 'bg-[#0a0e17] text-slate-100'} overflow-hidden`}>
      {/* Top Header Bar */}
      <div className={`h-14 border-b ${isLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-[#0d1322]'} px-4 flex items-center justify-between z-20 shrink-0`}>
        {/* Left: Branding & Status */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm font-bold tracking-tight">OpenPencil Studio</h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full">
                Native Vector & AI
              </span>
              {generatedScreen && (
                <span className="text-xs text-slate-400 font-normal">
                  — <strong className="text-slate-200">{generatedScreen.name}</strong> ({generatedScreen.width} × {generatedScreen.height})
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {statusMessage || (selectedProject?.name ? `Project: ${selectedProject.name}` : 'Local-first Figma compatible editor with built-in AI tools')}
            </p>
          </div>
        </div>

        {/* Right: Studio Controls */}
        <div className="flex items-center space-x-2">
          {/* Download .fig button if screen exists */}
          {generatedScreen && (
            <button
              onClick={handleDownloadFig}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/40 transition-all shadow-sm cursor-pointer"
              title="Download Figma binary (.fig) file"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download .fig</span>
            </button>
          )}

          {/* AI Key Status & Setup Trigger */}
          <button
            onClick={() => setShowAiGuide(true)}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              hasAnyKey
                ? isLight
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60 shadow-sm shadow-emerald-950/50'
                : isLight
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/60 shadow-sm shadow-amber-950/50'
            }`}
            title="Configure / View AI API Key from Settings"
          >
            {hasAnyKey ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AI Key Configured ({hasGroq ? 'Groq' : 'OpenAI'})</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Configure AI Key</span>
              </>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open Local Studio in New Tab */}
          <a
            href="/screens"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20 hover:from-violet-500 hover:to-indigo-500 transition-all cursor-pointer"
          >
            <span>Open in Tab</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Studio Viewport: Native OpenPencil React Canvas Shell */}
      <div className={`relative flex-1 w-full h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-[#080b12]' : ''}`}>
        <OpenPencilCanvas
          theme={isLight ? 'light' : 'dark'}
          components={generatedScreen?.components}
          boardWidth={generatedScreen?.width}
          boardHeight={generatedScreen?.height}
          title={generatedScreen?.name}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          className="w-full h-full"
        />

        {/* Floating Bottom AI Command Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40">
          <div className="bg-slate-900/95 border border-violet-500/40 backdrop-blur-xl rounded-2xl shadow-2xl p-3 space-y-2.5">
            {/* Targeted Mode Indicator (if elements selected) */}
            {selectedIds.length > 0 && (
              <div className="flex items-center justify-between bg-violet-950/60 border border-violet-500/30 rounded-lg px-2.5 py-1 text-[11px] text-violet-300">
                <div className="flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-400" />
                  <span className="font-semibold">Targeted Mutation Mode:</span>
                  <span className="font-mono text-slate-300">{selectedIds.join(', ')}</span>
                </div>
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[10px] text-violet-400 hover:text-white underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Quick Chips */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerate(chip.prompt)}
                  disabled={isGenerating}
                  className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium rounded-full bg-slate-800/80 hover:bg-violet-950/80 text-slate-300 hover:text-violet-300 border border-slate-700 hover:border-violet-500/50 transition-all cursor-pointer disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Prompt Input Dock */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleGenerate(); }}
              className={`flex items-center space-x-2 bg-slate-950/90 border rounded-xl px-3 py-2 transition-all ${
                isGenerating ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-slate-800 focus-within:border-violet-500'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'text-violet-400 animate-spin' : selectedIds.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  selectedIds.length > 0
                    ? `Describe edits for selected element(s) (e.g. "Change color to emerald, add 16px radius, bold title")...`
                    : "Ask OpenPencil AI to synthesize a UI screen (e.g. '5 containers each with 10 text items')..."
                }
                disabled={isGenerating}
                className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 outline-none cursor-text disabled:opacity-60"
                autoFocus
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center min-w-[28px]"
                title="Send Instruction to AI"
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* AI Setup & API Key Modal */}
      {showAiGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-slate-800 text-slate-100'
          }`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isLight ? 'border-slate-100 bg-slate-50' : 'border-slate-800 bg-[#0b1120]'
            }`}>
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-violet-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AI API Keys from Your Settings</h3>
                  <p className="text-xs text-slate-400">Use your configured keys for native OpenPencil AI synthesis</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiGuide(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-200">Keys Configured in Settings:</h4>
                  <a
                    href="/settings"
                    className="flex items-center space-x-1 text-[11px] text-violet-400 hover:text-violet-300 transition-colors"
                  >
                    <SettingsIcon className="w-3 h-3" />
                    <span>Manage in Settings</span>
                  </a>
                </div>

                {/* Groq Card */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">Groq API Key</span>
                      {hasGroq ? (
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                          Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded-md">
                          Not Set
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] font-mono mt-1">
                      {keysData?.keys?.groq?.masked || 'Not configured'}
                    </p>
                  </div>

                  {hasGroq && (
                    <button
                      onClick={() => handleCopyKey('groq')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 hover:bg-violet-600/50 transition-all text-xs font-semibold"
                    >
                      {copiedKeyType === 'groq' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* OpenAI Card */}
                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">OpenAI API Key</span>
                      {hasOpenAI ? (
                        <span className="px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                          Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded-md">
                          Not Set
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-[11px] font-mono mt-1">
                      {keysData?.keys?.openai?.masked || 'Not configured'}
                    </p>
                  </div>

                  {hasOpenAI && (
                    <button
                      onClick={() => handleCopyKey('openai')}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-violet-600/30 text-violet-300 border border-violet-500/30 hover:bg-violet-600/50 transition-all text-xs font-semibold"
                    >
                      {copiedKeyType === 'openai' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="/settings"
                  className="text-violet-400 hover:underline text-xs flex items-center space-x-1"
                >
                  <span>Go to Settings to edit keys →</span>
                </a>
                <button
                  onClick={() => setShowAiGuide(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors"
                >
                  Got it, Open Canvas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
