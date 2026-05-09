'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import WalletInfo from '@/components/WalletInfo';
import EconomyGraph from '@/components/EconomyGraph';
import AgentChat from '@/components/AgentChat';
import TransactionLog from '@/components/TransactionLog';
import ProtocolTrace from '@/components/ProtocolTrace';
import ExecutionSteps from '@/components/ExecutionSteps';
import UmbraPrivacyProof from '@/components/UmbraPrivacyProof';
import CovalentDataPanel from '@/components/CovalentDataPanel';
import ToolCatalog from '@/components/ToolCatalog';
import type { StepEvent } from '@/lib/types';
import { postQuery, createEventSource } from '@/lib/api';
import { Radio, Shield, Cpu, Activity, Zap, Crosshair, Send, Loader2, MessageSquare, Sparkles, Search, Code, TrendingUp, Cloud } from 'lucide-react';

function generateSessionId(): string {
  return 'ses_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const SUGGESTED_QUERIES = [
  { icon: Search, label: 'Research', query: 'Research the latest Solana ecosystem trends' },
  { icon: Code, label: 'Code', query: 'Write a Solana Anchor program for an NFT marketplace' },
  { icon: TrendingUp, label: 'DeFi', query: 'Analyze the best yield farming strategies on Solana' },
  { icon: Cloud, label: 'Weather', query: 'What is the weather in San Francisco?' },
  { icon: Sparkles, label: 'Creative', query: 'Generate a social media post about Web3 adoption' },
];

