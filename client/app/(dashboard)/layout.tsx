'use client';

import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardNavbar } from '@/components/dashboard/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0D0D0D' }}>
      {/* Atmospheric background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="atm-orb"
          style={{
            width: 600, height: 600,
            top: '-10%', left: '-5%',
            background: 'radial-gradient(circle, rgba(129,140,248,0.04) 0%, transparent 70%)',
            animation: 'orbFloat 14s ease-in-out infinite',
          }}
        />
        <div
          className="atm-orb"
          style={{
            width: 500, height: 500,
            bottom: '-5%', right: '-5%',
            background: 'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)',
            animation: 'orbFloat 16s ease-in-out infinite reverse',
          }}
        />
        <div
          className="atm-orb"
          style={{
            width: 400, height: 400,
            top: '40%', left: '50%',
            background: 'radial-gradient(circle, rgba(103,232,249,0.025) 0%, transparent 70%)',
            animation: 'orbFloat 11s ease-in-out infinite',
            animationDelay: '-5s',
          }}
        />
      </div>

      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-col flex-1 min-w-0 relative z-10">
        <DashboardNavbar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
