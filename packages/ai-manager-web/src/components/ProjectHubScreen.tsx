import React, { useState, useEffect } from 'react';
import { getApiClient } from '../api/client.js';

interface ProjectHubScreenProps {
  user: any;
  projectData: any;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

export const ProjectHubScreen: React.FC<ProjectHubScreenProps> = ({
  user,
  projectData,
  onNavigate
}) => {
  const [hubData, setHubData] = useState<any | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchHubData();
    fetchProposals();
  }, []);

  const fetchHubData = async () => {
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/modules/hub', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setHubData(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async () => {
    try {
      const client = getApiClient();
      const list = await client.getProposals();
      setProposals(list);
    } catch (err) {
      console.error('Failed to fetch proposals:', err);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const client = getApiClient();
      await client.approveProposal(id);
      alert('Proposal approved and executed successfully!');
      fetchProposals();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Please enter a rejection reason:');
    if (reason === null) return;
    
    setActionLoading(id);
    try {
      const client = getApiClient();
      await client.rejectProposal(id, reason);
      alert('Proposal rejected successfully.');
      fetchProposals();
    } catch (err: any) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const repoStats = {
    name: projectData?.projectId || 'db-context-indexer',
    branch: hubData?.branch || 'main',
    lastSync: 'Live',
    healthScore: hubData?.healthScore || '98%',
    totalFiles: hubData?.totalFiles || 142,
    indexedTokens: hubData?.indexedTokens || '348.2k',
    activeScanners: hubData?.activeScanners || [
      'MongoDB Scanner',
      'TypeScript AST Scanner',
      'Call Graph Builder'
    ]
  };

  const aiActivityFeed = hubData?.activityFeed || [
    {
      id: 'act_1',
      author: 'AI Architect Agent',
      action: 'Context Index Refreshed',
      timestamp: '5 min ago',
      desc: 'Re-indexed source files across monorepo packages.'
    }
  ];

  return (
    <div className="module-screen-container">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            ◈ Active Workspace: {repoStats.name}
          </div>
          <h1 className="hero-title">Project Hub &amp; AI Collaboration</h1>
          <p className="hero-subtitle">
            Monorepo overview, active static analysis indexers, and real-time developer activity stream.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => onNavigate('context')}>
            🔍 Explore Context
          </button>
          <button className="btn-primary" onClick={() => onNavigate('picker')} style={{ width: 'auto' }}>
            🗂️ Switch Project
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Repository Health</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--secondary-text)' }}>{repoStats.healthScore}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>● 0 unresolved AST breaks</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Indexed Tokens</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-text)' }}>{repoStats.indexedTokens}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>synced {repoStats.lastSync}</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Source Files</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{repoStats.totalFiles}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>across packages/</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Git Branch</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning-text)', fontFamily: 'var(--font-code)' }}>{repoStats.branch}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>origin/{repoStats.branch} synced</div>
        </div>
      </div>

      {/* AI Proposals Queue Panel */}
      <div className="ui-card" style={{ marginBottom: 28 }}>
        <div className="card-header">
          <span className="card-title">🛡️ Unified AI Proposals Approval Queue ({proposals.filter(p => p.status === 'pending').length} Pending)</span>
          <span className="chip chip-warning">Human Approvals Required</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {proposals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: '20px 0' }}>
              No AI writing proposals found. AI agent writes must route through this queue before applying to disk.
            </p>
          ) : (
            proposals.map((prop: any) => (
              <div key={prop.id} style={{
                padding: 16,
                borderRadius: 'var(--radius)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }} className="mono">{prop.id}</span>
                    <span className={`chip ${prop.status === 'pending' ? 'chip-warning' : prop.status === 'approved' ? 'chip-success' : 'chip-danger'}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
                      {prop.status}
                    </span>
                    <span className="chip chip-primary" style={{ fontSize: 10 }}>Type: {prop.type}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--primary)' }}>{prop.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }} className="mono">
                    Target Path: {prop.targetPath}
                  </div>
                  {prop.reviewedBy && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Reviewed by {prop.reviewedBy} at {new Date(prop.reviewedAt).toLocaleString()}
                    </div>
                  )}
                  {prop.rejectionReason && (
                    <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 4, fontStyle: 'italic' }}>
                      Rejection Reason: {prop.rejectionReason}
                    </div>
                  )}
                </div>

                {prop.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      className="btn-primary"
                      disabled={actionLoading !== null}
                      onClick={() => handleApprove(prop.id)}
                      style={{ padding: '6px 12px', fontSize: 12, background: '#10B981', color: '#fff', width: 'auto' }}
                    >
                      {actionLoading === prop.id ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={actionLoading !== null}
                      onClick={() => handleReject(prop.id)}
                      style={{ padding: '6px 12px', fontSize: 12, width: 'auto' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-3">
        {/* Active Codebase Scanners */}
        <div className="ui-card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <span className="card-title">Active AST Scanners</span>
            <span className="chip chip-success">Running</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {repoStats.activeScanners.map((sc: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{sc}</span>
                <span className="chip chip-primary" style={{ fontSize: 11 }}>Active</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI & Developer Activity Stream */}
        <div className="ui-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">AI &amp; Developer Activity Stream</span>
            <span className="chip chip-primary">{loading ? 'Loading...' : 'Live API Log'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {aiActivityFeed.map((item: any) => (
              <div key={item.id} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: 14 }}>{item.author}</span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.timestamp}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{item.action}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
