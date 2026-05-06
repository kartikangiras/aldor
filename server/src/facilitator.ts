import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { serverConfig } from './config.js';
import type { MiddlewareConfig, PaymentProofV1 } from './eventtypes.js';
import { verifyUmbraTransfer } from '../../sdk/src/umbra.js';
import { getUmbraSecretForDomain } from './umbra.js';
import { fetchRegistryAgentByDomain, getStealthKeyForDomain } from './registry.js';

function parsedInfo(ix: any): any {
  return ix?.parsed?.info ?? null;
}

export async function verifyPayment(proof: PaymentProofV1, cfg: MiddlewareConfig): Promise<boolean> {
  if (serverConfig.mockPayments) {
    return true;
  }

  const connection = new Connection(serverConfig.solanaRpcUrl, 'confirmed');
  if (serverConfig.umbraEnabled && cfg.tokenKind === 'PALM_USD') {
    const receiverSecretKey = getUmbraSecretForDomain(cfg.snsDomain);
    if (!receiverSecretKey) {
      return false;
    }

    const registryAgent = await fetchRegistryAgentByDomain(cfg.snsDomain).catch(() => null);
    const stealthKey = registryAgent?.umbraStealthPublicKey ?? getStealthKeyForDomain(cfg.snsDomain) ?? '';
    if (!stealthKey) {
      return false;
    }

    return verifyUmbraTransfer({
      connection,
      receiverSecretKey,
      stealthPublicKey: stealthKey,
      assetMint: new PublicKey(serverConfig.palmUsdMint),
      expectedAmount: BigInt(cfg.priceAtomic),
      signature: proof.umbraSignature,
      ephemeralKey: proof.umbraEphemeralKey,
    });
  }
  const tx = await connection.getParsedTransaction(proof.umbraSignature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  if (!tx || tx.meta?.err) {
    return false;
  }

  const instructions = tx.transaction.message.instructions;
  if (cfg.tokenKind === 'SOL') {
    for (const ix of instructions) {
      const info = parsedInfo(ix);
      const dest = info?.destination as string | undefined;
      const lamportsRaw = info?.lamports;
      const lamports = lamportsRaw !== undefined ? BigInt(String(lamportsRaw)) : BigInt(0);

      if (cfg.recipientWallet) {
        if (dest === cfg.recipientWallet && lamports >= BigInt(cfg.priceAtomic)) {
          return true;
        }
      } else if (lamports >= BigInt(cfg.priceAtomic)) {
        return true;
      }
    }
    return false;
  }

  const mint = new PublicKey(serverConfig.palmUsdMint);
  const recipientAta = cfg.recipientWallet
    ? getAssociatedTokenAddressSync(mint, new PublicKey(cfg.recipientWallet)).toBase58()
    : null;

  for (const ix of instructions) {
    const info = parsedInfo(ix);
    const ixMint = info?.mint as string | undefined;
    const destination = info?.destination as string | undefined;
    const tokenAmount =
      info?.tokenAmount?.amount !== undefined
        ? BigInt(String(info.tokenAmount.amount))
        : BigInt(String(info?.amount ?? 0));

    if (
      ixMint === mint.toBase58() &&
      tokenAmount >= BigInt(cfg.priceAtomic) &&
      (recipientAta ? destination === recipientAta : true)
    ) {
      return true;
    }
  }

  return false;
}
