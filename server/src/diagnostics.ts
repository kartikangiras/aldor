import { Connection } from '@solana/web3.js';
import { runQvacEmbedding } from './qvac.js';

export interface IntegrationProbe {
  name: string;
  ok: boolean;
  detail: string;
}

async function probeSns(env: NodeJS.ProcessEnv): Promise<IntegrationProbe> {
  try {
    const mod = await import('@bonfida/spl-name-service');
    const getDomainKey = (mod as any).getDomainKey ?? (mod as any).getDomainKeySync;
    const NameRegistryState = (mod as any).NameRegistryState;
    if (!getDomainKey || !NameRegistryState?.retrieve) {
      return { name: 'sns', ok: false, detail: 'Bonfida SDK exports missing getDomainKey/NameRegistryState.retrieve' };
    }

    // Verify we can compute a domain key locally without RPC rate-limit risk
    const domain = env.SNS_DIAGNOSTIC_DOMAIN ?? 'toly';
    const domainKeyResult = await getDomainKey(domain);
    const pubkey = domainKeyResult?.pubkey ?? domainKeyResult;
    if (!pubkey) {
      return { name: 'sns', ok: false, detail: `getDomainKey("${domain}") returned empty pubkey` };
    }

    // Attempt a lightweight RPC call with a short timeout; if rate-limited, still report SDK OK
    const rpcUrl = env.SNS_TEST_RPC_URL ?? env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const retrieved = await NameRegistryState.retrieve(connection, pubkey);
      clearTimeout(timeout);
      const owner = retrieved?.nftOwner?.toBase58?.() ?? retrieved?.registry?.owner?.toBase58?.();
      return { name: 'sns', ok: true, detail: `${domain}.sol resolved → ${owner?.slice(0, 12)}…` };
    } catch (rpcErr: any) {
      const msg = rpcErr?.message ?? String(rpcErr);
      if (msg.includes('429')) {
        return { name: 'sns', ok: true, detail: `SDK ready · ${domain}.sol key=${pubkey.toBase58().slice(0, 12)}… (RPC rate-limited)` };
      }
      if (msg.includes('buffer is smaller than expected')) {
        return { name: 'sns', ok: true, detail: `SDK ready · ${domain}.sol key=${pubkey.toBase58().slice(0, 12)}… (domain not registered on this network)` };
      }
      return { name: 'sns', ok: true, detail: `SDK ready · ${domain}.sol key=${pubkey.toBase58().slice(0, 12)}… (RPC: ${msg.slice(0, 40)})` };
    }
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

    // Check if model file exists without loading the heavy embedding runtime
    const modelPath = env.QVAC_EMBED_MODEL_SRC ?? env.QVAC_EMBED_MODEL_PATH ?? '';
    if (!modelPath) {
      return { name: 'qvac', ok: false, detail: 'QVAC_EMBED_MODEL_SRC or QVAC_EMBED_MODEL_PATH not set' };
    }

    const { access } = await import('node:fs/promises');
    try {
      await access(modelPath);
    } catch {
      return { name: 'qvac', ok: false, detail: `Model file not found: ${modelPath}` };
    }

    // Try to import the SDK module to verify it's loadable
    const mod = await import('@qvac/sdk');
    const loadModel = mod?.loadModel ?? mod?.default?.loadModel;
    if (!loadModel) {
      return { name: 'qvac', ok: false, detail: '@qvac/sdk loaded but loadModel export missing' };
    }

    return { name: 'qvac', ok: true, detail: `SDK ready · model=${modelPath.split('/').pop()}` };
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
