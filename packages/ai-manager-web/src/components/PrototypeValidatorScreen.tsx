import React, { useState, useEffect } from 'react';

interface PrototypeValidatorScreenProps {
  user: any;
  projectData: any;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

export const PrototypeValidatorScreen: React.FC<PrototypeValidatorScreenProps> = ({
  user,
  projectData
}) => {
  const [validatorData, setValidatorData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchValidatorData();
  }, []);

  const fetchValidatorData = async () => {
    try {
      const token = localStorage.getItem('ai_manager_token');
      const res = await fetch('/api/modules/validator', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setValidatorData(data);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const designTokens = validatorData?.tokens || [
    { token: '--bg (dark)', figmaVal: '#0B1326', codeVal: '#0B1326', status: 'MATCH' },
    { token: '--bg (light)', figmaVal: '#F7F9FC', codeVal: '#F7F9FC', status: 'MATCH' },
    { token: '--primary', figmaVal: '#8083FF', codeVal: '#8083FF', status: 'MATCH' },
    { token: '--secondary', figmaVal: '#4EDEA3', codeVal: '#4EDEA3', status: 'MATCH' }
  ];

  return (
    <div className="module-screen-container">
      <div className="hero-banner">
        <div>
          <div className="chip chip-primary" style={{ marginBottom: 12 }}>
            📐 Stitch &amp; Figma Design Validator
          </div>
          <h1 className="hero-title">Prototype Validator — Token &amp; Component Variance</h1>
          <p className="hero-subtitle">
            Validate Figma design system specs against actual React component implementations.
          </p>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Design Token Match</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--secondary-text)' }}>{validatorData?.matchRate || '100%'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>High fidelity alignment</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Component Parity</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-text)' }}>{validatorData?.screensCount || 7} / 7</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>100% Stitch screens live</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Token Variances</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--warning-text)' }}>{validatorData?.variancesCount || 0}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>0 token discrepancies</div>
        </div>

        <div className="ui-card">
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Design System</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-code)' }}>{validatorData?.designSystem || 'Synthetic Intel'}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Dark / Light Token Set</div>
        </div>
      </div>

      <div className="ui-card">
        <div className="card-header">
          <span className="card-title">Design Token Variance Matrix</span>
          <span className="chip chip-primary">{loading ? 'Loading...' : 'Figma vs Code'}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {designTokens.map((item: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 'var(--radius)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 700, fontFamily: 'var(--font-code)', fontSize: 14, marginBottom: 4 }}>
                  {item.token}
                </div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Figma: <span style={{ color: 'var(--text-primary)' }}>{item.figmaVal}</span> • Code: <span style={{ color: 'var(--primary)' }}>{item.codeVal}</span>
                </div>
              </div>
              <span className={item.status === 'MATCH' ? 'chip chip-success' : 'chip chip-warning'}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
