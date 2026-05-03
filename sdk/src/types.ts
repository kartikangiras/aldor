import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import type { Connection, PublicKey } from '@solana/web3.js';

export type AssetKind = 'SOL' | 'PALM_USD';

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
  accepts: X402Accept[];
}

export interface PaymentProof {
  signature: string;
  payer: string;
  amount: string;
  asset: string;
  resource: string;
}

export interface PaymentSignerOptions {
  connection: Connection;
  keypairSecretKey: Uint8Array;
  palmUsdMint: PublicKey;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export interface BudgetPolicy {
  maxDepth: number;
  budgetRemaining: string;
}

export interface InterceptorOptions {
  signChallenge: (challenge: X402Accept) => Promise<PaymentProof>;
  budget: BudgetPolicy;
}

export interface AldorAxiosRequestConfig extends AxiosRequestConfig {
  _aldorRetried?: boolean;
}

export interface PaidResponse<T = unknown> extends AxiosResponse<T> {
  paymentProof?: PaymentProof;
}
