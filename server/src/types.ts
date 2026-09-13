import type { AxiosRequestConfig, AxiosResponse } from 'axios';

export type SolanaNetwork = 'solana:devnet' | 'solana:testnet' | 'solana:mainnet';

export interface X402Requirements {
  amount: number;
  currency: string;
  recipient: string;
  network: SolanaNetwork | string;
  facilitator?: string;
  memo?: string;
}

export interface X402Handshake {
  requirements: X402Requirements;
  rawHeader: string;
}

export interface PaymentProof {
  signature: string;
  requestUrl: string;
  network: string;
  amount: number;
  currency: string;
  recipient: string;
}

export interface AldorRequestConfig extends AxiosRequestConfig {
  paymentProofHeader?: string;
}

export interface PaidResponse<T = unknown> extends AxiosResponse<T> {
  paymentProof?: PaymentProof;
}
