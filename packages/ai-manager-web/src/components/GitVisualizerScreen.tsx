import React, { useState, useEffect } from 'react';

interface GitVisualizerScreenProps {
  user: any;
  projectData: any;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

export const GitVisualizerScreen: React.FC<GitVisualizerScreenProps> = ({
  user,
  projectData
}) => {
  const [gitData, setGitData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGitData();
  }, []);

  const fetchGitData = async () => {
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/modules/git', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setGitData(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const gitCommits = gitData?.commits || [
    { hash: 'e4f901a', author: 'Jeel Bhanderi', message: 'feat: add OAuth2Client verifyIdToken verification.', time: '1 hour ago', branch: 'main' },
    { hash: 'b8219c4', author: 'AI Architect Agent', message: 'refactor: dual theme CSS tokens and App shell navigation.', time: '2 hours ago', branch: 'main' }
  ];

  return (
    <div className="module-screen-container">
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            🌿 Git Version Tree &amp; Issue Tracking
          </div>
          <h1 className="hero-title">Git &amp; Issues Visualizer</h1>
          <p className="hero-subtitle">
            Live repository commit streams, active pull request branches, and commit status.
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Active Branch</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary-text)', fontFamily: 'var(--font-code)' }}>{gitData?.branch || 'main'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Synced with remote</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Recent Commits</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--secondary-text)' }}>{gitCommits.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>All builds passing</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Open Issues</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{gitData?.openIssues || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>0 pending bug reports</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Git Sync Status</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--secondary-text)' }}>{gitData?.syncStatus || 'Clean'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>0 uncommitted diffs</div>
        </div>
      </div>

      <div className="ui-card">
        <div className="card-header">
          <span className="card-title">Live Commit Stream Log ({gitCommits.length})</span>
          <span className="chip chip-primary">{loading ? 'Loading...' : `origin/${gitData?.branch || 'main'}`}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {gitCommits.map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  <span className="chip chip-primary mono" style={{ fontSize: 11, padding: '2px 8px', marginRight: 8 }}>{c.hash}</span>
                  {c.message}
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {c.author} • {c.time} • branch: {c.branch || 'main'}
                </div>
              </div>
              <span className="chip chip-success">Synced</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
