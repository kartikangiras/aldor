'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { StepEvent, X402Challenge, PaymentProof } from '@/lib/types';
import { submitWalletPayment, rejectWalletPayment } from '@/lib/api';
import { signChallengeWithWallet } from '@/lib/walletSigner';

export interface PendingPayment {
  requestId: string;
  challenge: X402Challenge;
  timestamp: string;
  agent?: string;
  status: 'pending' | 'signing' | 'submitted' | 'error' | 'rejected';
  error?: string;
  chosenMethod?: 'wallet' | 'dodo';
}

export function useWalletPaymentQueue() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);

  const addPaymentRequest = useCallback((event: StepEvent) => {
    if (event.type !== 'WALLET_SIGN_REQUESTED') return;

    let requestId: string | undefined;
    let challenge: X402Challenge | undefined;
    try {
      const parsed = JSON.parse(event.message ?? '{}');
      requestId = parsed.requestId;
      challenge = parsed.challenge;
    } catch {
      console.warn('[WalletPayments] Failed to parse wallet sign request');
      return;
    }

    if (!requestId || !challenge) {
      console.warn('[WalletPayments] Missing requestId or challenge');
      return;
    }

    setPendingPayments((prev) => {
      if (prev.some((p) => p.requestId === requestId)) return prev;
      return [...prev, {
        requestId,
        challenge,
        timestamp: event.timestamp,
        agent: event.agent,
        status: 'pending',
      }];
    });
  }, []);

  const removePayment = useCallback((requestId: string) => {
    setPendingPayments((prev) => prev.filter((p) => p.requestId !== requestId));
  }, []);

  const approvePayment = useCallback(async (requestId: string) => {
    if (!publicKey || !signTransaction || !sendTransaction || !connection) {
      setPendingPayments((prev) =>
        prev.map((p) =>
          p.requestId === requestId
            ? { ...p, status: 'error', error: 'Wallet not connected. Connect Phantom or Solflare first.' }
            : p
        )
      );
      return;
    }

    const payment = pendingPayments.find((p) => p.requestId === requestId);
    if (!payment) return;

    setPendingPayments((prev) =>
      prev.map((p) => (p.requestId === requestId ? { ...p, status: 'signing', error: undefined } : p))
    );

    try {
      const challenge = payment.challenge;
      const proof: PaymentProof = await signChallengeWithWallet(
        {
          scheme: 'exact',
          network: challenge.network,
          maxAmountRequired: challenge.amount,
          resource: challenge.resource,
          description: challenge.description,
          payTo: challenge.recipientWallet ?? challenge.recipient,
          asset: challenge.asset,
        },
        {
          publicKey,
          signTransaction,
          sendTransaction,
          connection,
        },
      );

      await submitWalletPayment(requestId, proof);

      setPendingPayments((prev) =>
        prev.map((p) => (p.requestId === requestId ? { ...p, status: 'submitted' } : p))
      );

      // Remove from queue after 3s
      setTimeout(() => {
        removePayment(requestId);
      }, 3000);
    } catch (error: any) {
      console.error('[WalletPayments] Failed to sign/submit payment:', error);
      const errorMessage = error?.message ?? 'Transaction failed';

      // User rejected in wallet — notify backend immediately
      if (
        errorMessage.includes('User rejected') ||
        errorMessage.includes('declined') ||
        errorMessage.includes('cancelled') ||
        errorMessage.includes('canceled') ||
        errorMessage.includes(' rejected')
      ) {
        try {
          await rejectWalletPayment(requestId, 'USER_REJECTED');
        } catch (e) {
          // Backend may have already timed out, ignore
        }
        setPendingPayments((prev) =>
          prev.map((p) =>
            p.requestId === requestId
              ? { ...p, status: 'rejected', error: 'You declined the transaction in your wallet.' }
              : p
          )
        );
        setTimeout(() => removePayment(requestId), 3000);
        return;
      }

      setPendingPayments((prev) =>
        prev.map((p) =>
          p.requestId === requestId
            ? { ...p, status: 'error', error: errorMessage }
            : p
        )
      );
    }
  }, [pendingPayments, publicKey, signTransaction, sendTransaction, connection, removePayment]);

  const rejectPayment = useCallback(async (requestId: string) => {
    // Notify backend immediately so it doesn't wait for timeout
    try {
      await rejectWalletPayment(requestId, 'USER_REJECTED');
    } catch (e) {
      // Backend may have already timed out, ignore
    }
    removePayment(requestId);
  }, [removePayment]);

  const chooseMethod = useCallback((requestId: string, method: 'wallet' | 'dodo') => {
    setPendingPayments((prev) =>
      prev.map((p) => (p.requestId === requestId ? { ...p, chosenMethod: method } : p))
    );
  }, []);

  const dismissPayment = useCallback((requestId: string) => {
    removePayment(requestId);
  }, [removePayment]);

  return {
    pendingPayments,
    addPaymentRequest,
    approvePayment,
    rejectPayment,
    dismissPayment,
    chooseMethod,
  };
}
