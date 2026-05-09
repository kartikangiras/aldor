'use client';

import { useEffect, useState } from 'react';

export default function StatusBadges() {
  const [covalentFresh, setCovalentFresh] = useState(true);
  const [covalentError, setCovalentError] = useState(false);

  useEffect(() => {
    const onCovalentUpdate = () => {
      const last = (window as any).__covalentLastUpdate;
      if (!last) {
        setCovalentFresh(true);
        return;
      }
      const age = Date.now() - last;
      if (age > 30000) setCovalentFresh(false);
      else setCovalentFresh(true);
    };
    const id = setInterval(onCovalentUpdate, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 24px', borderBottom: '1px solid #333333' }}>
      <div className="status-badge">
        <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#00ff94' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <rect x="3" y="3" width="18" height="18" />
            <rect x="7" y="7" width="10" height="10" />
          </svg>
        </span>
        <span>RECURSIVE DELEGATION: ON</span>
      </div>
      <div className="status-badge">
        <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#9d4edd' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <rect x="5" y="11" width="14" height="10" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </span>
        <span style={{ color: '#9d4edd' }}>UMBRA PRIVACY: ACTIVE</span>
      </div>
      <div className="status-badge">
        <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <circle cx="12" cy="12" r="10" />
            <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="12" fontFamily="monospace">@</text>
          </svg>
        </span>
        <span>SNS DOMAINS: ACTIVE</span>
      </div>
      <div className="status-badge">
        <span
          style={{
            width: 16,
            height: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: covalentError ? '#ff3b30' : covalentFresh ? '#00ff94' : '#ffa500',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 3v18h18" />
            <path d="M7 16l4-4 4 4 6-6" />
          </svg>
        </span>
        <span style={{ color: covalentError ? '#ff3b30' : covalentFresh ? '#00ff94' : '#ffa500' }}>
          COVALENT DATA: {covalentError ? 'ERROR' : covalentFresh ? 'LIVE' : 'STALE'}
        </span>
      </div>
    </div>
  );
}
