'use client';

import { useEffect, useState } from 'react';

const CACHE_KEY = 'aldor-sol-usd';
const CACHE_MS = 10 * 60 * 1000;

/** The SOL price in USD from CoinGecko, cached for 10 minutes. Null while loading or when unavailable. */
export function useSolUsdPrice(enabled: boolean): number | null {
  const [price, setPrice] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) ?? 'null');
      if (cached && Date.now() - cached.at < CACHE_MS) { setPrice(cached.usd); return; }
    } catch { /* no cache */ }
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const usd = Number(j?.solana?.usd);
        if (!live || !Number.isFinite(usd) || usd <= 0) return;
        setPrice(usd);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ usd, at: Date.now() })); } catch { /* ignore */ }
      })
      .catch(() => {});
    return () => { live = false; };
  }, [enabled]);
  return price;
}

export function formatUsd(amount: number): string {
  return amount < 0.01 ? `$${amount.toFixed(4)}` : `$${amount.toFixed(2)}`;
}
