import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import idl from '../../target/idl/aldor.json' with { type: 'json' };
import { AGENTS } from './agents.js';
import { serverConfig } from './config.js';
import { getAgentWalletMap } from './wallets.js';

export interface RegistryAgentEntry {
  snsDomain: string;
  name: string;
  category: string;
  priceMicroStablecoin: string;
  reputationBps: string;
  totalJobs: string;
  successfulJobs: string;
  isActive: boolean;
  isRecursive: boolean;
  capabilities: string[];
  owner: string;
  registeredAt: string;
  umbraStealthPublicKey?: string;
  walletAddress?: string;
}

function getStealthKeyMap(env: NodeJS.ProcessEnv): Record<string, string> {
  const raw = env.ALDOR_UMBRA_STEALTH_MAP;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getStealthKeyForDomain(domain: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const map = getStealthKeyMap(env);
  if (map[domain]) return map[domain];
  const envKey = `ALDOR_UMBRA_STEALTH_${domain.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  return env[envKey];
}

function getProgramId(env: NodeJS.ProcessEnv): PublicKey | null {
  if (!env.ALDOR_PROGRAM_ID || env.ALDOR_PROGRAM_ID === '11111111111111111111111111111111') {
    return null;
  }
  try {
    return new PublicKey(env.ALDOR_PROGRAM_ID);
  } catch {
    return null;
  }
}

export async function fetchRegistryAgents(env: NodeJS.ProcessEnv = process.env, rpcUrl?: string): Promise<RegistryAgentEntry[]> {
  const programId = getProgramId(env);
  if (!programId) {
    const walletMap = getAgentWalletMap(env);
    return AGENTS.map((agent) => ({
      snsDomain: agent.domain,
      name: agent.name,
      category: agent.category,
      priceMicroStablecoin: String(agent.priceAtomic),
      reputationBps: String(agent.reputation),
      totalJobs: '0',
      successfulJobs: '0',
      isActive: true,
      isRecursive: agent.recursive,
      capabilities: [agent.category],
      description: agent.description,
      owner: walletMap[agent.domain] ?? '',
      registeredAt: '0',
      umbraStealthPublicKey: getStealthKeyForDomain(agent.domain, env),
      walletAddress: walletMap[agent.domain],
    }));
  }

  const connection = new Connection(rpcUrl ?? serverConfig.solanaRpcUrl, 'confirmed');
  const coder = new BorshAccountsCoder(idl as Idl);
  const discriminator = coder.accountDiscriminator('AgentAccount');

  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: bs58.encode(discriminator),
        },
      },
    ],
  });

  const walletMap = getAgentWalletMap(env);

  return accounts.map((accountInfo) => {
    const decoded = coder.decode('AgentAccount', accountInfo.account.data) as any;
    const snsDomain = String(decoded.sns_domain ?? decoded.snsDomain ?? '');
    const owner = String(decoded.owner ?? decoded.owner?.toBase58?.() ?? '');
    const rawCapabilities = Array.isArray(decoded.capabilities) ? decoded.capabilities : [];
    const capabilities = rawCapabilities.map((cap: any) => String(cap ?? '')).filter((cap: string) => cap.length > 0);

    const umbraKey = decoded.umbra_stealth_key ?? decoded.umbraStealthKey;
    const umbraStealthPublicKey = umbraKey
      ? bs58.encode(Buffer.from(umbraKey))
      : getStealthKeyForDomain(snsDomain, env);

    return {
      snsDomain,
      name: String(decoded.name ?? ''),
      category: String(decoded.category ?? ''),
      priceMicroStablecoin: String(decoded.price_micro_stablecoin ?? decoded.priceMicroStablecoin ?? 0),
      reputationBps: String(decoded.reputation_bps ?? decoded.reputationBps ?? 0),
      totalJobs: String(decoded.total_jobs ?? decoded.totalJobs ?? 0),
      successfulJobs: String(decoded.successful_jobs ?? decoded.successfulJobs ?? 0),
      isActive: Boolean(decoded.active ?? false),
      isRecursive: Boolean(decoded.is_recursive ?? decoded.isRecursive ?? false),
      capabilities,
      owner,
      registeredAt: String(decoded.registered_at ?? decoded.registeredAt ?? 0),
      umbraStealthPublicKey,
      walletAddress: walletMap[snsDomain] ?? owner,
    };
  });
}

export async function fetchRegistryAgentByDomain(
  snsDomain: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<RegistryAgentEntry | null> {
  const agents = await fetchRegistryAgents(env);
  return agents.find((agent) => agent.snsDomain === snsDomain) ?? null;
}
