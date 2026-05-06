import { AGENTS } from './agents.js';

interface RegistryLikeAgent {
  snsDomain: string;
  name?: string;
  category?: string;
  priceLamports?: string;
  priceMicroStablecoin?: number | string;
  reputation?: number | string;
  reputationBps?: string;
  isRecursive?: boolean;
  isActive?: boolean;
  capabilities?: string[];
  walletAddress?: string;
  owner?: string;
}

export interface AgentBalanceInfo {
  address: string;
  stablecoinBalance: string;
  raw?: unknown;
}

export interface RecentTxInfo {
  address: string;
  hash: string;
  timestamp: string;
  kind: string;
}

function covalentEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.COVALENT_API_KEY);
}

function covalentBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.COVALENT_BASE_URL ?? 'https://api.covalenthq.com/v1';
}

function covalentChain(env: NodeJS.ProcessEnv = process.env): string {
  return env.COVALENT_SOLANA_CHAIN ?? 'solana-devnet';
}

async function covalentGet(path: string, env: NodeJS.ProcessEnv = process.env): Promise<any> {
  const apiKey = env.COVALENT_API_KEY;
  if (!apiKey) {
    throw new Error('COVALENT_API_KEY is not configured.');
  }

  const base = covalentBaseUrl(env).replace(/\/+$/, '');
  const url = `${base}${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Covalent request failed with status ${response.status}`);
  }
  return response.json();
}

export async function getStablecoinBalanceForAddress(
  address: string,
  stablecoinMint: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AgentBalanceInfo> {
  if (!covalentEnabled(env)) {
    return { address, stablecoinBalance: '0' };
  }

  const chain = covalentChain(env);
  const payload = await covalentGet(`/${chain}/address/${address}/balances_v2/`, env);
  const items = payload?.data?.items;
  const match = Array.isArray(items)
    ? items.find((item: any) => {
        const contract = String(item?.contract_address ?? '');
        return contract === stablecoinMint;
      })
    : undefined;

  return {
    address,
    stablecoinBalance: String(match?.balance ?? '0'),
    raw: match ?? null,
  };
}

export async function getRecentTransactions(
  addresses: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<RecentTxInfo[]> {
  if (!covalentEnabled(env)) {
    return [];
  }

  const chain = covalentChain(env);
  const all: RecentTxInfo[] = [];
  for (const address of addresses) {
    const payload = await covalentGet(`/${chain}/address/${address}/transactions_v3/?page-size=5`, env);
    const items = payload?.data?.items;
    if (!Array.isArray(items)) continue;
    for (const item of items.slice(0, 5)) {
      all.push({
        address,
        hash: String(item?.tx_hash ?? ''),
        timestamp: String(item?.block_signed_at ?? ''),
        kind: String(item?.successful ? 'successful' : 'unknown'),
      });
    }
  }

  all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return all.slice(0, 5);
}

export async function getAgentRegistryEnriched(
  stablecoinMint: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Array<Record<string, unknown>>> {
  return enrichAgentsWithBalances(AGENTS.map((agent) => ({
    snsDomain: agent.domain,
    name: agent.name,
    category: agent.category,
    priceMicroStablecoin: agent.priceAtomic,
    reputation: agent.reputation,
    isRecursive: agent.recursive,
    isActive: true,
    capabilities: [agent.category],
  })), stablecoinMint, env);
}

export async function enrichAgentsWithBalances(
  agents: RegistryLikeAgent[],
  stablecoinMint: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<Array<Record<string, unknown>>> {
  const walletMap = (() => {
    const raw = env.ALDOR_AGENT_WALLET_MAP;
    if (!raw) return {} as Record<string, string>;
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  })();

  const balances = await Promise.all(
    agents.map((agent) => {
      const address = agent.walletAddress ?? agent.owner ?? walletMap[agent.snsDomain] ?? agent.snsDomain;
      return getStablecoinBalanceForAddress(address, stablecoinMint, env).catch(() => ({
        address,
        stablecoinBalance: '0',
      }));
    }),
  );

  return agents.map((agent) => {
    const address = agent.walletAddress ?? agent.owner ?? walletMap[agent.snsDomain] ?? agent.snsDomain;
    const balance = balances.find((b) => b.address === address);
    return {
      snsDomain: agent.snsDomain,
      name: agent.name ?? '',
      category: agent.category ?? '',
      priceMicroStablecoin: agent.priceMicroStablecoin ?? agent.priceLamports ?? '0',
      reputation: agent.reputation ?? agent.reputationBps ?? '0',
      isRecursive: agent.isRecursive ?? false,
      isActive: agent.isActive ?? true,
      capabilities: agent.capabilities ?? (agent.category ? [agent.category] : []),
      walletAddress: address,
      stablecoinBalance: balance?.stablecoinBalance ?? '0',
      owner: agent.owner,
    };
  });
}
