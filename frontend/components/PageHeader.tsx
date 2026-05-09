'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  backHref?: string;
  badge?: string;
  badgeColor?: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, backHref, badge, badgeColor = '#00ff94', action }: PageHeaderProps) {
  return (
    <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #333333', background: 'rgba(5,5,5,0.95)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {backHref && (
            <Link
              href={backHref}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                border: '1px solid #333333',
                background: '#1a1a1a',
                color: '#888888',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={12} />
              Back
            </Link>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1
                style={{
                  fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  margin: 0,
                }}
              >
                {title}
              </h1>
              {badge && (
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 8px',
                    border: `1px solid ${badgeColor}`,
                    color: badgeColor,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#888888', lineHeight: 1.4 }}>{subtitle}</p>
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
