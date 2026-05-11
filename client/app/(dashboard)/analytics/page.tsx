'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { getPaymentActivity, getStats } from '@/lib/api';
import type { PaymentStats } from '@/lib/types';
import type { PaymentActivity } from '@/lib/api';
import {
  BarChart3,
  TrendingUp,
  Activity,
  DollarSign,
  Bot,
  Loader2,
  BarChart as BarChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function AnalyticsPage() {
  const [activity, setActivity] = useState<PaymentActivity | null>(null);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      getPaymentActivity().catch(() => null),
      getStats().catch(() => null),
    ]).then(([activityData, statsData]) => {
      if (!active) return;
      setActivity(activityData);
      setStats(statsData);
    }).catch((err: any) => {
      if (!active) return;
      setError(err?.message ?? 'Failed to load analytics');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const velocityData = (activity?.velocity ?? []).map((v, i) => ({
    name: `T-${activity!.velocity.length - i}`,
    value: v,
  }));

  const statCards = [
    {
      label: 'Total Payments',
      value: String(activity?.stats.totalPayments ?? stats?.totalPayments ?? 0),
      change: '+live',
      icon: DollarSign,
      color: 'text-aldor-emerald',
      bg: 'bg-aldor-emerald/10',
    },
    {
      label: 'Active Agents',
      value: String(activity?.stats.uniqueAgents ?? stats?.uniqueAgents ?? 0),
      change: '+live',
      icon: Bot,
      color: 'text-aldor-purple-bright',
      bg: 'bg-aldor-purple/10',
    },
    {
      label: 'Volume (SOL)',
      value: activity?.stats.totalVolumeSol ?? '0',
      change: '+live',
      icon: Activity,
      color: 'text-aldor-cyan',
      bg: 'bg-aldor-cyan/10',
    },
    {
      label: 'Palm USD Volume',
      value: `${(activity?.stats.palmVolumeUsd ?? 0).toFixed(2)}`,
      change: '+live',
      icon: TrendingUp,
      color: 'text-aldor-amber',
      bg: 'bg-aldor-amber/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Analytics</h1>
        <p className="text-sm text-aldor-text-secondary">Covalent-powered on-chain analytics</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-aldor-text-muted">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading analytics...
        </div>
      )}

      {error && !loading && (
        <Card className="border-aldor-rose/30 bg-aldor-rose/10">
          <CardContent className="p-4 text-sm text-aldor-rose">{error}</CardContent>
        </Card>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="border-aldor-border bg-aldor-graphite/60">
                <CardContent className="p-5">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-aldor-text-muted">{stat.label}</p>
                  <p className="text-xs text-aldor-emerald mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-aldor-border bg-aldor-graphite/60 min-h-[300px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Payment Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                {velocityData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={velocityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} />
                        <Tooltip
                          contentStyle={{
                            background: '#0a0a0a',
                            border: '1px solid #2a2a2a',
                            borderRadius: '6px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="value" fill="#00ff94" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-aldor-text-muted text-sm">
                    No velocity data yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-aldor-border bg-aldor-graphite/60 min-h-[300px]">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Agent Balances</CardTitle>
              </CardHeader>
              <CardContent>
                {activity?.agentBalances?.length ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {activity.agentBalances.map((ab) => (
                      <div
                        key={ab.agent}
                        className="flex items-center justify-between p-2 rounded-md bg-aldor-surface/50 border border-aldor-border"
                      >
                        <div>
                          <p className="text-xs font-medium">{ab.agent}</p>
                          <p className="text-[10px] text-aldor-text-muted font-mono truncate max-w-[180px]">
                            {ab.address}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-aldor-emerald">{ab.solBalance} SOL</p>
                          <p className="text-[10px] font-mono text-aldor-cyan">{ab.palmBalance} Palm</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-aldor-text-muted text-sm">
                    No agent balance data yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 size={16} />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-aldor-border">
                      <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Agent</th>
                      <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Amount</th>
                      <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Token</th>
                      <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Depth</th>
                      <th className="text-left text-xs font-medium text-aldor-text-muted pb-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity?.recentPayments?.length ? (
                      activity.recentPayments.slice(0, 10).map((item, i) => (
                        <tr key={i} className="border-b border-aldor-border/50 last:border-0">
                          <td className="py-3 pr-4 text-sm">{item.agent}</td>
                          <td className="py-3 pr-4 text-sm font-mono">{item.amount}</td>
                          <td className="py-3 pr-4 text-xs">{item.token}</td>
                          <td className="py-3 pr-4 text-xs">{item.depth}</td>
                          <td className="py-3 text-xs text-aldor-text-muted">
                            {new Date(item.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-4 text-xs text-aldor-text-muted text-center">
                          No recent payments.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-aldor-text-muted border-t border-aldor-border">
            <span>Powered by</span>
            <img src="/covalent.png" alt="Covalent" className="w-4 h-4 rounded-sm object-contain" />
            <span className="text-aldor-emerald font-medium">Covalent Blockchain Analytics</span>
          </div>
        </>
      )}
    </div>
  );
}
