import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { serverConfig } from './config.js';
import type { MiddlewareConfig, PaymentProofV1 } from './phase3-types.js';

function parseProof(raw: string): PaymentProofV1 {
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  return JSON.parse(decoded) as PaymentProofV1;
}

function amountToBigInt(value: string): bigint {
  return BigInt(value);
}

function parsedInfo(ix: any): any {
  return ix?.parsed?.info ?? null;
}

export async function verifyPayment(rawHeader: string, cfg: MiddlewareConfig): Promise<boolean> {
  if (serverConfig.mockPayments) {
    return true;
  }

  const proof = parseProof(rawHeader);
  const connection = new Connection(serverConfig.solanaRpcUrl, 'confirmed');
  const tx = await connection.getParsedTransaction(proof.signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) {
    return false;
  }

  const proofAmount = amountToBigInt(proof.amount);
  if (proofAmount < BigInt(cfg.priceAtomic)) {
    return false;
  }

  const instructions = tx.transaction.message.instructions;
  if (cfg.tokenKind === 'SOL') {
    for (const ix of instructions) {
      const info = parsedInfo(ix);
      const dest = info?.destination as string | undefined;
      const lamportsRaw = info?.lamports;
      const lamports = lamportsRaw !== undefined ? BigInt(String(lamportsRaw)) : BigInt(0);

      if (dest === cfg.recipient && lamports >= BigInt(cfg.priceAtomic)) {
        return true;
      }
    }
    return false;
  }

  const mint = new PublicKey(serverConfig.palmUsdMint);
  const recipient = new PublicKey(cfg.recipient);
  const recipientAta = getAssociatedTokenAddressSync(mint, recipient).toBase58();

  for (const ix of instructions) {
    const info = parsedInfo(ix);
    const destination = info?.destination as string | undefined;
    const ixMint = info?.mint as string | undefined;
    const tokenAmount =
      info?.tokenAmount?.amount !== undefined
        ? BigInt(String(info.tokenAmount.amount))
        : BigInt(String(info?.amount ?? 0));

    if (ixMint === mint.toBase58() && destination === recipientAta && tokenAmount >= BigInt(cfg.priceAtomic)) {
      return true;
    }
  }

  return false;
}
