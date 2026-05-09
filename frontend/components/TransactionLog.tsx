'use client';

import type { StepEvent } from '@/lib/types';
import { useNetwork } from '@/lib/NetworkContext';
import { ExternalLink, Lock, ArrowRight } from 'lucide-react';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

function PaymentCard({ step, index }: { step: StepEvent; index: number }) {
  const { clusterParam } = useNetwork();
  const isA2A = step.depth > 0;

  return (
    <div
      style={{
        padding: '10px 12px',
        marginBottom: 6,
        background: isA2A ? 'rgba(255,165,0,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isA2A ? 'rgba(255,165,0,0.15)' : '#333333'}`,
        transition: 'all 0.2s',
      }}
    >
      {/* Row 1: source → destination + amount */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#ffffff', fontFamily: "'JetBrains Mono', monospace" }}>
            orchestrator.aldor.sol
          </span>
          <ArrowRight size={10} color={isA2A ? '#ffa500' : '#555555'} />
          <span style={{ fontSize: 10, fontWeight: 600, color: '#00ff94', fontFamily: "'JetBrains Mono', monospace" }}>
            {step.agent ?? step.domain ?? 'unknown'}
          </span>
          {isA2A && (
            <span
              style={{
                fontSize: 9,
                padding: '1px 5px',
                background: 'rgba(255,165,0,0.1)',
                border: '1px solid rgba(255,165,0,0.3)',
                color: '#ffa500',
                fontWeight: 700,
              }}
            >
              A2A D{step.depth}
            </span>
          )}
        </div>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 10,
            padding: '2px 6px',
            background: '#1a1a1a',
            border: '1px solid #333333',
            color: '#9d4edd',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          <Lock size={10} />
          [REDACTED]
        </span>
      </div>

      {/* Row 2: tx hash + timestamp */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
        {step.txSignature ? (
          <a
            href={`https://explorer.solana.com/tx/${step.txSignature}${clusterParam}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: '#14b8a6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <ExternalLink size={10} />
            {step.txSignature.slice(0, 14)}…{step.txSignature.slice(-4)}
          </a>
        ) : (
          <span>pending…</span>
        )}
        <span style={{ marginLeft: 'auto' }}>{timeAgo(step.timestamp)}</span>
      </div>
    </div>
  );
}

export default function TransactionLog({ steps }: { steps: StepEvent[] }) {
  const settled = steps.filter((s) => s.type === 'X402_SETTLED');
  const a2aCount = settled.filter((s) => s.depth > 0).length;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Transaction Log
          </span>
          <span style={{ fontSize: 10, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
            {settled.length} total
          </span>
        </div>
        {a2aCount > 0 && (
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: 'rgba(255,165,0,0.1)',
              border: '1px solid rgba(255,165,0,0.3)',
              color: '#ffa500',
              fontWeight: 700,
            }}
          >
            {a2aCount} A2A
          </span>
        )}
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
        {settled.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#555555', fontSize: 11 }}>
            <Lock size={16} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No shielded transactions yet.</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>All amounts are hidden via Umbra stealth addresses.</div>
          </div>
        ) : (
          settled
            .slice()
            .reverse()
            .map((step, i) => <PaymentCard key={i} step={step} index={i} />)
        )}
      </div>
    </div>
  );
}
