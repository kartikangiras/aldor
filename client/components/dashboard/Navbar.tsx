'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Bell, Search, Settings, User, LogOut, ChevronDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DashboardNavbar() {
  const [network, setNetwork] = useState<'devnet' | 'mainnet'>('devnet');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-14 flex items-center justify-between px-6 sticky top-0 z-30"
      style={{ background: 'rgba(8,8,8,0.7)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={14} className={cn('absolute left-3 top-1/2 -translate-y-1/2 transition-colors', searchFocused ? 'text-aldor-emerald' : 'text-white/20')} />
          <motion.input type="text" placeholder="Search agents, commands..."
            animate={{ width: searchFocused ? 288 : 220 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="bg-transparent pl-8 pr-4 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none rounded-lg transition-all"
            style={{ border: searchFocused ? '1px solid rgba(129,140,248,0.25)' : '1px solid rgba(255,255,255,0.06)', background: searchFocused ? 'rgba(129,140,248,0.04)' : 'rgba(255,255,255,0.02)' }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-lg p-0.5 gap-0.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['devnet', 'mainnet'] as const).map((net) => (
            <button key={net} onClick={() => setNetwork(net)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 flex items-center gap-1.5', network === net ? 'text-white' : 'text-white/25 hover:text-white/50')}
              style={network === net ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: net === 'mainnet' ? '#a78bfa' : '#818cf8', boxShadow: network === net ? (net === 'mainnet' ? '0 0 6px rgba(167,139,250,0.7)' : '0 0 6px rgba(129,140,248,0.7)') : 'none' }} />
              {net === 'mainnet' ? 'Mainnet' : 'Devnet'}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-all hover:bg-white/[0.04]" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(129,140,248,0.5), rgba(167,139,250,0.5))', border: '1px solid rgba(255,255,255,0.08)' }}>
                <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <ChevronDown size={12} className="text-white/25" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60" style={{ background: 'rgba(12,12,12,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }}>
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src="/logo.png" alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">Operator</p>
                  <p className="text-[10px] text-white/30 truncate">operator@aldor.network</p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
            <DropdownMenuItem className="text-white/40 focus:bg-white/[0.04] focus:text-white/70 cursor-pointer">
              <Settings size={13} className="mr-2" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/40 focus:bg-white/[0.04] focus:text-white/70 cursor-pointer">
              <User size={13} className="mr-2" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-white/40 focus:bg-white/[0.04] focus:text-white/70 cursor-pointer">
              <Bell size={13} className="mr-2" /> Notifications
              <span className="ml-auto w-1.5 h-1.5 bg-aldor-rose rounded-full" style={{ boxShadow: '0 0 4px rgba(251,113,133,0.7)' }} />
            </DropdownMenuItem>
            <DropdownMenuSeparator style={{ background: 'rgba(255,255,255,0.06)' }} />
            <DropdownMenuItem className="text-aldor-rose focus:bg-white/[0.04] cursor-pointer">
              <LogOut size={13} className="mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
