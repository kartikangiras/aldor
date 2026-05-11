'use client';

import { useState } from 'react';
import { DashboardSidebar } from '@/components/dashboard/Sidebar';
import { DashboardNavbar } from '@/components/dashboard/Navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-aldor-void overflow-hidden">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <DashboardNavbar />
        <main className="flex-1 overflow-y-auto bg-aldor-void">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
