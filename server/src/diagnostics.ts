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
    const key = env.DODO_API_KEY;
    if (!key || key === 'replace_me') {
      return { name: 'dodo', ok: false, detail: 'DODO_API_KEY missing or placeholder' };
    }

    const productId = env.DODO_PRODUCT_ID;
    if (!productId) {
      // Key is present but product ID is missing — auth might be valid but we can't test a real payment.
      // Do a lightweight GET to check auth rather than a POST.
      const base = (env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com').replace(/\/$/, '');
      const listUrl = `${base}/v1/payments?limit=1`;
      const listResp = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      });
      const listText = await listResp.text();
      console.log('[DODO DIAG LIST RAW]', {
        status: listResp.status,
        headers: Object.fromEntries(listResp.headers.entries()),
        body: listText,
      });
      if (listResp.status === 401 || listResp.status === 403) {
        return {
          name: 'dodo',
          ok: false,
          detail: `API key auth failed (${listResp.status}): RBAC access denied. Rotate the key or grant Payments permissions in the Dodo dashboard. Also set DODO_PRODUCT_ID.`,
        };
      }
      if (!listResp.ok) {
        return { name: 'dodo', ok: false, detail: `DODO_PRODUCT_ID missing and list check failed: status=${listResp.status} body=${listText.slice(0, 200)}` };
      }
      return { name: 'dodo', ok: false, detail: 'DODO_PRODUCT_ID is not set. Create a product in the Dodo dashboard and set DODO_PRODUCT_ID in server/.env.' };
    }

    // Full checkout test when product ID is available
    const base = (env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com').replace(/\/$/, '');
    const response = await fetch(`${base}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_link: true,
        customer: { email: env.DODO_CUSTOMER_EMAIL ?? 'diag@aldor.local', name: 'Diagnostics' },
        billing: { country: 'US' },
        product_cart: [{ product_id: productId, quantity: 1, amount: 100 }],
        metadata: { diagnostics: 'true' },
      }),
    });
    const text = await response.text();
    console.log('[DODO DIAG CHECKOUT RAW]', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    });
    if (response.status === 401 || response.status === 403) {
      return {
        name: 'dodo',
        ok: false,
        detail: `API key auth failed (${response.status}): RBAC access denied. Rotate DODO_API_KEY or grant Payments write access in the Dodo dashboard.`,
      };
    }
    if (!response.ok) {
      return { name: 'dodo', ok: false, detail: `status=${response.status} body=${text.slice(0, 220)}` };
    }
    return { name: 'dodo', ok: true, detail: `status=${response.status}` };
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
    // Use balances_v2 for a more reliable Solana health check
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
