import type { AgentDefinition, PaymentItem, PaymentStats, StepEvent, RegistryAgent, RecentTransaction, DodoFundResponse, DodoOfframpResponse, X402Challenge, PaymentProof } from './types';

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || '';

function getNetworkHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const network = localStorage.getItem('aldor_network');
  if (network === 'mainnet' || network === 'devnet') {
    return { 'X-Aldor-Network': network };
  }
  return {};
}

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const networkHeaders = getNetworkHeader();
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers: {
        ...networkHeaders,
        ...(opts?.headers || {}),
      },
    });
  } catch (networkError: any) {
    throw new Error(
      `Network error fetching ${url}: ${networkError?.message ?? 'Failed to fetch'}. ` +
        'Is the backend server running?',
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status} on ${url}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function getTools(): Promise<{ tools: AgentDefinition[] }> {
  return apiFetch('/api/tools');
}

export async function getAgents(): Promise<RegistryAgent[]> {
  return apiFetch('/api/agents');
}

export async function getRegistry(): Promise<RegistryAgent[]> {
  return apiFetch('/api/registry');
}

export async function getPayments(limit = 100, offset = 0): Promise<{ items: PaymentItem[]; limit: number; offset: number }> {
  return apiFetch(`/api/payments?limit=${limit}&offset=${offset}`);
}

export async function getStats(): Promise<PaymentStats> {
  return apiFetch('/api/stats');
}

export async function getRecentTransactions(): Promise<{ items: RecentTransaction[] }> {
  return apiFetch('/api/analytics/recent-transactions');
}

export async function getPalmUsdCirculation(): Promise<{ totalSupply: number }> {
  return apiFetch('/api/analytics/palmusd-circulation');
}

export interface PaymentActivity {
  recentPayments: Array<{
    hash: string;
    timestamp: string;
    kind: string;
    agent: string;
    amount: number;
    token: string;
    depth: number;
    payer?: string;
  }>;
  stats: {
    totalPayments: number;
    uniqueAgents: number;
    totalVolumeSol: string;
    totalVolumePalm: string;
    palmVolumeUsd: number;
  };
  agentBalances: Array<{
    agent: string;
    address: string;
    solBalance: string;
    palmBalance: string;
  }>;
  velocity: number[];
}

export async function getPaymentActivity(): Promise<PaymentActivity> {
  return apiFetch('/api/analytics/payment-activity');
}

export async function getPaymentConfig(): Promise<{ paymentMode: string; network: string; palmUsdMint: string; umbraEnabled: boolean }> {
  return apiFetch('/api/payment/config');
}

export async function getPreflight(): Promise<{ ok: boolean; umbraEnabled: boolean; paymentMode: string }> {
  return apiFetch('/api/payment/preflight');
}

export async function postQuery(query: string, session: string, budget = 0.01): Promise<{ result: string; requestId: string }> {
  return apiFetch('/api/agent/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session, budget }),
  });
}

export async function submitWalletPayment(requestId: string, proof: PaymentProof): Promise<{ ok: boolean; requestId: string }> {
  return apiFetch('/api/agent/pay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId,
      signature: proof.signature,
      payer: proof.payer,
      ephemeralKey: proof.ephemeralKey,
    }),
  });
}

export async function rejectWalletPayment(requestId: string, reason = 'USER_REJECTED'): Promise<{ ok: boolean; requestId: string; reason: string }> {
  return apiFetch('/api/agent/pay/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, reason }),
  });
}

export async function getPendingPayments(): Promise<{ items: Array<{ requestId: string; challenge: X402Challenge }> }> {
  return apiFetch('/api/agent/payments/pending');
}

export async function getDodoHealth(): Promise<{ ok: boolean; mode: string; message: string }> {
  return apiFetch('/api/dodo/health');
}

export async function fundViaDodo(
  amountUsd: number,
  walletAddress: string,
  returnUrl?: string,
  cancelUrl?: string,
): Promise<DodoFundResponse> {
  return apiFetch('/api/dodo/fund', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amountUsd,
      walletAddress,
      customerData: { email: 'guest@example.com', name: 'Guest User', countryCode: 'US' },
      returnUrl,
      cancelUrl,
    }),
  });
}

export async function offRampEarnings(agentAddress: string, amountStablecoin: number): Promise<DodoOfframpResponse> {
  return apiFetch('/api/dodo/offramp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentAddress, amountStablecoin, destinationDetails: {} }),
  });
}

export function createEventSource(sessionId: string): EventSource {
  const url = new URL(`${API_BASE}/api/agent/events`, typeof window !== 'undefined' ? window.location.href : undefined);
  url.searchParams.set('session', sessionId);
  const network = typeof window !== 'undefined' ? localStorage.getItem('aldor_network') : null;
  if (network === 'mainnet' || network === 'devnet') {
    url.searchParams.set('network', network);
  }
  return new EventSource(url.toString());
}
