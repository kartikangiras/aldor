export type TokenKind = 'SOL' | 'PALM_USD';

export type StepEventType =
  | 'MANAGER_PLANNING'
  | 'PLAN_CREATED'
  | 'SNS_RESOLVING'
  | 'SNS_RESOLVED'
  | 'UMBRA_TRANSFER_INITIATED'
  | 'UMBRA_TRANSFER_CONFIRMED'
  | 'X402_SETTLED'
  | 'SPECIALIST_FAILED'
  | 'BUDGET_EXCEEDED'
  | 'RESULT_COMPOSED';

export interface StepEvent {
  type: StepEventType;
  timestamp: string;
  depth: number;
  spent?: number;
  agent?: string;
  domain?: string;
  cost?: number;
  token?: TokenKind;
  txSignature?: string;
  message?: string;
}

export interface AgentDefinition {
  name: string;
  domain: string;
  path: string;
  category: string;
  token: TokenKind;
  priceAtomic: number;
  recursive: boolean;
  reputation: number;
  description: string;
}

export interface PaymentProofV1 {
  umbraSignature: string;
  umbraEphemeralKey: string;
  payer?: string;
  timestamp?: number;
}

export interface MiddlewareConfig {
  priceAtomic: number;
  tokenKind: TokenKind;
  snsDomain: string;
  recipientWallet?: string;
  paymentMode?: 'server' | 'wallet';
  description: string;
  resourcePath: string;
}

export interface X402Challenge {
  x402Version: number;
  recipient: string;
  amount: string;
  asset: string;
  network: 'solana-devnet';
  expiresAt: number;
  description: string;
  resource: string;
  paymentMode?: 'server' | 'wallet';
  recipientWallet?: string;
  mint?: string;
  decimals?: number;
}
