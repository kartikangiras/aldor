'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { StepEvent } from '@/lib/types';

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
  type: 'user' | 'manager' | 'worker';
}

interface EdgeDef {
  from: string;
  to: string;
  label: string;
}

const NODES: NodeDef[] = [
  { id: 'user', label: 'USER', x: 80, y: 200, type: 'user' },
  { id: 'manager', label: 'MANAGER', x: 280, y: 200, type: 'manager' },
  { id: 'deepresearch', label: 'DEEP_RESEARCH', x: 480, y: 120, type: 'worker' },
  { id: 'summarizer', label: 'SUMMARIZER', x: 680, y: 80, type: 'worker' },
  { id: 'sentiment', label: 'SENTIMENT_AI', x: 680, y: 160, type: 'worker' },
];

const EDGES: EdgeDef[] = [
  { from: 'user', to: 'manager', label: 'QUERY' },
  { from: 'manager', to: 'deepresearch', label: 'HIRE' },
  { from: 'deepresearch', to: 'summarizer', label: 'SUB-HIRE' },
  { from: 'deepresearch', to: 'sentiment', label: 'SUB-HIRE' },
];

const NODE_COLORS: Record<string, { border: string; glow: string }> = {
  user:    { border: '#3b82f6', glow: 'rgba(59,130,246,0.2)' },
  manager: { border: '#14b8a6', glow: 'rgba(20,184,166,0.2)' },
  worker:  { border: '#00ff94', glow: 'rgba(0,255,148,0.2)' },
};

export default function EconomyGraph({ steps }: { steps: StepEvent[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const dotsRef = useRef<{ edgeIndex: number; t: number; speed: number }[]>([]);
  const flashRef = useRef<Record<string, number>>({});
  const lastStepCountRef = useRef(0);
  const tickRef = useRef(0);

  const edgeIndexForAgent = (agent?: string): number => {
    if (!agent) return -1;
    if (agent === 'DeepResearch') return 1;
    if (agent === 'Summarizer') return 2;
    if (agent === 'SentimentAI') return 3;
    return -1;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;

    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    tickRef.current++;
    const tick = tickRef.current;

    ctx.clearRect(0, 0, cw, ch);

    // Grid background
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 30;
    for (let x = 0; x < cw; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Draw edges
    EDGES.forEach((edge, i) => {
      const from = NODES.find((n) => n.id === edge.from)!;
      const to = NODES.find((n) => n.id === edge.to)!;
      const fx = (from.x / 760) * cw;
      const fy = (from.y / 300) * ch;
      const tx = (to.x / 760) * cw;
      const ty = (to.y / 300) * ch;

      const flash = flashRef.current[`${edge.from}-${edge.to}`] || 0;
      const isActive = flash > 0;

      if (isActive) {
        // Electric purple flash on Umbra settlement
        ctx.strokeStyle = '#9d4edd';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#9d4edd';
        flashRef.current[`${edge.from}-${edge.to}`] = Math.max(0, flash - 1);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.setLineDash([4, 4]);
      }

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Edge label
      const mx = (fx + tx) / 2;
      const my = (fy + ty) / 2;
      if (isActive) {
        ctx.fillStyle = '#9d4edd';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('UMBRA SHIELDED', mx, my - 6);
        // Truncated stealth address hint
        ctx.fillStyle = 'rgba(157,78,221,0.6)';
        ctx.font = '8px monospace';
        ctx.fillText('stealth:0x' + Math.random().toString(36).slice(2, 8) + '…', mx, my + 6);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(edge.label, mx, my - 4);
      }
    });

    // Draw nodes
    NODES.forEach((node) => {
      const x = (node.x / 760) * cw;
      const y = (node.y / 300) * ch;
      const colors = NODE_COLORS[node.type];
      const pulse = Math.sin(tick * 0.03) * 2;

      // Glow
      ctx.beginPath();
      ctx.arc(x, y, 22 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = colors.glow;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a0a';
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.border;
      ctx.fill();

      // Label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, x, y + 30);
    });

    // Animate dots (particles along edges)
    dotsRef.current = dotsRef.current.filter((d) => {
      d.t += d.speed;
      if (d.t >= 1) return false;
      const edge = EDGES[d.edgeIndex];
      const from = NODES.find((n) => n.id === edge.from)!;
      const to = NODES.find((n) => n.id === edge.to)!;
      const fx = (from.x / 760) * cw;
      const fy = (from.y / 300) * ch;
      const tx = (to.x / 760) * cw;
      const ty = (to.y / 300) * ch;
      const px = fx + (tx - fx) * d.t;
      const py = fy + (ty - fy) * d.t;

      // Particle glow
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(157,78,221,0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#9d4edd';
      ctx.fill();
      return true;
    });

    animRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  useEffect(() => {
    const start = lastStepCountRef.current;
    const next = steps.slice(start);
    lastStepCountRef.current = steps.length;

    next.forEach((step) => {
      if (step.type !== 'UMBRA_TRANSFER_CONFIRMED') return;
      const edgeIndex = edgeIndexForAgent(step.agent);
      if (edgeIndex < 0) return;
      dotsRef.current.push({ edgeIndex, t: 0, speed: 0.02 });
      const edge = EDGES[edgeIndex];
      flashRef.current[`${edge.from}-${edge.to}`] = 45; // ~750ms at 60fps
    });
  }, [steps]);

  const settledCount = steps.filter((s) => s.type === 'X402_SETTLED').length;
  const uniqueAgents = new Set(steps.filter((s) => s.agent).map((s) => s.agent)).size;
  const maxDepth = steps.length > 0 ? Math.max(...steps.map((s) => s.depth)) : 0;

  return (
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.4)' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Economy Topology
          </span>
          <span
            style={{
              fontSize: 9,
              padding: '2px 6px',
              background: 'rgba(0,255,148,0.1)',
              border: '1px solid rgba(0,255,148,0.3)',
              color: '#00ff94',
              fontWeight: 700,
            }}
          >
            LIVE
          </span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {[
            { label: 'Payments', value: settledCount, color: '#00ff94' },
            { label: 'Agents', value: uniqueAgents, color: '#14b8a6' },
            { label: 'Max Depth', value: maxDepth, color: '#ffa500' },
          ].map((s) => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </div>
              <div style={{ fontSize: 9, color: '#555555', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', flex: 1, border: '1px solid #333333', background: '#0a0a0a', overflow: 'hidden' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 12,
            display: 'flex',
            gap: 14,
            fontSize: 9,
            color: '#555555',
          }}
        >
          {[
            { color: '#3b82f6', label: 'User' },
            { color: '#14b8a6', label: 'Manager' },
            { color: '#00ff94', label: 'Worker' },
            { color: '#9d4edd', label: 'Umbra Shielded' },
          ].map((l) => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 3, background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
