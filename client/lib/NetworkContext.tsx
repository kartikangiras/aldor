'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type SolanaNetwork = 'mainnet' | 'devnet';

interface NetworkContextValue {
  network: SolanaNetwork;
  setNetwork: (n: SolanaNetwork) => void;
  toggleNetwork: () => void;
  clusterParam: string;
  explorerCluster: string;
  covalentChain: string;
  rpcUrl: string;
}

const NetworkContext = createContext<NetworkContextValue>({
  network: 'devnet',
  setNetwork: () => {},
  toggleNetwork: () => {},
  clusterParam: '?cluster=devnet',
  explorerCluster: '?cluster=devnet',
  covalentChain: 'solana-devnet',
  rpcUrl: 'https://api.devnet.solana.com',
});

const STORAGE_KEY = 'aldor_network';

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<SolanaNetwork>('devnet');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'mainnet' || saved === 'devnet') {
        setNetworkState(saved);
      }
    }
  }, []);

  const setNetwork = useCallback((n: SolanaNetwork) => {
    setNetworkState(n);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, n);
    }
  }, []);

  const toggleNetwork = useCallback(() => {
    setNetworkState((prev) => {
      const next = prev === 'mainnet' ? 'devnet' : 'mainnet';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const value: NetworkContextValue = {
    network,
    setNetwork,
    toggleNetwork,
    clusterParam: network === 'mainnet' ? '' : '?cluster=devnet',
    explorerCluster: network === 'mainnet' ? '?cluster=mainnet' : '?cluster=devnet',
    covalentChain: network === 'mainnet' ? 'solana-mainnet' : 'solana-devnet',
    rpcUrl: network === 'mainnet'
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET ?? 'https://api.mainnet-beta.solana.com')
      : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET ?? 'https://api.devnet.solana.com'),
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
