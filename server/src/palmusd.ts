export interface PalmUsdCirculation {
  chains: Array<{ chain: string; circulating: string }>;
  total_circulating: string;
}

export async function fetchPalmUsdCirculation(): Promise<PalmUsdCirculation> {
  const response = await fetch('https://www.palmusd.com/api/v1/circulation');
  if (!response.ok) {
    throw new Error(`Palm USD circulation fetch failed with status ${response.status}`);
  }
  return response.json() as Promise<PalmUsdCirculation>;
}
