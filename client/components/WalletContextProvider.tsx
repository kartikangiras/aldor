'use client';

import { useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useNetwork } from '@/lib/NetworkContext';

require('@solana/wallet-adapter-react-ui/styles.css');

export default function WalletContextProvider({ children }: { children: React.ReactNode }) {
  const { network } = useNetwork();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const solanaNetwork = network === 'mainnet' ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => {
    if (network === 'mainnet') {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || clusterApiUrl(WalletAdapterNetwork.Mainnet);
    }
    return process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || clusterApiUrl(WalletAdapterNetwork.Devnet);
  }, [network, solanaNetwork]);

  const wallets = useMemo(
    () => {
      if (!mounted) return [];
      return [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    },
    [solanaNetwork, mounted]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={mounted}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
