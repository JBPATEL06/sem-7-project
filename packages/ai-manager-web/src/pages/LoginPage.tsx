import React, { useState } from 'react';
import { Shield, KeyRound, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onNavigateToRegister: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateToRegister, onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-center items-center px-4 py-12 select-none">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="rounded-xl bg-primary flex justify-center items-center size-12 shadow-lg shadow-primary/20 mb-3">
            <span className="font-mono font-bold text-primary-foreground text-xl">{`>_`}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Manager Platform</h1>
          <p className="text-sm text-muted-foreground mt-1">Local-first database context indexer</p>
        </div>

        {/* Login Card */}
        <div className="bg-card border border-border rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
              <p className="text-xs text-muted-foreground">Access your workspace and project schemas</p>
            </div>
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <KeyRound className="size-4" />
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2.5 text-xs text-destructive">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@local.workspace"
                  className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-muted/40 border border-border rounded-lg pl-9 pr-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-primary text-primary-foreground font-medium py-2.5 px-4 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer shadow-md disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                Create an account
              </button>
            </p>
          </div>
        </div>

        {/* Security badge note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/80 mt-6 font-mono">
          <Shield className="size-3.5 text-accent" />
          <span>Local-first BCrypt + JWT Auth • Role-based access</span>
        </div>
      </div>
    </div>
  );
};
