'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Send, Loader2, Zap, Shield, Activity, MessageSquare, AlertTriangle, CheckCircle2, Bot, User } from 'lucide-react';
import { useNetwork } from '@/lib/NetworkContext';
import type { StepEvent } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  MANAGER_PLANNING: '#3b82f6',
  PLAN_CREATED: '#3b82f6',
  AGENT_RESPONDED: '#00ff94',
  SPECIALIST_FAILED: '#ff3b30',
  BUDGET_EXCEEDED: '#ff3b30',
  MAX_DEPTH_EXCEEDED: '#ff3b30',
  RESULT_COMPOSED: '#ffffff',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'system' | 'agent' | 'error' | 'result';
  content: string;
  agent?: string;
  domain?: string;
  timestamp: string;
  meta?: string;
}

function buildMessages(steps: StepEvent[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let currentQuery = '';

  for (const step of steps) {
    switch (step.type) {
      case 'MANAGER_PLANNING':
        if (step.depth === 0 && step.message) {
          currentQuery = step.message;
          messages.push({
            id: `${step.timestamp}-user`,
            role: 'user',
            content: step.message,
            timestamp: step.timestamp,
          });
        }
        break;

      case 'PLAN_CREATED':
        if (step.depth === 0 && step.message) {
          try {
            const plan = JSON.parse(step.message) as Array<{ agent: string; route: string; payload: unknown }>;
            const agentList = plan.map((t) => t.agent).join(', ');
            messages.push({
              id: `${step.timestamp}-plan`,
              role: 'system',
              content: `Orchestrator selected ${plan.length} specialist${plan.length > 1 ? 's' : ''}: ${agentList}`,
              timestamp: step.timestamp,
              meta: `Tasks: ${plan.map((t) => t.route).join(', ')}`,
            });
          } catch {
            messages.push({
              id: `${step.timestamp}-plan`,
              role: 'system',
              content: 'Orchestrator created execution plan',
              timestamp: step.timestamp,
            });
          }
        }
        break;

      case 'SNS_RESOLVED':
        if (step.agent) {
          messages.push({
            id: `${step.timestamp}-delegate`,
            role: 'system',
            content: `Delegating to ${step.agent} (${step.domain})`,
            agent: step.agent,
            domain: step.domain,
            timestamp: step.timestamp,
          });
        }
        break;

      case 'AGENT_RESPONDED':
        if (step.agent && step.message) {
          messages.push({
            id: `${step.timestamp}-agent`,
            role: 'agent',
            content: step.message,
            agent: step.agent,
            domain: step.domain,
            timestamp: step.timestamp,
          });
        }
        break;

      case 'SPECIALIST_FAILED':
        messages.push({
          id: `${step.timestamp}-error`,
          role: 'error',
          content: step.message ?? 'Unknown error',
          agent: step.agent,
          domain: step.domain,
          timestamp: step.timestamp,
        });
        break;

      case 'BUDGET_EXCEEDED':
        messages.push({
          id: `${step.timestamp}-error`,
          role: 'error',
          content: `Budget exceeded for ${step.agent ?? 'agent'}`,
          agent: step.agent,
          timestamp: step.timestamp,
        });
        break;

      case 'RESULT_COMPOSED':
        if (step.message && step.depth === 0) {
          messages.push({
            id: `${step.timestamp}-result`,
            role: 'result',
            content: step.message,
            timestamp: step.timestamp,
          });
        }
        break;
    }
  }

  return messages;
}

export default function AgentChat({
  steps,
  onSubmit,
  isLoading,
}: {
  steps: StepEvent[];
  onSubmit: (query: string) => void;
  isLoading: boolean;
}) {
  const { clusterParam } = useNetwork();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const messages = buildMessages(steps);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || isLoading) return;
      onSubmit(query.trim());
      setQuery('');
    },
    [query, isLoading, onSubmit]
  );

  return (
    <div className="scanline-overlay" style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      {/* ── Terminal Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, background: '#1a1a1a', border: '1px solid #333333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={16} color="#00ff94" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
              Agent Conversation
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, background: isLoading ? '#00ff94' : '#555555', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#555555', textTransform: 'uppercase' }}>
                {isLoading ? 'EXECUTING' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: '1px solid #333333', background: '#1a1a1a' }}>
            <Shield size={10} color="#9d4edd" />
            <span style={{ fontSize: 9, color: '#888888' }}>SECURE</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', border: '1px solid #333333', background: '#1a1a1a' }}>
            <Zap size={10} color="#00ff94" />
            <span style={{ fontSize: 9, color: '#888888' }}>FAST</span>
          </div>
        </div>
      </div>

      {/* ── Chat Stream ── */}
      <div
        ref={scrollRef}
        className="scrollbar-thin"
        style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}
      >
        {messages.length === 0 && (
          <div style={{ color: '#555555', fontSize: 11, padding: '20px 0', textAlign: 'center' }}>
            <Activity size={14} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>Waiting for query...</div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>Type a command to initiate agent delegation</div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="fade-in" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ maxWidth: '80%', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #333333', borderRight: '3px solid #3b82f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <User size={10} color="#3b82f6" />
                    <span style={{ fontSize: 9, color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>You</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#ffffff', lineHeight: 1.5 }}>{msg.content}</span>
                </div>
              </div>
            );
          }

          if (msg.role === 'system') {
            return (
              <div key={msg.id} className="fade-in" style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ padding: '6px 12px', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', maxWidth: '90%' }}>
                  <span style={{ fontSize: 10, color: '#3b82f6', lineHeight: 1.5 }}>{msg.content}</span>
                  {msg.meta && <span style={{ fontSize: 9, color: '#555555', display: 'block', marginTop: 2 }}>{msg.meta}</span>}
                </div>
              </div>
            );
          }

          if (msg.role === 'agent') {
            return (
              <div key={msg.id} className="fade-in" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 14px', background: 'rgba(0,255,148,0.03)', border: '1px solid rgba(0,255,148,0.15)', borderLeft: '3px solid #00ff94' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Bot size={10} color="#00ff94" />
                    <span style={{ fontSize: 9, color: '#00ff94', fontWeight: 700, textTransform: 'uppercase' }}>{msg.agent}</span>
                    {msg.domain && <span style={{ fontSize: 9, color: '#555555' }}>{msg.domain}</span>}
                  </div>
                  <span style={{ fontSize: 12, color: '#e0e0e0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                </div>
              </div>
            );
          }

          if (msg.role === 'error') {
            return (
              <div key={msg.id} className="fade-in" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 14px', background: 'rgba(255,59,48,0.04)', border: '1px solid rgba(255,59,48,0.2)', borderLeft: '3px solid #ff3b30' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertTriangle size={10} color="#ff3b30" />
                    <span style={{ fontSize: 9, color: '#ff3b30', fontWeight: 700, textTransform: 'uppercase' }}>Error {msg.agent ? `· ${msg.agent}` : ''}</span>
                  </div>
                  <span style={{ fontSize: 11, color: '#ff6b6b', lineHeight: 1.5 }}>{msg.content}</span>
                </div>
              </div>
            );
          }

          if (msg.role === 'result') {
            return (
              <div key={msg.id} className="fade-in" style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '90%', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid #444444' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <CheckCircle2 size={12} color="#ffffff" />
                    <span style={{ fontSize: 10, color: '#ffffff', fontWeight: 700, textTransform: 'uppercase' }}>Final Result</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#ffffff', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* ── Terminal Input ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #333333', background: '#1a1a1a' }}>
        <span style={{ padding: '0 10px', color: '#00ff94', fontSize: 14, fontWeight: 700, userSelect: 'none' }}>{'>'}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter query..."
          style={{
            flex: 1,
            fontSize: 13,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            padding: '10px 0',
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          style={{
            padding: '0 14px',
            height: 40,
            background: query.trim() && !isLoading ? '#00ff94' : '#333333',
            border: 'none',
            color: query.trim() && !isLoading ? '#000000' : '#555555',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: query.trim() && !isLoading ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {isLoading ? <Loader2 size={16} className="animate-spin-slow" /> : <Send size={16} strokeWidth={2.5} />}
        </button>
      </form>
    </div>
  );
}
