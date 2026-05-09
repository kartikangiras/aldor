'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { getPaymentConfig, getPreflight, getPalmUsdCirculation } from '@/lib/api';
import NetworkSwitcher from './NetworkSwitcher';
import {
  Brain,
  Shield,
  Database,
  CreditCard,
  Activity,
  Zap,
  Lock,
  Radio,
} from 'lucide-react';

function truncateAddr(addr?: string | null) {
  if (!addr) return '';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function HealthBadge({
  label,
  sub,
  active,
  icon: Icon,
  color,
}: {
  label: string;
  sub: string;
  active: boolean;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        border: `1px solid ${active ? color : '#333333'}`,
        background: active ? `${color}10` : '#1a1a1a',
        fontSize: 10,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        color: active ? color : '#555555',
        fontWeight: 600,
        transition: 'all 0.3s ease',
        ...(active && {
          boxShadow: `0 0 8px ${color}30`,
          animation: 'flicker 3s infinite',
        }),
      }}
    >
      <Icon size={12} strokeWidth={2.5} />
      <span>
        {label}: <span style={{ color: active ? '#ffffff' : '#555555' }}>{sub}</span>
      </span>
    </div>
  );
}

export default function Header() {
  const { publicKey, connected } = useWallet();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<{ paymentMode: string; network: string; umbraEnabled: boolean } | null>(null);
  const [preflight, setPreflight] = useState<{ ok: boolean } | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [balancePulse, setBalancePulse] = useState<{ sol: number | null; pusd: number | null }>({
    sol: null,
    pusd: null,
  });
  const [covalentFresh, setCovalentFresh] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    getPaymentConfig().then(setConfig).catch(() => null);
    getPreflight().then(setPreflight).catch(() => null);
    setMockMode(process.env.NEXT_PUBLIC_MOCK_PAYMENTS === 'true');
  }, []);

  // Balance pulse polling
  useEffect(() => {
    const poll = async () => {
      try {
        const circ = await getPalmUsdCirculation();
        setBalancePulse((prev) => ({ ...prev, pusd: (circ.totalSupply || 0) / 1000 }));
      } catch {
        setCovalentFresh(false);
      }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  const isLive = preflight?.ok ?? false;

  return (
    <header
      style={{
        borderBottom: '1px solid #333333',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        background: 'rgba(5,5,5,0.95)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* ── Left: Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '1px solid #333333',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a1a',
            }}
          >
            <Zap size={18} color="#00ff94" strokeWidth={2.5} />
          </div>
          {isLive && (
            <div
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 8,
                height: 8,
                background: '#00ff94',
                border: '2px solid #050505',
                animation: 'glow 2s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: '#ffffff',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ALDOR
            <span
              style={{
                fontSize: 9,
                fontWeight: 600,
                padding: '1px 5px',
                background: 'rgba(0,255,148,0.08)',
                border: '1px solid rgba(0,255,148,0.25)',
                color: '#00ff94',
              }}
            >
              v1.0
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: '#555555',
              marginTop: 2,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Sovereign Agentic Orchestrator
          </div>
        </div>
      </div>

      {/* ── Center: System Health Matrix ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <HealthBadge
          label="BRAIN"
          sub="QVAC/METAL"
          active={isLive}
          icon={Brain}
          color="#00ff94"
        />
        <HealthBadge
          label="SHIELD"
          sub="UMBRA/STEALTH"
          active={config?.umbraEnabled ?? true}
          icon={Shield}
          color="#9d4edd"
        />
        <HealthBadge
          label="INDEX"
          sub={covalentFresh ? 'COVALENT/LIVE' : 'COVALENT/STALE'}
          active={covalentFresh}
          icon={Database}
          color="#14b8a6"
        />
        <HealthBadge
          label="ROUTING"
          sub="DODO/ON"
          active={true}
          icon={CreditCard}
          color="#ffa500"
        />
      </div>

      {/* ── Right: Balance Pulse + Wallet ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* Balance Pulse */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '4px 10px',
            border: '1px solid #333333',
            background: '#1a1a1a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Activity size={10} color="#00ff94" />
            <span style={{ fontSize: 10, color: '#888888' }}>SOL</span>
            <span style={{ fontSize: 11, color: '#ffffff', fontWeight: 600, minWidth: 50 }}>
              {balancePulse.sol !== null ? balancePulse.sol.toFixed(3) : '—'}
            </span>
          </div>
          <div style={{ width: 1, height: 14, background: '#333333' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={10} color="#9d4edd" />
            <span style={{ fontSize: 10, color: '#888888' }}>PUSD</span>
            <span style={{ fontSize: 11, color: '#00ff94', fontWeight: 600, minWidth: 50 }}>
              {balancePulse.pusd !== null ? balancePulse.pusd.toFixed(2) : '—'}
            </span>
          </div>
        </div>

        <NetworkSwitcher />

        {mockMode && (
          <span
            style={{
              padding: '3px 8px',
              border: '1px solid #ffa500',
              color: '#ffa500',
              fontSize: 10,
              letterSpacing: '0.05em',
              fontWeight: 600,
            }}
          >
            MOCK MODE
          </span>
        )}

        <div suppressHydrationWarning>
          {mounted && (
            <WalletMultiButton
              style={{
                background: '#1a1a1a',
                border: '1px solid #333333',
                color: '#ffffff',
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                borderRadius: 0,
                padding: '6px 12px',
                height: 'auto',
                lineHeight: '1.4',
                fontWeight: 600,
              }}
            >
              {connected && publicKey ? truncateAddr(publicKey.toBase58()) : 'CONNECT'}
            </WalletMultiButton>
          )}
        </div>
      </div>
    </header>
  );
}
