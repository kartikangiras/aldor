import { PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
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

  // Validate recipient address
  let recipient: PublicKey;
  try {
    recipient = new PublicKey(challenge.payTo);
  } catch {
    throw new Error(
      `Invalid recipient address: "${challenge.payTo}". ` +
      `Expected a valid Solana base58 public key. ` +
      `This usually means the agent's wallet address is not configured on the backend.`
    );
  }

  const tx = new Transaction();

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
    let mint: PublicKey;
    try {
      mint = new PublicKey(challenge.asset);
    } catch {
      throw new Error(
        `Invalid SPL token mint address: "${challenge.asset}". ` +
        `Expected a valid Solana base58 mint address.`
      );
    }

    const tokenName = challenge.asset === '6q9nuLJcMgJEVAZuC3hZAgZX5LnwM8Jbeqc3qGuKsWm5'
      ? 'PALM_USD'
      : challenge.asset === 'HU59RWU1di1ez7XD8awcb9WJD1hfHNTYcv67nBDbboxJ'
      ? 'PALM_USD (devnet)'
      : 'SPL Token';

    const senderAta = getAssociatedTokenAddressSync(mint, publicKey);
    const recipientAta = getAssociatedTokenAddressSync(mint, recipient);

    // Check sender balance first
    try {
      const senderAccount = await connection.getTokenAccountBalance(senderAta);
      const senderBalance = BigInt(senderAccount.value.amount);
      if (senderBalance < amount) {
        throw new Error(
          `Insufficient ${tokenName} balance. ` +
          `You have ${senderAccount.value.uiAmountString ?? '0'} but need ${(Number(amount) / 1_000_000).toFixed(4)} ${tokenName}. ` +
          `Fund your wallet with this token first.`
        );
      }
    } catch (error: any) {
      if (error?.message?.includes('Insufficient')) throw error;
      // Sender ATA doesn't exist — they have 0 balance
      throw new Error(
        `You don't have any ${tokenName} tokens in your wallet. ` +
        `Your Associated Token Account doesn't exist on this network. ` +
        `To fix this:\n` +
        `1. Ensure you're on the correct network (devnet/mainnet)\n` +
        `2. Fund your wallet with ${tokenName}\n` +
        `3. Or switch to an agent that accepts SOL instead`
      );
    }

    // Only add ATA creation instruction if recipient doesn't have one yet
    // This keeps the tx smaller and avoids Phantom showing confusing "Create Account" UI
    const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
    if (!recipientAtaInfo) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          recipientAta,
          recipient,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    // Transfer tokens
    tx.add(
      createTransferInstruction(senderAta, recipientAta, publicKey, Number(amount)),
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = publicKey;

  // Pre-simulate to catch errors before opening Phantom
  try {
    const simulation = await connection.simulateTransaction(tx);
    if (simulation.value.err) {
      const logs = simulation.value.logs?.slice(-3).join('\n') ?? 'Unknown simulation error';
      throw new Error(`Transaction simulation failed: ${logs}`);
    }
  } catch (simError: any) {
    if (simError?.message?.includes('Insufficient')) throw simError;
    // Ignore simulation errors that are just RPC issues
  }

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
