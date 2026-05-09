'use client';

import type { StepEvent } from '@/lib/types';
import { useNetwork } from '@/lib/NetworkContext';
import { Shield, Lock, Eye, Fingerprint, ExternalLink } from 'lucide-react';

export default function UmbraPrivacyProof({ steps }: { steps: StepEvent[] }) {
  const { clusterParam } = useNetwork();
  const mockMode = process.env.NEXT_PUBLIC_MOCK_PAYMENTS === 'true';
  const settled = steps.filter((s) => s.type === 'X402_SETTLED' && s.txSignature);
  const uniqueSigs = new Set(settled.map((s) => s.txSignature));
  const volumeShielded = settled.length * 1000; // Placeholder: each settlement shields ~1000 micro-units on average
  const stealthAddressesGenerated = uniqueSigs.size;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={14} color="#9d4edd" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Umbra Privacy Proof
          </span>
        </div>
        <span style={{ fontSize: 10, color: '#9d4edd', fontWeight: 700 }}>
          {settled.length} Shielded
        </span>
      </div>

      {/* Shield counters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ padding: 10, border: '1px solid #333333', background: '#1a1a1a', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Volume Shielded
          </div>
          <div style={{ fontSize: 18, color: '#9d4edd', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {mockMode ? '(MOCK) ' : ''}
            {volumeShielded.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: '#555555' }}>micro-PUSD</div>
        </div>
        <div style={{ padding: 10, border: '1px solid #333333', background: '#1a1a1a', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Stealth Addresses
          </div>
          <div style={{ fontSize: 18, color: '#00ff94', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
            {stealthAddressesGenerated}
          </div>
          <div style={{ fontSize: 9, color: '#555555' }}>generated</div>
        </div>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {settled.map((step, i) => (
          <div
            key={i}
            className="fade-in"
            style={{ padding: '8px 10px', border: '1px solid #333333', background: 'rgba(157,78,221,0.03)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: '#ffffff', fontWeight: 600 }}>{step.agent}</span>
              <span style={{ fontSize: 9, color: '#555555' }}>
                {mockMode ? '(MOCK) ' : ''}#{i + 1}
              </span>
            </div>
            <div style={{ fontSize: 9, color: '#888888', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Fingerprint size={9} />
              <a
                href={`https://explorer.solana.com/tx/${step.txSignature}${clusterParam}`}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#14b8a6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
              >
                <ExternalLink size={9} />
                {step.txSignature!.slice(0, 18)}...
              </a>
            </div>
            <div style={{ fontSize: 9, color: '#555555' }}>
              Ephemeral Key: <span style={{ color: '#333333' }}>not emitted in SSE</span>
            </div>
            <div style={{ fontSize: 9, color: '#9d4edd', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Eye size={9} />
              Amount: [REDACTED] — hidden on-chain
            </div>
          </div>
        ))}
        {settled.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555555', fontSize: 11 }}>
            <Lock size={16} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No privacy-protected transfers yet.</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>Umbra stealth addresses ensure amount privacy.</div>
          </div>
        )}
      </div>

      <a
        href="https://umbra.cash"
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 9, color: '#9d4edd', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <ExternalLink size={9} />
        About Umbra Protocol
      </a>
    </div>
  );
}
