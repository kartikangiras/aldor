export type StepEventType =
  | 'MANAGER_PLANNING'
  | 'PLAN_CREATED'
  | 'SNS_RESOLVING'
  | 'SNS_RESOLVED'
  | 'UMBRA_TRANSFER_INITIATED'
  | 'UMBRA_TRANSFER_CONFIRMED'
  | 'X402_SETTLED'
  | 'X402_CHALLENGE'
  | 'X402_PAYMENT_SENT'
  | 'AGENT_RESPONDED'
  | 'SPECIALIST_FAILED'
  | 'BUDGET_EXCEEDED'
  | 'MAX_DEPTH_EXCEEDED'
  | 'RESULT_COMPOSED'
  | 'A2A_HIRE_INITIATED'
  | 'A2A_HIRE_COMPLETED'
  | 'REPUTATION_CHECK'
  | 'WALLET_SIGN_REQUESTED'
  | 'WALLET_SIGN_CONFIRMED'
  | 'QVAC_EMBEDDING'
  | 'QVAC_EMBEDDING_FAILED'
  | 'QVAC_MATCHED'
  | 'QVAC_SKIPPED';

export interface StepEvent {
  type: StepEventType;
  timestamp: string;
  depth: number;
  spent?: number;
  agent?: string;
  domain?: string;
  cost?: number;
  token?: string;
  txSignature?: string;
  message?: string;
  requestId?: string;
  jobId?: string;
  parentJobId?: string;
  sessionId?: string;
}

export interface AgentDefinition {
  name: string;
  snsDomain: string;
  path: string;
  category: string;
  token: string;
  priceAtomic: number;
  recursive: boolean;
  reputation?: number;
  description: string;
}

export interface RegistryAgent {
  snsDomain: string;
  name: string;
  category: string;
  priceMicroStablecoin: number | string;
  reputation: number | string;
  isRecursive: boolean;
  isActive: boolean;
  capabilities: string[];
  description?: string;
  stablecoinBalance?: string;
  walletAddress?: string;
  owner?: string;
  token?: string;
}

export interface PaymentItem {
  id: string;
  fromAgent: string;
  toAgent: string;
  amount: number;
  token: string;
  depth: number;
  txSignature: string;
  timestamp: string;
}

export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  uniqueAgents: number;
}

export interface RecentTransaction {
  address: string;
  hash: string;
  timestamp: string;
  kind: string;
}

export interface DodoFundResponse {
  payment: string;
}

export interface DodoOfframpResponse {
  invoiceId: string;
}

export interface X402Accept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description?: string;
  mimeType?: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  asset: string;
}

export interface X402Challenge {
  x402Version: number;
  recipient: string;
  amount: string;
  asset: string;
  network: string;
  expiresAt: number;
  description: string;
  resource: string;
  paymentMode?: 'server' | 'wallet';
  recipientWallet?: string;
  mint?: string;
  decimals?: number;
}

export function isValidSolanaAddress(value: string): boolean {
  try {
    const { PublicKey } = require('@solana/web3.js');
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

export interface PaymentProof {
  signature: string;
  ephemeralKey?: string;
  payer: string;
  amount: string;
  asset: string;
  resource: string;
}
