'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getPaymentActivity } from '@/lib/api';
import type { PaymentActivity } from '@/lib/api';
import { Activity, Database, TrendingUp, Zap } from 'lucide-react';

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 1000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  return `${Math.floor(diff / 3600000)}h`;
}

export default function CovalentDataPanel() {
  const [activity, setActivity] = useState<PaymentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await getPaymentActivity();
      setActivity(data);
      setLoading(false);
    } catch (error) {
      console.error('[CovalentDataPanel] Failed to fetch activity:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Draw velocity chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !activity) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const velocityData = activity.velocity;
    const max = Math.max(1, ...velocityData);
    const barWidth = (w - 40) / velocityData.length;
    const barGap = 4;

    velocityData.forEach((val, i) => {
      const bh = (val / max) * (h - 30);
      const x = 20 + i * barWidth + barGap / 2;
      const y = h - 20 - bh;
      ctx.fillStyle = 'rgba(157, 78, 221, 0.7)';
      ctx.fillRect(x, y, barWidth - barGap, bh);
      ctx.fillStyle = '#9d4edd';
      ctx.fillRect(x, y, barWidth - barGap, 1);
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
  }, [activity?.velocity]);

  const hasData = activity && activity.recentPayments.length > 0;
  const stats = activity?.stats;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, height: '100%', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '1px solid #333333' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={14} color="#14b8a6" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Analytics
          </span>
        </div>
        {loading && (
          <span style={{ fontSize: 9, color: '#ffa500', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={10} />
            SYNCING...
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #333333' }}>
        <div style={{ padding: 14, borderRight: '1px solid #333333', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <TrendingUp size={10} />
            Agentic GDP
          </div>
          <div style={{
            fontSize: 32,
            color: '#ffffff',
            fontWeight: 900,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '-0.02em',
          }}>
            {stats?.gdp.toLocaleString() ?? '—'}
          </div>
          <div style={{ fontSize: 9, color: '#555555', marginTop: 2 }}>
            {stats?.totalPayments ?? 0} payments · {stats?.uniqueAgents ?? 0} agents
          </div>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Activity size={10} />
            Economic Velocity
          </div>
          <canvas ref={canvasRef} style={{ width: '100%', height: 80 }} />
        </div>
      </div>

      {/* Volume stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ padding: '8px 10px', border: '1px solid #333333', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase' }}>SOL Volume</div>
            <div style={{ fontSize: 13, color: '#00ff94', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {(Number(stats.totalVolumeSol) / 1_000_000_000).toFixed(6)} SOL
            </div>
          </div>
          <div style={{ padding: '8px 10px', border: '1px solid #333333', background: 'rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase' }}>PALM Volume</div>
            <div style={{ fontSize: 13, color: '#9d4edd', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
              {(Number(stats.totalVolumePalm) / 1_000_000).toFixed(4)} Palm
            </div>
          </div>
        </div>
      )}

      {/* Recent payments */}
      <div>
        <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={10} />
          Recent Payments
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {hasData ? (
            activity!.recentPayments.slice(0, 5).map((tx, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 8px',
                  border: '1px solid rgba(255,255,255,0.03)',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                <span style={{ color: '#888888', minWidth: 50 }}>
                  {timeAgo(tx.timestamp)}
                </span>
                <span style={{ color: '#ffffff', flex: 1, textAlign: 'center', fontWeight: 600 }}>
                  {tx.agent}
                </span>
                <span style={{ color: tx.token === 'SOL' ? '#00ff94' : '#9d4edd', minWidth: 80, textAlign: 'right' }}>
                  {tx.token === 'SOL'
                    ? `${(tx.amount / 1_000_000_000).toFixed(6)} SOL`
                    : `${(tx.amount / 1_000_000).toFixed(4)} Palm`}
                </span>
              </div>
            ))
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#555555', fontSize: 11 }}>
              <Activity size={16} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div>No payments yet.</div>
              <div style={{ fontSize: 10, marginTop: 4 }}>Payments will appear here once agents are hired.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
