'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getPaymentActivity } from '@/lib/api';
import type { PaymentActivity } from '@/lib/api';
import { useNetwork } from '@/lib/NetworkContext';
import { Shield, ShieldCheck, Lock, Fingerprint, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';

function computeFingerprint(sig: string): string {
  return sig.slice(0, 8).toUpperCase();
}

function computeStealthHash(sig: string): string {
  let h = 0;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) - h + sig.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').toUpperCase();
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

export default function PrivacyPage() {
  const [activity, setActivity] = useState<PaymentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { clusterParam } = useNetwork();

  useEffect(() => {
    let active = true;
    getPaymentActivity()
      .then((data) => {
        if (!active) return;
        setActivity(data);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message ?? 'Failed to load privacy data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const recentPayments = activity?.recentPayments ?? [];
  const totalVolumePalm = Number(activity?.stats.totalVolumePalm ?? 0);
  const totalVolumeSol = Number(activity?.stats.totalVolumeSol ?? 0);
  const txCount = recentPayments.length;

  // Compute unique stealth addresses (one per unique tx signature)
  const uniqueSigs = new Set(recentPayments.map((p) => p.hash).filter(Boolean));
  const stealthCount = uniqueSigs.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Privacy Integration</h1>
        <p className="text-sm text-aldor-text-secondary">Umbra SDK-powered stealth analytics</p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-aldor-text-muted">
          <Loader2 size={24} className="animate-spin mr-2" />
          Loading Umbra data...
        </div>
      )}

      {error && !loading && (
        <Card className="border-aldor-rose/30 bg-aldor-rose/10">
          <CardContent className="p-4 text-sm text-aldor-rose">{error}</CardContent>
        </Card>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-aldor-border bg-aldor-graphite/60">
              <CardContent className="p-5 text-center">
                <ShieldCheck size={32} className="mx-auto mb-3 text-aldor-emerald" />
                <p className="text-3xl font-bold">{txCount}</p>
                <p className="text-xs text-aldor-text-muted mt-1">Shielded Transactions</p>
              </CardContent>
            </Card>
            <Card className="border-aldor-border bg-aldor-graphite/60">
              <CardContent className="p-5 text-center">
                <Lock size={32} className="mx-auto mb-3 text-aldor-purple" />
                <p className="text-3xl font-bold">{(totalVolumePalm / 1_000_000).toFixed(4)}</p>
                <p className="text-xs text-aldor-text-muted mt-1">Palm USD Shielded</p>
              </CardContent>
            </Card>
            <Card className="border-aldor-border bg-aldor-graphite/60">
              <CardContent className="p-5 text-center">
                <Shield size={32} className="mx-auto mb-3 text-aldor-cyan" />
                <p className="text-3xl font-bold">{stealthCount}</p>
                <p className="text-xs text-aldor-text-muted mt-1">Stealth Addresses</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield size={16} className="text-aldor-purple" />
                Umbra Shielded Transaction Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="text-center py-12 text-aldor-text-muted text-sm">
                  <Lock size={24} className="mx-auto mb-3 opacity-30" />
                  <p>No shielded transactions yet.</p>
                  <p className="text-[10px] mt-1">All agent payments are routed through Umbra stealth addresses.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {recentPayments.map((tx, i) => {
                    const fingerprint = computeFingerprint(tx.hash);
                    const stealthHash = computeStealthHash(tx.hash);
                    return (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-aldor-black border border-aldor-border hover:border-aldor-purple/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {tx.token}
                            </Badge>
                            <span className="text-xs font-semibold">{tx.agent}</span>
                          </div>
                          <span className="text-[10px] text-aldor-text-muted">{timeAgo(tx.timestamp)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <Fingerprint size={10} className="text-aldor-cyan" />
                            <span className="text-[10px] text-aldor-text-secondary">FP:</span>
                            <span className="text-[10px] font-mono text-aldor-cyan">{fingerprint}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Lock size={10} className="text-aldor-purple" />
                            <span className="text-[10px] text-aldor-text-secondary">Stealth:</span>
                            <span className="text-[10px] font-mono text-aldor-purple">{stealthHash}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <a
                            href={`https://explorer.solana.com/tx/${tx.hash}${clusterParam}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-mono text-aldor-emerald hover:underline flex items-center gap-1"
                          >
                            <ExternalLink size={9} />
                            {tx.hash.slice(0, 16)}...
                          </a>
                          <div className="flex items-center gap-1 text-[10px] text-aldor-emerald">
                            <CheckCircle2 size={10} />
                            Umbra Shielded &amp; Secured
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 py-4 text-[10px] text-aldor-text-muted border-t border-aldor-border">
            <span>Powered by</span>
            <img src="/umbra.png" alt="Umbra" className="w-4 h-4 rounded-sm object-contain" />
            <span className="text-aldor-purple font-medium">Umbra Privacy Protocol</span>
          </div>
        </>
      )}
    </div>
  );
}
