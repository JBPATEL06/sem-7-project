import React, { useState, useEffect } from 'react';

interface SettingsScreenProps {
  user: any;
  projects: any[];
  activeProjectId?: string;
  onClose: () => void;
  onRefreshUser: () => void;
  onRefreshProjects: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  projects,
  activeProjectId,
  onClose,
  onRefreshUser,
  onRefreshProjects
}) => {
  const [activeTab, setActiveTab] = useState<'pairing' | 'github' | 'groq'>('pairing');

  // Device Pairing State
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingExpiry, setPairingExpiry] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // GitHub State
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState(user?.githubUsername || '');
  const [selectedProjectId, setSelectedProjectId] = useState(activeProjectId || projects[0]?.projectId || '');
  const [githubRepo, setGithubRepo] = useState('');
  const [savingGithub, setSavingGithub] = useState(false);
  const [githubMsg, setGithubMsg] = useState('');

  // Groq BYOK State
  const [groqKey, setGroqKey] = useState('');
  const [savingGroq, setSavingGroq] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqStatusMsg, setGroqStatusMsg] = useState('');
  const [groqSuccess, setGroqSuccess] = useState<boolean | null>(user?.hasGroqKey ? true : null);

  useEffect(() => {
    onRefreshUser();
  }, []);

  useEffect(() => {
    if (user?.githubUsername) setGithubUsername(user.githubUsername);
    if (activeProjectId) setSelectedProjectId(activeProjectId);
  }, [user, activeProjectId]);

  const handleGeneratePairingCode = async () => {
    setGeneratingCode(true);
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/auth/device-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPairingCode(data.code);
        setPairingExpiry(new Date(data.expiresAt).toLocaleTimeString());
      } else {
        alert(data.error || 'Failed to generate pairing code.');
      }
    } catch (err: any) {
      alert(`Error generating pairing code: ${err.message}`);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGithub(true);
    setGithubMsg('');
    try {
      const token = localStorage.getItem('ai_manager_token');
      if (githubToken && githubUsername) {
        const linkRes = await fetch('/api/auth/github/link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            githubAccessToken: githubToken,
            githubUsername: githubUsername
          })
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok) {
          setGithubMsg(`GitHub Link Error: ${linkData.error}`);
          setSavingGithub(false);
          return;
        }
      }

      if (selectedProjectId && githubRepo) {
        const projRes = await fetch(`/api/projects/${selectedProjectId}/github`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ githubRepo })
        });
        const projData = await projRes.json();
        if (!projRes.ok) {
          setGithubMsg(`Project Repo Error: ${projData.error}`);
          setSavingGithub(false);
          return;
        }
      }

      setGithubMsg('✔ GitHub account and project repository updated securely!');
      setGithubToken('');
      onRefreshUser();
      onRefreshProjects();
    } catch (err: any) {
      setGithubMsg(`Error saving GitHub settings: ${err.message}`);
    } finally {
      setSavingGithub(false);
    }
  };

  const handleSaveGroqKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groqKey) return;
    setSavingGroq(true);
    setGroqStatusMsg('');
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/auth/groq/key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groqApiKey: groqKey })
      });
      const data = await res.json();
      if (res.ok) {
        setGroqStatusMsg('✔ Groq API key saved with AES-256-GCM encryption at rest.');
        setGroqKey('');
        setGroqSuccess(true);
        onRefreshUser();
      } else {
        setGroqStatusMsg(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setGroqStatusMsg(`Error saving key: ${err.message}`);
    } finally {
      setSavingGroq(false);
    }
  };

  const handleTestGroqConnection = async () => {
    setTestingGroq(true);
    setGroqStatusMsg('');
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/auth/groq/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ groqApiKey: groqKey || undefined })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGroqSuccess(true);
        setGroqStatusMsg(`✔ Connection Succeeded! Connected to Groq API (${data.modelsCount} models available).`);
      } else {
        setGroqSuccess(false);
        setGroqStatusMsg(`✖ ${data.error || 'Groq API connection test failed.'}`);
      }
    } catch (err: any) {
      setGroqSuccess(false);
      setGroqStatusMsg(`Error testing connection: ${err.message}`);
    } finally {
      setTestingGroq(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'var(--surface-color, #1A1D24)',
        border: '1px solid var(--border-color, #2D3139)',
        borderRadius: '12px',
        width: '640px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color, #2D3139)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚙️</span>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-color, #FFFFFF)' }}>
              Settings & Account Unification
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B949E',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Header */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-color, #2D3139)',
          backgroundColor: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={() => setActiveTab('pairing')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'pairing' ? 'var(--surface-color, #1A1D24)' : 'transparent',
              color: activeTab === 'pairing' ? '#4EDEA3' : '#8B949E',
              fontWeight: activeTab === 'pairing' ? 600 : 400,
              borderBottom: activeTab === 'pairing' ? '2px solid #4EDEA3' : 'none',
              cursor: 'pointer'
            }}
          >
            💻 CLI Pairing
          </button>
          <button
            onClick={() => setActiveTab('github')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'github' ? 'var(--surface-color, #1A1D24)' : 'transparent',
              color: activeTab === 'github' ? '#ADC6FF' : '#8B949E',
              fontWeight: activeTab === 'github' ? 600 : 400,
              borderBottom: activeTab === 'github' ? '2px solid #ADC6FF' : 'none',
              cursor: 'pointer'
            }}
          >
            🐙 GitHub Link
          </button>
          <button
            onClick={() => setActiveTab('groq')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === 'groq' ? 'var(--surface-color, #1A1D24)' : 'transparent',
              color: activeTab === 'groq' ? '#FFB95F' : '#8B949E',
              fontWeight: activeTab === 'groq' ? 600 : 400,
              borderBottom: activeTab === 'groq' ? '2px solid #FFB95F' : 'none',
              cursor: 'pointer'
            }}
          >
            ⚡ Groq BYOK
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: DEVICE PAIRING */}
          {activeTab === 'pairing' && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color, #FFF)' }}>Link Local CLI Workstation</h4>
              <p style={{ color: '#8B949E', fontSize: '13px', margin: '0 0 16px 0' }}>
                Associate your local terminal CLI (`dbci`) directly with your canonical Web User ID ({user?.id}).
              </p>

              {pairingCode ? (
                <div style={{
                  padding: '20px',
                  borderRadius: '8px',
                  backgroundColor: '#10131A',
                  border: '1px solid #4EDEA3',
                  textAlign: 'center',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginBottom: '4px' }}>YOUR PAIRING CODE</div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    letterSpacing: '4px',
                    color: '#4EDEA3',
                    fontFamily: 'monospace',
                    marginBottom: '12px'
                  }}>
                    {pairingCode}
                  </div>
                  <p style={{ fontSize: '13px', color: '#C5D0E6', margin: '0 0 10px 0' }}>
                    Run this command in your local terminal:
                  </p>
                  <code style={{
                    display: 'block',
                    padding: '8px 12px',
                    backgroundColor: '#1E222B',
                    borderRadius: '4px',
                    color: '#FFB95F',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    marginBottom: '10px'
                  }}>
                    dbci pair {pairingCode}
                  </code>
                  <span style={{ fontSize: '11px', color: '#8B949E' }}>
                    Expires at {pairingExpiry} (10-minute TTL)
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleGeneratePairingCode}
                  disabled={generatingCode}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#4EDEA3',
                    color: '#0B1326',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '20px'
                  }}
                >
                  {generatingCode ? 'Generating Code...' : '🔗 Generate Device Pairing Code'}
                </button>
              )}

              <h5 style={{ margin: '16px 0 8px 0', color: '#ADC6FF' }}>Paired CLI Devices ({user?.pairedDevicesCount || 0})</h5>
              {user?.pairedDevices && user.pairedDevices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {user.pairedDevices.map((d: any, idx: number) => (
                    <div key={idx} style={{
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: '#10131A',
                      border: '1px solid #272A31',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px'
                    }}>
                      <span style={{ color: '#FFF', fontWeight: 500 }}>💻 {d.deviceName}</span>
                      <span style={{ color: '#8B949E', fontSize: '11px' }}>
                        Paired {new Date(d.pairedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#8B949E', fontSize: '12px', fontStyle: 'italic' }}>No local CLI devices paired yet.</p>
              )}
            </div>
          )}

          {/* TAB 2: GITHUB OAUTH & REPO LINKING */}
          {activeTab === 'github' && (
            <form onSubmit={handleSaveGithub}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color, #FFF)' }}>GitHub Access & Project Repo Linking</h4>
              <p style={{ color: '#8B949E', fontSize: '13px', margin: '0 0 16px 0' }}>
                Link your GitHub account token (AES-256-GCM encrypted at rest) to enable live code previews and issue tracking.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#ADC6FF', marginBottom: '4px' }}>
                  GitHub Username
                </label>
                <input
                  type="text"
                  placeholder="e.g. octocat"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #272A31',
                    backgroundColor: '#10131A',
                    color: '#FFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#ADC6FF', marginBottom: '4px' }}>
                  GitHub Personal Access Token (repo scope)
                </label>
                <input
                  type="password"
                  placeholder={user?.hasGithubToken ? '•••••••• (Encrypted token active — enter new token to update)' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #272A31',
                    backgroundColor: '#10131A',
                    color: '#FFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div style={{ borderTop: '1px solid #272A31', paddingTop: '14px', marginTop: '14px', marginBottom: '14px' }}>
                <h5 style={{ margin: '0 0 8px 0', color: '#FFB95F' }}>Link GitHub Repo to Project Workspace</h5>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #272A31',
                      backgroundColor: '#10131A',
                      color: '#FFF',
                      fontSize: '13px'
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.projectId} value={p.projectId}>
                        {p.projectName} ({p.projectId})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="owner/repository (e.g. facebook/react)"
                    value={githubRepo}
                    onChange={(e) => setGithubRepo(e.target.value)}
                    style={{
                      flex: 1.5,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #272A31',
                      backgroundColor: '#10131A',
                      color: '#FFF',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              {githubMsg && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: githubMsg.startsWith('✔') ? 'rgba(78, 222, 163, 0.1)' : 'rgba(255, 180, 171, 0.1)',
                  color: githubMsg.startsWith('✔') ? '#4EDEA3' : '#FFB4AB',
                  border: `1px solid ${githubMsg.startsWith('✔') ? '#4EDEA3' : '#FFB4AB'}`,
                  marginBottom: '14px'
                }}>
                  {githubMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={savingGithub}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ADC6FF',
                  color: '#0B1326',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {savingGithub ? 'Saving...' : '💾 Save GitHub Link Settings'}
              </button>
            </form>
          )}

          {/* TAB 3: GROQ BYOK SETUP */}
          {activeTab === 'groq' && (
            <form onSubmit={handleSaveGroqKey}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-color, #FFF)' }}>Groq AI Provider (BYOK)</h4>
              <p style={{ color: '#8B949E', fontSize: '13px', margin: '0 0 16px 0' }}>
                Store your personal Groq API key securely with AES-256-GCM encryption at rest. Keys are never logged or exposed.
              </p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#FFB95F', marginBottom: '4px' }}>
                  Groq API Key (`gsk_...`)
                </label>
                <input
                  type="password"
                  placeholder={user?.hasGroqKey ? '•••••••••••• (Encrypted key saved — enter new key to overwrite)' : 'gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #272A31',
                    backgroundColor: '#10131A',
                    color: '#FFF',
                    fontSize: '13px'
                  }}
                />
              </div>

              {groqStatusMsg && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: groqSuccess ? 'rgba(78, 222, 163, 0.1)' : 'rgba(255, 180, 171, 0.1)',
                  color: groqSuccess ? '#4EDEA3' : '#FFB4AB',
                  border: `1px solid ${groqSuccess ? '#4EDEA3' : '#FFB4AB'}`,
                  marginBottom: '14px'
                }}>
                  {groqStatusMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={savingGroq || !groqKey}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#FFB95F',
                    color: '#0B1326',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: groqKey ? 'pointer' : 'not-allowed',
                    opacity: groqKey ? 1 : 0.6
                  }}
                >
                  {savingGroq ? 'Saving Encrypted Key...' : '🔒 Save Encrypted Key'}
                </button>

                <button
                  type="button"
                  onClick={handleTestGroqConnection}
                  disabled={testingGroq || (!groqKey && !user?.hasGroqKey)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#4EDEA3',
                    border: '1px solid #4EDEA3',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {testingGroq ? 'Testing Ping...' : '⚡ Test Connection'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
