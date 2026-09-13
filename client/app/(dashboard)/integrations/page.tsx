'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, Cpu, ShieldCheck, CreditCard, BarChart3, Loader2 } from 'lucide-react';
import SNSIntegration from '@/components/SNSIntegration';
import QVACIntegration from '@/components/QVACIntegration';
import IntegrationsStatus from '@/components/IntegrationsStatus';

const integrations = [
  { name: 'SNS Resolution', icon: Globe, status: 'connected', description: 'Bonfida .sol domain resolution', color: 'text-blue-400' },
  { name: 'QVAC Embeddings', icon: Cpu, status: 'connected', description: 'Local on-device vector similarity', color: 'text-aldor-purple-bright' },
  { name: 'Umbra Privacy', icon: ShieldCheck, status: 'connected', description: 'Stealth address transfers', color: 'text-aldor-emerald' },
  { name: 'Dodo Payments', icon: CreditCard, status: 'connected', description: 'Fiat on-ramp integration', color: 'text-aldor-amber' },
  { name: 'Covalent Analytics', icon: BarChart3, status: 'connected', description: 'Blockchain data indexing', color: 'text-aldor-cyan' },
];

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SNS + QVAC Integrations</h1>
        <p className="text-sm text-aldor-text-secondary">Connected services and API health</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={24} className="animate-spin text-aldor-emerald" />
        </div>
      ) : (
        <>
          {/* Detailed SNS + QVAC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SNSIntegration />
            <QVACIntegration />
          </div>

          {/* All integrations overview */}
          <Card className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">All Integrations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.name}
                    className="p-4 rounded-lg bg-aldor-black border border-aldor-border hover:border-aldor-emerald/20 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-9 h-9 rounded-lg bg-aldor-surface flex items-center justify-center ${integration.color}`}>
                        <integration.icon size={18} />
                      </div>
                      <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'} className="text-[10px]">
                        {integration.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-xs mb-1">{integration.name}</h3>
                    <p className="text-[10px] text-aldor-text-secondary">{integration.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live status panel */}
          <IntegrationsStatus />
        </>
      )}
    </div>
  );
}
