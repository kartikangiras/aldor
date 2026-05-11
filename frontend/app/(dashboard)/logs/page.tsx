'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPayments } from '@/lib/api';
import type { PaymentItem } from '@/lib/types';
import { FileText, ArrowUpRight, Loader2 } from 'lucide-react';

export default function LogsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getPayments(100, 0)
      .then((data) => {
        if (!active) return;
        setPayments(data.items ?? []);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load transactions');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const explorerUrl = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction Logs</h1>
        <p className="text-sm text-aldor-text-secondary">On-chain transaction monitoring</p>
      </div>

      <Card className="border-aldor-border bg-aldor-graphite/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText size={16} />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8 text-aldor-text-muted">
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading transactions...
            </div>
          )}

          {error && !loading && (
            <div className="text-sm text-aldor-rose py-4">{error}</div>
          )}

          {!loading && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aldor-border">
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Tx Signature</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">From</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">To</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Amount</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Token</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3 pr-4">Depth</th>
                    <th className="text-left text-xs font-medium text-aldor-text-muted pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-xs text-aldor-text-muted text-center">
                        No transactions yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((tx) => (
                      <tr key={tx.id} className="border-b border-aldor-border/50 last:border-0">
                        <td className="py-3 pr-4">
                          <a
                            href={explorerUrl(tx.txSignature)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-mono text-aldor-emerald hover:underline flex items-center gap-1"
                          >
                            {tx.txSignature.slice(0, 12)}...
                            <ArrowUpRight size={12} />
                          </a>
                        </td>
                        <td className="py-3 pr-4 text-sm text-aldor-text-secondary">{tx.fromAgent}</td>
                        <td className="py-3 pr-4 text-sm text-aldor-text-secondary">{tx.toAgent}</td>
                        <td className="py-3 pr-4 text-sm font-mono">{tx.amount}</td>
                        <td className="py-3 pr-4 text-xs">{tx.token}</td>
                        <td className="py-3 pr-4 text-xs">{tx.depth}</td>
                        <td className="py-3 text-xs text-aldor-text-muted">{formatTime(tx.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
