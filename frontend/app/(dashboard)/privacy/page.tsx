'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldCheck, Eye, Lock, Fingerprint } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Privacy Integration</h1>
        <p className="text-sm text-aldor-text-secondary">Umbra SDK-powered stealth analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-aldor-border bg-aldor-graphite/60">
          <CardContent className="p-5 text-center">
            <ShieldCheck size={32} className="mx-auto mb-3 text-aldor-emerald" />
            <p className="text-3xl font-bold">98.2%</p>
            <p className="text-xs text-aldor-text-muted mt-1">Privacy Score</p>
          </CardContent>
        </Card>
        <Card className="border-aldor-border bg-aldor-graphite/60">
          <CardContent className="p-5 text-center">
            <Eye size={32} className="mx-auto mb-3 text-aldor-purple" />
            <p className="text-3xl font-bold">12,847</p>
            <p className="text-xs text-aldor-text-muted mt-1">Shielded Transactions</p>
          </CardContent>
        </Card>
        <Card className="border-aldor-border bg-aldor-graphite/60">
          <CardContent className="p-5 text-center">
            <Lock size={32} className="mx-auto mb-3 text-aldor-cyan" />
            <p className="text-3xl font-bold">100%</p>
            <p className="text-xs text-aldor-text-muted mt-1">Encryption Rate</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-aldor-border bg-aldor-graphite/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Privacy Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Stealth Key Coverage', value: 94, color: 'bg-aldor-emerald' },
            { label: 'Transaction Obfuscation', value: 87, color: 'bg-aldor-purple' },
            { label: 'Metadata Protection', value: 92, color: 'bg-aldor-cyan' },
            { label: 'Forward Secrecy', value: 98, color: 'bg-aldor-amber' },
          ].map((metric) => (
            <div key={metric.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm">{metric.label}</span>
                <span className="text-sm font-mono">{metric.value}%</span>
              </div>
              <div className="h-2 bg-aldor-surface rounded-full overflow-hidden">
                <div className={`h-full ${metric.color} rounded-full transition-all`} style={{ width: `${metric.value}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