function CentralChatBox({ onSubmit, isLoading }: { onSubmit: (query: string) => void; isLoading: boolean }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
    setQuery('');
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #333333', background: '#1a1a1a', marginBottom: 20 }}>
        <span style={{ padding: '0 14px', color: '#00ff94', fontSize: 16, fontWeight: 700, userSelect: 'none' }}>{'>'}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything — research, code, analyze, translate..."
          style={{
            flex: 1,
            fontSize: 14,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#ffffff',
            padding: '14px 0',
            fontFamily: "'JetBrains Mono', monospace",
          }}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          style={{
            padding: '0 18px',
            height: 48,
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
          {isLoading ? <Loader2 size={18} className="animate-spin-slow" /> : <Send size={18} strokeWidth={2.5} />}
        </button>
      </form>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SUGGESTED_QUERIES.map((sq) => (
          <button
            key={sq.label}
            onClick={() => {
              if (isLoading) return;
              setQuery(sq.query);
            }}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              border: '1px solid #333333',
              background: '#1a1a1a',
              color: '#888888',
              fontSize: 11,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#555555';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#333333';
              e.currentTarget.style.color = '#888888';
            }}
          >
            <sq.icon size={12} />
            {sq.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [hiredAgent, setHiredAgent] = useState<string | null>(null);
  const sessionRef = useRef<string>(generateSessionId());
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const sessionId = sessionRef.current;
    const es = createEventSource(sessionId);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StepEvent;
        setSteps((prev) => [...prev, data]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE errors are non-fatal; reconnect handled by browser
    };

    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const hire = params.get('hire');
    if (hire) {
      setHiredAgent(hire);
      const url = new URL(window.location.href);
      url.searchParams.delete('hire');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const handleSubmit = useCallback(async (query: string) => {
    setIsLoading(true);
    setSteps((prev) => [
      ...prev,
      {
        type: 'MANAGER_PLANNING',
        timestamp: new Date().toISOString(),
        depth: 0,
        message: query,
        sessionId: sessionRef.current,
      } as StepEvent,
    ]);
    try {
      await postQuery(query, sessionRef.current, 0.01);
    } catch (e: any) {
      setSteps((prev) => [
        ...prev,
        {
          type: 'SPECIALIST_FAILED',
          timestamp: new Date().toISOString(),
          depth: 0,
          message: e.message ?? 'Query failed',
          sessionId: sessionRef.current,
        } as StepEvent,
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const triggerStressTest = async () => {
    setIsStressTesting(true);
    try {
      await fetch('/api/agent/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionRef.current }),
      });
    } catch (err) {
      console.error('Stress test failed', err);
    } finally {
      setTimeout(() => setIsStressTesting(false), 8000);
    }
  };

  const settledCount = steps.filter((s) => s.type === 'X402_SETTLED').length;
  const uniqueAgents = new Set(steps.filter((s) => s.agent).map((s) => s.agent)).size;
  const maxDepth = steps.length > 0 ? Math.max(...steps.map((s) => s.depth)) : 0;
  const latestResult = [...steps].reverse().find((s) => s.type === 'RESULT_COMPOSED')?.message ?? '';

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: "'JetBrains Mono', monospace" }}>
      <Header />

      <main style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {hiredAgent && (
          <div
            style={{
              padding: '12px 16px',
              border: '1px solid #00ff94',
              background: 'rgba(0,255,148,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 12, color: '#00ff94' }}>
              Agent <strong>{hiredAgent}</strong> selected for delegation. Type a query below to begin.
            </span>
            <button
              onClick={() => setHiredAgent(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#888888',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              DISMISS
            </button>
          </div>
        )}

        {/* ── Mission Control Hero ── */}
        <section
          style={{
            padding: '32px 36px',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
            border: '1px solid #333333',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative background text */}
          <div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              fontSize: '8rem',
              opacity: 0.03,
              fontWeight: 900,
              pointerEvents: 'none',
              color: '#ffffff',
              letterSpacing: '-0.05em',
              lineHeight: 1,
            }}
          >
            CONTROL
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Crosshair size={18} color="#00ff94" strokeWidth={2.5} />
                <span style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888888', textTransform: 'uppercase', fontWeight: 600 }}>
                  Mission Control
                </span>
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                  fontWeight: 900,
                  letterSpacing: '-0.05em',
                  lineHeight: 0.95,
                  color: '#ffffff',
                }}
              >
                ALDOR
                <span style={{ color: '#555555' }}>.NETWORK</span>
              </h1>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 13,
                  color: '#888888',
                  maxWidth: 520,
                  lineHeight: 1.6,
                  borderLeft: '2px solid #333333',
                  paddingLeft: 14,
                }}
              >
                Sovereign Autonomous Agentic Orchestrator. x402 payment settlement via Umbra stealth addresses. 
                Recursive delegation with on-chain reputation.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #333333',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Cpu size={12} color="#00ff94" />
                  <span style={{ fontSize: 10, color: '#888888' }}>AGENTS</span>
                  <span style={{ fontSize: 12, color: '#00ff94', fontWeight: 700 }}>{uniqueAgents}</span>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #333333',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Shield size={12} color="#9d4edd" />
                  <span style={{ fontSize: 10, color: '#888888' }}>SHIELDED</span>
                  <span style={{ fontSize: 12, color: '#9d4edd', fontWeight: 700 }}>{settledCount}</span>
                </div>
                <div
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #333333',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Activity size={12} color="#ffa500" />
                  <span style={{ fontSize: 10, color: '#888888' }}>DEPTH</span>
                  <span style={{ fontSize: 12, color: '#ffa500', fontWeight: 700 }}>{maxDepth}</span>
                </div>
              </div>
              <button
                onClick={triggerStressTest}
                disabled={isStressTesting}
                style={{
                  padding: '8px 16px',
                  background: isStressTesting ? '#333333' : '#1a1a1a',
                  border: `1px solid ${isStressTesting ? '#555555' : '#00ff94'}`,
                  color: isStressTesting ? '#555555' : '#00ff94',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  cursor: isStressTesting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <Zap size={12} />
                {isStressTesting ? 'EXECUTING...' : 'GOD MODE'}
              </button>
            </div>
          </div>
        </section>

        {/* ── Central AI Chatbox Hero ── */}
        <section style={{ border: '1px solid #333333', background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #00ff9440, transparent)' }} />

          <div style={{ padding: '32px 36px', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <MessageSquare size={18} color="#00ff94" strokeWidth={2.5} />
              <span style={{ fontSize: 11, letterSpacing: '0.1em', color: '#888888', textTransform: 'uppercase', fontWeight: 600 }}>
                AI Orchestrator
              </span>
            </div>

            <CentralChatBox onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
        </section>

        {/* ── Latest Result Banner ── */}
        {latestResult && (
          <section style={{ border: '1px solid #333333', background: 'rgba(0,255,148,0.02)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #00ff9440, transparent)' }} />
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Zap size={14} color="#00ff94" />
                <span style={{ fontSize: 10, letterSpacing: '0.1em', color: '#888888', textTransform: 'uppercase', fontWeight: 700 }}>
                  Latest Result
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#e0e0e0', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace" }}>
                {latestResult}
              </div>
            </div>
          </section>
        )}

        {/* ── Balance Pulse Sidebar (compact) ── */}
        <WalletInfo />

        {/* ── War Room 2×2 Grid ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0,
            border: '1px solid #333333',
          }}
        >
          <div style={{ borderRight: '1px solid #333333', borderBottom: '1px solid #333333', minHeight: 360 }}>
            <EconomyGraph steps={steps} />
          </div>
          <div style={{ borderBottom: '1px solid #333333', minHeight: 360 }}>
            <AgentChat steps={steps} onSubmit={handleSubmit} isLoading={isLoading} />
          </div>
          <div style={{ borderRight: '1px solid #333333', minHeight: 300 }}>
            <TransactionLog steps={steps} />
          </div>
          <div style={{ minHeight: 300 }}>
            <ProtocolTrace steps={steps} />
          </div>
        </div>

        {/* ── Evidence & Analytics ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0, border: '1px solid #333333' }}>
          <div style={{ borderRight: '1px solid #333333', minHeight: 280 }}>
            <ExecutionSteps steps={steps} />
          </div>
          <div style={{ borderRight: '1px solid #333333', minHeight: 280 }}>
            <UmbraPrivacyProof steps={steps} />
          </div>
          <div style={{ minHeight: 280 }}>
            <CovalentDataPanel />
          </div>
        </div>

        {/* ── Tool Catalog ── */}
        <ToolCatalog />
      </main>
    </div>
  );
}
