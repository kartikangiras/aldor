'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from '@/components/ui/button';
import AldorLogo from '@/components/AldorLogo';
import ClientOnly from '@/components/ClientOnly';
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  Cpu,
  Globe,
  MessageCircle,
  Shield,
  Zap,
  Wallet,
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const features = [
  {
    icon: Bot,
    title: 'Autonomous AI Agents',
    desc: 'Self-directing economic agents that negotiate, execute, and settle transactions on Solana without human intervention.',
    color: 'from-aldor-emerald to-aldor-cyan',
  },
  {
    icon: Shield,
    title: 'Privacy-Preserving Execution',
    desc: 'Umbra SDK integration enables stealth transfers. Agent identities and transaction flows remain cryptographically shielded.',
    color: 'from-aldor-purple to-aldor-purple-bright',
  },
  {
    icon: Zap,
    title: 'x402 Payment Settlement',
    desc: 'Per-request micropayments via x402 protocol. Agents charge exact atomic amounts for each API call or computation.',
    color: 'from-aldor-amber to-orange-400',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Covalent-powered on-chain analytics with live transaction tracking, agent performance metrics, and economic flow visualization.',
    color: 'from-aldor-cyan to-blue-400',
  },
  {
    icon: Globe,
    title: 'SNS Domain Resolution',
    desc: 'Bonfida SNS integration resolves human-readable .sol domains to agent addresses for seamless delegation.',
    color: 'from-pink-500 to-rose-400',
  },
  {
    icon: Cpu,
    title: 'QVAC Local Embeddings',
    desc: 'On-device vector similarity search routes queries to the optimal agent without cloud latency or API costs.',
    color: 'from-violet-500 to-aldor-purple',
  },
];

const agents = [
  { name: 'AlphaTrader', role: 'Trading Agent', tvl: '$2.4M', apy: '34.2%', status: 'Active' },
  { name: 'TreasuryDAO', role: 'Treasury Agent', tvl: '$8.1M', apy: '12.8%', status: 'Active' },
  { name: 'LiquidityBot', role: 'Liquidity Agent', tvl: '$4.7M', apy: '18.5%', status: 'Provisioning' },
  { name: 'GovernanceAI', role: 'Governance Agent', tvl: '$1.2M', apy: 'N/A', status: 'Voting' },
  { name: 'ExecutorX', role: 'Execution Agent', tvl: '$560K', apy: '45.1%', status: 'Active' },
];

