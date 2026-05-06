import { randomUUID } from 'node:crypto';
import type { TokenKind } from './eventtypes.js';

export interface PaymentRecord {
  id: string;
  timestamp: string;
  snsDomain: string;
  amountAtomic: number;
  token: TokenKind;
  depth: number;
  payer?: string;
  txSignature?: string;
  ephemeralKey?: string;
  paymentMode?: 'server' | 'wallet';
  sessionId?: string;
  requestId?: string;
  jobId?: string;
  parentJobId?: string;
  resource?: string;
  headers?: Record<string, string>;
}

export interface PaymentStats {
  totalPayments: number;
  uniqueAgents: number;
  uniquePayers: number;
  totalsByToken: Record<TokenKind, string>;
  byAgent: Record<string, number>;
  byDepth: Record<string, number>;
  lastPayment: PaymentRecord | null;
}

const MAX_PAYMENTS = 5_000;
const ledger: PaymentRecord[] = [];

function nowIso(): string {
  return new Date().toISOString();
}

export function recordPayment(input: Omit<PaymentRecord, 'id' | 'timestamp'>): PaymentRecord {
  const record: PaymentRecord = {
    id: randomUUID(),
    timestamp: nowIso(),
    ...input,
  };

  ledger.unshift(record);
  if (ledger.length > MAX_PAYMENTS) {
    ledger.pop();
  }

  return record;
}

export function listPayments(limit = 100, offset = 0): PaymentRecord[] {
  return ledger.slice(offset, offset + limit);
}

export function getPaymentStats(): PaymentStats {
  const totalsByToken: Record<TokenKind, bigint> = {
    SOL: BigInt(0),
    PALM_USD: BigInt(0),
  };
  const byAgent: Record<string, number> = {};
  const byDepth: Record<string, number> = {};
  const payers = new Set<string>();
  const agents = new Set<string>();

  for (const payment of ledger) {
    totalsByToken[payment.token] += BigInt(payment.amountAtomic);
    byAgent[payment.snsDomain] = (byAgent[payment.snsDomain] ?? 0) + 1;
    byDepth[String(payment.depth)] = (byDepth[String(payment.depth)] ?? 0) + 1;
    agents.add(payment.snsDomain);
    if (payment.payer) {
      payers.add(payment.payer);
    }
  }

  return {
    totalPayments: ledger.length,
    uniqueAgents: agents.size,
    uniquePayers: payers.size,
    totalsByToken: {
      SOL: totalsByToken.SOL.toString(),
      PALM_USD: totalsByToken.PALM_USD.toString(),
    },
    byAgent,
    byDepth,
    lastPayment: ledger[0] ?? null,
  };
}
