'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Bot,
  Network,
  Shield,
  BarChart3,
  FileText,
  Activity,
  Plug,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { truncate } from '@/lib/utils';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Economic Topology', href: '/topology', icon: Network },
  { label: 'Privacy Integration', href: '/privacy', icon: Shield },
  { label: 'Live Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Transaction Logs', href: '/logs', icon: FileText },
  { label: 'Execution Trace', href: '/trace', icon: Activity },
  { label: 'SNS + QVAC', href: '/integrations', icon: Plug, badge: 'Active' },
  { label: 'Documentation', href: '/docs', icon: BookOpen },
];

export function DashboardSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-aldor-graphite/95 backdrop-blur-xl border-r border-aldor-border z-40"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-aldor-border">
        <Link href="/home" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aldor-emerald to-aldor-cyan flex items-center justify-center shrink-0">
            <span className="text-aldor-black font-bold text-sm">A</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-bold text-aldor-text text-lg tracking-tight"
              >
                Aldor
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-aldor-surface border border-aldor-border flex items-center justify-center hover:border-aldor-emerald/50 transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-200 group relative',
                isActive
                  ? 'bg-aldor-emerald/10 text-aldor-emerald border border-aldor-emerald/20'
                  : 'text-aldor-text-secondary hover:text-aldor-text hover:bg-aldor-surface'
              )}
            >
              <Icon size={18} className={cn('shrink-0', isActive && 'text-aldor-emerald')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="truncate font-medium whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-aldor-emerald/10 text-aldor-emerald border border-aldor-emerald/20">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-aldor-emerald rounded-r-full"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom - Wallet */}
      <WalletSection collapsed={collapsed} />
    </motion.aside>
  );
}

function WalletSection({ collapsed }: { collapsed: boolean }) {
  const { publicKey, connected } = useWallet();

  return (
    <div className="p-3 border-t border-aldor-border">
      {connected && publicKey ? (
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md bg-aldor-emerald/10 border border-aldor-emerald/20',
            collapsed && 'justify-center'
          )}
        >
          <Wallet size={18} className="text-aldor-emerald shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0"
              >
                <p className="text-xs text-aldor-text-muted">Wallet</p>
                <p className="text-xs text-aldor-emerald font-mono truncate">
                  {truncate(publicKey.toBase58(), 4)}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className={cn('flex', collapsed && 'justify-center')}>
          <WalletMultiButton
            style={{
              background: 'rgba(0, 255, 148, 0.1)',
              color: '#00ff94',
              fontWeight: 600,
              fontSize: '12px',
              padding: collapsed ? '6px' : '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(0, 255, 148, 0.2)',
              cursor: 'pointer',
              height: '36px',
              lineHeight: '20px',
              width: collapsed ? '40px' : '100%',
              overflow: 'hidden',
            }}
          />
        </div>
      )}
    </div>
  );
}
