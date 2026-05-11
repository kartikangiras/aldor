'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, truncate } from '@/lib/utils';
import {
  getAgents,
  getPaymentActivity,
  postQuery,
  createEventSource,
  fundViaDodo,
} from '@/lib/api';
import type { RegistryAgent, StepEvent } from '@/lib/types';
import type { PaymentActivity } from '@/lib/api';
import { useWalletPaymentQueue } from '@/lib/useWalletPaymentQueue';
import WalletPaymentModal from '@/components/WalletPaymentModal';
import {
  Bot,
  Shield,
  Zap,
  Activity,
  ArrowUpRight,
  Send,
  Loader2,
  Wallet,
  CreditCard,
  Search,
  Code,
  TrendingUp,
  Cloud,
  Sparkles,
} from 'lucide-react';

function useSSE(sessionId: string, onStep?: (data: StepEvent) => void) {
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = createEventSource(sessionId);
    esRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StepEvent;
        setSteps((prev) => [...prev, data]);
        onStep?.(data);
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [sessionId, onStep]);

  return { steps };
}

function generateSessionId() {
  return `sess_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

const SUGGESTED_QUERIES = [
  { icon: Search, label: 'Research', query: 'Research the latest Solana ecosystem trends' },
  { icon: Code, label: 'Code', query: 'Write a Solana Anchor program for an NFT marketplace' },
  { icon: TrendingUp, label: 'DeFi', query: 'Analyze the best yield farming strategies on Solana' },
  { icon: Cloud, label: 'Weather', query: 'What is the weather in San Francisco?' },
  { icon: Sparkles, label: 'Creative', query: 'Generate a social media post about Web3 adoption' },
];

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [sessionId] = useState(() => generateSessionId());
  const {
    pendingPayments,
    addPaymentRequest,
    approvePayment,
    rejectPayment,
    dismissPayment,
    chooseMethod,
  } = useWalletPaymentQueue();

  const handleStep = useCallback((data: StepEvent) => {
    if (data.type === 'WALLET_SIGN_REQUESTED') {
      addPaymentRequest(data);
    }
  }, [addPaymentRequest]);

  const { steps } = useSSE(sessionId, handleStep);

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const [agents, setAgents] = useState<RegistryAgent[]>([]);
  const [activity, setActivity] = useState<PaymentActivity | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [palmBalance, setPalmBalance] = useState<number | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch real data
  useEffect(() => {
    let active = true;
    Promise.all([
      getAgents().catch(() => []),
      getPaymentActivity().catch(() => null),
    ]).then(([agentsData, activityData]) => {
      if (!active) return;
      setAgents(agentsData);
      setActivity(activityData);
      setLoadingData(false);
    });
    return () => { active = false; };
  }, []);

  // Fetch wallet balance
  useEffect(() => {
    if (!publicKey || !connection) return;
    let active = true;
    connection.getBalance(publicKey).then((lamports) => {
      if (active) setSolBalance(lamports / LAMPORTS_PER_SOL);
    });
    // TODO: fetch PALM_USD balance via getTokenAccountBalance
    setPalmBalance(0);
    return () => { active = false; };
  }, [publicKey, connection]);

  // Agent terminal query
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    const userQuery = query.trim();
    setQuery('');
    setIsLoading(true);
    setResult('');
    try {
      const res = await postQuery(userQuery, sessionId, 0.01);
      setResult(res.result);
    } catch (err: any) {
      setResult(`Error: ${err?.message ?? 'Query failed'}`);
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, sessionId]);

  // Dodo fund handler
  const handleFundWallet = async () => {
    if (!publicKey) return;
    try {
      const res = await fundViaDodo(10, publicKey.toBase58());
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.open(res.payment, '_blank');
      }
    } catch (err: any) {
      alert('Dodo funding failed: ' + (err?.message ?? 'Unknown error'));
    }
  };

  // Stats from real data
  const totalPayments = activity?.stats.totalPayments ?? 0;
  const uniqueAgentsCount = activity?.stats.uniqueAgents ?? 0;
  const totalVolumeSol = activity?.stats.totalVolumeSol ?? '0';

  const stats = [
    {
      label: 'Total Payments',
      value: String(totalPayments),
      change: '+live',
      trend: 'up' as const,
      icon: Activity,
      color: 'text-aldor-emerald',
      bg: 'bg-aldor-emerald/10',
    },
    {
      label: 'Active Agents',
      value: String(uniqueAgentsCount || agents.length),
      change: '+live',
      trend: 'up' as const,
      icon: Bot,
      color: 'text-aldor-purple-bright',
      bg: 'bg-aldor-purple/10',
    },
    {
      label: 'Volume (SOL)',
      value: totalVolumeSol,
      change: '+live',
      trend: 'up' as const,
      icon: Zap,
      color: 'text-aldor-cyan',
      bg: 'bg-aldor-cyan/10',
    },
    {
      label: 'Privacy Score',
      value: '98.2%',
      change: '+0.5%',
      trend: 'up' as const,
      icon: Shield,
      color: 'text-aldor-amber',
      bg: 'bg-aldor-amber/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mission Control</h1>
          <p className="text-sm text-aldor-text-secondary">Autonomous agent orchestration dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="default" className="gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-aldor-emerald animate-pulse" />
            System Online
          </Badge>
          {connected && publicKey && (
            <Button size="sm" variant="outline" className="gap-2" onClick={handleFundWallet}>
              <CreditCard size={14} />
              Fund Wallet
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-aldor-border bg-aldor-graphite/60 hover:border-aldor-border-light transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                  <span className={cn(
                    'text-xs font-medium flex items-center gap-1',
                    stat.trend === 'up' ? 'text-aldor-emerald' : 'text-aldor-rose'
                  )}>
                    <ArrowUpRight size={12} />
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-aldor-text">{stat.value}</p>
                <p className="text-xs text-aldor-text-muted mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Terminal */}
        <Card className="lg:col-span-2 border-aldor-border bg-aldor-graphite/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-aldor-emerald" />
                <CardTitle className="text-sm font-semibold">Agent Terminal</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-aldor-emerald mr-1.5 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Chat / Output */}
            <div className="bg-aldor-black rounded-lg border border-aldor-border p-4 h-80 overflow-y-auto scrollbar-thin mb-4">
              <div className="space-y-3">
                {steps.filter((s) => s.type === 'MANAGER_PLANNING' && s.depth === 0 && s.message).map((step, i) => (
                  <div key={`q-${i}`} className="flex justify-end">
                    <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-aldor-purple/10 text-aldor-text border border-aldor-purple/30">
                      <span className="text-xs text-aldor-purple-bright font-medium block mb-0.5">You</span>
                      {step.message}
                    </div>
                  </div>
                ))}

                {steps.filter((s) => s.type === 'PLAN_CREATED' && s.depth === 0 && s.message).map((step, i) => {
                  let agents: string[] = [];
                  try {
                    const plan = JSON.parse(step.message ?? '[]') as Array<{ agent: string }>;
                    agents = plan.map((t) => t.agent);
                  } catch { /* ignore */ }
                  return (
                    <div key={`plan-${i}`} className="flex justify-center">
                      <div className="px-3 py-1.5 rounded-full text-[10px] bg-aldor-surface/40 border border-aldor-border/40 text-aldor-text-muted">
                        {agents.length > 0 ? (
                          <>Hiring <span className="text-aldor-emerald">{agents.join(', ')}</span></>
                        ) : (
                          'Planning execution...'
                        )}
                      </div>
                    </div>
                  );
                })}

                {steps.filter((s) => s.type === 'AGENT_RESPONDED' && s.agent && s.message).map((step, i) => (
                  <div key={`resp-${i}`} className="flex justify-start">
                    <div className="max-w-[90%] px-3 py-2 rounded-lg text-sm bg-aldor-surface/60 border border-aldor-border/60">
                      <span className="text-xs text-aldor-emerald font-medium block mb-0.5">{step.agent}</span>
                      <span className="text-aldor-text-secondary whitespace-pre-wrap">{step.message}</span>
                    </div>
                  </div>
                ))}

                {steps.filter((s) => s.type === 'RESULT_COMPOSED' && s.depth === 0 && s.message).map((step, i) => (
                  <div key={`res-${i}`} className="flex justify-start">
                    <div className="max-w-[90%] px-3 py-2 rounded-lg text-sm bg-aldor-emerald/5 text-aldor-text border border-aldor-emerald/20">
                      <span className="text-xs text-aldor-emerald font-medium block mb-0.5">Result</span>
                      <span className="whitespace-pre-wrap">{step.message}</span>
                    </div>
                  </div>
                ))}

                {steps.filter((s) => ['SPECIALIST_FAILED', 'BUDGET_EXCEEDED', 'MAX_DEPTH_EXCEEDED'].includes(s.type)).map((step, i) => (
                  <div key={`err-${i}`} className="flex justify-start">
                    <div className="max-w-[90%] px-3 py-2 rounded-lg text-xs bg-aldor-rose/5 border border-aldor-rose/20 text-aldor-rose">
                      <span className="font-medium">{step.agent ?? 'System'}</span>{' '}
                      {step.message ?? 'An error occurred'}
                    </div>
                  </div>
                ))}

                {isLoading && steps.filter((s) => ['MANAGER_PLANNING', 'AGENT_RESPONDED', 'RESULT_COMPOSED'].includes(s.type)).length === 0 && (
                  <div className="flex justify-start">
                    <div className="bg-aldor-surface border border-aldor-border px-3 py-2 rounded-lg flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-aldor-emerald" />
                      <span className="text-xs text-aldor-text-muted">Orchestrating agents...</span>
                    </div>
                  </div>
                )}

                {steps.length === 0 && !result && !isLoading && (
                  <div className="text-center text-aldor-text-muted text-xs py-8">
                    Type a query to delegate to autonomous agents.
                  </div>
                )}
              </div>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter query or command..."
                className="flex-1 bg-aldor-surface border border-aldor-border rounded-md px-4 py-2.5 text-sm text-aldor-text placeholder:text-aldor-text-muted focus:outline-none focus:border-aldor-emerald/50"
              />
              <Button type="submit" disabled={isLoading} size="sm" className="gap-2">
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Execute
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Side Panel */}
        <div className="space-y-4">
          {/* Quick Hire */}
          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick Hire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Suggested Queries */}
              <div className="space-y-2">
                <p className="text-xs text-aldor-text-muted uppercase tracking-wider font-medium">Popular Tasks</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUERIES.map((sq) => (
                    <button
                      key={sq.label}
                      onClick={() => {
                        if (isLoading) return;
                        setQuery(sq.query);
                      }}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-aldor-surface/50 border border-aldor-border hover:border-aldor-emerald/40 hover:text-aldor-text transition-colors text-xs text-aldor-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <sq.icon size={12} />
                      {sq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Core Agents */}
              <div className="space-y-2">
                <p className="text-xs text-aldor-text-muted uppercase tracking-wider font-medium">Core Agents</p>
                {loadingData ? (
                  <div className="text-xs text-aldor-text-muted text-center py-4">Loading agents...</div>
                ) : agents.slice(0, 6).map((agent) => (
                  <div
                    key={agent.snsDomain}
                    className="flex items-center justify-between p-2 rounded-md bg-aldor-surface/50 border border-aldor-border hover:border-aldor-emerald/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                        <Bot size={12} className="text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">{agent.name}</p>
                        <p className="text-[10px] text-aldor-text-muted">
                          {(Number(agent.priceMicroStablecoin) / 1_000_000).toFixed(4)} Palm
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2"
                      onClick={() => {
                        setQuery(`Hire ${agent.name} to help with: `);
                      }}
                    >
                      Hire
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Card */}
          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Wallet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!connected ? (
                <div className="text-center py-2">
                  <WalletMultiButton
                    style={{
                      background: 'rgba(0, 255, 148, 0.1)',
                      color: '#00ff94',
                      fontWeight: 600,
                      fontSize: '12px',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid rgba(0, 255, 148, 0.2)',
                      cursor: 'pointer',
                      height: '36px',
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-aldor-text-secondary">SOL Balance</span>
                    <span className="text-sm font-mono font-semibold">
                      {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-aldor-text-secondary">Palm USD</span>
                    <span className="text-sm font-mono font-semibold text-aldor-emerald">
                      {palmBalance !== null ? palmBalance.toFixed(2) : '—'}
                    </span>
                  </div>
                  {publicKey && (
                    <p className="text-xs text-aldor-text-muted font-mono truncate">
                      {truncate(publicKey.toBase58(), 6)}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={handleFundWallet}>
                      Fund via Dodo
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-aldor-border bg-aldor-graphite/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-aldor-border">
                  <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Agent</th>
                  <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Tx Hash</th>
                  <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Amount</th>
                  <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Token</th>
                  <th className="text-left text-xs font-medium text-aldor-text-muted pb-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {loadingData ? (
                  <tr><td colSpan={5} className="py-4 text-xs text-aldor-text-muted text-center">Loading...</td></tr>
                ) : activity?.recentPayments?.length ? (
                  activity.recentPayments.slice(0, 10).map((item, i) => (
                    <tr key={i} className="border-b border-aldor-border/50 last:border-0">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                            <Bot size={12} className="text-white" />
                          </div>
                          <span className="text-sm">{item.agent}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs font-mono text-aldor-emerald">
                        <a href={`https://explorer.solana.com/tx/${item.hash}?cluster=devnet`} target="_blank" rel="noreferrer" className="hover:underline">
                          {truncate(item.hash, 6)}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-sm font-mono">{item.amount}</td>
                      <td className="py-3 pr-4 text-xs">{item.token}</td>
                      <td className="py-3 text-xs text-aldor-text-muted">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={5} className="py-4 text-xs text-aldor-text-muted text-center">No activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Payment Modal */}
      <WalletPaymentModal
        payments={pendingPayments}
        onApprove={approvePayment}
        onReject={rejectPayment}
        onDismiss={dismissPayment}
        onChooseMethod={chooseMethod}
        walletConnected={!!publicKey}
      />
    </div>
  );
}
