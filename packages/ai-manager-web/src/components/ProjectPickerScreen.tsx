import React, { useState } from 'react';

interface ProjectPickerScreenProps {
  user: any;
  projects: any[];
  onboardingRequired?: boolean;
  onboardingMessage?: string;
  onSelectProject: (projectId: string) => void;
  onRefreshProjects: () => void;
  onLogout: () => void;
}

export const ProjectPickerScreen: React.FC<ProjectPickerScreenProps> = ({
  user,
  projects,
  onboardingRequired,
  onboardingMessage,
  onSelectProject,
  onRefreshProjects
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjId, setNewProjId] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName || !newProjId) {
      setErrorMsg('Project Name and Project ID are required.');
      return;
    }

    setCreating(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId: newProjId,
          projectName: newProjName,
          description: newProjDesc
        })
      });
      const data = await res.json();

      if (res.ok) {
        setShowCreateModal(false);
        setNewProjName('');
        setNewProjId('');
        setNewProjDesc('');
        onRefreshProjects();
      } else {
        setErrorMsg(data.error || 'Failed to create project.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove project '${projectId}' from your profile?`)) return;

    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefreshProjects();
      }
    } catch (err: any) {
      alert(`Delete Error: ${err.message}`);
    }
  };

  return (
    <div className="module-screen-container">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            👤 Profile: {user?.email}
          </div>
          <h1 className="hero-title">Your Codebase Workspaces</h1>
          <p className="hero-subtitle">
            User-isolated codebase projects linked to your account ({user?.email}).
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={onRefreshProjects}>
            🔄 Refresh List
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)} style={{ width: 'auto' }}>
            ➕ Create Workspace
          </button>
        </div>
      </div>

      {onboardingRequired && (
        <div className="ui-card" style={{ marginBottom: 28, background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
          <div className="card-header" style={{ borderColor: 'var(--primary)' }}>
            <span className="card-title" style={{ color: 'var(--primary)' }}>💡 Account Workspace Info</span>
            <span className="chip chip-primary">Info</span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {onboardingMessage || "Create your own workspace project or connect Google Drive."}
          </p>
        </div>
      )}

      {/* Projects Grid */}
      <div className="ui-card">
        <div className="card-header">
          <span className="card-title">User Account Projects ({projects.length})</span>
          <span className="chip chip-success">MongoDB User Isolated</span>
        </div>

        {projects.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📁</div>
            <h3 style={{ marginBottom: 8 }}>No Projects in Profile</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              You do not have any workspace projects created under {user?.email} yet.
            </p>
            <button className="btn-primary" style={{ width: 'auto', display: 'inline-flex' }} onClick={() => setShowCreateModal(true)}>
              ➕ Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid-3">
            {projects.map((proj: any) => (
              <div
                key={proj.projectId}
                onClick={() => onSelectProject(proj.projectId)}
                className="ui-card"
                style={{
                  background: 'var(--surface-2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span className="chip chip-primary">{proj.projectId}</span>
                  <button
                    onClick={(e) => handleDeleteProject(e, proj.projectId)}
                    style={{ fontSize: 14, color: 'var(--danger-text)', background: 'transparent', padding: '2px 6px' }}
                    title="Delete project from profile"
                  >
                    🗑️
                  </button>
                </div>
                <h3 style={{ fontSize: 18, marginBottom: 8 }}>{proj.projectName}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginBottom: 16 }}>
                  {proj.description || proj.metrics || 'User codebase workspace'}
                </p>
                <button className="btn-primary" style={{ marginTop: 'auto' }}>
                  Launch Workspace →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal Overlay */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="ui-card"
            style={{ width: 480, background: 'var(--surface)', padding: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <span className="card-title">Create Workspace Project</span>
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)} style={{ padding: '4px 8px' }}>
                ✕
              </button>
            </div>

            {errorMsg && (
              <div style={{ color: 'var(--danger-text)', background: 'var(--danger-light)', padding: 10, borderRadius: 6, marginBottom: 16 }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. My E-Commerce Microservice"
                  value={newProjName}
                  onChange={(e) => {
                    setNewProjName(e.target.value);
                    if (!newProjId) {
                      setNewProjId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'));
                    }
                  }}
                  required
                />
              </div>

              <div>
                <label className="form-label">Project ID / Slug</label>
                <input
                  type="text"
                  className="form-input mono"
                  placeholder="e.g. my-ecommerce-app"
                  value={newProjId}
                  onChange={(e) => setNewProjId(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Description (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Short workspace summary"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Workspace'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
