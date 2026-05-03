import { PublicKey } from '@solana/web3.js';

function getFallbackMap(env: NodeJS.ProcessEnv): Record<string, string> {
  const raw = env.ALDOR_SNS_FALLBACK_MAP;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    return {};
  }
}

export async function resolveAgent(domain: string, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  try {
    const mod = await import('@bonfida/spl-name-service');
    const resolver = (mod as any).resolve;
    if (typeof resolver === 'function') {
      const resolved = await resolver(domain);
      if (resolved) {
        const key = typeof resolved === 'string' ? resolved : String(resolved);
        return new PublicKey(key).toBase58();
      }
    }
  } catch {
    // fall back to env map below
  }

  const map = getFallbackMap(env);
  const fallback = map[domain] ?? env[`ALDOR_SNS_${domain.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`];
  if (!fallback) {
    throw new Error(`Unable to resolve domain '${domain}' via SNS or fallback map`);
  }

  return new PublicKey(fallback).toBase58();
}
