'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Bot,
  Shield,
  Globe,
  Cpu,
  CreditCard,
  BarChart3,
  Lock,
  ArrowRight,
  Zap,
  Server,
  Search,
  Code,
  Sparkles,
} from 'lucide-react';

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
  color: string;
  dashed?: boolean;
}

const NODES: FlowNode[] = [
  {
    id: 'user',
    label: 'User Wallet',
    sublabel: 'Signs x402 payments',
    icon: <Wallet size={16} />,
    color: '#00ff94',
    x: 50,
    y: 40,
    w: 140,
    h: 56,
  },
  {
    id: 'orchestrator',
    label: 'Orchestrator',
    sublabel: 'Planner + Budget Manager',
    icon: <Server size={16} />,
    color: '#14b8a6',
    x: 280,
    y: 40,
    w: 150,
    h: 56,
  },
  {
    id: 'sns',
    label: 'SNS Resolution',
    sublabel: 'Bonfida .sol → Pubkey',
    icon: <Globe size={16} />,
    color: '#3b82f6',
    x: 280,
    y: 140,
    w: 150,
    h: 56,
  },
  {
    id: 'qvac',
    label: 'QVAC Embeddings',
    sublabel: 'Local vector similarity',
    icon: <Cpu size={16} />,
    color: '#8b5cf6',
    x: 80,
    y: 140,
    w: 150,
    h: 56,
  },
  {
    id: 'umbra',
    label: 'Umbra Stealth',
    sublabel: 'Private payments',
    icon: <Shield size={16} />,
    color: '#9d4edd',
    x: 480,
    y: 40,
    w: 140,
    h: 56,
  },
  {
    id: 'agents',
    label: 'Agent Specialists',
    sublabel: '18 AI agents on-chain',
    icon: <Bot size={16} />,
    color: '#f59e0b',
    x: 480,
    y: 140,
    w: 140,
    h: 56,
  },
  {
    id: 'covalent',
    label: 'Covalent Analytics',
    sublabel: 'On-chain indexing',
    icon: <BarChart3 size={16} />,
    color: '#00ff94',
    x: 480,
    y: 240,
    w: 140,
    h: 56,
  },
  {
    id: 'dodo',
    label: 'Dodo Payments',
    sublabel: 'Fiat on-ramp',
    icon: <CreditCard size={16} />,
    color: '#ffa500',
    x: 280,
    y: 240,
    w: 150,
    h: 56,
  },
  {
    id: 'ledger',
    label: 'Payment Ledger',
    sublabel: 'In-memory + on-chain',
    icon: <Lock size={16} />,
    color: '#555555',
    x: 80,
    y: 240,
    w: 150,
    h: 56,
  },
  {
    id: 'llm',
    label: 'LLM Providers',
    sublabel: 'Groq / Gemini / Anthropic',
    icon: <Sparkles size={16} />,
    color: '#ec4899',
    x: 660,
    y: 140,
    w: 150,
    h: 56,
  },
];

const EDGES: FlowEdge[] = [
  { from: 'user', to: 'orchestrator', label: 'x402 challenge', color: '#00ff94' },
  { from: 'orchestrator', to: 'sns', label: 'resolve .sol', color: '#3b82f6', dashed: true },
  { from: 'orchestrator', to: 'qvac', label: 'embed query', color: '#8b5cf6', dashed: true },
  { from: 'orchestrator', to: 'umbra', label: 'stealth pay', color: '#9d4edd' },
  { from: 'umbra', to: 'agents', label: 'settled', color: '#f59e0b' },
  { from: 'agents', to: 'llm', label: 'inference', color: '#ec4899', dashed: true },
  { from: 'agents', to: 'covalent', label: 'balance check', color: '#00ff94', dashed: true },
  { from: 'orchestrator', to: 'ledger', label: 'record tx', color: '#555555', dashed: true },
  { from: 'user', to: 'dodo', label: 'fund wallet', color: '#ffa500', dashed: true },
];

function pathBetween(
  from: FlowNode,
  to: FlowNode,
): string {
  const sx = from.x + from.w / 2;
  const sy = from.y + from.h / 2;
  const ex = to.x + to.w / 2;
  const ey = to.y + to.h / 2;

  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const offset = 24;

  const nx = dx / dist;
  const ny = dy / dist;

  const startX = sx + nx * (from.w / 2 + 4);
  const startY = sy + ny * (from.h / 2 + 4);
  const endX = ex - nx * (to.w / 2 + 8);
  const endY = ey - ny * (to.h / 2 + 8);

  const mx = (startX + endX) / 2;
  const my = (startY + endY) / 2;

  // Curved path
  return `M ${startX} ${startY} Q ${mx} ${startY} ${mx} ${my} T ${endX} ${endY}`;
}

export default function PlatformFlowDiagram() {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  const svgW = 860;
  const svgH = 340;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full min-w-[700px]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#555555" />
          </marker>
          {EDGES.map((edge, i) => (
            <marker key={i} id={`arrow-${i}`} markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={edge.color} />
            </marker>
          ))}
        </defs>

        {/* Edges */}
        {EDGES.map((edge, i) => {
          const fromNode = NODES.find((n) => n.id === edge.from)!;
          const toNode = NODES.find((n) => n.id === edge.to)!;
          const d = pathBetween(fromNode, toNode);
          const isHover = hoveredEdge === i || hoveredNode === edge.from || hoveredNode === edge.to;

          return (
            <g key={i} onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}>
              <path
                d={d}
                fill="none"
                stroke={edge.color}
                strokeWidth={isHover ? 2.5 : 1.5}
                strokeDasharray={edge.dashed ? '5,4' : '0'}
                opacity={isHover ? 1 : 0.5}
                markerEnd={`url(#arrow-${i})`}
                style={{ transition: 'all 0.2s' }}
              />
              {/* Edge label at midpoint */}
              {edge.label && (
                <text
                  x={(fromNode.x + toNode.x + fromNode.w / 2 + toNode.w / 2) / 2}
                  y={(fromNode.y + toNode.y + fromNode.h / 2 + toNode.h / 2) / 2 - 6}
                  textAnchor="middle"
                  fill={edge.color}
                  fontSize="8"
                  opacity={isHover ? 1 : 0.7}
                  style={{ transition: 'all 0.2s', pointerEvents: 'none' }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {NODES.map((node) => {
          const isHover = hoveredNode === node.id;
          const connectedEdges = EDGES.filter((e) => e.from === node.id || e.to === node.id);
          const isConnected = connectedEdges.some(
            (_, i) => hoveredEdge === i
          );
          const active = isHover || isConnected;

          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
              style={{ cursor: 'pointer' }}
            >
              <motion.rect
                width={node.w}
                height={node.h}
                rx={8}
                fill={active ? `${node.color}15` : '#0f0f0f'}
                stroke={node.color}
                strokeWidth={active ? 2 : 1}
                initial={false}
                animate={{ strokeWidth: active ? 2 : 1 }}
              />
              <foreignObject x="0" y="0" width={node.w} height={node.h}>
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    color: node.color,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {node.icon}
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{node.label}</span>
                  </div>
                  {node.sublabel && (
                    <span style={{ fontSize: 8, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      {node.sublabel}
                    </span>
                  )}
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-aldor-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-aldor-emerald" />
          <span>x402 Payment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-px bg-aldor-purple-bright border-dashed" style={{ borderTop: '1px dashed #9d4edd' }} />
          <span>Optional / Async</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowRight size={10} className="text-aldor-text-muted" />
          <span>Hover nodes to highlight flows</span>
        </div>
      </div>
    </div>
  );
}
