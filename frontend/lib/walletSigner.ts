import type { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import type { X402Accept, PaymentProof } from '@/lib/types';

export interface WalletSignerOptions {
  publicKey: PublicKey;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>;
  connection: Connection;
}

export async function signChallengeWithWallet(
  challenge: X402Accept,
  opts: WalletSignerOptions,
): Promise<PaymentProof> {
  const { publicKey, signTransaction, sendTransaction, connection } = opts;
  const amount = BigInt(challenge.maxAmountRequired);
  const isSol = challenge.asset === 'SOL';

  const { Transaction: SolTransaction, SystemProgram, PublicKey: SolPublicKey } = await import('@solana/web3.js');

  const tx = new SolTransaction();
  const recipient = new SolPublicKey(challenge.payTo);

  if (isSol) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipient,
        lamports: Number(amount),
      }),
    );
  } else {
    // SPL token transfer (PALM_USD)
    const mint = new SolPublicKey(challenge.asset);
    const senderAta = getAssociatedTokenAddressSync(mint, publicKey);
    const recipientAta = getAssociatedTokenAddressSync(mint, recipient);

    tx.add(
      createTransferInstruction(senderAta, recipientAta, publicKey, Number(amount)),
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = publicKey;

  const signed = await signTransaction(tx);
  const signature = await sendTransaction(signed, connection);

  // Wait for confirmation
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed',
  );

  return {
    signature,
    ephemeralKey: publicKey.toBase58(),
    payer: publicKey.toBase58(),
    amount: challenge.maxAmountRequired,
    asset: challenge.asset,
    resource: challenge.resource,
  };
}
