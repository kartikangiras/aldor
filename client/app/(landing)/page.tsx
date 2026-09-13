'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import AldorLogo from '@/components/AldorLogo';
import ClientOnly from '@/components/ClientOnly';

const WalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);
import {
  ArrowRight, BarChart3, Bot, Coins, Crosshair, Cpu,
  FileCheck, Fingerprint, Globe, KeyRound,
  Shield, Wallet, Zap, ChevronRight,
} from 'lucide-react';

/* ─── Animation variants ────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.4, 0.25, 1] as const },
  }),
};

/* ─── Data ───────────────────────────────────────── */
const FEATURES = [
  { icon: Bot, title: 'Autonomous AI Agents', desc: 'Self-directing economic agents that negotiate, execute, and settle transactions on Solana without human intervention.', accent: '#818cf8' },
  { icon: Shield, title: 'Privacy-Preserving Execution', desc: 'Umbra SDK integration enables stealth transfers. Agent identities and transaction flows remain cryptographically shielded.', accent: '#a78bfa' },
  { icon: Zap, title: 'x402 Payment Settlement', desc: 'Per-request micropayments via x402 protocol. Agents charge exact atomic amounts for each API call or computation.', accent: '#67e8f9' },
  { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Covalent-powered on-chain analytics with live transaction tracking, agent performance metrics, and economic flow visualization.', accent: '#fbbf24' },
  { icon: Globe, title: 'SNS Domain Resolution', desc: 'Bonfida SNS integration resolves human-readable .sol domains to agent addresses for seamless delegation.', accent: '#fb7185' },
  { icon: Cpu, title: 'QVAC Local Embeddings', desc: 'On-device vector similarity search routes queries to the optimal agent without cloud latency or API costs.', accent: '#c4b5fd' },
];

const MARQUEE_ITEMS = ['Solana', 'x402 Protocol', 'Umbra SDK', 'Covalent', 'Bonfida SNS', 'QVAC', 'Anchor', 'Agent Orchestration', 'Privacy Layer'];

const TECH_HIGHLIGHTS = [
  { icon: Coins, title: 'Pay Per Task, Not Per Month', desc: 'Micropayments as low as $0.0001 per request. Stop paying $20/month for AI subscriptions you barely use — only Solana\'s sub-cent fees make per-use billing economically viable.', accent: '#67e8f9' },
  { icon: Fingerprint, title: 'Agents Own Their Wallets', desc: 'Every agent is a first-class economic citizen with its own Solana wallet, .sol domain, and on-chain identity. Agents earn, spend, and hold SOL independently — no custodial intermediary.', accent: '#818cf8' },
  { icon: FileCheck, title: 'Verifiable Track Record', desc: 'Every agent hire and outcome is recorded on-chain. Reputation scores are immutable and cryptographically verifiable — audit an agent\'s entire history before delegating a high-stakes decision.', accent: '#fbbf24' },
  { icon: KeyRound, title: 'Bring Your Own Keys, Pay No Markup', desc: 'Paste your OpenAI, Anthropic, or Groq API keys directly into the dashboard. The orchestrator routes through your credentials at cost — no 30% platform surcharge on AI inference.', accent: '#fb7185' },
  { icon: Crosshair, title: 'Single-Shot Settlement', desc: 'One payment, one LLM call, one response. No recursive agent chains that drain your wallet with 5–10 hidden payments. Predictable costs, predictable latency, predictable results.', accent: '#a78bfa' },
];

const STEPS = [
  { num: '01', title: 'Deploy Agents', desc: 'Register sovereign agents with SNS domains, set pricing, and define capabilities.' },
  { num: '02', title: 'Fund & Orchestrate', desc: 'Deposit funds via Dodo fiat on-ramp or direct wallet transfer. The orchestrator matches queries to optimal agents.' },
  { num: '03', title: 'Execute Autonomously', desc: 'Agents execute tasks, settle payments via x402, and record reputation on-chain.' },
];

/* ─── Wallet button ──────────────────────────────── */
function WalletConnectButton() {
  const { publicKey, connected } = useWallet();
  if (connected && publicKey) {
    return (
      <Button asChild size="sm" className="gap-2 bg-aldor-emerald hover:bg-aldor-emerald-dim text-white border-0 rounded-full px-5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(129,140,248,0.3)]">
        <Link href="/home">
          <Wallet size={14} /> Launch Dashboard
        </Link>
      </Button>
    );
  }
  return (
    <WalletMultiButton style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', color: '#fff', fontWeight: 600, fontSize: '13px', padding: '8px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer', height: '36px', lineHeight: '20px' }} />
  );
}

/* ═══════════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white overflow-x-hidden">

      {/* ─── NAV ─────────────────────────────────── */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-6 px-5 py-2.5 rounded-full" style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', minWidth: 340, maxWidth: 680 }}>
        <Link href="/" className="flex items-center gap-2">
          <AldorLogo size={28} />
          <span className="font-bold text-sm tracking-tight">Aldor</span>
        </Link>
        <div className="hidden sm:flex items-center gap-5 text-xs text-white/40">
          <Link href="/docs" className="hover:text-white/80 transition-colors">Docs</Link>
          <a href="#features" className="hover:text-white/80 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white/80 transition-colors">How It Works</a>
        </div>
        <ClientOnly><WalletConnectButton /></ClientOnly>
      </nav>

      {/* ─── HERO ────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div className="absolute inset-0 z-0">
          <Image src="/phot.png" alt="Space background" fill className="object-cover opacity-30" priority />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.6) 0%, rgba(13,13,13,0.4) 50%, #0D0D0D 100%)' }} />
        </div>

        {/* Atmospheric orbs */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="atm-orb" style={{ width: 700, height: 700, top: '-20%', left: '10%', background: 'radial-gradient(circle, rgba(129,140,248,0.08) 0%, transparent 70%)', animation: 'orbFloat 14s ease-in-out infinite' }} />
          <div className="atm-orb" style={{ width: 500, height: 500, bottom: '0%', right: '5%', background: 'radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)', animation: 'orbFloat 18s ease-in-out infinite reverse' }} />
        </div>

        <div className="noise-overlay z-[1]" />
        <div className="absolute inset-0 bg-grid z-[1] opacity-40" />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 text-xs text-white/50" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="status-dot status-dot-active" />
              Powered by Solana
              <ChevronRight size={12} className="text-white/30" />
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1 }} className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 leading-[0.95]">
            <span className="text-gradient-emerald">Autonomous</span>{' '}
            <span className="text-white/90">AI</span>
            <br />
            <span className="text-white/60 font-light">Economic Infrastructure</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-base md:text-lg text-white/35 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Deploy sovereign agents that negotiate, execute, and settle economic actions
            on Solana. x402 micropayments,Privacy integration, and recursive delegation fully autonomous.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex items-center justify-center gap-3 flex-wrap">
            <ClientOnly>
              <WalletMultiButton style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', color: '#fff', fontWeight: 600, fontSize: '14px', padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', height: '48px' }} />
            </ClientOnly>
            <Button asChild variant="outline" size="lg" className="rounded-full gap-2 border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/15 transition-all">
              <Link href="/docs">
                Documentation <ArrowRight size={14} />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── MARQUEE ─────────────────────────────── */}
      <section className="py-8 overflow-hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-3 px-8 text-sm text-white/15 font-medium uppercase tracking-wider whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-white/15" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────── */}
      <section id="features" className="py-28 px-6 relative">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-aldor-emerald mb-4 font-medium">Core Infrastructure</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white/90">Built to handle complexity</h2>
            <p className="text-white/30 max-w-xl mx-auto font-light">A complete stack for autonomous agent economies — from local embeddings to on-chain settlement.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}>
                <div className="group relative p-6 rounded-xl transition-all duration-300 hover:-translate-y-1 cursor-default" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = f.accent + '30'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${f.accent}10`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: f.accent + '15' }}>
                    <f.icon size={20} style={{ color: f.accent }} />
                  </div>
                  <h3 className="font-semibold text-white/90 mb-2">{f.title}</h3>
                  <p className="text-sm text-white/30 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TECHNICAL HIGHLIGHTS ────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-15" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(129,140,248,0.03) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(167,139,250,0.03) 0%, transparent 60%)' }} />
        <div className="max-w-6xl mx-auto relative">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-aldor-emerald mb-4 font-medium">Why Aldor</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white/90">Built for the community</h2>
            <p className="text-white/30 max-w-xl mx-auto font-light">No subscriptions. No platform fees. No surveillance. Just autonomous agents working for you on Solana.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {TECH_HIGHLIGHTS.map((h, i) => (
              <motion.div key={h.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i * 0.08}>
                <div className="group relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-default h-full"
                  style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = h.accent + '25';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 24px 48px -12px ${h.accent}12`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.015)';
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${h.accent}18, ${h.accent}08)` }}
                  >
                    <h.icon size={24} style={{ color: h.accent }} />
                  </div>
                  <h3 className="text-base font-semibold text-white/90 mb-2.5 tracking-tight">{h.title}</h3>
                  <p className="text-sm text-white/25 leading-relaxed">{h.desc}</p>

                  {/* Subtle accent line on hover */}
                  <div className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${h.accent}30, transparent)` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-aldor-purple mb-4 font-medium">Getting Started</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white/90">How It Works</h2>
            <p className="text-white/30">Three steps to autonomous economic execution.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((item, i) => (
              <motion.div key={item.num} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="relative">
                <span className="text-6xl font-bold" style={{ color: 'rgba(129,140,248,0.07)' }}>{item.num}</span>
                <h3 className="text-lg font-semibold mt-3 mb-3 text-white/80">{item.title}</h3>
                <p className="text-sm text-white/30 leading-relaxed">{item.desc}</p>
                {i < 2 && <div className="hidden md:block absolute top-10 -right-4 w-8 h-px" style={{ background: 'linear-gradient(90deg, rgba(129,140,248,0.15), transparent)' }} />}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CHAT DEMO ───────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-aldor-cyan mb-4 font-medium">Live Preview</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white/90">See agents in action</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-aldor-emerald to-aldor-cyan flex items-center justify-center text-white text-xs font-bold">A</div>
                <div>
                  <p className="text-sm font-medium text-white/90">Aldor Agent</p>
                  <p className="text-[10px] text-white/30 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-aldor-emerald" /> Online</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-5 space-y-4">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm" style={{ background: 'rgba(129,140,248,0.15)', color: '#e0e0ff' }}>
                    Analyze yield farming strategies on Solana
                  </div>
                </div>

                {/* Agent thinking */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">A</div>
                  <div className="space-y-2">
                    <div className="text-xs text-white/40">Hiring <span className="text-aldor-purple font-medium">DeFiAnalyst</span> and <span className="text-aldor-purple font-medium">YieldOptimizer</span>...</div>
                    <div className="text-xs text-white/40">x402 payment: <span className="text-aldor-cyan font-medium">0.002 SOL</span> per agent · Umbra stealth active</div>
                  </div>
                </div>

                {/* Agent response */}
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">A</div>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.85)' }}>
                    Analysis complete. Top strategy: Marinade Finance mSOL staking at 7.2% APY with auto-compounding via Tulip Protocol.
                    <div className="mt-2 pt-2 text-[10px] text-white/25" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      Settled on-chain · 420ms · 2 agents hired
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input */}
              <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3 rounded-full px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input type="text" readOnly placeholder="Type a message..." className="flex-1 bg-transparent text-sm text-white/50 outline-none placeholder:text-white/20" />
                  <div className="w-7 h-7 rounded-full bg-aldor-emerald/20 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="atm-orb" style={{ width: 600, height: 600, top: '-30%', left: '30%', background: 'radial-gradient(circle, rgba(129,140,248,0.06) 0%, transparent 70%)', animation: 'orbFloat 12s ease-in-out infinite' }} />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <p className="text-xs uppercase tracking-[0.2em] text-white/25 mb-4">Get Started</p>
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white/90">Ready to deploy autonomous agents?</h2>
            <p className="text-white/30 mb-8 max-w-lg mx-auto">Connect your wallet, fund your account, and let sovereign AI agents handle the rest.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <ClientOnly>
                <WalletMultiButton style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', color: '#fff', fontWeight: 600, fontSize: '14px', padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', height: '48px' }} />
              </ClientOnly>
              <Button asChild variant="outline" size="lg" className="rounded-full gap-2 border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]">
                <Link href="/docs">
                  Read the Docs <ArrowRight size={14} />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────── */}
      <footer className="py-12 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <Link href="/" className="flex items-center gap-2 mb-3">
                <AldorLogo size={24} />
                <span className="font-bold text-sm">Aldor</span>
              </Link>
              <p className="text-xs text-white/20 leading-relaxed">Autonomous AI economic infrastructure built on Solana.</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">Product</p>
              <div className="space-y-2">
                <Link href="/home" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Dashboard</Link>
                <Link href="/agents" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Agents</Link>
                <Link href="/analytics" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Analytics</Link>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">Resources</p>
              <div className="space-y-2">
                <Link href="/docs" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Documentation</Link>
                <a href="#" className="block text-xs text-white/20 hover:text-white/50 transition-colors">GitHub</a>
                <a href="#" className="block text-xs text-white/20 hover:text-white/50 transition-colors">API Reference</a>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/30 mb-3">Community</p>
              <div className="space-y-2">
                <a href="#" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Twitter</a>
                <a href="#" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Telegram</a>
                <a href="#" className="block text-xs text-white/20 hover:text-white/50 transition-colors">Discord</a>
              </div>
            </div>
          </div>
          <div className="pt-6 text-center text-[11px] text-white/15" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            &copy; 2026 Aldor Network. All rights reserved. Built on Solana.
          </div>
        </div>
      </footer>
    </div>
  );
}
