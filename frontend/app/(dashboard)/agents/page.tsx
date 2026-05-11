'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAgents, postQuery, fundViaDodo } from '@/lib/api';
import type { RegistryAgent } from '@/lib/types';
import {
  Bot,
  Search,
  Filter,
  Zap,
  CreditCard,
  Loader2,
  Send,
  X,
  CheckCircle2,
} from 'lucide-react';

function generateSessionId() {
  return `sess_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

export default function AgentsPage() {
  const { publicKey, connected } = useWallet();

  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [fundingAgent, setFundingAgent] = useState<string | null>(null);
  const [hiringAgent, setHiringAgent] = useState<string | null>(null);
  const [hireQuery, setHireQuery] = useState('');
  const [hireLoading, setHireLoading] = useState(false);
  const [hireResult, setHireResult] = useState('');

  useEffect(() => {
    let active = true;
    getAgents()
      .then((data) => {
        if (!active) return;
        setAgents(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load agents');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const categories = ['All', ...Array.from(new Set(agents.map((a) => a.category).filter(Boolean)))];

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      !search ||
      agent.name?.toLowerCase().includes(search.toLowerCase()) ||
      agent.snsDomain?.toLowerCase().includes(search.toLowerCase()) ||
      agent.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || agent.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleFund = async (agent: RegistryAgent) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    setFundingAgent(agent.snsDomain);
    try {
      const res = await fundViaDodo(10, publicKey.toBase58());
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.open(res.payment, '_blank');
      } else {
        alert('Funding initiated: ' + res.payment);
      }
    } catch (err: any) {
      alert('Funding failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setFundingAgent(null);
    }
  };

  const handleHire = useCallback(
    async (agent: RegistryAgent) => {
      if (!hireQuery.trim()) return;
      setHireLoading(true);
      setHireResult('');
      const session = generateSessionId();
      try {
        const res = await postQuery(hireQuery, session, 0.01);
        setHireResult(res.result);
      } catch (err: any) {
        setHireResult(`Error: ${err?.message ?? 'Hire failed'}`);
      } finally {
        setHireLoading(false);
      }
    },
    [hireQuery]
  );

  const openHire = (agent: RegistryAgent) => {
    setHiringAgent(agent.snsDomain);
    setHireQuery(`Hire ${agent.name} to help with: `);
    setHireResult('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Marketplace</h1>
          <p className="text-sm text-aldor-text-secondary">Hire and manage autonomous economic agents</p>
        </div>
        <Button className="gap-2" onClick={() => setSearch('')}>
          <Zap size={16} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-aldor-text-muted" />
          <Input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-aldor-surface border-aldor-border"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setCategoryFilter((prev) => {
            const idx = categories.indexOf(prev);
            return categories[(idx + 1) % categories.length] ?? 'All';
          })}
        >
          <Filter size={14} />
          {categoryFilter}
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-aldor-text-muted">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading agents...
        </div>
      )}

      {error && !loading && (
        <Card className="border-aldor-rose/30 bg-aldor-rose/10">
          <CardContent className="p-4 text-sm text-aldor-rose">{error}</CardContent>
        </Card>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const isHiring = hiringAgent === agent.snsDomain;
          const pricePalm = (Number(agent.priceMicroStablecoin) / 1_000_000).toFixed(4);
          const reputation = Number(agent.reputation);

          return (
            <Card
              key={agent.snsDomain}
              className="border-aldor-border bg-aldor-graphite/60 hover:border-aldor-emerald/30 transition-all"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                      <Bot size={20} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{agent.name}</h3>
                      <p className="text-xs text-aldor-text-muted">{agent.snsDomain}</p>
                    </div>
                  </div>
                  <Badge variant={agent.isActive ? 'default' : 'secondary'} className="text-xs">
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-aldor-text-muted">Category</p>
                    <p>{agent.category || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-aldor-text-muted">Price</p>
                    <p className="font-mono text-aldor-emerald">{pricePalm} Palm</p>
                  </div>
                  <div>
                    <p className="text-xs text-aldor-text-muted">Reputation</p>
                    <p>{isNaN(reputation) ? '—' : `${reputation}%`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-aldor-text-muted">Balance</p>
                    <p className="font-mono text-aldor-cyan">{agent.stablecoinBalance ?? '0'} Palm</p>
                  </div>
                </div>

                {agent.capabilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {agent.capabilities.slice(0, 3).map((cap) => (
                      <Badge key={cap} variant="outline" className="text-[10px]">{cap}</Badge>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <Badge variant="outline" className="text-[10px]">+{agent.capabilities.length - 3}</Badge>
                    )}
                  </div>
                )}

                {isHiring && (
                  <div className="mb-4 p-3 rounded-lg bg-aldor-surface/50 border border-aldor-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Hire {agent.name}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setHiringAgent(null)}>
                        <X size={12} />
                      </Button>
                    </div>
                    <Input
                      value={hireQuery}
                      onChange={(e) => setHireQuery(e.target.value)}
                      placeholder="Describe the task..."
                      className="text-xs bg-aldor-black border-aldor-border"
                    />
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      disabled={hireLoading || !hireQuery.trim()}
                      onClick={() => handleHire(agent)}
                    >
                      {hireLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      Submit Query
                    </Button>
                    {hireResult && (
                      <div className="text-xs bg-aldor-black border border-aldor-border rounded p-2 text-aldor-text-secondary max-h-24 overflow-y-auto">
                        {hireResult}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openHire(agent)}
                  >
                    <Zap size={14} />
                    Hire
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    disabled={fundingAgent === agent.snsDomain}
                    onClick={() => handleFund(agent)}
                  >
                    {fundingAgent === agent.snsDomain ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CreditCard size={14} />
                    )}
                    Fund
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && filteredAgents.length === 0 && (
        <div className="text-center py-12 text-aldor-text-muted text-sm">No agents found.</div>
      )}
    </div>
  );
}