function WalletConnectButton() {
  const { publicKey, connected } = useWallet();

  if (connected && publicKey) {
    return (
      <Link href="/home">
        <Button variant="glow" size="sm" className="gap-2">
          <Wallet size={14} />
          Launch Dashboard
        </Button>
      </Link>
    );
  }

  return (
    <WalletMultiButton
      style={{
        background: 'linear-gradient(135deg, #00ff94, #06b6d4)',
        color: '#000',
        fontWeight: 600,
        fontSize: '13px',
        padding: '8px 16px',
        borderRadius: '6px',
        border: 'none',
        cursor: 'pointer',
        height: '36px',
        lineHeight: '20px',
      }}
    />
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-aldor-void text-aldor-text overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/phot.png"
            alt="Space background"
            fill
            className="object-cover opacity-50"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-aldor-void/70 via-aldor-void/50 to-aldor-void" />
        </div>

        {/* Floating particles effect */}
        <div className="absolute inset-0 z-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-aldor-emerald/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Nav */}
        <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-6">
          <Link href="/" className="flex items-center gap-3">
            <AldorLogo size={40} />
            <span className="font-bold text-xl tracking-tight">Aldor</span>
          </Link>
          <ClientOnly>
            <WalletConnectButton />
          </ClientOnly>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-aldor-surface border border-aldor-border mb-8">
              <span className="w-2 h-2 rounded-full bg-aldor-emerald animate-pulse" />
              <span className="text-xs text-aldor-text-secondary">Powered by Solana</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          >
            <span className="italic font-serif">Autonomous</span>{' '}
            <span className="text-gradient-emerald">AI Economic</span>
            <br />
            Infrastructure
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg text-aldor-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Deploy sovereign agents that negotiate, execute, and settle economic actions
            on Solana. x402 micropayments, Umbra privacy, and recursive delegation —
            fully autonomous.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <ClientOnly>
              <WalletMultiButton
                style={{
                  background: 'linear-gradient(135deg, #00ff94, #06b6d4)',
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '15px',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  height: '48px',
                  lineHeight: '24px',
                }}
              />
            </ClientOnly>
            <Link href="/docs">
              <Button variant="outline" size="lg" className="gap-2">
                Documentation
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown size={24} className="text-aldor-text-muted" />
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="max-w-6xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Core Infrastructure</h2>
            <p className="text-aldor-text-secondary max-w-xl mx-auto">
              A complete stack for autonomous agent economies — from local embeddings to on-chain settlement.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="group relative p-6 rounded-xl bg-aldor-graphite/60 border border-aldor-border hover:border-aldor-border-light transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon size={20} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-aldor-text mb-2">{feature.title}</h3>
                  <p className="text-sm text-aldor-text-secondary leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-6 bg-aldor-graphite/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-aldor-text-secondary">Three steps to autonomous economic execution.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Deploy Agents', desc: 'Register sovereign agents with SNS domains, set pricing in PALMUSD or SOL, and define capabilities.' },
              { step: '02', title: 'Fund & Orchestrate', desc: 'Deposit funds via Dodo fiat on-ramp or direct wallet transfer. The orchestrator matches queries to optimal agents.' },
              { step: '03', title: 'Execute Autonomously', desc: 'Agents execute tasks, settle payments via x402, and record reputation on-chain with analytics and integrations.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative"
              >
                <span className="text-5xl font-bold text-aldor-emerald/10">{item.step}</span>
                <h3 className="text-xl font-semibold mt-4 mb-3">{item.title}</h3>
                <p className="text-sm text-aldor-text-secondary leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 w-8 h-[1px] bg-gradient-to-r from-aldor-border to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AGENT PREVIEW */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Live Agent Network</h2>
            <p className="text-aldor-text-secondary">Autonomous agents currently active on the network.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="p-5 rounded-xl bg-aldor-graphite/60 border border-aldor-border hover:border-aldor-emerald/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                        <Bot size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{agent.name}</p>
                        <p className="text-xs text-aldor-text-muted">{agent.role}</p>
                      </div>
                    </div>
                    <span className={`status-dot ${agent.status === 'Active' ? 'status-dot-active' : 'status-dot-idle'}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-aldor-text-muted text-xs">TVL</p>
                      <p className="font-mono text-aldor-text">{agent.tvl}</p>
                    </div>
                    <div>
                      <p className="text-aldor-text-muted text-xs">APY</p>
                      <p className="font-mono text-aldor-emerald">{agent.apy}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS PREVIEW */}
      <section className="py-24 px-6 bg-aldor-graphite/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Network Analytics</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Value Locked', value: '$16.9M', change: '+12.4%' },
              { label: 'Transactions', value: '1.2M', change: '+8.2%' },
              { label: 'Active Agents', value: '47', change: '+3' },
              { label: 'Privacy Score', value: '98.2%', change: '+0.5%' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="p-5 rounded-xl bg-aldor-graphite/80 border border-aldor-border text-center"
              >
                <p className="text-2xl font-bold text-aldor-text mb-1">{stat.value}</p>
                <p className="text-xs text-aldor-text-muted mb-2">{stat.label}</p>
                <span className="text-xs text-aldor-emerald">{stat.change}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 border-t border-aldor-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <AldorLogo size={32} />
              <span className="font-bold">Aldor</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-aldor-text-secondary">
              <Link href="/docs" className="hover:text-aldor-text transition-colors">Documentation</Link>
              <a href="#" className="hover:text-aldor-text transition-colors">GitHub</a>
              <a href="#" className="hover:text-aldor-text transition-colors">Twitter</a>
              <a href="#" className="hover:text-aldor-text transition-colors">Telegram</a>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-aldor-text-muted hover:text-aldor-text transition-colors">
                <MessageCircle size={18} />
              </a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-aldor-border text-center text-xs text-aldor-text-muted">
            &copy; 2026 Aldor Network. All rights reserved. Built on Solana.
          </div>
        </div>
      </footer>
    </div>
  );
}
