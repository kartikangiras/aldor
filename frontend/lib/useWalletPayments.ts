'use client';

import { useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import type { StepEvent } from '@/lib/types';
import { submitWalletPayment } from '@/lib/api';
import { signChallengeWithWallet } from '@/lib/walletSigner';

export function useWalletPayments() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const signingRef = useRef<Set<string>>(new Set());

  const handleWalletSignRequest = useCallback(async (event: StepEvent) => {
    if (event.type !== 'WALLET_SIGN_REQUESTED') return;
    if (!publicKey || !signTransaction || !sendTransaction || !connection) {
      console.warn('[WalletPayments] Wallet not connected, cannot sign');
      return;
    }

    let requestId: string | undefined;
    let challenge: any;
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

    if (signingRef.current.has(requestId)) {
      return; // Already signing this one
    }
    signingRef.current.add(requestId);

    try {
      const proof = await signChallengeWithWallet(
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
      console.log('[WalletPayments] Submitted payment for request', requestId);
    } catch (error: any) {
      console.error('[WalletPayments] Failed to sign/submit payment:', error);
    } finally {
      signingRef.current.delete(requestId);
    }
  }, [publicKey, signTransaction, sendTransaction, connection]);

  return { handleWalletSignRequest };
}
