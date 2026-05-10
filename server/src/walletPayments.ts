import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { PaymentProofV1, X402Challenge } from './eventtypes.js';

interface PendingWalletPayment {
  requestId: string;
  challenge: X402Challenge;
  resolve: (proof: PaymentProofV1) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingPayments = new Map<string, PendingWalletPayment>();

export function requestWalletPayment(
  challenge: X402Challenge,
  emitter: EventEmitter,
  sessionId?: string,
  timeoutMs = 120_000,
): Promise<PaymentProofV1> {
  const requestId = randomUUID();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingPayments.delete(requestId);
      reject(new Error(`Wallet payment timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    pendingPayments.set(requestId, {
      requestId,
      challenge,
      resolve,
      reject,
      timeout,
    });

    emitter.emit('step', {
      type: 'WALLET_SIGN_REQUESTED',
      timestamp: new Date().toISOString(),
      depth: 0,
      message: JSON.stringify({ requestId, challenge }),
      requestId,
      sessionId,
    });
  });
}

export function fulfillWalletPayment(
  requestId: string,
  proof: PaymentProofV1,
): boolean {
  const pending = pendingPayments.get(requestId);
  if (!pending) {
    return false;
  }

  clearTimeout(pending.timeout);
  pending.resolve(proof);
  pendingPayments.delete(requestId);
  return true;
}

export function cancelWalletPayment(requestId: string, reason: string): boolean {
  const pending = pendingPayments.get(requestId);
  if (!pending) {
    return false;
  }

  clearTimeout(pending.timeout);
  pending.reject(new Error(reason));
  pendingPayments.delete(requestId);
  return true;
}

export function listPendingPayments(): Array<{ requestId: string; challenge: X402Challenge; sessionId?: string }> {
  return Array.from(pendingPayments.values()).map((p) => ({
    requestId: p.requestId,
    challenge: p.challenge,
    sessionId: p.challenge.resource,
  }));
}
