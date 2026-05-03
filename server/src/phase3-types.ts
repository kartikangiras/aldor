export type TokenKind = 'SOL' | 'PALM_USD';

export type StepEventType =
  | 'MANAGER_PLANNING'
  | 'PLAN_CREATED'
  | 'SNS_RESOLVED'
  | 'X402_INITIATED'
  | 'X402_SETTLED'
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
  recipient: string;
  path: string;
  category: string;
  token: TokenKind;
  priceAtomic: number;
  recursive: boolean;
  reputation: number;
  description: string;
}

export interface PaymentProofV1 {
  signature: string;
  payer: string;
  amount: string;
  asset: string;
  resource: string;
}

export interface MiddlewareConfig {
  priceAtomic: number;
  tokenKind: TokenKind;
  recipient: string;
  description: string;
  resourcePath: string;
}

export interface X402Accept {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
}

export interface X402Challenge {
  x402Version: number;
  accepts: [X402Accept];
}
