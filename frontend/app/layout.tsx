import './globals.css';
import WalletContextProvider from '@/components/WalletContextProvider';
import { NetworkProvider } from '@/lib/NetworkContext';

export const metadata = {
  title: 'ALDOR — Agentic Dashboard',
  description: 'x402 Paid HTTP Tool Network · Solana Native',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <NetworkProvider>
          <WalletContextProvider>{children}</WalletContextProvider>
        </NetworkProvider>
      </body>
    </html>
  );
}
