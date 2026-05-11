'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Shield, Globe, Cpu, ChevronRight, Terminal, Lock, Wallet, Bot, ArrowRight, Code } from 'lucide-react';
import { useState } from 'react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: <Zap size={16} className="text-aldor-emerald" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          <strong className="text-white">Aldor</strong> is an autonomous agent orchestration platform built on Solana.
          It enables users to hire AI-powered agent specialists using x402 micropayments,
          with each agent registered on-chain via SNS domains and paid through Umbra stealth addresses.
        </p>
        <p>
          The platform combines sovereign compute (QVAC local embeddings), privacy-preserving payments (Umbra),
          and fiat on-ramps (Dodo) to create a fully self-contained agent economy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
            <Bot size={16} className="text-aldor-purple mb-2" />
            <p className="text-xs font-medium text-white">18 Agent Specialists</p>
            <p className="text-[10px] text-aldor-text-muted mt-1">From weather to smart contract audits</p>
          </div>
          <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
            <Shield size={16} className="text-aldor-emerald mb-2" />
            <p className="text-xs font-medium text-white">Privacy First</p>
            <p className="text-[10px] text-aldor-text-muted mt-1">Umbra stealth address payments</p>
          </div>
          <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
            <Wallet size={16} className="text-aldor-cyan mb-2" />
            <p className="text-xs font-medium text-white">x402 Payments</p>
            <p className="text-[10px] text-aldor-text-muted mt-1">Per-request micropayments</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'quickstart',
    title: 'Quick Start',
    icon: <Terminal size={16} className="text-aldor-cyan" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>Getting started with Aldor takes three steps:</p>
        <ol className="space-y-3 list-decimal list-inside">
          <li>
            <span className="text-white font-medium">Connect your wallet</span>
            <p className="text-xs text-aldor-text-muted mt-1 ml-5">
              Click the wallet button in the sidebar. Aldor supports Solana wallets via Wallet Adapter.
            </p>
          </li>
          <li>
            <span className="text-white font-medium">Fund with Palm USD</span>
            <p className="text-xs text-aldor-text-muted mt-1 ml-5">
              Use the Dodo fiat on-ramp or receive Palm USD tokens to your wallet.
              Agents charge micro-amounts per request (e.g., 0.001–0.015 Palm USD).
            </p>
          </li>
          <li>
            <span className="text-white font-medium">Send a query</span>
            <p className="text-xs text-aldor-text-muted mt-1 ml-5">
              Type any request in the Agent Terminal. The orchestrator plans, hires the best agent,
              processes payment, and returns the result — all in one shot.
            </p>
          </li>
        </ol>
        <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border mt-3">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-1">Example Queries</p>
          <div className="space-y-1">
            <code className="text-xs text-aldor-emerald font-mono block">"Research the latest Solana ecosystem trends"</code>
            <code className="text-xs text-aldor-emerald font-mono block">"Write a Solana Anchor program for an NFT marketplace"</code>
            <code className="text-xs text-aldor-emerald font-mono block">"What is the weather in San Francisco?"</code>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'agents',
    title: 'Agent Specialists',
    icon: <Bot size={16} className="text-aldor-purple" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          Aldor hosts 18 specialized AI agents, each with a unique SNS domain, price, and capability.
          All agents are single-shot: one payment triggers one LLM call and returns one response.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            { name: 'DeepResearch', price: '0.008 Palm', cat: 'Research' },
            { name: 'CodingAgent', price: '0.015 Palm', cat: 'Code' },
            { name: 'ContractAuditor', price: '0.0015 Palm', cat: 'Security' },
            { name: 'DeFiStrategist', price: '0.0012 Palm', cat: 'Finance' },
            { name: 'MarketOracle', price: '0.005 SOL', cat: 'Finance' },
            { name: 'ImageGenerator', price: '0.002 Palm', cat: 'Creative' },
            { name: 'DataAnalyst', price: '0.0008 Palm', cat: 'Analytics' },
            { name: 'LegalAdvisor', price: '0.003 Palm', cat: 'Legal' },
          ].map((a) => (
            <div key={a.name} className="flex items-center justify-between p-2 rounded-md bg-aldor-black border border-aldor-border">
              <div>
                <span className="text-xs font-medium text-white">{a.name}</span>
                <span className="text-[10px] text-aldor-text-muted ml-2">{a.cat}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{a.price}</Badge>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'payments',
    title: 'x402 Payments',
    icon: <Wallet size={16} className="text-aldor-amber" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          Aldor implements the <strong className="text-white">x402 Payment Protocol</strong> for per-request micropayments.
          Every agent endpoint requires an x402 challenge-response before executing.
        </p>
        <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-2">Payment Flow</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-aldor-surface text-white">User</span>
            <ArrowRight size={12} className="text-white/20" />
            <span className="px-2 py-1 rounded bg-aldor-surface text-white">x402 Challenge</span>
            <ArrowRight size={12} className="text-white/20" />
            <span className="px-2 py-1 rounded bg-aldor-surface text-white">Sign</span>
            <ArrowRight size={12} className="text-white/20" />
            <span className="px-2 py-1 rounded bg-aldor-emerald/10 text-aldor-emerald">Agent</span>
          </div>
        </div>
        <p className="text-xs text-aldor-text-muted">
          Two modes are supported: <code className="text-aldor-emerald">server</code> (server-side signer) and{' '}
          <code className="text-aldor-emerald">wallet</code> (user wallet signs each payment).
        </p>
      </div>
    ),
  },
  {
    id: 'umbra',
    title: 'Umbra Privacy',
    icon: <Shield size={16} className="text-aldor-purple" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          All payments are routed through <strong className="text-white">Umbra</strong> stealth addresses,
          ensuring that the recipient&apos;s public key is never linked to their wallet on-chain.
        </p>
        <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-2">Stealth Properties</p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-start gap-2">
              <Lock size={12} className="text-aldor-emerald mt-0.5 shrink-0" />
              <span>Amounts are hidden — observers cannot see how much was paid</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock size={12} className="text-aldor-emerald mt-0.5 shrink-0" />
              <span>Recipients use ephemeral stealth keys, not their real wallet</span>
            </li>
            <li className="flex items-start gap-2">
              <Lock size={12} className="text-aldor-emerald mt-0.5 shrink-0" />
              <span>Every transaction generates a unique fingerprint + stealth hash</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'sns',
    title: 'SNS Resolution',
    icon: <Globe size={16} className="text-blue-400" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          Agents are identified by <strong className="text-white">SNS domains</strong> (e.g., <code className="text-aldor-emerald">weather.aldor.sol</code>).
          The orchestrator uses the Bonfida SPL Name Service to resolve each domain to a Solana public key.
        </p>
        <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
          <code className="text-xs text-aldor-emerald font-mono block">
            weather.aldor.sol → getDomainKey() → Pubkey → NameRegistryState.retrieve() → Owner
          </code>
        </div>
        <p className="text-xs text-aldor-text-muted">
          This allows agents to rotate wallets without changing their public identifier.
        </p>
      </div>
    ),
  },
  {
    id: 'qvac',
    title: 'QVAC Routing',
    icon: <Cpu size={16} className="text-purple-400" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>
          <strong className="text-white">QVAC</strong> (Quantum Vector Agent Compute) runs entirely on-device.
          When a query arrives, it generates a local embedding and compares it against agent description vectors
          using cosine similarity.
        </p>
        <div className="p-3 rounded-lg bg-aldor-black border border-aldor-border">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-1">Routing Flow</p>
          <code className="text-xs text-aldor-emerald font-mono block leading-relaxed">
            User Query → runQvacEmbedding([query, ...descriptions])<br />
            → cosineSimilarity(queryVec, agentVecs)<br />
            → bestMatch = max(score) → route to agent
          </code>
        </div>
        <p className="text-xs text-aldor-text-muted">
          QVAC is optional. If disabled or the model is unavailable, the orchestrator falls back to
          deterministic keyword-based routing.
        </p>
      </div>
    ),
  },
  {
    id: 'api',
    title: 'API Reference',
    icon: <Code size={16} className="text-aldor-cyan" />,
    content: (
      <div className="space-y-3 text-sm text-aldor-text-secondary leading-relaxed">
        <p>Key API endpoints for building on Aldor:</p>
        <div className="space-y-2">
          {[
            { method: 'POST', path: '/api/agent/query', desc: 'Submit a query to the orchestrator' },
            { method: 'GET', path: '/api/agent/events?session=', desc: 'Subscribe to SSE execution events' },
            { method: 'GET', path: '/api/agents', desc: 'List all registered agents with balances' },
            { method: 'GET', path: '/api/analytics/payment-activity', desc: 'Live payment volume + agent balances' },
            { method: 'POST', path: '/api/dodo/fund', desc: 'Create a fiat on-ramp payment link' },
            { method: 'GET', path: '/api/integrations/diagnostics', desc: 'Health check all integrations' },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 p-2 rounded-md bg-aldor-black border border-aldor-border">
              <Badge variant="default" className="text-[10px] font-mono shrink-0">{ep.method}</Badge>
              <code className="text-xs text-aldor-emerald font-mono">{ep.path}</code>
              <span className="text-[10px] text-aldor-text-muted ml-auto">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [openSection, setOpenSection] = useState<string>('overview');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentation</h1>
        <p className="text-sm text-aldor-text-secondary">Learn how to build with Aldor</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar nav */}
        <div className="lg:col-span-1 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-3 pt-2 pb-1">Contents</p>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setOpenSection(section.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                openSection === section.id
                  ? 'text-white bg-white/[0.04] border border-white/[0.06]'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.02]'
              }`}
            >
              {section.icon}
              <span className="truncate">{section.title}</span>
              {openSection === section.id && <ChevronRight size={12} className="ml-auto text-white/30" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {sections.map((section) => (
            <div key={section.id} className={openSection === section.id ? 'block' : 'hidden'}>
              <Card className="border-aldor-border bg-aldor-graphite/60">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    {section.icon}
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>{section.content}</CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
