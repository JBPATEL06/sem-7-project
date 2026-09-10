import React, { useState } from 'react';
import { Database, Zap, CheckCircle2, AlertCircle, X, Shield, Server, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface ConnectDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (data: { name: string; type: string; uri: string }) => Promise<{ success: boolean; error?: string; latencyMs?: number }>;
}

export const ConnectDbModal: React.FC<ConnectDbModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [dbType, setDbType] = useState<'postgresql' | 'mongodb' | 'redis' | 'sqlite'>('postgresql');
  const [name, setName] = useState('');
  const [uri, setUri] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string; latencyMs?: number } | null>(null);

  if (!isOpen) return null;

  const handlePreset = (type: 'postgresql' | 'mongodb' | 'redis' | 'sqlite', presetName: string, presetUri: string) => {
    setDbType(type);
    setName(presetName);
    setUri(presetUri);
    setTestStatus(null);
  };

  const handleTestAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !uri.trim()) return;

    setIsTesting(true);
    setTestStatus(null);

    const res = await onConnect({
      name: name.trim(),
      type: dbType,
      uri: uri.trim()
    });

    setIsTesting(false);

    if (res.success) {
      setTestStatus({ success: true, message: `Connected successfully in ${res.latencyMs}ms`, latencyMs: res.latencyMs });
      setTimeout(() => {
        onClose();
        setName('');
        setUri('');
        setTestStatus(null);
      }, 1000);
    } else {
      setTestStatus({ success: false, message: res.error || 'Connection failed' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connect External Database</h3>
              <p className="text-[11px] text-muted-foreground">Link PostgreSQL/Supabase, MongoDB, or Redis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleTestAndConnect} className="p-4 space-y-4">
          {/* Database Engine Selector */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Database Engine</label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setDbType('postgresql'); setTestStatus(null); }}
                className={`p-2.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  dbType === 'postgresql'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Server className="w-4 h-4 mx-auto mb-1 text-sky-500" />
                PostgreSQL
              </button>

              <button
                type="button"
                onClick={() => { setDbType('mongodb'); setTestStatus(null); }}
                className={`p-2.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  dbType === 'mongodb'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Database className="w-4 h-4 mx-auto mb-1 text-emerald-500" />
                MongoDB
              </button>

              <button
                type="button"
                onClick={() => { setDbType('redis'); setTestStatus(null); }}
                className={`p-2.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  dbType === 'redis'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Zap className="w-4 h-4 mx-auto mb-1 text-red-500" />
                Redis
              </button>

              <button
                type="button"
                onClick={() => { setDbType('sqlite'); setTestStatus(null); }}
                className={`p-2.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                  dbType === 'sqlite'
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                }`}
              >
                <Shield className="w-4 h-4 mx-auto mb-1 text-amber-500" />
                SQLite
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="bg-muted/40 p-2.5 rounded-lg border border-border">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Quick Templates / Local Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                onClick={() => handlePreset('postgresql', 'Supabase Production', 'postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres')}
                className="cursor-pointer hover:bg-primary/20 hover:border-primary/40 text-[10px]"
              >
                ⚡ Supabase
              </Badge>
              <Badge
                variant="outline"
                onClick={() => handlePreset('postgresql', 'Local Docker Postgres', 'postgresql://postgres:postgres@localhost:5432/main')}
                className="cursor-pointer hover:bg-primary/20 hover:border-primary/40 text-[10px]"
              >
                🐘 Local Postgres (5432)
              </Badge>
              <Badge
                variant="outline"
                onClick={() => handlePreset('mongodb', 'Local MongoDB Community', 'mongodb://localhost:27017/ai_manager')}
                className="cursor-pointer hover:bg-primary/20 hover:border-primary/40 text-[10px]"
              >
                🍃 Local Mongo (27017)
              </Badge>
              <Badge
                variant="outline"
                onClick={() => handlePreset('redis', 'Local Redis / Valkey', 'redis://localhost:6379')}
                className="cursor-pointer hover:bg-primary/20 hover:border-primary/40 text-[10px]"
              >
                🔴 Local Redis (6379)
              </Badge>
            </div>
          </div>

          {/* Connection Name */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Connection Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Supabase Production, Analytics DB"
              className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
          </div>

          {/* Connection URI */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Connection String / URI</label>
            <input
              type="text"
              required
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder={
                dbType === 'postgresql'
                  ? 'postgresql://user:password@host:5432/dbname'
                  : dbType === 'mongodb'
                  ? 'mongodb+srv://user:password@cluster.mongodb.net/dbname'
                  : dbType === 'redis'
                  ? 'redis://default:password@host:6379'
                  : '.ai-manager/dbs/custom.sqlite'
              }
              className="w-full font-mono bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-500" />
              Credentials are encrypted with AES-256-GCM before storage.
            </p>
          </div>

          {/* Test Status Feedback */}
          {testStatus && (
            <div
              className={`p-2.5 rounded-lg text-xs flex items-center space-x-2 ${
                testStatus.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-medium'
                  : 'bg-red-500/10 border border-red-500/30 text-red-500 font-medium'
              }`}
            >
              {testStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span className="truncate">{testStatus.message}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-8">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isTesting || !name.trim() || !uri.trim()}
              className="text-xs h-8 bg-primary hover:bg-primary/90 gap-1.5"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing & Connecting...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Test & Connect
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
