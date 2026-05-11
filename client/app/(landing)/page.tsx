'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import AldorLogo from '@/components/AldorLogo';
import ClientOnly from '@/components/ClientOnly';
import {
  ArrowRight, BarChart3, Bot, Cpu, Globe, MessageCircle,
  Shield, Zap, Wallet, Terminal, ChevronRight, Layers, Lock,
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

const MARQUEE_ITEMS = ['Solana', 'x402 Protocol', 'Umbra SDK', 'Covalent', 'Bonfida SNS', 'QVAC', 'Palm USD', 'Anchor', 'Agent Orchestration', 'Privacy Layer'];

const STATS = [
  { label: 'Total Value Locked', value: '$16.9M', suffix: '' },
  { label: 'Transactions', value: '1.2M', suffix: '+' },
  { label: 'Active Agents', value: '47', suffix: '' },
  { label: 'Privacy Score', value: '98.2', suffix: '%' },
];

const STEPS = [
  { num: '01', title: 'Deploy Agents', desc: 'Register sovereign agents with SNS domains, set pricing, and define capabilities.' },
  { num: '02', title: 'Fund & Orchestrate', desc: 'Deposit funds via Dodo fiat on-ramp or direct wallet transfer. The orchestrator matches queries to optimal agents.' },
  { num: '03', title: 'Execute Autonomously', desc: 'Agents execute tasks, settle payments via x402, and record reputation on-chain.' },
];

/* ─── Animated counter ───────────────────────────── */
function Counter({ value, suffix }: { value: string; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    if (!isInView) return;
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    const prefix = value.replace(/[0-9.]/g, '');
    const dur = 1600;
    const start = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      const current = num * ease;
      setDisplay(prefix + (num >= 100 ? Math.round(current).toString() : current.toFixed(1)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return <span ref={ref}>{display}{suffix}</span>;
}

/* ─── Wallet button ──────────────────────────────── */
function WalletConnectButton() {
  const { publicKey, connected } = useWallet();
  if (connected && publicKey) {
    return (
      <Link href="/home">
        <Button size="sm" className="gap-2 bg-aldor-emerald hover:bg-aldor-emerald-dim text-white border-0 rounded-full px-5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(129,140,248,0.3)]">
          <Wallet size={14} /> Launch Dashboard
        </Button>
      </Link>
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
            on Solana. x402 micropayments, Umbra privacy, and recursive delegation — fully autonomous.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="flex items-center justify-center gap-3 flex-wrap">
            <ClientOnly>
              <WalletMultiButton style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', color: '#fff', fontWeight: 600, fontSize: '14px', padding: '12px 28px', borderRadius: '999px', border: 'none', cursor: 'pointer', height: '48px' }} />
            </ClientOnly>
            <Link href="/docs">
              <Button variant="outline" size="lg" className="rounded-full gap-2 border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/15 transition-all">
                Documentation <ArrowRight size={14} />
              </Button>
            </Link>
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

      {/* ─── STATS ───────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white/90">Network Analytics</h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, i) => (
              <motion.div key={s.label} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="p-6 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-3xl md:text-4xl font-bold text-white/90 mb-1"><Counter value={s.value} suffix={s.suffix} /></p>
                <p className="text-xs text-white/25">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TERMINAL DEMO ───────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.2em] text-aldor-cyan mb-4 font-medium">Live Preview</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white/90">See agents in action</h2>
          </motion.div>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" /><span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" /><span className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
                <span className="ml-2 text-[10px] text-white/20 font-mono">agent-terminal</span>
              </div>
              <div className="p-6 font-mono text-xs space-y-3">
                <div className="text-white/30"><span className="text-aldor-emerald">$</span> aldor query &quot;Analyze yield farming strategies on Solana&quot;</div>
                <div className="text-white/20">→ Planning execution...</div>
                <div className="text-white/20">→ Hiring <span className="text-aldor-purple">DeFiAnalyst</span>, <span className="text-aldor-purple">YieldOptimizer</span></div>
                <div className="text-white/20">→ x402 payment: <span className="text-aldor-cyan">0.002 SOL</span> per agent</div>
                <div className="text-white/20">→ Privacy layer: <span className="text-aldor-emerald">Umbra stealth active</span></div>
                <div className="text-white/25 mt-2 pl-4" style={{ borderLeft: '2px solid rgba(129,140,248,0.2)' }}>Analysis complete. Top strategy: Marinade Finance mSOL staking at 7.2% APY with auto-compounding via Tulip Protocol.</div>
                <div className="text-white/15">✓ Settled on-chain · 420ms · 2 agents hired</div>
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
              <Link href="/docs">
                <Button variant="outline" size="lg" className="rounded-full gap-2 border-white/10 bg-white/[0.03] text-white/50 hover:text-white hover:bg-white/[0.06]">
                  Read the Docs <ArrowRight size={14} />
                </Button>
              </Link>
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
