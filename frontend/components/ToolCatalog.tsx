'use client';

import { useState, useEffect } from 'react';
import { getTools, offRampEarnings, fundViaDodo } from '@/lib/api';
import type { AgentDefinition } from '@/lib/types';
import { Zap, CreditCard, ArrowDownCircle } from 'lucide-react';

export default function ToolCatalog() {
  const [tools, setTools] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [offramping, setOfframping] = useState<string | null>(null);
  const [funding, setFunding] = useState<string | null>(null);

  useEffect(() => {
    getTools()
      .then((data) => setTools(data.tools))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOfframp = async (agent: AgentDefinition) => {
    setOfframping(agent.name);
    try {
      const walletMapRaw = process.env.NEXT_PUBLIC_AGENT_WALLET_MAP;
      const walletMap: Record<string, string> = walletMapRaw ? JSON.parse(walletMapRaw) : {};
      const address = walletMap[agent.snsDomain];
      if (!address) throw new Error('No wallet mapped for ' + agent.snsDomain);
      const res = await offRampEarnings(address, agent.priceAtomic / 1_000_000);
      alert(`Off-ramp invoice created: ${res.invoiceId}`);
    } catch (e: any) {
      alert('Off-ramp failed: ' + e.message);
    } finally {
      setOfframping(null);
    }
  };

  const handleFund = async (agent: AgentDefinition) => {
    setFunding(agent.name);
    try {
      const walletMapRaw = process.env.NEXT_PUBLIC_AGENT_WALLET_MAP;
      const walletMap: Record<string, string> = walletMapRaw ? JSON.parse(walletMapRaw) : {};
      const address = walletMap[agent.snsDomain];
      if (!address) {
        alert(`No wallet mapped for ${agent.snsDomain}. Set NEXT_PUBLIC_AGENT_WALLET_MAP.`);
        return;
      }
      const res = await fundViaDodo(10, address);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.open(res.payment, '_blank');
      } else {
        alert(`Dodo invoice: ${res.payment}`);
      }
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      if (msg.includes('DODO_PRODUCT_ID')) {
        alert(
          '⚠️ Dodo Setup Required\n\n' +
          'DODO_PRODUCT_ID is missing from your server/.env file.\n\n' +
          'Steps to fix:\n' +
          '1. Log into your Dodo Payments dashboard (test.dodopayments.com)\n' +
          '2. Create a product for agent top-ups\n' +
          '3. Copy the product ID and add DODO_PRODUCT_ID=<id> to server/.env\n' +
          '4. Restart the backend server'
        );
      } else if (msg.includes('permission') || msg.includes('RBAC') || msg.includes('403') || msg.includes('401')) {
        alert(
          '⚠️ Dodo API Key Invalid\n\n' +
          'Your DODO_API_KEY does not have Payments write access.\n\n' +
          'Steps to fix:\n' +
          '1. Log into your Dodo Payments dashboard\n' +
          '2. Generate a new API key with Payments permissions\n' +
          '3. Update DODO_API_KEY in server/.env\n' +
          '4. Restart the backend server'
        );
      } else if (msg.includes('DODO_UNAVAILABLE') || msg.includes('503')) {
        alert('Dodo Payments is not configured. Set DODO_API_KEY in server environment.');
      } else {
        alert('Funding failed: ' + msg);
      }
    } finally {
      setFunding(null);
    }
  };

  const formatPrice = (agent: AgentDefinition) => {
    if (agent.token === 'SOL') return `${agent.priceAtomic / 1_000_000_000} SOL`;
    return `${(agent.priceAtomic / 1_000_000).toFixed(4)} Palm USD`;
  };

  return (
    <div style={{ padding: 16, border: '1px solid #333333', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color="#ffa500" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tool Catalog
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
          {tools.length} agents
        </span>
      </div>

      {loading && <span style={{ color: '#555555', fontSize: 11 }}>Loading agents...</span>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
        {tools.map((agent) => (
          <div
            key={agent.snsDomain}
            style={{
              padding: 14,
              border: '1px solid #333333',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#555555';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333333';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 700 }}>{agent.name}</span>
                <div style={{ fontSize: 10, color: '#14b8a6', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                  {agent.snsDomain}
                </div>
              </div>
              {agent.recursive && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 5px',
                    border: '1px solid #9d4edd',
                    color: '#9d4edd',
                    fontWeight: 700,
                  }}
                >
                  RECURSIVE
                </span>
              )}
            </div>

            <span style={{ fontSize: 11, color: '#888888', lineHeight: 1.5 }}>{agent.description}</span>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, padding: '2px 6px', background: '#1a1a1a', border: '1px solid #333333', color: '#888888' }}>
                {agent.category}
              </span>
              <span style={{ fontSize: 9, padding: '2px 6px', background: '#1a1a1a', border: '1px solid #333333', color: '#00ff94', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatPrice(agent)}
              </span>
              {typeof agent.reputation === 'number' && (
                <span style={{ fontSize: 9, padding: '2px 6px', background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', color: '#00ff94' }}>
                  {(agent.reputation / 100).toFixed(0)}% rep
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                onClick={() => {
                  window.location.href = `/?hire=${encodeURIComponent(agent.snsDomain)}`;
                }}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #00ff94',
                  background: 'transparent',
                  color: '#00ff94',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,255,148,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Zap size={10} />
                Hire
              </button>
              <button
                onClick={() => handleFund(agent)}
                disabled={funding === agent.name}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #333333',
                  background: '#1a1a1a',
                  color: funding === agent.name ? '#555555' : '#ffffff',
                  fontSize: 10,
                  cursor: funding === agent.name ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <CreditCard size={10} />
                {funding === agent.name ? '...' : 'Fund'}
              </button>
              <button
                onClick={() => handleOfframp(agent)}
                disabled={offramping === agent.name}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid #333333',
                  background: '#1a1a1a',
                  color: offramping === agent.name ? '#555555' : '#ffa500',
                  fontSize: 10,
                  cursor: offramping === agent.name ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <ArrowDownCircle size={10} />
                {offramping === agent.name ? '...' : 'Off-ramp'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
