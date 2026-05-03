const DEFAULT_PROGRAM_ID = '11111111111111111111111111111111';
const DEFAULT_RPC_URL = 'https://api.devnet.solana.com';
const DEFAULT_SERVER_BASE_URL = 'http://localhost:3000';
const DEFAULT_PALM_USD_MINT = 'So11111111111111111111111111111111111111112';

export interface AldorServerConfig {
  aldorProgramId: string;
  solanaRpcUrl: string;
  palmUsdMint: string;
  mockPayments: boolean;
  serverBaseUrl: string;
  payerSecretKey: string;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): AldorServerConfig {
  return {
    aldorProgramId: env.ALDOR_PROGRAM_ID ?? DEFAULT_PROGRAM_ID,
    solanaRpcUrl: env.SOLANA_RPC_URL ?? DEFAULT_RPC_URL,
    palmUsdMint: env.PALM_USD_MINT ?? DEFAULT_PALM_USD_MINT,
    mockPayments: (env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true',
    serverBaseUrl: env.SERVER_BASE_URL ?? DEFAULT_SERVER_BASE_URL,
    payerSecretKey: env.ALDOR_PAYER_SECRET_KEY ?? '',
  };
}

export const serverConfig = loadServerConfig();
