'use client';

import type { StepEvent } from '@/lib/types';
import { ListOrdered, Clock, ChevronRight, AlertTriangle, Zap, Shield, Activity } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  MANAGER_PLANNING: '#3b82f6',
  PLAN_CREATED: '#3b82f6',
  SNS_RESOLVING: '#14b8a6',
  SNS_RESOLVED: '#14b8a6',
  UMBRA_TRANSFER_INITIATED: '#9d4edd',
  UMBRA_TRANSFER_CONFIRMED: '#9d4edd',
  X402_SETTLED: '#00ff94',
  AGENT_RESPONDED: '#00ff94',
  SPECIALIST_FAILED: '#ff3b30',
  BUDGET_EXCEEDED: '#ff3b30',
  MAX_DEPTH_EXCEEDED: '#ff3b30',
  RESULT_COMPOSED: '#ffffff',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  MANAGER_PLANNING: <Activity size={10} />,
  PLAN_CREATED: <Zap size={10} />,
  SNS_RESOLVING: <Shield size={10} />,
  SNS_RESOLVED: <Shield size={10} />,
  UMBRA_TRANSFER_INITIATED: <Shield size={10} />,
  UMBRA_TRANSFER_CONFIRMED: <Shield size={10} />,
  X402_SETTLED: <Zap size={10} />,
  AGENT_RESPONDED: <Zap size={10} />,
  SPECIALIST_FAILED: <AlertTriangle size={10} />,
  BUDGET_EXCEEDED: <AlertTriangle size={10} />,
  MAX_DEPTH_EXCEEDED: <AlertTriangle size={10} />,
  RESULT_COMPOSED: <ChevronRight size={10} />,
};

function formatVerboseDescription(step: StepEvent): string {
  switch (step.type) {
    case 'MANAGER_PLANNING':
      return `Orchestrator received query and began planning delegation strategy. Query length: ${step.message?.length ?? 0} chars.`;
    case 'PLAN_CREATED': {
      try {
        const plan = JSON.parse(step.message ?? '[]') as Array<{ agent: string; route: string }>;
        return `Execution plan finalized with ${plan.length} task(s): ${plan.map((t) => `${t.agent} → ${t.route}`).join('; ')}`;
      } catch {
        return `Execution plan created: ${step.message ?? 'N/A'}`;
      }
    }
    case 'SNS_RESOLVING':
      return `Resolving SNS domain '${step.domain}' to stealth public key via registry or fallback map.`;
    case 'SNS_RESOLVED':
      return `SNS domain '${step.domain}' resolved successfully. Stealth key ready for Umbra transfer.`;
    case 'UMBRA_TRANSFER_INITIATED':
      return `Confidential payment flow initiated to ${step.agent}. Creating stealth transaction via Umbra Privacy SDK.`;
    case 'UMBRA_TRANSFER_CONFIRMED':
      return `Umbra stealth transfer confirmed on-chain. Transaction signature recorded.`;
    case 'X402_SETTLED':
      return `x402 payment settled. Agent ${step.agent} has been compensated for execution.`;
    case 'AGENT_RESPONDED':
      return `Agent ${step.agent} returned response. Payload size: ${step.message?.length ?? 0} chars.`;
    case 'SPECIALIST_FAILED':
      return `Agent ${step.agent ?? 'unknown'} failed at depth ${step.depth}. Error: ${step.message ?? 'No details'}`;
    case 'BUDGET_EXCEEDED':
      return `Budget cap reached for ${step.agent}. Remaining funds insufficient for task pricing.`;
    case 'MAX_DEPTH_EXCEEDED':
      return `Maximum recursion depth exceeded. Halting further agent delegation to prevent infinite loops.`;
    case 'RESULT_COMPOSED':
      return `Orchestrator composed final result from ${(step.message?.match(/:/g) ?? []).length} agent response(s).`;
    default:
      return step.message ?? 'No details available';
  }
}

export default function ExecutionSteps({ steps }: { steps: StepEvent[] }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <ListOrdered size={14} color="#888888" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Execution Trace
        </span>
        <span style={{ fontSize: 10, color: '#555555', fontFamily: "'JetBrains Mono', monospace" }}>
          {steps.length} events
        </span>
      </div>

      <div className="scrollbar-thin" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {steps.map((step, i) => {
          const prev = i > 0 ? new Date(steps[i - 1].timestamp).getTime() : new Date(step.timestamp).getTime();
          const curr = new Date(step.timestamp).getTime();
          const elapsed = i > 0 ? `+${(curr - prev) / 1000}s` : '';
          const color = TYPE_COLORS[step.type] ?? '#ffffff';

          return (
            <div
              key={i}
              className="fade-in"
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'flex-start',
                padding: '8px 10px',
                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                border: '1px solid transparent',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'transparent';
                e.currentTarget.style.background = i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent';
              }}
            >
              <span style={{ color: '#555555', fontSize: 9, minWidth: 20, paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ color: '#555555', fontSize: 9, minWidth: 50, fontVariantNumeric: 'tabular-nums', paddingTop: 2 }}>
                {new Date(step.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span style={{ color: '#555555', fontSize: 9, minWidth: 35, paddingTop: 2 }}>
                {elapsed}
              </span>
              <span
                style={{
                  fontSize: 9,
                  padding: '2px 6px',
                  border: `1px solid ${color}40`,
                  color: color,
                  minWidth: 120,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {TYPE_ICONS[step.type]}
                {step.type}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: '#888888', fontSize: 10, lineHeight: 1.5, display: 'block' }}>
                  {formatVerboseDescription(step)}
                </span>
                {step.agent && (
                  <span style={{ fontSize: 9, color: '#555555', marginTop: 2, display: 'block', fontFamily: "'JetBrains Mono', monospace" }}>
                    agent: {step.agent} {step.domain ? `· domain: ${step.domain}` : ''} {step.depth > 0 ? `· depth: ${step.depth}` : ''}
                  </span>
                )}
                {step.txSignature && (
                  <span style={{ fontSize: 9, color: '#14b8a6', marginTop: 2, display: 'block', fontFamily: "'JetBrains Mono', monospace" }}>
                    tx: {step.txSignature.slice(0, 20)}…
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {steps.length === 0 && (
          <div style={{ padding: 20, textAlign: 'center', color: '#555555', fontSize: 11 }}>
            <Clock size={16} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No execution steps yet.</div>
            <div style={{ fontSize: 10, marginTop: 4 }}>Submit a query to see the full orchestration trace.</div>
          </div>
        )}
      </div>
    </div>
  );
}
