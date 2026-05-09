'use client';

import { useState, useEffect } from 'react';
import { useNetwork } from '@/lib/NetworkContext';
import { Globe, Radio } from 'lucide-react';

export default function NetworkSwitcher() {
  const { network, toggleNetwork } = useNetwork();
  const [mounted, setMounted] = useState(false);
  const isMainnet = network === 'mainnet';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          border: '1px solid #333333',
          background: '#1a1a1a',
          fontSize: 10,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          color: '#888888',
          fontWeight: 700,
        }}
      >
        <Globe size={12} />
        <span>DEVNET</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleNetwork}
      title={`Switch to ${isMainnet ? 'Devnet' : 'Mainnet'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: `1px solid ${isMainnet ? '#00ff94' : '#333333'}`,
        background: isMainnet ? 'rgba(0,255,148,0.08)' : '#1a1a1a',
        fontSize: 10,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        color: isMainnet ? '#00ff94' : '#888888',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        ...(isMainnet && {
          boxShadow: '0 0 8px rgba(0,255,148,0.15)',
        }),
      }}
    >
      {isMainnet ? <Radio size={12} /> : <Globe size={12} />}
      <span>{isMainnet ? 'MAINNET' : 'DEVNET'}</span>
    </button>
  );
}
