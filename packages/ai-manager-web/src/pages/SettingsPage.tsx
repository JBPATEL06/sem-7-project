import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Check, Loader2, AlertCircle, KeyRound, Eye, EyeOff, Trash2, X, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../hooks/useSettings';

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
    resetAllData
  } = useSettings();

  // Modal editing state
  const [editingKeyType, setEditingKeyType] = useState<'groq' | 'github' | 'openai' | null>(null);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);

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
    if (window.confirm('Are you sure you want to permanently reset all SQLite databases and indexed context? This action cannot be undone.')) {
      const res = await resetAllData();
      if (res.success) {
        setResetFeedback('✓ All indexed SQLite databases have been deleted and reset to clean state.');
      } else {
        setResetFeedback(`✗ Error resetting data: ${res.error}`);
      }
      setTimeout(() => setResetFeedback(null), 5000);
    }
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
              const displayValue = isConfigured
                ? isRevealed
                  ? revealedVal
                  : entry?.masked
                : 'Not configured';

              return (
                <div key={item.id} className="flex py-4 justify-between items-center gap-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
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
                    </div>
                    <span className="font-mono text-muted-foreground text-xs select-all">
                      {isLoading ? 'Loading...' : displayValue}
                    </span>
                    <span className="text-muted-foreground text-[11px] hidden sm:block">
                      {item.description}
                    </span>
                  </div>

                  <div className="flex items-center shrink-0 gap-2">
                    {isConfigured && (
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
                  onChange={(e) => setKeyInputValue(e.target.value)}
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

              <div className="flex justify-end items-center gap-2 pt-2">
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
            </form>
          </div>
        </div>
      )}
    </main>
  );
};
