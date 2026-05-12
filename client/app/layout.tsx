import './globals.css';
import WalletContextProvider from '@/components/WalletContextProvider';
import { NetworkProvider } from '@/lib/NetworkContext';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Aldor',
  description: 'Sovereign agent orchestration with x402 payments, Umbra privacy, and Solana-native execution.',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-aldor-void">
        <NetworkProvider>
          <WalletContextProvider>{children}</WalletContextProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}

