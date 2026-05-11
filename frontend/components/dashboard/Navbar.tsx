'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Bell,
  Search,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Circle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DashboardNavbar() {
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-aldor-border bg-aldor-graphite/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left - Breadcrumb / Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-aldor-text-muted"
          />
          <input
            type="text"
            placeholder="Search agents, commands..."
            className={cn(
              'bg-aldor-surface border border-aldor-border rounded-md pl-9 pr-4 py-1.5 text-sm text-aldor-text placeholder:text-aldor-text-muted focus:outline-none focus:border-aldor-emerald/50 transition-all',
              searchOpen ? 'w-72' : 'w-56'
            )}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Network Switcher */}
        <div className="flex items-center gap-2 bg-aldor-surface rounded-md border border-aldor-border p-0.5">
          {(['devnet', 'mainnet'] as const).map((net) => (
            <button
              key={net}
              onClick={() => setNetwork(net)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded transition-all',
                network === net
                  ? 'bg-aldor-emerald/10 text-aldor-emerald'
                  : 'text-aldor-text-muted hover:text-aldor-text-secondary'
              )}
            >
              <span className="flex items-center gap-1.5">
                <Circle
                  size={6}
                  className={cn(
                    'fill-current',
                    net === 'mainnet' ? 'text-aldor-purple' : 'text-aldor-emerald'
                  )}
                />
                {net === 'mainnet' ? 'Mainnet' : 'Devnet'}
              </span>
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-md hover:bg-aldor-surface transition-colors">
          <Bell size={18} className="text-aldor-text-secondary" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-aldor-rose rounded-full" />
        </button>

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-aldor-surface transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-aldor-purple to-aldor-cyan flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <ChevronDown size={14} className="text-aldor-text-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-aldor-graphite border-aldor-border"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-aldor-text">Operator</p>
              <p className="text-xs text-aldor-text-muted">operator@aldor.network</p>
            </div>
            <DropdownMenuSeparator className="bg-aldor-border" />
            <DropdownMenuItem className="text-aldor-text-secondary focus:bg-aldor-surface focus:text-aldor-text">
              <Settings size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-aldor-text-secondary focus:bg-aldor-surface focus:text-aldor-text">
              <User size={14} className="mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-aldor-border" />
            <DropdownMenuItem className="text-aldor-rose focus:bg-aldor-surface">
              <LogOut size={14} className="mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
