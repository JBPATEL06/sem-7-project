import React, { useState, useEffect } from 'react';
import { getApiClient } from '../api/client';

interface DashboardScreenProps {
  user: any;
  projectData: any;
  onSwitchProject: () => void;
  onLogout: () => void;
  onNavigate?: (module: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  projectData,
  onSwitchProject
}) => {
  const [topTab, setTopTab] = useState<'Overview' | 'Database queries' | 'Functions' | 'Call graph' | 'Discussions'>('Overview');
  const [selectedFunction, setSelectedFunction] = useState<any | null>(null);

  const [liveCode, setLiveCode] = useState<string | null>(null);
  const [liveCodeLoading, setLiveCodeLoading] = useState(false);
  const [liveCodeError, setLiveCodeError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  // Live Backend Context States
  const [plans, setPlans] = useState<any[]>([]);
  const [threads, setThreads] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [queries, setQueries] = useState<any[]>([]);
  const [callGraph, setCallGraph] = useState<any | null>(null);

  // Grounded Chat States
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; groundedContext?: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Load Context Data on mount/project change
  useEffect(() => {
    const loadContextData = async () => {
      try {
        const client = getApiClient();
        const pId = projectData?.projectId || 'db-context-indexer';
        const [plansList, proposalsList, queriesList, graphData, discussionsData, decisionsData] = await Promise.all([
          client.getPlans(pId),
          client.getProposals(pId),
          client.getQueries(),
          client.getCallGraph(),
          client.getDiscussions(),
          client.getDecisions()
        ]);
        setPlans(plansList);
        setProposals(proposalsList);
        setQueries(queriesList);
        setCallGraph(graphData);
        setThreads(discussionsData.threads || []);
        setDecisions(discussionsData.decisions || decisionsData.decisions || []);
      } catch (err) {
        console.error('Failed to load dashboard context data:', err);
      }
    };
    loadContextData();
  }, [projectData]);

  // Live Code Preview effect
  useEffect(() => {
    if (!selectedFunction) {
      setLiveCode(null);
      setLiveCodeError(null);
      return;
    }

    const fetchCode = async () => {
      setLiveCodeLoading(true);
      setLiveCodeError(null);
      setLiveCode(null);
      try {
        const client = getApiClient();
        const detail = await client.getFunctionDetail(selectedFunction.file || selectedFunction.id || selectedFunction.name, selectedFunction);
        if (detail && detail.code) {
          setLiveCode(detail.code);
          setIsCached(Boolean(detail.isCached));
        } else if (detail && detail.error) {
          setLiveCodeError(detail.error);
        }
        if (detail && detail.refs && detail.refs.length > 0 && (!selectedFunction.refs || selectedFunction.refs.length === 0)) {
          setSelectedFunction((prev: any) => prev ? { ...prev, refs: detail.refs } : prev);
        }
      } catch (err: any) {
        setLiveCodeError(err.message);
      } finally {
        setLiveCodeLoading(false);
      }
    };

    fetchCode();
  }, [selectedFunction]);

  // Handle Groq Chat submit
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatPrompt.trim() || chatLoading) return;

    const userMessage = chatPrompt;
    setChatPrompt('');
    setChatHistory((prev) => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      const client = getApiClient();
      const pId = projectData?.projectId || 'db-context-indexer';
      const result = await client.sendGroqChat(userMessage, pId);
      if (result.success) {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', content: result.response, groundedContext: result.groundedContext }
        ]);
      } else {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${result.error || 'Failed to generate response.'}` }
        ]);
      }
    } catch (err: any) {
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: `API Error: ${err.message}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const metrics = projectData?.metrics || {
    clientsCount: 1,
    queriesCount: queries.length || 27,
    functionsCount: projectData?.functions?.length || 144,
    unresolvedCount: 0
  };

  const queriesByDb = projectData?.queriesByDb || { mongodb: queries.length || 27, firebase: 0, supabase: 0, mysql: 0 };
  const totalQueries = Math.max(1, Object.values(queriesByDb).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number);

  const indexedFunctions = projectData?.functions || [
    {
      name: 'getUserById',
      file: 'backend/config/passport.js',
      line: '11–18',
      dbType: 'mongodb',
      code: [
        'async function getUserById(id) {',
        '  const user = await User.findById(id);',
        '  if (!user) return null;',
        '  return user;',
        '}'
      ],
      queries: [{ op: 'findById', tgt: 'User' }],
      refs: [
        { path: 'backend/routes/auth.js:22', type: 'call' },
        { path: 'backend/routes/auth.js:41', type: 'call' }
      ]
    }
  ];

  return (
    <div className="module-screen-container">
      {/* Hero Header */}
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            🔍 Technical Deep Dive &amp; AST Analysis
          </div>
          <h1 className="hero-title">{projectData?.projectId || 'db-context-indexer'}</h1>
          <p className="hero-subtitle">
            Static call-graphs, database query tracking, architectural decision records (ADRs), and active plans.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={onSwitchProject}>
            🗂️ Change Project
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--surface-2)', padding: 6, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        {(['Overview', 'Database queries', 'Functions', 'Call graph', 'Discussions'] as const).map((tab) => (
          <button
            key={tab}
            className={`nav-module-btn ${topTab === tab ? 'active' : ''}`}
            onClick={() => setTopTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {topTab === 'Overview' && (
        <>
          <div className="grid-4" style={{ marginBottom: 28 }}>
            <div className="ui-card">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>DB Clients</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-text)' }}>{metrics.clientsCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>SDK Instances</div>
            </div>

            <div className="ui-card">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>DB Queries</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--secondary-text)' }}>{metrics.queriesCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Linked Call Sites</div>
            </div>

            <div className="ui-card">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Function Symbols</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>{metrics.functionsCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>AST Node Exports</div>
            </div>

            <div className="ui-card">
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Active Plans</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--warning-text)' }}>{plans.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Feature Milestones</div>
            </div>
          </div>

          <div className="ui-card" style={{ marginBottom: 28 }}>
            <div className="card-header">
              <span className="card-title">Database Query Distribution</span>
              <span className="chip chip-primary">{totalQueries} Total Queries</span>
            </div>
            <div className="grid-4">
              {Object.entries(queriesByDb).map(([db, count]) => (
                <div key={db} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="mono" style={{ textTransform: 'uppercase', fontWeight: 700, fontSize: 13 }}>{db}</span>
                    <span className="chip chip-success" style={{ fontSize: 11 }}>{Number(count)} calls</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, Math.round((Number(count) / totalQueries) * 100))}%`, background: 'var(--primary)', borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ask Your Codebase Grounded Chat Panel */}
          <div className="ui-card">
            <div className="card-header">
              <span className="card-title">💬 Ask Your Codebase (Grounded AI Chat)</span>
              <span className="chip chip-success">llama-3.3-70b-versatile</span>
            </div>
            
            <div style={{ minHeight: 180, maxHeight: 300, overflowY: 'auto', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
              {chatHistory.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                  Ask questions about function definitions, queries, or plans in this project. Context is grounded automatically in the AST index.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatHistory.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-lg)',
                        background: msg.role === 'user' ? 'var(--primary-light)' : 'var(--surface-3)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        fontSize: 13
                      }}>
                        <div style={{ fontWeight: 600, fontSize: 11, color: msg.role === 'user' ? 'var(--primary)' : 'var(--secondary)', marginBottom: 4 }}>
                          {msg.role === 'user' ? 'DEVELOPER' : 'AI MANAGER'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      </div>
                      {msg.groundedContext && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, marginLeft: 6 }} className="mono">
                          📍 Grounded: {msg.groundedContext}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                      Thinking and searching AST index...
                    </div>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, margin: 0 }}
                placeholder="e.g. Which functions query the User collection?"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                disabled={chatLoading}
              />
              <button type="submit" className="btn-primary" disabled={chatLoading} style={{ padding: '0 24px' }}>
                Send
              </button>
            </form>
          </div>
        </>
      )}

      {/* Database Queries Tab */}
      {topTab === 'Database queries' && (
        <div className="ui-card">
          <div className="card-header">
            <span className="card-title">Live Database Queries ({queries.length || indexedFunctions.length})</span>
            <span className="chip chip-success">AST Resolved</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(queries.length > 0 ? queries : indexedFunctions).map((q: any, idx: number) => (
              <div key={idx} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)' }} className="mono">
                    {q.operation || q.queries?.[0]?.op || 'connect'} ({q.target || q.queries?.[0]?.tgt || 'DB'})
                  </div>
                  <span className="chip chip-primary" style={{ textTransform: 'uppercase' }}>
                    {q.dbType || 'mongodb'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }} className="mono">
                  Enclosing function: <span style={{ color: 'var(--text-primary)' }}>{q.enclosingFunction || q.name}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }} className="mono">
                  Location: {q.file || 'backend/server.js'}:{q.line || 'L20'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Functions Tab */}
      {topTab === 'Functions' && (
        <div className="ui-card">
          <div className="card-header">
            <span className="card-title">Indexed AST Functions ({indexedFunctions.length})</span>
            <span className="chip chip-primary">Click to inspect drawer</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {indexedFunctions.map((fn: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelectedFunction(fn)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 16,
                  borderRadius: 'var(--radius)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-code)', fontSize: 14, color: 'var(--primary)' }}>
                    {fn.name || `Function_${idx + 1}`}
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {fn.file || 'src/index.ts'} : {fn.line || 'L1-L20'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="chip chip-primary">{fn.dbType || 'MongoDB'}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call Graph Tab */}
      {topTab === 'Call graph' && (
        <div className="ui-card">
          <div className="card-header">
            <span className="card-title">Transitive Call Graph Visualizer</span>
            <span className="chip chip-primary">Static Flow Linkage</span>
          </div>
          
          <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', padding: 24, border: '1px solid var(--border)', minHeight: 200 }} className="mono">
            {callGraph?.edges && callGraph.edges.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {callGraph.edges.map((edge: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13 }}>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{edge.callerId}</span>
                    <span style={{ color: 'var(--text-muted)' }}>──calls──▶</span>
                    <span style={{ color: 'var(--secondary)', fontWeight: 600 }}>{edge.calleeId}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({edge.file}:{edge.line})</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                <p>No call graph edges detected. Run "dbci" in your project folder to rebuild the database context index.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Discussions Tab */}
      {topTab === 'Discussions' && (
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Active Plans & ADRs list */}
          <div style={{ flex: 1 }}>
            <div className="ui-card" style={{ marginBottom: 24 }}>
              <div className="card-header">
                <span className="card-title">📋 Active Execution Plans ({plans.length})</span>
                <span className="chip chip-primary">Project Roadmap</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {plans.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active project plans recorded.</p>
                ) : (
                  plans.map((p: any, idx: number) => (
                    <div key={idx} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</span>
                        <span className="chip chip-success">{p.targetVersion || 'v1.0.0'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{p.description}</p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 12 }} className="mono">
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Plan ID: {p.id}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="ui-card">
              <div className="card-header">
                <span className="card-title">📖 Architecture Decision Records (ADRs) ({decisions.length})</span>
                <span className="chip chip-warning">Immutable ADRs</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {decisions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recorded architecture decisions.</p>
                ) : (
                  decisions.map((d: any, idx: number) => (
                    <div key={idx} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--warning-text)', marginBottom: 6 }}>
                        {d.title || `ADR Decision #${idx + 1}`}
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>{d.justification || d.body}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Threads & Discussions */}
          <div style={{ flex: 1 }}>
            <div className="ui-card">
              <div className="card-header">
                <span className="card-title">💬 Thread Discussions ({threads.length})</span>
                <span className="chip chip-primary">Collaborative Space</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {threads.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active discussions found.</p>
                ) : (
                  threads.map((t: any, idx: number) => (
                    <div key={idx} style={{ padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{t.title}</span>
                        <span className="chip chip-success" style={{ fontSize: 10 }}>Target: {t.targetType}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }} className="mono">
                        Author: {t.createdBy} | Thread ID: {t.id}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Code Details Drawer Overlay */}
      {selectedFunction && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 200,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
          onClick={() => setSelectedFunction(null)}
        >
          <div
            style={{
              width: 540,
              height: '100%',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              padding: 32,
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div className="chip chip-primary" style={{ marginBottom: 8 }}>AST Function Detail</div>
                <h2 style={{ fontSize: 20, fontFamily: 'var(--font-code)' }}>{selectedFunction.name}</h2>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {selectedFunction.file} ({selectedFunction.line})
                </div>
              </div>
              <button className="btn-secondary" onClick={() => setSelectedFunction(null)}>
                ✕ Close
              </button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="form-label" style={{ margin: 0 }}>Source Code Definition</span>
                {liveCode && (
                  <span style={{ fontSize: 11, color: '#4EDEA3', background: 'rgba(78,222,163,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                    {isCached ? '⚡ Live GitHub Code (5-min cache active)' : '🐙 Live GitHub API Code'}
                  </span>
                )}
              </div>

              {liveCodeLoading ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  ⏳ Fetching live source code...
                </div>
              ) : liveCode ? (
                <div className="code-block" style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {liveCode.split('\n').map((line: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: 16 }}>
                      <span style={{ color: 'var(--text-muted)', width: 32, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ whiteSpace: 'pre-wrap' }}>{line}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {liveCodeError && (
                    <div style={{ fontSize: 12, color: 'var(--accent-amber)', marginBottom: 8, fontStyle: 'italic' }}>
                      Note: {liveCodeError} (Showing AST metadata snippet)
                    </div>
                  )}
                  <div className="code-block">
                    {(selectedFunction.code || ['// Function implementation code']).map((line: string, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 16 }}>
                        <span style={{ color: 'var(--text-muted)', width: 24 }}>{i + 1}</span>
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="form-label">Incoming &amp; Outgoing References ({selectedFunction.refs?.length || 0})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(selectedFunction.refs || []).map((ref: any, i: number) => (
                  <div key={i} style={{ padding: 12, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12 }} className="mono">
                    <span className="chip chip-primary" style={{ fontSize: 10, padding: '2px 6px', marginRight: 8 }}>{ref.type}</span>
                    {ref.path}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
