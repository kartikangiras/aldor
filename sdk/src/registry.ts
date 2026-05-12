import { AnchorProvider, BorshAccountsCoder, type Idl, Wallet } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import idl from './aldorIdl.js';

export interface AgentRegistryRecord {
  owner: string;
  name: string;
  category: string;
  priceMicroStablecoin: string;
  snsDomain: string;
  reputationBps: string;
  totalJobs: string;
  successfulJobs: string;
  active: boolean;
  isRecursive: boolean;
  capabilities: string[];
  registeredAt: string;
  umbraStealthPublicKey?: string;
}

function getProgramId(env: NodeJS.ProcessEnv): PublicKey | null {
  const programId = env.ALDOR_PROGRAM_ID;
  if (!programId || programId === '11111111111111111111111111111111') {
    return null;
  }
  try {
    return new PublicKey(programId);
  } catch {
    return null;
  }
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

export async function fetchAgentRegistry(
  connection: Connection,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AgentRegistryRecord[]> {
  const programId = getProgramId(env);
  if (!programId) return [];

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

  return accounts.map((accountInfo) => {
    const decoded = coder.decode('AgentAccount', accountInfo.account.data) as any;
    const owner = String(decoded.owner ?? decoded.owner?.toBase58?.() ?? '');
    const snsDomain = String(decoded.sns_domain ?? decoded.snsDomain ?? '');
    const stealthKey = getStealthKeyForDomain(snsDomain, env);
    const rawCapabilities = Array.isArray(decoded.capabilities) ? decoded.capabilities : [];
    const capabilities = rawCapabilities.map((cap: any) => String(cap ?? '')).filter((cap: string) => cap.length > 0);

    const umbraKey = decoded.umbra_stealth_key ?? decoded.umbraStealthKey;
    const umbraStealthPublicKey = umbraKey ? bs58.encode(Buffer.from(umbraKey)) : stealthKey;

    return {
      owner,
      name: String(decoded.name ?? ''),
      category: String(decoded.category ?? ''),
      priceMicroStablecoin: String(decoded.price_micro_stablecoin ?? decoded.priceMicroStablecoin ?? 0),
      snsDomain,
      reputationBps: String(decoded.reputation_bps ?? decoded.reputationBps ?? 0),
      totalJobs: String(decoded.total_jobs ?? decoded.totalJobs ?? 0),
      successfulJobs: String(decoded.successful_jobs ?? decoded.successfulJobs ?? 0),
      active: Boolean(decoded.active ?? false),
      isRecursive: Boolean(decoded.is_recursive ?? decoded.isRecursive ?? false),
      capabilities,
      registeredAt: String(decoded.registered_at ?? decoded.registeredAt ?? 0),
      umbraStealthPublicKey,
    };
  });
}

export async function fetchAgentRegistryByDomain(
  domain: string,
  connection: Connection,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AgentRegistryRecord | null> {
  const records = await fetchAgentRegistry(connection, env);
  return records.find((record) => record.snsDomain === domain) ?? null;
}

export function createReadonlyProvider(connection: Connection): AnchorProvider {
  const wallet = new Wallet(Keypair.generate());
  return new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions());
}
