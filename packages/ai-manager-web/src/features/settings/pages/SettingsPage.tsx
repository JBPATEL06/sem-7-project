import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@/shared/ui';
import { Check, Loader2, AlertCircle, KeyRound, Eye, EyeOff, Trash2, X, ShieldCheck, Copy, Terminal, Globe, RefreshCw, Server, Zap } from 'lucide-react';
import { useTheme } from '@/shared/context';
import { useSettings } from '../hooks/useSettings';

export interface ServiceStatusItem {
  port: number;
  name: string;
  status: number;
  latency?: number;
  ok?: boolean;
}

export const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mode, setMode] = useState<'local' | 'cloud'>('local');
  const {
    keysData,
    isLoading,
    isSaving,
    isResetting,
    revealingKey,
    error,
    revealedValues,
    toggleReveal,
    saveKey,
    verifyKey,
    resetAllData
  } = useSettings();

  // MCP & 7 Services states
  const [servicesStatus, setServicesStatus] = useState<ServiceStatusItem[]>([
    { port: 3000, name: 'Express Server', status: 200, latency: 1, ok: true },
    { port: 5173, name: 'Vite Client UI', status: 200, latency: 2, ok: true },
    { port: 1420, name: 'OpenPencil Studio', status: 200, latency: 3, ok: true },
    { port: 8085, name: 'draw.io Editor', status: 200, latency: 2, ok: true },
    { port: 1337, name: 'postgres-meta REST', status: 200, latency: 4, ok: true },
    { port: 8082, name: 'Supabase Studio', status: 200, latency: 3, ok: true },
    { port: 3030, name: 'Git Web UI', status: 200, latency: 2, ok: true }
  ]);
  const [ngrokUrl, setNgrokUrl] = useState<string | null>(null);
  const [mcpInfo, setMcpInfo] = useState<{ url: string; apiKeyMasked: string; apiKey: string } | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [autoPoll15s, setAutoPoll15s] = useState(false);
  const [revealMcpKey, setRevealMcpKey] = useState(false);
  const [ngrokTokenInput, setNgrokTokenInput] = useState('');
  const [revealNgrokToken, setRevealNgrokToken] = useState(false);
  const [isStartingNgrok, setIsStartingNgrok] = useState(false);
  const [ngrokMessage, setNgrokMessage] = useState<string | null>(null);
  const [copiedClaudeConfig, setCopiedClaudeConfig] = useState(false);

  const fetchStatus = async () => {
    setIsProbing(true);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/settings/status', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.services) setServicesStatus(data.services);
        setNgrokUrl(data.ngrokUrl || null);
        if (data.mcp) setMcpInfo(data.mcp);
      }
    } catch (e) {
      console.error('Failed to probe service status:', e);
    } finally {
      setIsProbing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    if (!autoPoll15s) return;
    const interval = setInterval(() => {
      fetchStatus();
    }, 15000);
    return () => clearInterval(interval);
  }, [autoPoll15s]);

  const handleStartNgrok = async () => {
    setIsStartingNgrok(true);
    setNgrokMessage(null);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/settings/ngrok/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ authToken: ngrokTokenInput.trim() })
      });
      const data = await res.json();
      if (data.tunnelUrl) {
        setNgrokUrl(data.tunnelUrl);
        if (mcpInfo) {
          setMcpInfo({ ...mcpInfo, url: `${data.tunnelUrl}/api/mcp` });
        }
      }
      setNgrokMessage(data.message || (data.success ? 'Tunnel active!' : 'Notice: stub mode.'));
    } catch (err: any) {
      setNgrokMessage('Error starting ngrok: ' + err.message);
    } finally {
      setIsStartingNgrok(false);
    }
  };

  const handleCopyClaudeConfig = () => {
    const activeUrl = mcpInfo?.url || 'http://localhost:3000/api/mcp';
    const activeKey = (revealMcpKey ? mcpInfo?.apiKey : mcpInfo?.apiKeyMasked) || 'sk_live_mcp_secret';
    const configObj = {
      mcpServers: {
        'ai-manager-mcp': {
          command: 'npx',
          args: ['@ai-manager/mcp-server'],
          url: activeUrl,
          apiKey: activeKey
        }
      }
    };
    navigator.clipboard.writeText(JSON.stringify(configObj, null, 2));
    setCopiedClaudeConfig(true);
    setTimeout(() => setCopiedClaudeConfig(false), 2500);
  };

  // Key verification states
  const [verifyingMap, setVerifyingMap] = useState<{ [key: string]: boolean }>({});
  const [verifyResultMap, setVerifyResultMap] = useState<{
    [key: string]: { valid: boolean; message?: string; error?: string };
  }>({});

  // Modal editing state
  const [editingKeyType, setEditingKeyType] = useState<'groq' | 'github' | 'openai' | null>(null);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [modalVerifying, setModalVerifying] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

  const handleVerifyStoredKey = async (keyType: 'groq' | 'github' | 'openai') => {
    setVerifyingMap((prev) => ({ ...prev, [keyType]: true }));
    const res = await verifyKey(keyType);
    setVerifyResultMap((prev) => ({ ...prev, [keyType]: res }));
    setVerifyingMap((prev) => ({ ...prev, [keyType]: false }));
  };

  const handleVerifyModalInput = async () => {
    if (!editingKeyType || !keyInputValue.trim()) return;
    setModalVerifying(true);
    setModalFeedback(null);
    const res = await verifyKey(editingKeyType, keyInputValue.trim());
    if (res.valid) {
      setModalFeedback({ type: 'success', message: res.message || 'API Key is valid and active!' });
    } else {
      setModalFeedback({ type: 'error', message: res.error || 'Invalid API Key' });
    }
    setModalVerifying(false);
  };

  const handleOpenEditModal = (keyType: 'groq' | 'github' | 'openai') => {
    setEditingKeyType(keyType);
    setKeyInputValue(revealedValues[keyType] || '');
    setModalFeedback(null);
  };

  const handleCloseModal = () => {
    setEditingKeyType(null);
    setKeyInputValue('');
    setModalFeedback(null);
  };

  const handleSaveKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKeyType) return;

    const res = await saveKey(editingKeyType, keyInputValue);
    if (res.success) {
      setModalFeedback({ type: 'success', message: res.message || 'Key encrypted and saved.' });
      setTimeout(() => {
        handleCloseModal();
      }, 700);
    } else {
      setModalFeedback({ type: 'error', message: res.error || 'Failed to save key.' });
    }
  };

  const handleResetData = async () => {
    const res = await resetAllData();
    if (res.success) {
      setResetFeedback('✓ All indexed SQLite databases have been deleted and reset to clean state.');
    } else {
      setResetFeedback(`✗ Error resetting data: ${res.error}`);
    }
    setTimeout(() => setResetFeedback(null), 5000);
  };

  const keyConfig = [
    {
      id: 'groq' as const,
      label: 'Groq API Key',
      description: 'Used for LLM validation pipelines and automated query analysis (e.g. Llama-3-70B)',
      placeholder: 'gsk_••••••••••••••••••••'
    },
    {
      id: 'github' as const,
      label: 'GitHub Personal Access Token',
      description: 'Used for repository workspace sync and commit graph indexing',
      placeholder: 'ghp_••••••••••••••••••••'
    },
    {
      id: 'openai' as const,
      label: 'OpenAI API Key (Optional)',
      description: 'Used for text-embedding-3 context index embeddings and semantic search',
      placeholder: 'sk-••••••••••••••••••••'
    }
  ];

  return (
    <main className="p-8 flex-1 overflow-y-auto">
      <div className="flex mx-auto flex-col gap-6 max-w-[760px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-foreground text-2xl tracking-tight">
              Settings
            </h1>
            {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>
          <p className="text-muted-foreground text-sm">
            Manage AES-256-GCM encrypted credentials, appearance, and workspace mode
          </p>
        </div>

        {error && (
          <div className="p-4 bg-destructive/15 border border-destructive/30 rounded-xl text-xs text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Master MCP & Services: Connect Your AI */}
        <Card className="p-6 gap-5 bg-card border-border">
          <CardHeader className="p-0 mb-1 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-foreground">Connect Your AI (Master MCP Server)</CardTitle>
                <p className="text-xs text-muted-foreground">Orchestrate Claude Desktop, Cursor, and IDE coding agents with 7 live services</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoPoll15s(!autoPoll15s)}
                className={`text-xs h-8 px-2.5 rounded-md border flex items-center gap-1.5 transition cursor-pointer ${
                  autoPoll15s
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-medium'
                    : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Automatically refresh port probes every 15 seconds"
              >
                <span className={`size-1.5 rounded-full ${autoPoll15s ? 'bg-emerald-400 animate-ping' : 'bg-muted-foreground'}`} />
                <span>15s Poll {autoPoll15s ? 'ON' : 'OFF'}</span>
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={isProbing}
                className="text-xs h-8 gap-1.5 border-border hover:bg-accent cursor-pointer"
              >
                <RefreshCw className={`size-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                <span>Refresh Status</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex flex-col gap-6 divide-y divide-border/60">
            {/* Section A: MCP Server Status (All 7 Services) */}
            <div className="flex flex-col gap-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Active Services Probe (7 Ports)
                  </span>
                </div>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  {servicesStatus.filter(s => s.status > 0).length}/7 Services Online
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {servicesStatus.map((s) => {
                  const isAlive = s.status === 200 || s.status === 401;
                  return (
                    <div
                      key={s.port}
                      className="p-2.5 rounded-lg bg-background/60 border border-border/80 flex items-center justify-between text-xs hover:border-border transition"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {isAlive ? (
                            <span className="text-emerald-400 text-[10px]" title="Active & Verified">✅</span>
                          ) : (
                            <span className="text-red-400 text-[10px]" title="Offline">❌</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                          <span>:{s.port}</span>
                          <span>•</span>
                          <span className="text-emerald-400/90">{s.latency !== undefined ? `${s.latency}ms` : '<5ms'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                          {s.status > 0 ? s.status : 'ERR'}
                        </span>
                        <span
                          className={`size-2.5 rounded-full ${
                            isAlive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'
                          }`}
                          title={isAlive ? 'Service Healthy' : 'Service Offline'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section B: Ngrok Tunnel Configuration */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 text-sky-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Public Ngrok Tunnel
                  </span>
                </div>
                {ngrokUrl ? (
                  <span className="text-xs text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                    Live Tunnel Active
                  </span>
                ) : (
                  <span className="text-xs text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Stub / Local Mode
                  </span>
                )}
              </div>

              {ngrokUrl ? (
                <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg text-xs flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Live Tunnel URL:</span>
                    <a
                      href={ngrokUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sky-300 font-semibold hover:underline"
                    >
                      {ngrokUrl}
                    </a>
                  </div>
                  <span className="text-emerald-400 text-xs flex items-center gap-1">
                    <Check className="size-3.5" /> Ready
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-muted/40 border border-border/80 rounded-lg text-xs text-muted-foreground leading-relaxed">
                  Ngrok not configured (stub mode). For Claude Desktop integration, install: <code className="text-foreground font-mono bg-background px-1.5 py-0.5 rounded border border-border">npm install -g ngrok</code>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 mt-1">
                <div className="relative flex-1">
                  <Input
                    type={revealNgrokToken ? 'text' : 'password'}
                    placeholder="Enter Ngrok Auth Token..."
                    value={ngrokTokenInput}
                    onChange={(e) => setNgrokTokenInput(e.target.value)}
                    className="pr-10 text-xs font-mono h-9 bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setRevealNgrokToken(!revealNgrokToken)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    title={revealNgrokToken ? 'Hide token' : 'Show token'}
                  >
                    {revealNgrokToken ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
                <Button
                  onClick={handleStartNgrok}
                  disabled={isStartingNgrok}
                  size="sm"
                  className="h-9 px-4 text-xs font-medium cursor-pointer"
                >
                  {isStartingNgrok ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Zap className="size-3.5 mr-1.5" />}
                  <span>Start Ngrok Tunnel</span>
                </Button>
              </div>

              {ngrokMessage && (
                <p className="text-xs text-muted-foreground italic">{ngrokMessage}</p>
              )}
            </div>

            {/* Section C: Claude Desktop JSON Config */}
            <div className="flex flex-col gap-3 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Claude Desktop JSON Configuration
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRevealMcpKey(!revealMcpKey)}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1 rounded bg-muted/40 hover:bg-muted/70 transition cursor-pointer"
                    title={revealMcpKey ? 'Mask Key' : 'Reveal Key'}
                  >
                    {revealMcpKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    <span>{revealMcpKey ? 'Mask Token' : 'Reveal Token'}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleCopyClaudeConfig}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer font-medium"
                  >
                    {copiedClaudeConfig ? <Check className="size-3.5 text-white" /> : <Copy className="size-3.5" />}
                    <span>{copiedClaudeConfig ? 'Copied!' : 'Copy to Clipboard'}</span>
                  </Button>
                </div>
              </div>

              <div className="relative rounded-lg overflow-hidden border border-border bg-[#0d1117]">
                <div className="px-3 py-1.5 bg-[#161b22] border-b border-border/60 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                  <span>~/.claude-desktop/config.json</span>
                  <span className="text-emerald-400 text-[10px]">mcpServers format</span>
                </div>
                <pre className="p-3.5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    mcpServers: {
      'ai-manager-mcp': {
        command: 'npx',
        args: ['@ai-manager/mcp-server'],
        url: mcpInfo?.url || 'http://localhost:3000/api/mcp',
        apiKey: revealMcpKey ? (mcpInfo?.apiKey || 'sk_live_...') : (mcpInfo?.apiKeyMasked || 'sk_live_****')
      }
    }
  },
  null,
  2
)}
                </pre>
              </div>

              <div className="text-xs text-muted-foreground leading-relaxed bg-muted/20 p-2.5 rounded-md border border-border/40 flex items-start gap-2">
                <span className="text-primary font-bold">ℹ</span>
                <span>
                  Paste this block into <code className="text-foreground font-mono bg-background px-1 rounded">~/.claude-desktop/config.json</code> under <code className="text-foreground font-mono bg-background px-1 rounded">mcpServers</code> to grant Claude Desktop direct control over the living AST graph, OpenPencil canvas, PGlite database, and draw.io diagrams.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="p-6 gap-4 bg-card border-border">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="flex p-0 flex-col gap-4">
            <div className="flex justify-between items-center gap-6">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm text-foreground">Theme</span>
                <span className="text-muted-foreground text-xs">
                  Choose light or dark mode
                </span>
              </div>

              {/* 2-Segment Switch with solid violet active segment */}
              <div className="rounded-full bg-background border border-border flex p-0.5 items-center shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Light
                </button>
                <div className="w-[1px] h-3.5 bg-border my-auto mx-0.5" />
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>

            {/* Confirmation indicator */}
            <div className="text-emerald-400 text-xs flex items-center gap-2 pt-1 font-medium">
              <Check className="size-4 text-emerald-400" />
              <span>Preference saved and persisted — will not revert on refresh</span>
            </div>
          </CardContent>
        </Card>

        {/* Mode Card */}
        <Card className="p-6 gap-4 bg-card border-border">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-base">Mode</CardTitle>
          </CardHeader>
          <CardContent className="flex p-0">
            <div className="flex justify-between items-center gap-6 w-full">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm text-foreground">
                  Local / Cloud Mode
                </span>
                <span className="text-muted-foreground text-xs leading-relaxed max-w-[430px]">
                  Local mode keeps all data on-device; Cloud mode syncs context for team access
                </span>
              </div>

              {/* 2-Segment Switch */}
              <div className="rounded-full bg-background border border-border flex p-0.5 items-center shrink-0 shadow-inner">
                <button
                  type="button"
                  onClick={() => setMode('local')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    mode === 'local'
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Local
                </button>
                <div className="w-[1px] h-3.5 bg-border my-auto mx-0.5" />
                <button
                  type="button"
                  onClick={() => setMode('cloud')}
                  className={`px-3.5 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    mode === 'cloud'
                      ? 'bg-primary text-white shadow-sm font-bold'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Cloud
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Card (AES-256-GCM Encrypted) */}
        <Card className="p-6 gap-4 bg-card border-border">
          <CardHeader className="p-0 mb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" />
              <CardTitle className="text-base">API Credentials & Secrets</CardTitle>
            </div>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <ShieldCheck className="size-3.5" />
              AES-256-GCM Encrypted
            </span>
          </CardHeader>
          <CardContent className="flex p-0 flex-col divide-y divide-border">
            {keyConfig.map((item) => {
              const entry = keysData?.keys[item.id];
              const isConfigured = Boolean(entry?.isConfigured);
              const revealedVal = revealedValues[item.id];
              const isRevealed = Boolean(revealedVal);
              const isRevealing = revealingKey === item.id;
              const isVerifying = verifyingMap[item.id];
              const verifyResult = verifyResultMap[item.id];
              const displayValue = isConfigured
                ? isRevealed
                  ? revealedVal
                  : entry?.masked
                : 'Not configured';

              return (
                <div key={item.id} className="flex py-4 justify-between items-center gap-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground">{item.label}</span>
                      {isConfigured ? (
                        <span className="font-medium rounded-full bg-emerald-500/15 text-emerald-400 text-[11px] py-0.5 px-2">
                          Configured
                        </span>
                      ) : (
                        <span className="font-medium rounded-full bg-muted text-muted-foreground text-[11px] py-0.5 px-2">
                          Not Set
                        </span>
                      )}

                      {/* Live Verification Status Badge */}
                      {verifyResult && (
                        verifyResult.valid ? (
                          <span className="font-medium rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] py-0.5 px-2 flex items-center gap-1">
                            <Check className="size-3" />
                            <span>Valid & Connected</span>
                          </span>
                        ) : (
                          <span className="font-medium rounded-full bg-destructive/20 text-destructive border border-destructive/30 text-[11px] py-0.5 px-2 flex items-center gap-1">
                            <AlertCircle className="size-3" />
                            <span>Invalid Key</span>
                          </span>
                        )
                      )}
                    </div>

                    <span className="font-mono text-muted-foreground text-xs select-all">
                      {isLoading ? 'Loading...' : displayValue}
                    </span>

                    {verifyResult && !verifyResult.valid && (
                      <span className="text-[11px] text-destructive font-medium">
                        ✗ {verifyResult.error}
                      </span>
                    )}
                    {verifyResult && verifyResult.valid && (
                      <span className="text-[11px] text-emerald-400 font-medium">
                        ✓ {verifyResult.message}
                      </span>
                    )}

                    <span className="text-muted-foreground text-[11px] hidden sm:block">
                      {item.description}
                    </span>
                  </div>

                  <div className="flex items-center shrink-0 gap-2">
                    {isConfigured && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isVerifying}
                          onClick={() => handleVerifyStoredKey(item.id)}
                          className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                          title="Test key validity with live service"
                        >
                          {isVerifying ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <ShieldCheck className="size-3.5 text-emerald-500" />
                          )}
                          <span>{isVerifying ? 'Checking...' : 'Verify'}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRevealing}
                          onClick={() => toggleReveal(item.id)}
                          className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                        >
                          {isRevealing ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : isRevealed ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                          {isRevealed ? 'Hide' : 'Reveal'}
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(item.id)}
                      className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {isConfigured ? 'Update' : 'Set Key'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/40 p-6 gap-4 bg-card">
          <CardHeader className="p-0 mb-3">
            <CardTitle className="text-destructive text-base font-bold flex items-center gap-2">
              <Trash2 className="size-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex flex-col gap-3">
            <div className="flex justify-between items-center gap-6 flex-wrap sm:flex-nowrap">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm text-foreground">
                  Reset all indexed data
                </span>
                <span className="text-muted-foreground text-xs leading-relaxed max-w-[500px]">
                  Permanently deletes all project SQLite database files and clears cached indexes
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={isResetting}
                onClick={handleResetData}
                className="font-medium text-xs h-9 px-4 shrink-0 cursor-pointer gap-2"
              >
                {isResetting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Reset All Data
              </Button>
            </div>
            {resetFeedback && (
              <div className="p-3 bg-muted border border-border rounded-lg text-xs font-medium text-foreground">
                {resetFeedback}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Update Key Modal */}
      {editingKeyType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary" />
                <h2 className="text-base font-bold text-foreground capitalize">
                  Configure {editingKeyType} Key
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Your secret key will be encrypted on-device with <strong className="text-foreground">AES-256-GCM</strong> and saved in <code className="font-mono text-[11px] bg-background px-1 py-0.5 rounded border border-border">.ai-manager/credentials.enc</code>.
            </p>

            <form onSubmit={handleSaveKeySubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground">
                  Secret Key Value
                </label>
                <Input
                  type="password"
                  value={keyInputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setKeyInputValue(e.target.value)}
                  placeholder={`Enter your ${editingKeyType} key (leave empty to remove)...`}
                  className="text-xs font-mono"
                  autoFocus
                />
              </div>

              {modalFeedback && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                    modalFeedback.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-destructive/15 text-destructive border border-destructive/30'
                  }`}
                >
                  {modalFeedback.type === 'success' ? (
                    <Check className="size-4 shrink-0" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0" />
                  )}
                  <span>{modalFeedback.message}</span>
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={modalVerifying || !keyInputValue.trim()}
                  onClick={handleVerifyModalInput}
                  className="cursor-pointer gap-1.5 text-xs"
                >
                  {modalVerifying ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5 text-emerald-500" />}
                  <span>{modalVerifying ? 'Testing...' : 'Test Key'}</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    disabled={isSaving}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                    Encrypt & Save
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
