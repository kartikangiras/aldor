import { Connection } from '@solana/web3.js';
import { runQvacEmbedding } from './qvac.js';

export interface IntegrationProbe {
  name: string;
  ok: boolean;
  detail: string;
}

async function probeSns(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  const domain = env.SNS_DIAGNOSTIC_DOMAIN ?? 'toly';
  const rpcUrl = env.SNS_TEST_RPC_URL ?? env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  try {
    const mod = await import('@bonfida/spl-name-service');
    const getDomainKey = (mod as any).getDomainKey ?? (mod as any).getDomainKeySync;
    const NameRegistryState = (mod as any).NameRegistryState;
    if (!getDomainKey || !NameRegistryState?.retrieve) {
      return { name: 'sns', ok: false, detail: 'Bonfida SDK exports missing getDomainKey/NameRegistryState.retrieve' };
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    const domainKeyResult = await getDomainKey(domain);
    const pubkey = domainKeyResult?.pubkey ?? domainKeyResult;
    const retrieved = await NameRegistryState.retrieve(connection, pubkey);
    const owner = retrieved?.nftOwner?.toBase58?.() ?? retrieved?.registry?.owner?.toBase58?.();
    if (!owner) {
      return { name: 'sns', ok: false, detail: `Domain resolved but owner missing shape for ${domain}.sol` };
    }
    return { name: 'sns', ok: true, detail: `${domain}.sol owner=${owner}` };
  } catch (error: any) {
    return { name: 'sns', ok: false, detail: error?.message ?? String(error) };
  }
}

async function probeUmbra(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  const moduleName = env.UMBRA_SDK_MODULE ?? 'umbra-sdk';
  try {
    const mod = await import(moduleName);
    const hasSend = Boolean((mod as any)?.send ?? (mod as any)?.default?.send ?? (mod as any)?.Umbra?.send);
    const hasClientPath = Boolean((mod as any)?.getUmbraClient ?? (mod as any)?.default?.getUmbraClient);
    if (!hasSend && !hasClientPath) {
      return { name: 'umbra', ok: false, detail: `Module ${moduleName} loaded but lacks send/getUmbraClient` };
    }
    return { name: 'umbra', ok: true, detail: `Module ${moduleName} loaded (send=${hasSend}, clientPath=${hasClientPath})` };
  } catch (error: any) {
    return { name: 'umbra', ok: false, detail: error?.message ?? String(error) };
  }
}

async function probeDodo(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  try {
    const { probeDodoAuth } = await import('../../sdk/src/dodo.js');
    const result = await probeDodoAuth(env);

    if (result.ok) {
      return { name: 'dodo', ok: true, detail: `API reachable (${result.mode} mode, pattern: ${result.workingPattern})` };
    }

    if (result.lastStatus === 401 || result.lastStatus === 403) {
      return {
        name: 'dodo',
        ok: false,
        detail: `API key auth failed (${result.lastStatus}). ${result.lastError}. ` +
          `Fix: 1) Create a new API key in Dodo dashboard with Payments read+write, 2) Update DODO_API_KEY in server/.env, 3) Restart server.`,
      };
    }

    return { name: 'dodo', ok: false, detail: result.lastError };
  } catch (error: any) {
    return { name: 'dodo', ok: false, detail: error?.message ?? String(error) };
  }
}

async function probeCovalent(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  try {
    const key = env.COVALENT_API_KEY;
    if (!key || key === 'replace_me') {
      return { name: 'covalent', ok: false, detail: 'COVALENT_API_KEY missing or placeholder' };
    }
    const base = (env.COVALENT_BASE_URL ?? 'https://api.covalenthq.com/v1').replace(/\/$/, '');
    const chain = env.COVALENT_SOLANA_CHAIN ?? 'solana-mainnet';
    const address = env.COVALENT_TEST_ADDRESS ?? '11111111111111111111111111111111';
    const url = `${base}/${chain}/address/${address}/balances_v2/?key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    const text = await response.text();
    if (!response.ok) {
      return { name: 'covalent', ok: false, detail: `status=${response.status} body=${text.slice(0, 220)}` };
    }
    return { name: 'covalent', ok: true, detail: `status=${response.status}` };
  } catch (error: any) {
    return { name: 'covalent', ok: false, detail: error?.message ?? String(error) };
  }
}

async function probeQvac(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  try {
    if ((env.QVAC_EMBED_ENABLED ?? 'false').toLowerCase() !== 'true') {
      return { name: 'qvac', ok: false, detail: 'QVAC_EMBED_ENABLED is false' };
    }
    const vectors = await runQvacEmbedding(['diagnostics']);
    if (!Array.isArray(vectors) || vectors.length === 0 || !Array.isArray(vectors[0])) {
      return { name: 'qvac', ok: false, detail: 'Embedding output malformed' };
    }
    return { name: 'qvac', ok: true, detail: `vectors=${vectors.length} dim=${vectors[0].length}` };
  } catch (error: any) {
    return { name: 'qvac', ok: false, detail: error?.message ?? String(error) };
  }
}

export async function runIntegrationDiagnostics(env: NodeJS.ProcessEnv = process.env): Promise<{
  ok: boolean;
  probes: IntegrationProbe[];
}> {
  const probes = await Promise.all([
    probeSns(env),
    probeUmbra(env),
    probeDodo(env),
    probeCovalent(env),
    probeQvac(env),
  ]);
  return { ok: probes.every((p) => p.ok), probes };
}
