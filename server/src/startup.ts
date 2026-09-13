import { AGENTS } from './agents.js';
import { serverConfig } from './config.js';
import { getAgentWalletMap, isValidSolanaAddress } from './wallets.js';
import { getUmbraSecretForDomain } from './umbra.js';

export function assertStartupConfig(env: NodeJS.ProcessEnv = process.env): void {
  const issues: string[] = [];

  if (!env.SOLANA_RPC_URL) issues.push('Missing SOLANA_RPC_URL');

  if (serverConfig.paymentMode === 'server') {
    if (!env.ALDOR_PAYER_SECRET_KEY) {
      issues.push(
        'Missing ALDOR_PAYER_SECRET_KEY for server payment mode. ' +
        'Either set ALDOR_PAYMENT_MODE=wallet or provide a payer secret key.'
      );
    }
  }

  if (serverConfig.paymentMode === 'wallet') {
    const walletMap = getAgentWalletMap(env);
    if (Object.keys(walletMap).length === 0) {
      issues.push(
        'Missing ALDOR_AGENT_WALLET_MAP entries for wallet payment mode. ' +
        'If your .env file is not being loaded, run with: node --env-file=server/.env dist/server/src/main.js'
      );
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
    const missingUmbra: string[] = [];
    for (const agent of AGENTS) {
      if (!getUmbraSecretForDomain(agent.domain, env)) {
        missingUmbra.push(agent.domain);
      }
    }
    if (missingUmbra.length > 0) {
      console.warn(
        `[Startup] Umbra is enabled but secrets are missing for ${missingUmbra.length} agent(s). ` +
        `Set ALDOR_UMBRA_SECRET_MAP or individual ALDOR_UMBRA_SECRET_* env vars. ` +
        `Missing: ${missingUmbra.join(', ')}`
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(`Startup config invalid:\n- ${issues.join('\n- ')}`);
  }
}
