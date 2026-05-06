import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { buildPalmUsdTransferTx } from './palmUsd.js';
import { executeUmbraTransfer } from './umbra.js';
import { resolveRecipientStealthKey } from './sns.js';
import type { PaymentProof, PaymentSignerOptions, X402Accept } from './types.js';

function parseAmountToBigInt(value: string): bigint {
  return BigInt(value);
}

function parseAssetKind(asset: string): 'SOL' | 'PALM_USD' {
  return asset === 'SOL' ? 'SOL' : 'PALM_USD';
}

export class PaymentSigner {
  private readonly connection: Connection;
  private readonly payer: Keypair;
  private readonly palmUsdMint: PublicKey;
  private readonly commitment: 'processed' | 'confirmed' | 'finalized';
  private readonly registryProgramId?: PublicKey;

  constructor(options: PaymentSignerOptions) {
    this.connection = options.connection;
    this.payer = Keypair.fromSecretKey(options.keypairSecretKey);
    this.palmUsdMint = options.palmUsdMint;
    this.commitment = options.commitment ?? 'confirmed';
    this.registryProgramId = options.registryProgramId;
  }

  async signChallenge(challenge: X402Accept): Promise<PaymentProof> {
    const amountRaw = parseAmountToBigInt(challenge.maxAmountRequired);
    const kind = parseAssetKind(challenge.asset);

    let tx: Transaction;
    if (kind === 'SOL') {
      const payTo = new PublicKey(challenge.payTo);
      tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.payer.publicKey,
          toPubkey: payTo,
          lamports: Number(amountRaw),
        }),
      );
    } else {
      const stealthKey = await resolveRecipientStealthKey(challenge.payTo, this.connection, process.env);
      const result = await executeUmbraTransfer({
        connection: this.connection,
        payer: this.payer,
        stealthPublicKey: stealthKey,
        assetMint: this.palmUsdMint,
        amount: amountRaw,
      });

      return {
        signature: result.signature,
        ephemeralKey: result.ephemeralKey ?? this.payer.publicKey.toBase58(),
        payer: this.payer.publicKey.toBase58(),
        amount: challenge.maxAmountRequired,
        asset: challenge.asset,
        resource: challenge.resource,
      };
    }

    tx.feePayer = this.payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash(this.commitment)).blockhash;
    tx.sign(this.payer);

    const signature = await this.connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: this.commitment,
    });

    await this.connection.confirmTransaction(signature, this.commitment);

    return {
      signature,
      ephemeralKey: this.payer.publicKey.toBase58(),
      payer: this.payer.publicKey.toBase58(),
      amount: challenge.maxAmountRequired,
      asset: challenge.asset,
      resource: challenge.resource,
    };
  }
}
