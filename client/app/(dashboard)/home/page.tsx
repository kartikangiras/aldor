'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useSearchParams } from 'next/navigation';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
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
  getPaymentConfig,
} from '@/lib/api';
import type { RegistryAgent, StepEvent } from '@/lib/types';
import type { PaymentActivity } from '@/lib/api';
import { useWalletPaymentQueue } from '@/lib/useWalletPaymentQueue';
import WalletPaymentModal from '@/components/WalletPaymentModal';
import ClientOnly from '@/components/ClientOnly';
import {
  Bot,
  Shield,
  Zap,
  Activity,
  ArrowUpRight,
  Send,
  Loader2,
  Search,
  Code,
  TrendingUp,
  Cloud,
  Sparkles,
  CheckCircle2,
  AlertCircle,
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

function PrefillProvider({ onPrefill }: { onPrefill: (q: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (prefill) {
      onPrefill(decodeURIComponent(prefill));
    }
  }, [searchParams, onPrefill]);
  return null;
}

function DashboardPageInner({ initialPrefill }: { initialPrefill?: string }) {
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
  const [walletFunded, setWalletFunded] = useState(false);
  const [walletCancelled, setWalletCancelled] = useState(false);

  // Apply prefill from URL when it arrives
  useEffect(() => {
    if (initialPrefill) {
      setQuery(initialPrefill);
    }
  }, [initialPrefill]);

  // Detect Dodo wallet top-up return params
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const funded = params.has('walletFunded');
    const cancelled = params.has('walletCancelled');
    if (funded) setWalletFunded(true);
    if (cancelled) setWalletCancelled(true);
    if (funded || cancelled) {
      const url = new URL(window.location.href);
      url.searchParams.delete('walletFunded');
      url.searchParams.delete('walletCancelled');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Core query execution
  const executeQuery = useCallback(async (userQuery: string) => {
    if (!userQuery.trim() || isLoading) return;
    setQuery('');
    setIsLoading(true);
    setResult('');
    try {
      const res = await postQuery(userQuery.trim(), sessionId, 0.01);
      setResult(res.result);
    } catch (err: any) {
      setResult(`Error: ${err?.message ?? 'Query failed'}`);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId]);

  // Agent terminal query (form handler)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    executeQuery(query);
  }, [query, executeQuery]);

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

  // Fetch wallet balances (SOL + Palm USD)
  useEffect(() => {
    if (!publicKey || !connection) return;
    const pk = publicKey;
    let active = true;

    async function fetchBalances() {
      try {
        const lamports = await connection.getBalance(pk);
        if (!active) return;
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (active) setSolBalance(0);
      }

      try {
        const config = await getPaymentConfig();
        if (!active) return;
        const mint = new PublicKey(config.palmUsdMint);
        const ata = await getAssociatedTokenAddress(mint, pk);
        const tokenAccount = await getAccount(connection, ata);
        if (active) setPalmBalance(Number(tokenAccount.amount) / 1_000_000);
      } catch {
        if (active) setPalmBalance(0);
      }
    }

    fetchBalances();
    return () => { active = false; };
  }, [publicKey, connection]);

  // Dodo fund handler — redirects in same tab with return URL
  const handleFundWallet = async () => {
    if (!publicKey) return;
    try {
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/home?walletFunded=1`
        : undefined;
      const cancelUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/home?walletCancelled=1`
        : undefined;
      const res = await fundViaDodo(10, publicKey.toBase58(), returnUrl, cancelUrl);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.location.href = res.payment;
      } else {
        alert('Funding initiated: ' + res.payment);
      }
    } catch (err: any) {
      alert('Dodo funding failed: ' + (err?.message ?? 'Unknown error'));
    }
  };

  // Stats from real data
  const totalPayments = activity?.stats.totalPayments ?? 0;
  const uniqueAgentsCount = activity?.stats.uniqueAgents ?? 0;
  const totalVolumeSol = activity?.stats.totalVolumeSol ?? '0';

  const sparkPaths = [
    'M0,20 L8,18 L16,22 L24,15 L32,17 L40,10 L48,12 L56,6 L64,8',
    'M0,22 L8,20 L16,18 L24,21 L32,16 L40,14 L48,11 L56,13 L64,9',
    'M0,18 L8,22 L16,19 L24,24 L32,20 L40,15 L48,18 L56,10 L64,7',
    'M0,24 L8,20 L16,22 L24,18 L32,20 L40,16 L48,14 L56,12 L64,10',
  ];

  const stats = [
    {
      label: 'Total Payments',
      value: String(totalPayments),
      change: '+live',
      trend: 'up' as const,
      icon: Activity,
      color: 'text-aldor-emerald',
      bg: 'bg-aldor-emerald/10',
      sparkColor: '#818cf8',
    },
    {
      label: 'Active Agents',
      value: String(uniqueAgentsCount || agents.length),
      change: '+live',
      trend: 'up' as const,
      icon: Bot,
      color: 'text-aldor-purple-bright',
      bg: 'bg-aldor-purple/10',
      sparkColor: '#a78bfa',
    },
    {
      label: 'Volume (SOL)',
      value: totalVolumeSol,
      change: '+live',
      trend: 'up' as const,
      icon: Zap,
      color: 'text-aldor-cyan',
      bg: 'bg-aldor-cyan/10',
      sparkColor: '#67e8f9',
    },
    {
      label: 'Palm USD Volume',
      value: `${(activity?.stats.palmVolumeUsd ?? 0).toFixed(2)}`,
      change: '+live',
      trend: 'up' as const,
      icon: Shield,
      color: 'text-aldor-amber',
      bg: 'bg-aldor-amber/10',
      sparkColor: '#fbbf24',
    },
  ];

  return (
    <ClientOnly>
      <div className="space-y-6">
        {/* Dodo Status Banners */}
        {walletFunded && (
          <Card className="border-aldor-emerald/20 bg-aldor-emerald/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-aldor-emerald">
              <CheckCircle2 size={16} />
              <span>Wallet funded successfully! Your balance should update shortly.</span>
            </CardContent>
          </Card>
        )}

        {walletCancelled && (
          <Card className="border-aldor-rose/30 bg-aldor-rose/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-aldor-rose">
              <AlertCircle size={16} />
              <span>Payment was cancelled. No funds were charged.</span>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mission Control</h1>
            <p className="text-sm text-aldor-text-secondary">Autonomous agent orchestration dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="gap-1.5">
              <span className="status-dot status-dot-active" />
              System Online
            </Badge>
            {connected && publicKey && (
              <Button size="sm" variant="outline" className="gap-2" onClick={handleFundWallet}>
                <img src="/dodo.png" alt="Dodo" className="w-4 h-4 rounded-sm object-contain" />
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
            <div className="glass-card p-5">
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
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-aldor-text-muted">{stat.label}</p>
                  <svg width="64" height="28" viewBox="0 0 64 28" fill="none" className="opacity-60">
                    <path d={sparkPaths[i]} stroke={stat.sparkColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Terminal */}
        <Card className="lg:col-span-2 glass-card border-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-aldor-emerald" />
                <div className="flex gap-1 ml-1"><span className="w-2 h-2 rounded-full bg-red-400/70" /><span className="w-2 h-2 rounded-full bg-yellow-400/70" /><span className="w-2 h-2 rounded-full bg-green-400/70" /></div>
                <CardTitle className="text-sm font-semibold">Agent Terminal</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-aldor-emerald mr-1.5 animate-pulse" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Chat / Output — refined: only final answer, no markdown */}
            <div className="bg-aldor-black rounded-lg border border-aldor-border p-4 h-80 overflow-y-auto scrollbar-thin mb-4">
              <div className="space-y-3">
                {/* User query bubble */}
                {steps.filter((s) => s.type === 'MANAGER_PLANNING' && s.depth === 0 && s.message).map((step, i) => (
                  <div key={`q-${i}`} className="flex justify-end">
                    <div className="max-w-[85%] px-3 py-2 rounded-lg text-sm bg-aldor-purple/10 text-aldor-text border border-aldor-purple/30">
                      <span className="text-xs text-aldor-purple-bright font-medium block mb-0.5">You</span>
                      {step.message}
                    </div>
                  </div>
                ))}

                {/* Final result only — stripped of markdown */}
                {steps.filter((s) => s.type === 'RESULT_COMPOSED' && s.depth === 0 && s.message).map((step, i) => {
                  const clean = step.message!
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '')
                    .replace(/__/g, '')
                    .replace(/#/g, '')
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                    .replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim())
                    .replace(/`([^`]+)`/g, '$1')
                    .replace(/> /g, '')
                    .replace(/-\s/g, '• ')
                    .trim();
                  return (
                    <div key={`res-${i}`} className="flex justify-start">
                      <div className="max-w-[90%] px-3 py-2 rounded-lg text-sm bg-aldor-emerald/5 text-aldor-text border border-aldor-emerald/20">
                        <span className="text-xs text-aldor-emerald font-medium block mb-0.5">Result</span>
                        <span className="whitespace-pre-wrap leading-relaxed">{clean}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Errors only */}
                {steps.filter((s) => ['SPECIALIST_FAILED', 'BUDGET_EXCEEDED', 'MAX_DEPTH_EXCEEDED'].includes(s.type)).map((step, i) => (
                  <div key={`err-${i}`} className="flex justify-start">
                    <div className="max-w-[90%] px-3 py-2 rounded-lg text-xs bg-aldor-rose/5 border border-aldor-rose/20 text-aldor-rose">
                      <span className="font-medium">{step.agent ?? 'System'}</span>{' '}
                      {step.message ?? 'An error occurred'}
                    </div>
                  </div>
                ))}

                {isLoading && steps.filter((s) => s.type === 'RESULT_COMPOSED').length === 0 && (
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
          <Card className="glass-card border-0">
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
                        executeQuery(sq.query);
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
            </CardContent>
          </Card>

          {/* Wallet Card */}
          <Card className="glass-card border-0">
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
                    <Button size="sm" variant="outline" className="flex-1 text-xs gap-1.5" onClick={handleFundWallet}>
                      <img src="/dodo.png" alt="Dodo" className="w-3.5 h-3.5 rounded-sm object-contain" />
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
      <Card className="glass-card border-0">
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
                    <tr key={i} className="activity-row cursor-default">
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
          solBalance={solBalance}
          palmBalance={palmBalance}
        />
      </div>
    </ClientOnly>
  );
}

export default function DashboardPage() {
  const [prefill, setPrefill] = useState('');
  return (
    <Suspense fallback={null}>
      <PrefillProvider onPrefill={setPrefill} />
      <DashboardPageInner initialPrefill={prefill} />
    </Suspense>
  );
}
