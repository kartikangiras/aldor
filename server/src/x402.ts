import type { AxiosResponse } from 'axios';
import type { X402Handshake, X402Requirements } from './types.js';

export function parsePaymentRequiredHeader(response: AxiosResponse): X402Handshake {
  const header =
    response.headers['payment-required'] ??
    response.headers['x-payment-required'] ??
    response.headers['payment-requirement'];

  if (!header || typeof header !== 'string') {
    throw new Error('Missing X402 payment requirement header.');
  }

  const decoded = Buffer.from(header, 'base64').toString('utf8');
  const requirements = JSON.parse(decoded) as X402Requirements;

  return { requirements, rawHeader: header };
}

export function formatAtomicAmount(amount: number, currency: string): string {
  if (currency.toUpperCase() === 'SOL') return `${amount / 1_000_000_000} SOL`;
  if (currency.toUpperCase() === 'USDC') return `${amount / 1_000_000} USDC`;
  return `${amount} ${currency}`;
}
