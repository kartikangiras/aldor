'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, ChevronRight } from 'lucide-react';

const sections = [
  {
    title: 'Getting Started',
    items: ['Introduction', 'Quick Start', 'Installation', 'Configuration'],
  },
  {
    title: 'Core Concepts',
    items: ['Agents', 'x402 Payments', 'Umbra Privacy', 'Economic Topology'],
  },
  {
    title: 'API Reference',
    items: ['REST API', 'WebSocket Events', 'Authentication', 'Error Codes'],
  },
  {
    title: 'Advanced',
    items: ['Custom Agents', 'SNS Integration', 'QVAC Routing', 'Deployment'],
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentation</h1>
        <p className="text-sm text-aldor-text-secondary">Learn how to build with Aldor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Card key={section.title} className="border-aldor-border bg-aldor-graphite/60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen size={16} className="text-aldor-emerald" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item}>
                    <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-aldor-surface transition-colors text-sm text-aldor-text-secondary hover:text-aldor-text">
                      {item}
                      <ChevronRight size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
