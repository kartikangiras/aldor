'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getRecentTransactions, getPalmUsdCirculation } from '@/lib/api';
import type { RecentTransaction } from '@/lib/types';
import { Activity, Database, TrendingUp } from 'lucide-react';

export default function CovalentDataPanel() {
  const [gdp, setGdp] = useState<number>(0);
  const [velocityData, setVelocityData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [recentTxs, setRecentTxs] = useState<RecentTransaction[]>([]);
  const [stale, setStale] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const gdpRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [txs, circ] = await Promise.all([getRecentTransactions(), getPalmUsdCirculation()]);
      const hasRealData = txs.items.length > 0;
      if (!hasRealData) {
        // Demo data when Covalent is unavailable
        setRecentTxs([
          { address: '11111111111111111111111111111111', hash: 'mock_tx_7xKp9', timestamp: new Date(Date.now() - 120000).toISOString(), kind: 'X402_SETTLED' },
          { address: '11111111111111111111111111111111', hash: 'mock_tx_3vBn2', timestamp: new Date(Date.now() - 340000).toISOString(), kind: 'UMBRA_TRANSFER' },
          { address: '11111111111111111111111111111111', hash: 'mock_tx_9mQr5', timestamp: new Date(Date.now() - 560000).toISOString(), kind: 'JOB_OUTCOME' },
          { address: '11111111111111111111111111111111', hash: 'mock_tx_2wJt8', timestamp: new Date(Date.now() - 890000).toISOString(), kind: 'X402_SETTLED' },
          { address: '11111111111111111111111111111111', hash: 'mock_tx_4yLz1', timestamp: new Date(Date.now() - 1200000).toISOString(), kind: 'REGISTRY_UPDATE' },
        ]);
        setGdp(12847);
        setVelocityData([0, 1, 2, 0, 3, 1, 4, 2, 1, 3, 2, 5]);
        setStale(true);
        return;
      }
      setRecentTxs(txs.items.slice(0, 5));
      setGdp(Math.floor((circ.totalSupply || 0) / 1000));
      setStale(false);

      if (typeof window !== 'undefined') {
        (window as any).__covalentLastUpdate = Date.now();
      }

      const now = Date.now();
      const buckets = new Array(12).fill(0);
      txs.items.forEach((tx: RecentTransaction) => {
        const t = new Date(tx.timestamp).getTime();
        const minutesAgo = (now - t) / 60000;
        if (minutesAgo >= 0 && minutesAgo < 60) {
          const bucket = Math.min(11, Math.floor(minutesAgo / 5));
          buckets[11 - bucket] += 1;
        }
      });
      setVelocityData(buckets);
    } catch {
      setStale(true);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, w, h);

    const max = Math.max(1, ...velocityData);
    const barWidth = (w - 40) / velocityData.length;
    const barGap = 4;

    velocityData.forEach((val, i) => {
      const bh = (val / max) * (h - 30);
      const x = 20 + i * barWidth + barGap / 2;
      const y = h - 20 - bh;
      // Brutalist bar — no rounded corners
      ctx.fillStyle = 'rgba(157, 78, 221, 0.7)';
      ctx.fillRect(x, y, barWidth - barGap, bh);
      // Top highlight
      ctx.fillStyle = '#9d4edd';
      ctx.fillRect(x, y, barWidth - barGap, 1);
      // Value label
      ctx.fillStyle = '#888888';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(val), x + (barWidth - barGap) / 2, y - 4);
    });

    ctx.fillStyle = '#555555';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0m', 20, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText('60m', w - 20, h - 6);
  }, [velocityData]);

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={14} color="#14b8a6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Covalent Analytics
          </span>
        </div>
        {stale && (
          <span style={{ fontSize: 9, color: '#ffa500', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={10} />
            STALE DATA
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #333333' }}>
        <div style={{ padding: 14, borderRight: '1px solid #333333', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingUp size={10} />
            Agentic GDP
          </div>
          <div
            ref={gdpRef}
            style={{
              fontSize: 32,
              color: '#ffffff',
              fontWeight: 900,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '-0.02em',
              animation: stale ? 'none' : 'ticker-flicker 0.15s infinite',
            }}
          >
            {gdp.toLocaleString()}
          </div>
          <div style={{ fontSize: 9, color: '#555555', marginTop: 2 }}>Jobs completed (proxy)</div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={10} />
            Economic Velocity
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 80 }} />
        </div>
      </div>

      <div>
        <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Recent Transactions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {recentTxs.map((tx, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '6px 8px',
                border: '1px solid rgba(255,255,255,0.03)',
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}
            >
              <span style={{ color: '#888888' }}>
                {new Date(tx.timestamp).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span style={{ color: '#ffffff', minWidth: 100, textAlign: 'center' }}>
                {tx.kind ?? 'Unknown'}
              </span>
              <span className="truncate" style={{ maxWidth: 120, color: '#14b8a6' }}>
                {tx.hash?.slice(0, 12)}...
              </span>
            </div>
          ))}
          {recentTxs.length === 0 && (
            <span style={{ color: '#555555', fontSize: 11, padding: 8 }}>No recent transactions.</span>
          )}
        </div>
      </div>
    </div>
  );
}
