'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import { getTools, offRampEarnings, fundViaDodo } from '@/lib/api';
import type { AgentDefinition } from '@/lib/types';
import { Zap, CreditCard, ArrowDownCircle, Layers } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  utility: '#3b82f6',
  nlp: '#14b8a6',
  code: '#9d4edd',
  research: '#00ff94',
  qvac: '#ffa500',
  analytics: '#c084fc',
  security: '#ff3b30',
  finance: '#fbbf24',
  creative: '#ec4899',
  legal: '#6366f1',
  marketing: '#22d3ee',
  health: '#f87171',
};

export default function ToolsPage() {
  const [tools, setTools] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [offramping, setOfframping] = useState<string | null>(null);
  const [funding, setFunding] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    getTools()
      .then((data) => setTools(data.tools))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = tools.reduce<Record<string, AgentDefinition[]>>((acc, tool) => {
    const cat = tool.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(tool);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  const formatPrice = (agent: AgentDefinition) => {
    if (agent.token === 'SOL') return `${agent.priceAtomic / 1_000_000_000} SOL`;
    return `${(agent.priceAtomic / 1_000_000).toFixed(4)} Palm USD`;
  };

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
      const msg = e.message ?? '';
      if (msg.includes('DODO_UNAVAILABLE') || msg.includes('503')) {
        alert('Dodo off-ramp not configured. Set DODO_API_KEY.');
      } else {
        alert('Off-ramp failed: ' + msg);
      }
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
        alert(`No wallet mapped for ${agent.snsDomain}`);
        return;
      }
      const res = await fundViaDodo(10, address);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.open(res.payment, '_blank');
      } else {
        alert(`Invoice: ${res.payment}`);
      }
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.includes('DODO_UNAVAILABLE') || msg.includes('503')) {
        alert('Dodo Payments not configured. Set DODO_API_KEY in server environment.');
      } else {
        alert('Funding failed: ' + msg);
      }
    } finally {
      setFunding(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: "'JetBrains Mono', monospace" }}>
      <Header />
      <PageHeader
        title="AGENT CATALOG"
        subtitle={`${tools.length} specialized agents organized by category`}
        badge="MARKETPLACE"
        badgeColor="#ffa500"
      />

      <main style={{ padding: 24 }}>
        {loading && <span style={{ color: '#555555', fontSize: 11 }}>Loading catalog...</span>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {categories.map((cat) => {
            const agents = grouped[cat];
            const catColor = CATEGORY_COLORS[cat] ?? '#888888';
            const isExpanded = expandedCategory === cat;

            return (
              <div key={cat} style={{ border: '1px solid #333333', background: 'rgba(0,0,0,0.3)' }}>
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Layers size={16} color={catColor} />
                    <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {cat}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        border: `1px solid ${catColor}`,
                        color: catColor,
                        fontWeight: 700,
                      }}
                    >
                      {agents.length}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#555555', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                    ▼
                  </span>
                </button>

                {/* Agents in category */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {agents.map((agent) => (
                      <div
                        key={agent.snsDomain}
                        style={{
                          padding: 14,
                          border: '1px solid #333333',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 600 }}>{agent.name}</span>
                          {agent.recursive && (
                            <span style={{ fontSize: 9, padding: '2px 5px', border: '1px solid #9d4edd', color: '#9d4edd' }}>
                              RECURSIVE
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 10, color: '#14b8a6' }}>{agent.snsDomain}</span>
                        <span style={{ fontSize: 11, color: '#888888' }}>{agent.description}</span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.04)', color: '#888888' }}>
                            {formatPrice(agent)}
                          </span>
                          {typeof agent.reputation === 'number' && (
                            <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(0,255,148,0.08)', color: '#00ff94' }}>
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
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
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
                )}
              </div>
            );
          })}
        </div>

        {!loading && tools.length === 0 && (
          <span style={{ color: '#555555', fontSize: 11 }}>No tools available.</span>
        )}
      </main>
    </div>
  );
}
