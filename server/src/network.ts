import { serverConfig } from './config.js';

export interface PerRequestNetworkConfig {
  solanaRpcUrl: string;
  solanaCluster: 'mainnet' | 'devnet';
  covalentChain: string;
  explorerCluster: string;
}

const MAINNET_RPC = process.env.SOLANA_RPC_URL_MAINNET ?? 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com';

export function resolveNetworkConfig(networkHint?: string): PerRequestNetworkConfig {
  const network = (networkHint ?? serverConfig.solanaCluster).toLowerCase();
  const isMainnet = network === 'mainnet';

  return {
    solanaRpcUrl: isMainnet ? MAINNET_RPC : DEVNET_RPC,
    solanaCluster: isMainnet ? 'mainnet' : 'devnet',
    covalentChain: isMainnet ? 'solana-mainnet' : 'solana-devnet',
    explorerCluster: isMainnet ? '?cluster=mainnet' : '?cluster=devnet',
  };
}

export function networkFromRequest(req: { headers?: { [key: string]: string | string[] | undefined }; query?: { network?: string | string[] } }): PerRequestNetworkConfig {
  const headerNetwork = req.headers?.['x-aldor-network'];
  const queryNetwork = req.query?.network;
  const hint = typeof headerNetwork === 'string' ? headerNetwork : typeof queryNetwork === 'string' ? queryNetwork : undefined;
  return resolveNetworkConfig(hint);
}
