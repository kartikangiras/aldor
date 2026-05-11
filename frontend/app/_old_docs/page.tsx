'use client';

import Header from '@/components/Header';
import PageHeader from '@/components/PageHeader';
import { BookOpen, Code, Shield, CreditCard, Database, Zap, Globe, Lock, Cpu, FileText } from 'lucide-react';

const sections = [
  {
    id: 'overview',
    icon: Globe,
    color: '#00ff94',
    title: 'Overview',
    content: `Aldor is a sovereign autonomous agentic orchestrator built on Solana. It enables recursive agent delegation with x402 payment settlement via Umbra stealth addresses. Agents are identified by SNS domains like researcher.aldor.sol instead of raw public keys, enabling human-readable agent discovery and reputation tracking on-chain.`
  },
  {
    id: 'x402',
    icon: CreditCard,
    color: '#ffa500',
    title: 'x402 Payment Flow',
    content: `Aldor uses the x402 Payment Required protocol over HTTP. When an orchestrator wants to hire a specialist, it sends an HTTP POST. If no valid payment proof is present, the specialist returns HTTP 402 with a challenge body containing the SNS domain, amount, and asset. The client then resolves the SNS domain, performs an Umbra confidential transfer, and retries with the transaction signature. The middleware verifies the payment on-chain before executing the agent handler.`
  },
  {
    id: 'umbra',
    icon: Shield,
    color: '#9d4edd',
    title: 'Umbra Privacy Model',
    content: `Every payment settlement uses the Umbra SDK to generate a one-time stealth address. The transfer amount and recipient are hidden on the public blockchain explorer. Only the transaction signature is public, which reveals nothing about the business logic. This prevents competitors from observing which agents are hired and at what rates. Ephemeral keys are rotated per transaction.`
  },
  {
    id: 'sns',
    icon: Globe,
    color: '#14b8a6',
    title: 'SNS Domain System',
    content: `All agents are identified by .sol domains like researcher.aldor.sol instead of raw public keys. The Anchor registry maps each SNS domain to an Umbra stealth-compatible public key. SNS resolution happens transparently inside the AldorClient SDK. For development without registered domains, a deterministic fallback key is generated from the domain hash.`
  },
  {
    id: 'covalent',
    icon: Database,
    color: '#c084fc',
    title: 'Covalent Data Layer',
    content: `The dashboard uses Covalent GoldRush APIs to fetch decoded transaction histories, token balances, and on-chain event counts. This replaces traditional SQL-based analytics with structured REST endpoints that require no custom indexing. When Covalent is unavailable, the dashboard displays demo data with a clear indicator.`
  },
  {
    id: 'dodo',
    icon: CreditCard,
    color: '#fbbf24',
    title: 'Dodo Payment Flows',
    content: `The orchestrator can be funded via the Dodo Payments fiat-to-crypto on-ramp. Specialists can off-ramp their accumulated stablecoin earnings to fiat using Dodo invoicing. Both flows are sandbox-ready for Devnet demos. Set DODO_API_KEY in server environment to enable live payments.`
  },
  {
    id: 'architecture',
    icon: Cpu,
    color: '#3b82f6',
    title: 'System Architecture',
    content: `The system consists of: (1) Aldor Anchor program for on-chain agent registry and reputation, (2) Node.js orchestrator with SSE event streaming, (3) x402 middleware for per-request payment verification, (4) Umbra SDK integration for stealth transfers, (5) Covalent proxy for analytics, (6) Dodo SDK for fiat ramps, (7) Next.js dashboard with real-time monitoring.`
  },
  {
    id: 'deployment',
    icon: Zap,
    color: '#ec4899',
    title: 'Deployment',
    content: `Backend runs on port 3002 (configurable via PORT env). Frontend runs on port 3000 via Next.js dev server. Set SERVER_BASE_URL to the backend URL. For production, set SOLANA_RPC_URL to a mainnet RPC, configure PALM_USD_MINT_MAINNET, and set DODO_API_KEY and COVALENT_API_KEY for full integrations.`
  },
];

const links = [
  { label: 'Solana Devnet Explorer', url: 'https://explorer.solana.com/?cluster=devnet' },
  { label: 'Solana Mainnet Explorer', url: 'https://explorer.solana.com' },
  { label: 'Umbra Protocol', url: 'https://umbra.cash' },
  { label: 'Covalent GoldRush Docs', url: 'https://www.covalenthq.com/docs/api/' },
  { label: 'Dodo Payments', url: 'https://dodopayments.com' },
  { label: 'Bonfida SNS', url: 'https://sns.id' },
];

export default function DocsPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: "'JetBrains Mono', monospace" }}>
      <Header />
      <PageHeader
        title="DOCUMENTATION"
        subtitle="Technical reference for the Aldor agentic orchestrator"
        badge="DOCS"
        badgeColor="#3b82f6"
      />

      <main style={{ padding: 24, maxWidth: 900 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {sections.map((section) => (
            <section key={section.id} style={{ border: '1px solid #333333', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <section.icon size={16} color={section.color} />
                <h3 style={{ fontSize: 14, color: '#ffffff', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {section.title}
                </h3>
              </div>
              <p style={{ fontSize: 12, color: '#888888', lineHeight: 1.7, margin: 0 }}>
                {section.content}
              </p>
            </section>
          ))}
        </div>

        <section style={{ marginTop: 24, border: '1px solid #333333', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <FileText size={16} color="#00ff94" />
            <h3 style={{ fontSize: 14, color: '#ffffff', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              External Links
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  border: '1px solid #333333',
                  background: '#1a1a1a',
                  color: '#14b8a6',
                  fontSize: 12,
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#14b8a6';
                  e.currentTarget.style.background = 'rgba(20,184,166,0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333333';
                  e.currentTarget.style.background = '#1a1a1a';
                }}
              >
                <Code size={12} />
                {link.label}
              </a>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 24, border: '1px solid #333333', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Lock size={16} color="#9d4edd" />
            <h3 style={{ fontSize: 14, color: '#ffffff', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Environment Variables
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { key: 'SOLANA_RPC_URL', desc: 'Solana RPC endpoint' },
              { key: 'SOLANA_CLUSTER', desc: 'devnet or mainnet' },
              { key: 'ALDOR_PROGRAM_ID', desc: 'Anchor program ID' },
              { key: 'ALDOR_PAYER_SECRET_KEY', desc: 'Server payment signer' },
              { key: 'PALM_USD_MINT', desc: 'PALM USD token mint' },
              { key: 'COVALENT_API_KEY', desc: 'Covalent analytics key' },
              { key: 'DODO_API_KEY', desc: 'Dodo Payments key' },
              { key: 'ALDOR_AGENT_WALLET_MAP', desc: 'JSON map of agent domains to wallets' },
              { key: 'MOCK_PAYMENTS', desc: 'Set true for dev mode' },
            ].map((env) => (
              <div key={env.key} style={{ display: 'flex', gap: 12, padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
                <code style={{ color: '#00ff94', minWidth: 220, fontFamily: "'JetBrains Mono', monospace" }}>{env.key}</code>
                <span style={{ color: '#888888' }}>{env.desc}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
