'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Bot, Network, Shield, BarChart3, FileText,
  Activity, BookOpen, ChevronLeft, ChevronRight, Wallet, Globe, Cpu, Zap,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { truncate } from '@/lib/utils';

interface SidebarItem {
  label: string; href: string; icon: React.ElementType; badge?: string; group: string;
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard',         href: '/home',      icon: LayoutDashboard, group: 'main' },
  { label: 'Agents',            href: '/agents',    icon: Bot,             group: 'main' },
  { label: 'Economic Topology', href: '/topology',  icon: Network,         group: 'main' },
  { label: 'Covalent Live Analytics',    href: '/analytics', icon: BarChart3,       group: 'analytics' },
  { label: 'Transaction Logs',  href: '/logs',      icon: FileText,        group: 'analytics' },
  { label: 'Execution Trace',   href: '/trace',     icon: Activity,        group: 'analytics' },
  { label: 'Umbra Privacy Layer',     href: '/privacy',   icon: Shield,          group: 'integrations' },
  { label: 'SNS Resolution',    href: '/sns',       icon: Globe,           group: 'integrations' },
  { label: 'QVAC Embeddings',   href: '/qvac',      icon: Cpu,             group: 'integrations' },
  { label: 'Documentation',     href: '/docs',      icon: BookOpen,        group: 'docs' },
];

const groupLabels: Record<string, string> = { main: 'Overview', analytics: 'Analytics', integrations: 'Integrations', docs: 'Resources' };

export function DashboardSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const groups = Array.from(new Set(sidebarItems.map((i) => i.group)));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen z-40 overflow-hidden"
      style={{ background: 'rgba(8,8,8,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.5), rgba(167,139,250,0.4), transparent)' }} />

      <div className="flex items-center h-16 px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <Link href="/home" className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #818cf8, #a78bfa)', boxShadow: '0 0 16px rgba(129,140,248,0.3)' }}>
            <img src="/logo.png" alt="Aldor" className="w-full h-full object-cover" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="min-w-0">
                <span className="font-bold text-base tracking-tight text-white block leading-none">Aldor</span>
            
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <button onClick={onToggle} className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform z-50" style={{ background: 'rgba(18,18,18,0.95)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
        {collapsed ? <ChevronRight size={11} className="text-white/40" /> : <ChevronLeft size={11} className="text-white/40" />}
      </button>

      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide">
        {groups.map((group) => {
          const items = sidebarItems.filter((i) => i.group === group);
          return (
            <div key={group} className="mb-1">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-4 pt-3 pb-1">
                    {groupLabels[group]}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="px-2 space-y-0.5">
                {items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/home' && pathname?.startsWith(item.href + '/'));
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative', collapsed && 'justify-center px-0', isActive ? 'text-white' : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]')}
                      style={isActive ? { background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.15)' } : {}}
                    >
                      {isActive && (
                        <motion.div layoutId="sidebar-active-bar" className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full" style={{ background: 'linear-gradient(180deg,#818cf8,#a78bfa)', boxShadow: '0 0 8px rgba(129,140,248,0.6)' }} />
                      )}
                      <Icon size={17} className={cn('shrink-0 transition-colors', isActive ? 'text-aldor-emerald' : 'text-white/35 group-hover:text-white/60')} />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.2 }} className="truncate font-medium whitespace-nowrap overflow-hidden">
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <WalletSection collapsed={collapsed} />
    </motion.aside>
  );
}

function WalletSection({ collapsed }: { collapsed: boolean }) {
  const { publicKey, connected } = useWallet();
  return (
    <div className="p-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      {connected && publicKey ? (
        <div className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg', collapsed && 'justify-center px-2')} style={{ background: 'rgba(129,140,248,0.06)', border: '1px solid rgba(129,140,248,0.12)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(129,140,248,0.12)' }}>
            <Wallet size={14} className="text-aldor-emerald" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-w-0 flex-1">
                <p className="text-[10px] text-white/25 leading-none mb-0.5">Connected</p>
                <p className="text-xs text-aldor-emerald font-mono truncate">{truncate(publicKey.toBase58(), 4)}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && <div className="w-1.5 h-1.5 rounded-full bg-aldor-emerald shrink-0 animate-pulse" />}
        </div>
      ) : (
        <div className={cn('flex', collapsed && 'justify-center')}>
          <WalletMultiButton style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)', fontWeight: 500, fontSize: '12px', padding: collapsed ? '8px' : '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', height: '36px', lineHeight: '20px', width: collapsed ? '40px' : '100%', overflow: 'hidden' }} />
        </div>
      )}
    </div>
  );
}
