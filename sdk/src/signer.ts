import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import { buildPalmUsdTransferTx } from './palmUsd.js';
import { executeUmbraTransfer } from './umbra.js';
import { resolveAgent, resolveRecipientStealthKey } from './sns.js';
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

    console.log('[PaymentSigner] signChallenge', {
      asset: kind,
      amount: String(amountRaw),
      payTo: challenge.payTo,
      payer: this.payer.publicKey.toBase58(),
      resource: challenge.resource,
    });

    let tx: Transaction;
    if (kind === 'SOL') {
      let resolvedAddress: string;
      try {
        resolvedAddress = await resolveAgent(challenge.payTo, process.env);
        console.log('[PaymentSigner] Resolved SOL recipient', { domain: challenge.payTo, address: resolvedAddress });
      } catch (resolveError: any) {
        console.error('[PaymentSigner] Failed to resolve SOL recipient', { domain: challenge.payTo, error: resolveError?.message });
        throw new Error(
          `Cannot resolve SOL recipient '${challenge.payTo}'. ` +
          `Ensure ALDOR_AGENT_WALLET_MAP or ALDOR_SNS_FALLBACK_MAP contains this domain. ` +
          `Error: ${resolveError?.message ?? resolveError}`
        );
      }

      const payTo = new PublicKey(resolvedAddress);
      tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.payer.publicKey,
          toPubkey: payTo,
          lamports: Number(amountRaw),
        }),
      );
    } else {
      let stealthKey: string;
      try {
        stealthKey = await resolveRecipientStealthKey(challenge.payTo, this.connection, process.env);
        console.log('[PaymentSigner] Resolved stealth key', { domain: challenge.payTo, stealthKey });
      } catch (resolveError: any) {
        console.error('[PaymentSigner] Failed to resolve stealth key', { domain: challenge.payTo, error: resolveError?.message });
        throw new Error(
          `Cannot resolve stealth key for '${challenge.payTo}'. ` +
          `Ensure ALDOR_UMBRA_STEALTH_MAP contains this domain. ` +
          `Error: ${resolveError?.message ?? resolveError}`
        );
      }

      try {
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
      } catch (umbraError: any) {
        console.error('[PaymentSigner] Umbra transfer failed', { domain: challenge.payTo, error: umbraError?.message });
        throw new Error(`Umbra transfer failed for '${challenge.payTo}': ${umbraError?.message ?? umbraError}`);
      }
    }

    tx.feePayer = this.payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash(this.commitment)).blockhash;
    tx.sign(this.payer);

    console.log('[PaymentSigner] Sending SOL transfer tx', {
      from: this.payer.publicKey.toBase58(),
      to: (tx.instructions[0].keys.find((k) => k.pubkey !== this.payer.publicKey)?.pubkey ?? this.payer.publicKey).toBase58(),
      lamports: Number(amountRaw),
    });

    try {
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
    } catch (txError: any) {
      console.error('[PaymentSigner] SOL transfer failed', { error: txError?.message, logs: txError?.logs });
      throw new Error(`SOL transfer failed: ${txError?.message ?? txError}`);
    }
  }
}
