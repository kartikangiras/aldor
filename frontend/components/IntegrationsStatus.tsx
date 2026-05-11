'use client';

import { useState, useEffect } from 'react';
import { Globe, Cpu, ShieldCheck, CreditCard, BarChart3, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface IntegrationStatus {
  name: string;
  ok: boolean;
  detail: string;
}

const ICONS: Record<string, React.ReactNode> = {
  sns: <Globe size={14} color="#3b82f6" />,
  qvac: <Cpu size={14} color="#14b8a6" />,
  umbra: <ShieldCheck size={14} color="#9d4edd" />,
  dodo: <CreditCard size={14} color="#ffa500" />,
  covalent: <BarChart3 size={14} color="#00ff94" />,
};

const LABELS: Record<string, string> = {
  sns: 'SNS Resolution',
  qvac: 'QVAC Embeddings',
  umbra: 'Umbra Privacy',
  dodo: 'Dodo Payments',
  covalent: 'Covalent Analytics',
};

const COLORS: Record<string, string> = {
  sns: '#3b82f6',
  qvac: '#14b8a6',
  umbra: '#9d4edd',
  dodo: '#ffa500',
  covalent: '#00ff94',
};

export default function IntegrationsStatus() {
  const [probes, setProbes] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchStatus() {
      try {
        const res = await fetch('/api/integrations/diagnostics');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!active) return;
        setProbes(data.probes ?? []);
        setError(null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message ?? 'Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div style={{ padding: 16, background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={14} color="#ffffff" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Integrations
          </span>
        </div>
        {loading && <Loader2 size={12} color="#555555" className="animate-spin-slow" />}
      </div>

      {error && (
        <div style={{ fontSize: 10, color: '#ff3b30', padding: '6px 8px', background: 'rgba(255,59,48,0.05)', border: '1px solid rgba(255,59,48,0.2)' }}>
          <AlertCircle size={10} style={{ marginRight: 6, display: 'inline' }} />
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {probes.map((probe) => {
          const color = COLORS[probe.name] ?? '#888888';
          const label = LABELS[probe.name] ?? probe.name.toUpperCase();
          return (
            <div
              key={probe.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                background: probe.ok ? `${color}08` : 'rgba(255,59,48,0.04)',
                border: `1px solid ${probe.ok ? `${color}30` : 'rgba(255,59,48,0.2)'}`,
              }}
            >
              {ICONS[probe.name] ?? <ShieldCheck size={14} color="#888888" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: probe.ok ? color : '#ff3b30', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                  {probe.ok ? (
                    <CheckCircle2 size={10} color={color} />
                  ) : (
                    <AlertCircle size={10} color="#ff3b30" />
                  )}
                </div>
                <div style={{ fontSize: 9, color: '#555555', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {probe.detail}
                </div>
              </div>
            </div>
          );
        })}

        {probes.length === 0 && !loading && !error && (
          <div style={{ fontSize: 10, color: '#555555', textAlign: 'center', padding: 12 }}>
            No integration data available.
          </div>
        )}
      </div>
    </div>
  );
}
