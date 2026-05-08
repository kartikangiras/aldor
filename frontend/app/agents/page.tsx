'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import { getAgents, fundViaDodo } from '@/lib/api';
import type { RegistryAgent } from '@/lib/types';
import { Zap, CreditCard, Filter, Search, ArrowUpRight } from 'lucide-react';

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [fundingAgent, setFundingAgent] = useState<string | null>(null);

  useEffect(() => {
    getAgents()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = ['all', ...Array.from(new Set(agents.map((a) => a.category).filter(Boolean)))];

  const filtered = agents.filter((agent) => {
    const matchesCategory = selectedCategory === 'all' || agent.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      agent.name.toLowerCase().includes(q) ||
      agent.snsDomain.toLowerCase().includes(q) ||
      (agent.category ?? '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const formatPrice = (agent: RegistryAgent) => {
    const raw = Number(agent.priceMicroStablecoin ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return '—';
    return `${(raw / 1_000_000).toFixed(4)} Palm USD`;
  };

  const formatBalance = (agent: RegistryAgent) => {
    const raw = Number(agent.stablecoinBalance ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) return '—';
    return (raw / 1_000_000).toFixed(4);
  };

  const handleFund = async (agent: RegistryAgent) => {
    setFundingAgent(agent.snsDomain);
    try {
      const walletMapRaw = process.env.NEXT_PUBLIC_AGENT_WALLET_MAP;
      const walletMap: Record<string, string> = walletMapRaw ? JSON.parse(walletMapRaw) : {};
      const address = walletMap[agent.snsDomain] ?? agent.walletAddress;
      if (!address) {
        alert(`No wallet address for ${agent.name}`);
        return;
      }
      const res = await fundViaDodo(10, address);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.open(res.payment, '_blank');
      } else {
        alert(`Invoice created: ${res.payment}`);
      }
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.includes('DODO_UNAVAILABLE') || msg.includes('503')) {
        alert('Dodo Payments not configured. Set DODO_API_KEY in server environment.');
      } else {
        alert('Funding failed: ' + msg);
      }
    } finally {
      setFundingAgent(null);
    }
  };

  const handleHire = (agent: RegistryAgent) => {
    window.location.href = `/?hire=${encodeURIComponent(agent.snsDomain)}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: "'JetBrains Mono', monospace" }}>
      <Header />
      <PageHeader
        title="AGENT REGISTRY"
        subtitle={`${agents.length} sovereign agents available for hire across ${categories.length - 1} categories`}
        badge="LIVE"
        badgeColor="#00ff94"
      />

      <main style={{ padding: 24 }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid #333333', background: '#1a1a1a', flex: 1, minWidth: 200, maxWidth: 320 }}>
            <Search size={14} color="#555555" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Filter size={14} color="#555555" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 10px',
                  border: `1px solid ${selectedCategory === cat ? CATEGORY_COLORS[cat] ?? '#00ff94' : '#333333'}`,
                  background: selectedCategory === cat ? `${CATEGORY_COLORS[cat] ?? '#00ff94'}10` : '#1a1a1a',
                  color: selectedCategory === cat ? CATEGORY_COLORS[cat] ?? '#00ff94' : '#888888',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading && <span style={{ color: '#555555', fontSize: 11 }}>Loading registry...</span>}

        {/* Agents Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map((agent) => {
            const catColor = CATEGORY_COLORS[agent.category] ?? '#888888';
            return (
              <div
                key={agent.snsDomain}
                style={{
                  padding: 18,
                  border: '1px solid #333333',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = catColor;
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333333';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700 }}>{agent.name}</span>
                      {agent.isRecursive && (
                        <span style={{ fontSize: 9, padding: '2px 5px', border: '1px solid #9d4edd', color: '#9d4edd', fontWeight: 700 }}>
                          RECURSIVE
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color: catColor, fontFamily: "'JetBrains Mono', monospace", marginTop: 2, display: 'block' }}>
                      {agent.snsDomain}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      border: `1px solid ${catColor}`,
                      color: catColor,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {agent.category}
                  </span>
                </div>

                <span style={{ fontSize: 11, color: '#888888', lineHeight: 1.5 }}>
                  {agent.capabilities?.length ? agent.capabilities.join(', ') : agent.description ?? 'No description'}
                </span>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', background: '#1a1a1a', border: '1px solid #333333', color: '#00ff94', fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatPrice(agent)}
                  </span>
                  <span style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)', color: '#00ff94' }}>
                    {(Number(agent.reputation ?? 0) / 100).toFixed(0)}% rep
                  </span>
                  <span style={{ fontSize: 10, padding: '3px 8px', background: '#1a1a1a', border: '1px solid #333333', color: '#888888' }}>
                    Bal: {formatBalance(agent)}
                  </span>
                </div>

                {agent.walletAddress && (
                  <a
                    href={`https://explorer.solana.com/address/${agent.walletAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 10, color: '#14b8a6', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    {agent.walletAddress.slice(0, 16)}... <ArrowUpRight size={10} />
                  </a>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => handleHire(agent)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #00ff94',
                      background: 'transparent',
                      color: '#00ff94',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,255,148,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Zap size={12} />
                    Hire
                  </button>
                  <button
                    onClick={() => handleFund(agent)}
                    disabled={fundingAgent === agent.snsDomain}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid #333333',
                      background: '#1a1a1a',
                      color: fundingAgent === agent.snsDomain ? '#555555' : '#ffa500',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: fundingAgent === agent.snsDomain ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <CreditCard size={12} />
                    {fundingAgent === agent.snsDomain ? '...' : 'Fund'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#555555', fontSize: 12 }}>
            No agents match your filters.
          </div>
        )}
      </main>
    </div>
  );
}
