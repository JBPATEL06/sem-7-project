import React, { useState } from 'react';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess, theme = 'dark', onToggleTheme }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const mockGoogleUser = {
        email: email || 'elluminati.developer@gmail.com',
        googleId: 'g_1092837465'
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockGoogleUser)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Authentication failed');
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center-screen" style={{ background: 'var(--bg)', position: 'relative' }}>
      {onToggleTheme && (
        <button
          className="theme-toggle-btn"
          style={{ position: 'absolute', top: 24, right: 24 }}
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      )}

      <div className="ui-card" style={{ width: 420, padding: 36 }}>
        <div className="brand-container" style={{ justifyContent: 'center', marginBottom: 28 }}>
          <div className="brand-logo" style={{ width: 40, height: 40, fontSize: 18 }}>AI</div>
          <span className="brand-title" style={{ fontSize: 22 }}>AI Manager</span>
        </div>

        <div style={{ display: 'flex', background: 'var(--surface-2)', padding: 4, borderRadius: 'var(--radius)', marginBottom: 24, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`nav-module-btn ${mode === 'login' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`nav-module-btn ${mode === 'register' ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="chip chip-danger" style={{ width: '100%', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 20, justifyContent: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="btn-secondary"
          style={{ width: '100%', padding: '12px', justifyContent: 'center', gap: 10, marginBottom: 20 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, color: 'var(--text-muted)', fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span>or email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="developer@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: 12, top: 34, color: 'var(--text-secondary)', fontSize: 12 }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
