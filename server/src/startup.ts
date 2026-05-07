import { AGENTS } from './agents.js';
import { serverConfig } from './config.js';
import { getAgentWalletMap, isValidSolanaAddress } from './wallets.js';
import { getUmbraSecretForDomain } from './umbra.js';

export function assertStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  const issues: string[] = [];

  if (!env.SOLANA_RPC_URL) issues.push('Missing SOLANA_RPC_URL');
  const cluster = (env.SOLANA_CLUSTER ?? 'devnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'devnet';
  const hasPalmMint = Boolean(env.PALM_USD_MINT)
    || (cluster === 'mainnet' && Boolean(env.PALM_USD_MINT_MAINNET))
    || (cluster === 'devnet' && Boolean(env.PALM_USD_MINT_DEVNET));
  if (!hasPalmMint) issues.push('Missing PALM_USD_MINT (or PALM_USD_MINT_DEVNET/MAINNET)');

  if (serverConfig.paymentMode === 'server') {
    if (!env.ALDOR_PAYER_SECRET_KEY) {
      issues.push('Missing ALDOR_PAYER_SECRET_KEY for server payment mode');
    }
  }

  if (serverConfig.paymentMode === 'wallet') {
    const walletMap = getAgentWalletMap(env);
    if (Object.keys(walletMap).length === 0) {
      issues.push('Missing ALDOR_AGENT_WALLET_MAP entries for wallet payment mode');
    }

    for (const agent of AGENTS) {
      const wallet = walletMap[agent.domain];
      if (!wallet) {
        issues.push(`Missing wallet entry for ${agent.domain}`);
        continue;
      }
      if (!isValidSolanaAddress(wallet)) {
        issues.push(`Invalid wallet address for ${agent.domain}`);
      }
    }
  }

  if (serverConfig.umbraEnabled) {
    for (const agent of AGENTS) {
      if (!getUmbraSecretForDomain(agent.domain, env)) {
        issues.push(`Missing Umbra secret for ${agent.domain}`);
      }
    }
  }

  if (issues.length > 0) {
    throw new Error(`Startup config invalid:\n- ${issues.join('\n- ')}`);
  }
}
