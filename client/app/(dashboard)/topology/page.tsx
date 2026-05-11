'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPaymentActivity } from '@/lib/api';
import type { PaymentActivity } from '@/lib/api';
import { Network, ArrowRight, Bot, Loader2, Wallet } from 'lucide-react';
import PlatformFlowDiagram from '@/components/PlatformFlowDiagram';

export default function TopologyPage() {
  const [activity, setActivity] = useState<PaymentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPaymentActivity()
      .then((data) => {
        if (!active) return;
        setActivity(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load topology data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  // Build flows from recent payments
  const flows = (activity?.recentPayments ?? []).slice(0, 8).map((payment) => ({
    from: payment.payer ?? 'User',
    to: payment.agent,
    amount: `${payment.amount} ${payment.token}`,
    type: 'payment' as const,
    status: 'Settled' as const,
    hash: payment.hash,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Economic Topology</h1>
        <p className="text-sm text-aldor-text-secondary">Visualize agent-to-agent economic flows and dependencies</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-aldor-text-muted">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading topology...
        </div>
      )}

      {error && !loading && (
        <Card className="border-aldor-rose/30 bg-aldor-rose/10">
          <CardContent className="p-4 text-sm text-aldor-rose">{error}</CardContent>
        </Card>
      )}

      {!loading && (
        <>
          {/* Platform Flow Diagram */}
          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Network size={16} className="text-aldor-purple" />
                Platform Architecture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformFlowDiagram />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Network visualization */}
            <Card className="lg:col-span-2 border-aldor-border bg-aldor-graphite/60 min-h-[400px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Wallet size={16} className="text-aldor-emerald" />
                  Agent Balance Network
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity?.agentBalances?.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {activity.agentBalances.map((ab) => (
                      <div
                        key={ab.agent}
                        className="p-4 rounded-xl bg-aldor-surface/50 border border-aldor-border relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-aldor-purple/10 to-transparent rounded-bl-full" />
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                            <Bot size={14} className="text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{ab.agent}</p>
                            <p className="text-[10px] text-aldor-text-muted font-mono truncate max-w-[140px]">
                              {ab.address}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-aldor-text-muted">SOL</span>
                            <span className="font-mono text-aldor-emerald">{ab.solBalance}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-aldor-text-muted">Palm</span>
                            <span className="font-mono text-aldor-cyan">{ab.palmBalance}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-aldor-text-muted">
                    <div className="text-center">
                      <Network size={48} className="mx-auto mb-4 opacity-30" />
                      <p>No agent balance data yet.</p>
                    </div>
                  </div>
                )}

                {/* Center orchestrator node */}
                {activity?.agentBalances && activity.agentBalances.length > 0 && (
                  <div className="mt-6 flex items-center justify-center">
                    <div className="px-6 py-3 rounded-full bg-aldor-surface border border-aldor-border flex items-center gap-2">
                      <Wallet size={16} className="text-aldor-emerald" />
                      <span className="text-sm font-medium">Orchestrator</span>
                      <Badge variant="outline" className="text-xs">
                        {activity.agentBalances.length} agents
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Flows */}
            <Card className="border-aldor-border bg-aldor-graphite/60">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Active Flows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {flows.length === 0 ? (
                  <div className="text-center py-8 text-aldor-text-muted text-sm">
                    No payment flows yet.
                  </div>
                ) : (
                  flows.map((flow, i) => (
                    <div key={i} className="p-3 rounded-lg bg-aldor-surface/50 border border-aldor-border">
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="text-aldor-text-secondary">{flow.from}</span>
                        <ArrowRight size={12} className="text-aldor-text-muted" />
                        <span className="text-aldor-text-secondary">{flow.to}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono">{flow.amount}</span>
                        <Badge variant="default" className="text-xs">
                          {flow.status}
                        </Badge>
                      </div>
                      {flow.hash && (
                        <a
                          href={`https://explorer.solana.com/tx/${flow.hash}?cluster=devnet`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-aldor-emerald hover:underline mt-1 block"
                        >
                          {flow.hash.slice(0, 16)}...
                        </a>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
