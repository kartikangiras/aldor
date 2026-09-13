const DEFAULT_PROGRAM_ID = '11111111111111111111111111111111';
const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';
const DEFAULT_SERVER_BASE_URL = 'http://localhost:3002';
const DEFAULT_PAYMENT_MODE = 'wallet';

export type AldorPaymentMode = 'server' | 'wallet';

export interface AldorServerConfig {
  aldorProgramId: string;
  solanaRpcUrl: string;
  solanaCluster: 'devnet' | 'mainnet';
  mockPayments: boolean;
  serverBaseUrl: string;
  payerSecretKey: string;
  paymentMode: AldorPaymentMode;
  umbraEnabled: boolean;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): AldorServerConfig {
  const paymentMode = (env.ALDOR_PAYMENT_MODE ?? DEFAULT_PAYMENT_MODE).toLowerCase();
  const umbraEnabled = (env.UMBRA_ENABLED ?? 'true').toLowerCase() === 'true';
  const cluster = (env.SOLANA_CLUSTER ?? 'devnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'devnet';
  return {
    aldorProgramId: env.ALDOR_PROGRAM_ID ?? DEFAULT_PROGRAM_ID,
    solanaRpcUrl: env.SOLANA_RPC_URL ?? DEFAULT_RPC_URL,
    solanaCluster: cluster,
    mockPayments: (env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true',
    serverBaseUrl: env.SERVER_BASE_URL ?? DEFAULT_SERVER_BASE_URL,
    payerSecretKey: env.ALDOR_PAYER_SECRET_KEY ?? '',
    paymentMode: paymentMode === 'wallet' ? 'wallet' : 'server',
    umbraEnabled,
  };
}

export const serverConfig = loadServerConfig();
