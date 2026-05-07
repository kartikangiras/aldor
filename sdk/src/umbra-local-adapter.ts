import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, createTransferInstruction } from '@solana/spl-token';

interface SendParams {
  connection: Connection;
  payer: Keypair;
  stealthPublicKey: string;
  assetMint: PublicKey;
  amount: bigint;
}

interface VerifyParams {
  connection: Connection;
  receiverSecretKey: Uint8Array;
  assetMint: PublicKey;
  expectedAmount: bigint;
  signature: string;
}

export async function send(params: SendParams): Promise<{ signature: string; ephemeralKey: string }> {
  const recipient = new PublicKey(params.stealthPublicKey);
  const fromAta = getAssociatedTokenAddressSync(params.assetMint, params.payer.publicKey);
  const toAta = getAssociatedTokenAddressSync(params.assetMint, recipient);

  const tx = new Transaction().add(
    createTransferInstruction(
      fromAta,
      toAta,
      params.payer.publicKey,
      Number(params.amount),
    ),
  );

  tx.feePayer = params.payer.publicKey;
  tx.recentBlockhash = (await params.connection.getLatestBlockhash('confirmed')).blockhash;
  tx.sign(params.payer);
  const signature = await params.connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  await params.connection.confirmTransaction(signature, 'confirmed');
  return {
    signature,
    ephemeralKey: params.payer.publicKey.toBase58(),
  };
}

export async function verifyTransfer(params: VerifyParams): Promise<boolean> {
  const tx = await params.connection.getParsedTransaction(params.signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) {
    return false;
  }

  const receiver = Keypair.fromSecretKey(params.receiverSecretKey).publicKey;
  const receiverAta = getAssociatedTokenAddressSync(params.assetMint, receiver).toBase58();

  for (const ix of tx.transaction.message.instructions as any[]) {
    const info = ix?.parsed?.info;
    if (!info) continue;
    const mint = String(info?.mint ?? '');
    const destination = String(info?.destination ?? '');
    const amount = info?.tokenAmount?.amount !== undefined
      ? BigInt(String(info.tokenAmount.amount))
      : BigInt(String(info?.amount ?? 0));

    if (
      mint === params.assetMint.toBase58() &&
      destination === receiverAta &&
      amount >= params.expectedAmount
    ) {
      return true;
    }
  }

  return false;
}

export async function scan(): Promise<Array<Record<string, unknown>>> {
  return [];
}
