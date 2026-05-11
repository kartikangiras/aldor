'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAgents, fundViaDodo } from '@/lib/api';
import type { RegistryAgent } from '@/lib/types';
import {
  Bot,
  Search,
  Filter,
  Zap,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

export default function AgentsPage() {
  const { publicKey, connected } = useWallet();
  const router = useRouter();

  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tokenFilter, setTokenFilter] = useState<'All' | 'SOL' | 'PALM_USD'>('All');

  const [fundingAgent, setFundingAgent] = useState<string | null>(null);
  const [fundedAgent, setFundedAgent] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

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

  // Detect Dodo return params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const funded = params.get('funded');
    const isCancelled = params.has('cancelled');
    if (funded) setFundedAgent(funded);
    if (isCancelled) setCancelled(true);
    // Clean URL
    if (funded || isCancelled) {
      const url = new URL(window.location.href);
      url.searchParams.delete('funded');
      url.searchParams.delete('cancelled');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const categories = ['All', ...Array.from(new Set(agents.map((a) => a.category).filter(Boolean)))];

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      !search ||
      agent.name?.toLowerCase().includes(search.toLowerCase()) ||
      agent.snsDomain?.toLowerCase().includes(search.toLowerCase()) ||
      agent.category?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || agent.category === categoryFilter;
    const agentToken = agent.token === 'SOL' ? 'SOL' : 'PALM_USD';
    const matchesToken = tokenFilter === 'All' || agentToken === tokenFilter;
    return matchesSearch && matchesCategory && matchesToken;
  });

  const handleFund = async (agent: RegistryAgent) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }
    const address = agent.walletAddress;
    if (!address) {
      alert(`No wallet address configured for ${agent.name}`);
      return;
    }
    setFundingAgent(agent.snsDomain);
    try {
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/agents?funded=${encodeURIComponent(agent.snsDomain)}`
        : undefined;
      const cancelUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/agents?cancelled=1`
        : undefined;
      const res = await fundViaDodo(10, address, returnUrl, cancelUrl);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.location.href = res.payment;
      } else {
        alert('Funding initiated: ' + res.payment);
      }
    } catch (err: any) {
      alert('Funding failed: ' + (err?.message ?? 'Unknown error'));
    } finally {
      setFundingAgent(null);
    }
  };

  const handleHire = (agent: RegistryAgent) => {
    const prefill = encodeURIComponent(`Hire ${agent.name} to help with: `);
    router.push(`/home?prefill=${prefill}`);
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

      {/* Dodo Status Banners */}
      {fundedAgent && (
        <Card className="border-aldor-emerald/30 bg-aldor-emerald/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-aldor-emerald">
              <CheckCircle2 size={16} />
              <span>Support sent to <strong>{agents.find((a) => a.snsDomain === fundedAgent)?.name ?? fundedAgent}</strong>! Note: hiring this agent for a task still requires a wallet payment when you submit your query.</span>
            </div>
            <Button
              size="sm"
              className="gap-1"
              onClick={() => {
                const agent = agents.find((a) => a.snsDomain === fundedAgent);
                if (agent) handleHire(agent);
              }}
            >
              <ExternalLink size={12} />
              Hire Now
            </Button>
          </CardContent>
        </Card>
      )}

      {cancelled && (
        <Card className="border-aldor-rose/30 bg-aldor-rose/5">
          <CardContent className="p-4 flex items-center gap-2 text-sm text-aldor-rose">
            <AlertCircle size={16} />
            <span>Payment was cancelled. No funds were charged.</span>
          </CardContent>
        </Card>
      )}

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
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setTokenFilter((prev) => {
            const opts: Array<'All' | 'SOL' | 'PALM_USD'> = ['All', 'SOL', 'PALM_USD'];
            const idx = opts.indexOf(prev);
            return opts[(idx + 1) % opts.length];
          })}
        >
          <span className={`w-2 h-2 rounded-full ${tokenFilter === 'SOL' ? 'bg-aldor-amber' : tokenFilter === 'PALM_USD' ? 'bg-aldor-emerald' : 'bg-aldor-text-muted'}`} />
          {tokenFilter === 'All' ? 'Any Token' : tokenFilter}
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
                    <p className="font-mono text-aldor-emerald">
                      {agent.token === 'SOL'
                        ? `${(Number(agent.priceMicroStablecoin) / 1_000_000_000).toFixed(6)} SOL`
                        : `${pricePalm} Palm`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-aldor-text-muted">Reputation</p>
                    <p>{isNaN(reputation) ? '—' : `${reputation}%`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-aldor-text-muted">Token</p>
                    <p className={`font-mono text-xs ${agent.token === 'SOL' ? 'text-aldor-amber' : 'text-aldor-emerald'}`}>
                      {agent.token === 'SOL' ? 'SOL' : 'PALM_USD'}
                    </p>
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

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleHire(agent)}
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
                    title="Send a voluntary support payment to this agent (not a service fee)"
                  >
                    {fundingAgent === agent.snsDomain ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Heart size={14} />
                    )}
                    Support
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
