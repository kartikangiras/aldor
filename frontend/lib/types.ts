export type StepEventType =
  | 'MANAGER_PLANNING'
  | 'PLAN_CREATED'
  | 'SNS_RESOLVING'
  | 'SNS_RESOLVED'
  | 'UMBRA_TRANSFER_INITIATED'
  | 'UMBRA_TRANSFER_CONFIRMED'
  | 'X402_SETTLED'
  | 'AGENT_RESPONDED'
  | 'SPECIALIST_FAILED'
  | 'BUDGET_EXCEEDED'
  | 'MAX_DEPTH_EXCEEDED'
  | 'RESULT_COMPOSED';

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
