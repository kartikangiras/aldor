'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fundViaDodo } from '@/lib/api';
import { Wallet, Coins, CreditCard, Activity } from 'lucide-react';

export default function WalletInfo() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [palmBalance, setPalmBalance] = useState<number | null>(null);
  const [funding, setFunding] = useState(false);
  const [fundUrl, setFundUrl] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() ?? '';

  useEffect(() => {
    if (!publicKey || !connection) {
      setSolBalance(null);
      setPalmBalance(null);
      return;
    }
    let active = true;
    connection
      .getBalance(publicKey)
      .then((lamports) => {
        if (!active) return;
        setSolBalance(lamports / LAMPORTS_PER_SOL);
      })
      .catch(() => {
        if (active) setSolBalance(null);
      });

    setPalmBalance(0);

    return () => {
      active = false;
    };
  }, [publicKey, connection]);

  const [dodoStatus, setDodoStatus] = useState<string | null>(null);

  const handleFund = async () => {
    if (!walletAddress) return;
    setFunding(true);
    setDodoStatus(null);
    try {
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?funded=1`
        : undefined;
      const cancelUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/?cancelled=1`
        : undefined;
      const res = await fundViaDodo(10, walletAddress, returnUrl, cancelUrl);
      setFundUrl(res.payment);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        window.location.href = res.payment;
      } else if (typeof res.payment === 'string') {
        setDodoStatus(`Invoice: ${res.payment}`);
      } else {
        setDodoStatus('Payment initiated');
      }
    } catch (e: any) {
      const msg = e.message ?? '';
      if (msg.includes('DODO_UNAVAILABLE') || msg.includes('503')) {
        setDodoStatus('Dodo not configured — set DODO_API_KEY in server env');
      } else {
        setDodoStatus('Funding failed: ' + msg);
      }
    } finally {
      setFunding(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #333333', background: '#1a1a1a', flexWrap: 'wrap' }}>
      {/* Wallet status */}
      <div style={{ padding: '10px 16px', borderRight: '1px solid #333333', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Wallet size={14} color={connected ? '#00ff94' : '#555555'} />
        <div>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Wallet</div>
          <div style={{ fontSize: 11, color: connected ? '#ffffff' : '#555555', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
            {connected && walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'Disconnected'}
          </div>
        </div>
      </div>

      {/* SOL balance */}
      <div style={{ padding: '10px 16px', borderRight: '1px solid #333333', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Activity size={14} color="#3b82f6" />
        <div>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SOL</div>
          <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>
            {solBalance !== null ? solBalance.toFixed(4) : '—'}
          </div>
        </div>
      </div>

      {/* Palm USD balance */}
      <div style={{ padding: '10px 16px', borderRight: '1px solid #333333', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Coins size={14} color="#00ff94" />
        <div>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Palm USD</div>
          <div style={{ fontSize: 13, color: '#00ff94', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", minWidth: 60 }}>
            {palmBalance !== null ? palmBalance.toFixed(4) : '—'}
          </div>
        </div>
      </div>

      {/* Fund via Dodo */}
      <button
        onClick={handleFund}
        disabled={funding || !connected}
        style={{
          padding: '10px 16px',
          background: funding || !connected ? '#1a1a1a' : 'transparent',
          border: 'none',
          borderRight: '1px solid #333333',
          color: funding || !connected ? '#555555' : '#ffa500',
          fontSize: 11,
          fontWeight: 700,
          cursor: funding || !connected ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.1s',
        }}
      >
        <CreditCard size={12} />
        {funding ? 'Processing...' : 'Fund via Dodo'}
      </button>

      {dodoStatus && (
        <div style={{ padding: '10px 16px', fontSize: 10, color: dodoStatus.includes('not configured') ? '#ffa500' : '#00ff94', fontFamily: "'JetBrains Mono', monospace", maxWidth: 300 }}>
          {dodoStatus}
        </div>
      )}
    </div>
  );
}
