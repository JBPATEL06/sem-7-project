import React, { useState } from 'react';

interface FlowAuditorScreenProps {
  user: any;
  projectData: any;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

export const FlowAuditorScreen: React.FC<FlowAuditorScreenProps> = ({
  user,
  projectData
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('POST');
  const [endpointPath, setEndpointPath] = useState('/api/auth/google');
  const [requestBody, setRequestBody] = useState('{\n  "email": "elluminati.developer@gmail.com",\n  "googleId": "g_1092837465"\n}');
  const [responseLog, setResponseLog] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunRequest = async () => {
    setLoading(true);
    setResponseLog(null);

    try {
      const res = await fetch(endpointPath, {
        method: selectedMethod,
        headers: { 'Content-Type': 'application/json' },
        body: selectedMethod !== 'GET' ? requestBody : undefined
      });

      const data = await res.json();
      setResponseLog(JSON.stringify({ status: res.status, ok: res.ok, data }, null, 2));
    } catch (err: any) {
      setResponseLog(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="module-screen-container">
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            ⚡ API Tester &amp; Activity Flow Auditor
          </div>
          <h1 className="hero-title">Logic &amp; Activity Flow Auditor</h1>
          <p className="hero-subtitle">
            Interactive HTTP API route tester, endpoint execution inspector, and payload logger.
          </p>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 28 }}>
        {/* Request Configurator */}
        <div className="ui-card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <span className="card-title">HTTP Request Builder</span>
            <span className="chip chip-primary">Live Express Server</span>
          </div>

          <div className="form-group">
            <label className="form-label">HTTP Method</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((method) => (
                <button
                  key={method}
                  className={`nav-module-btn ${selectedMethod === method ? 'active' : ''}`}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 12 }}
                  onClick={() => setSelectedMethod(method)}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Endpoint Path</label>
            <input
              type="text"
              className="form-input mono"
              value={endpointPath}
              onChange={(e) => setEndpointPath(e.target.value)}
            />
          </div>

          {selectedMethod !== 'GET' && (
            <div className="form-group">
              <label className="form-label">JSON Request Payload</label>
              <textarea
                className="form-input mono"
                rows={6}
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          <button className="btn-primary" onClick={handleRunRequest} disabled={loading}>
            {loading ? 'Sending Request...' : '🚀 Execute Request'}
          </button>
        </div>

        {/* Response Inspector */}
        <div className="ui-card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <span className="card-title">Response Payload &amp; Status Logs</span>
            <span className={responseLog ? 'chip chip-success' : 'chip chip-primary'}>
              {responseLog ? 'Response Received' : 'Ready'}
            </span>
          </div>

          {responseLog ? (
            <div className="code-block" style={{ minHeight: 280 }}>
              {responseLog}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>No Request Executed Yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Configure an HTTP endpoint on the left and click Execute.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
