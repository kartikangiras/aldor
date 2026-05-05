import { PublicKey } from '@solana/web3.js';

export function getAgentWalletMap(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const raw = env.ALDOR_AGENT_WALLET_MAP;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getAgentWalletForDomain(domain: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const map = getAgentWalletMap(env);
  return map[domain];
}

export function isValidSolanaAddress(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}
