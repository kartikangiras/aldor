'use client';

import { useState } from 'react';
import type { StepEvent } from '@/lib/types';
import { Lock, Eye, EyeOff, Terminal, ChevronRight, Shield } from 'lucide-react';

const TRACE_TYPES = [
  'SNS_RESOLVING', 'SNS_RESOLVED',
  'UMBRA_TRANSFER_INITIATED', 'UMBRA_TRANSFER_CONFIRMED', 'X402_SETTLED',
  'A2A_HIRE_INITIATED', 'A2A_HIRE_COMPLETED', 'REPUTATION_CHECK',
  'WALLET_SIGN_REQUESTED', 'WALLET_SIGN_CONFIRMED',
  'QVAC_EMBEDDING', 'QVAC_EMBEDDING_FAILED', 'QVAC_MATCHED', 'QVAC_SKIPPED',
];

function TraceCard({ step, index }: { step: StepEvent; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const statusColor =
    step.type === 'X402_SETTLED'
      ? '#00ff94'
      : step.type === 'SPECIALIST_FAILED' || step.type === 'BUDGET_EXCEEDED'
      ? '#ff3b30'
      : step.type === 'UMBRA_TRANSFER_CONFIRMED'
      ? '#9d4edd'
      : '#14b8a6';

  const statusBg = `${statusColor}15`;

  return (
    <div
      style={{
        padding: '8px 10px',
        marginBottom: 4,
        background: expanded ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: '1px solid #333333',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: statusColor,
            fontFamily: "'JetBrains Mono', monospace",
            background: statusBg,
            padding: '1px 6px',
            border: `1px solid ${statusColor}40`,
            minWidth: 110,
            textAlign: 'center',
          }}
        >
          {step.type}
        </span>
        <span style={{ fontSize: 10, color: '#888888', fontWeight: 600, flex: 1 }}>
          {step.agent ?? step.domain ?? 'system'}
        </span>
        <span style={{ fontSize: 9, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
          D{step.depth}
        </span>
        <span style={{ fontSize: 10, color: '#555555' }}>{expanded ? '▾' : '▸'}</span>
      </div>

      {/* Expanded: raw JSON-like feed */}
      {expanded && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            background: '#0a0a0a',
            border: '1px solid #333333',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: '#888888',
            lineHeight: 1.7,
          }}
        >
          <div style={{ color: '#555555', marginBottom: 4, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.05em' }}>
            // SSE Payload
          </div>
          {step.domain && (
            <div>
              <span style={{ color: '#9d4edd' }}>sns_domain:</span>{' '}
              <span style={{ color: '#ffffff' }}>&quot;{step.domain}&quot;</span>
            </div>
          )}
          {step.agent && (
            <div>
              <span style={{ color: '#9d4edd' }}>agent:</span>{' '}
              <span style={{ color: '#ffffff' }}>&quot;{step.agent}&quot;</span>
            </div>
          )}
          <div>
            <span style={{ color: '#9d4edd' }}>depth:</span>{' '}
            <span style={{ color: '#ffa500' }}>{step.depth}</span>
          </div>
          <div>
            <span style={{ color: '#9d4edd' }}>timestamp:</span>{' '}
            <span style={{ color: '#14b8a6' }}>&quot;{new Date(step.timestamp).toISOString()}&quot;</span>
          </div>
          {step.txSignature && (
            <div>
              <span style={{ color: '#9d4edd' }}>tx_signature:</span>{' '}
              <span style={{ color: '#00ff94' }}>&quot;{step.txSignature}&quot;</span>
            </div>
          )}
          {step.message && (
            <div>
              <span style={{ color: '#9d4edd' }}>message:</span>{' '}
              <span style={{ color: '#888888' }}>&quot;{step.message.slice(0, 80)}{step.message.length > 80 ? '…' : ''}&quot;</span>
            </div>
          )}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #333333' }}>
            <span style={{ color: '#555555' }}>// Umbra stealth key: [HIDDEN]</span>
          </div>
          <div>
            <span style={{ color: '#555555' }}>// Ephemeral pubKey: [HIDDEN]</span>
          </div>
          <div>
            <span style={{ color: '#555555' }}>// Amount: [REDACTED]</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtocolTrace({ steps }: { steps: StepEvent[] }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const traceSteps = steps.filter((s) => TRACE_TYPES.includes(s.type));

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={14} color="#14b8a6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Protocol Trace
          </span>
          <span style={{ fontSize: 10, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
            {traceSteps.length} events
          </span>
        </div>

        {traceSteps.length > 0 && (
          <button
            onClick={() => setShowTechnical(!showTechnical)}
            style={{
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 600,
              border: '1px solid #333333',
              background: showTechnical ? '#14b8a6' : 'transparent',
              color: showTechnical ? '#000000' : '#555555',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {showTechnical ? <EyeOff size={10} /> : <Eye size={10} />}
            {showTechnical ? 'HIDE TECH' : 'SHOW TECH'}
          </button>
        )}
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto' }}>
        {traceSteps.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#555555', fontSize: 11 }}>
            <Shield size={16} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No protocol trace events.</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>SSE events will appear here in real-time.</div>
          </div>
        ) : (
          traceSteps.map((step, i) => (
            <TraceCard key={i} step={step} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
