import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { serverConfig } from './config.js';
import type { MiddlewareConfig, PaymentProofV1 } from './eventtypes.js';
import { verifyUmbraTransfer } from '../../sdk/src/umbra.js';
import { getUmbraSecretForDomain } from './umbra.js';
import { fetchRegistryAgentByDomain, getStealthKeyForDomain } from './registry.js';
import { resolveNetworkConfig, type PerRequestNetworkConfig } from './network.js';

function parsedInfo(ix: any): any {
  return ix?.parsed?.info ?? null;
}

function parsedType(ix: any): string | undefined {
  return ix?.parsed?.type ?? undefined;
}

export async function verifyPayment(
  proof: PaymentProofV1,
  cfg: MiddlewareConfig,
  networkHint?: string,
): Promise<boolean> {
  if (serverConfig.mockPayments) {
    return true;
  }

  const netConfig: PerRequestNetworkConfig = networkHint
    ? resolveNetworkConfig(networkHint)
    : { solanaRpcUrl: serverConfig.solanaRpcUrl, solanaCluster: serverConfig.solanaCluster, palmUsdMint: serverConfig.palmUsdMint, covalentChain: 'solana-devnet', explorerCluster: '?cluster=devnet' };

  const connection = new Connection(netConfig.solanaRpcUrl, 'confirmed');

  // Umbra stealth path (server-signed payments)
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
      assetMint: new PublicKey(netConfig.palmUsdMint),
      expectedAmount: BigInt(cfg.priceAtomic),
      signature: proof.umbraSignature,
      ephemeralKey: proof.umbraEphemeralKey,
    });
  }

  // Wallet-signed direct transfer verification
  // Retry a few times because the tx may not have propagated to our RPC yet
  let tx = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    tx = await connection.getParsedTransaction(proof.umbraSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (tx && !tx.meta?.err) break;
    await new Promise((r) => setTimeout(r, 800));
  }

  if (!tx || tx.meta?.err) {
    console.warn(`[Facilitator] Tx not found or failed for sig ${proof.umbraSignature.slice(0, 16)}...`);
    return false;
  }
  console.log(`[Facilitator] Tx found for ${proof.umbraSignature.slice(0, 16)}..., checking instructions...`);

  const instructions = tx.transaction.message.instructions;

  // ── SOL transfer verification ──
  if (cfg.tokenKind === 'SOL') {
    for (const ix of instructions) {
      const info = parsedInfo(ix);
      const dest = info?.destination as string | undefined;
      const lamportsRaw = info?.lamports;
      const lamports = lamportsRaw !== undefined ? BigInt(String(lamportsRaw)) : BigInt(0);

      if (cfg.recipientWallet) {
        if (dest === cfg.recipientWallet && lamports >= BigInt(cfg.priceAtomic)) {
          console.log(`[Facilitator] Verified SOL transfer to ${dest} for ${lamports}`);
          return true;
        }
      } else if (lamports >= BigInt(cfg.priceAtomic)) {
        console.log(`[Facilitator] Verified SOL transfer for ${lamports}`);
        return true;
      }
    }
    return false;
  }

  // ── SPL token transfer verification ──
  const mint = new PublicKey(netConfig.palmUsdMint);
  const recipientAta = cfg.recipientWallet
    ? getAssociatedTokenAddressSync(mint, new PublicKey(cfg.recipientWallet)).toBase58()
    : null;

  // Check top-level instructions
  for (const ix of instructions) {
    const info = parsedInfo(ix);
    if (!info) continue;

    const ixType = parsedType(ix);
    const destination = info?.destination as string | undefined;
    const tokenAmount =
      info?.tokenAmount?.amount !== undefined
        ? BigInt(String(info.tokenAmount.amount))
        : BigInt(String(info?.amount ?? 0));

    // Standard SPL Transfer: parsed info has authority, source, destination, amount
    // It does NOT include 'mint' — we verify by destination ATA instead
    if (ixType === 'transfer' || ixType === 'Transfer') {
      if (recipientAta && destination === recipientAta && tokenAmount >= BigInt(cfg.priceAtomic)) {
        console.log(`[Facilitator] Verified SPL transfer to ${destination} for ${tokenAmount}`);
        return true;
      }
      continue;
    }

    // MintTo / Burn / other instructions that DO include mint in parsed info
    const ixMint = info?.mint as string | undefined;
    if (
      ixMint === mint.toBase58() &&
      tokenAmount >= BigInt(cfg.priceAtomic) &&
      (recipientAta ? destination === recipientAta : true)
    ) {
      return true;
    }
  }

  // Also check inner instructions (CPI calls from programs like ATA creation)
  const innerInstructions = tx.meta?.innerInstructions ?? [];
  for (const inner of innerInstructions) {
    for (const ix of inner.instructions) {
      const info = parsedInfo(ix);
      if (!info) continue;

      const ixType = parsedType(ix);
      const destination = info?.destination as string | undefined;
      const tokenAmount =
        info?.tokenAmount?.amount !== undefined
          ? BigInt(String(info.tokenAmount.amount))
          : BigInt(String(info?.amount ?? 0));

      if (ixType === 'transfer' || ixType === 'Transfer') {
        if (recipientAta && destination === recipientAta && tokenAmount >= BigInt(cfg.priceAtomic)) {
          console.log(`[Facilitator] Verified inner SPL transfer to ${destination} for ${tokenAmount}`);
          return true;
        }
        continue;
      }

      const ixMint = info?.mint as string | undefined;
      if (
        ixMint === mint.toBase58() &&
        tokenAmount >= BigInt(cfg.priceAtomic) &&
        (recipientAta ? destination === recipientAta : true)
      ) {
        return true;
      }
    }
  }

  console.warn(`[Facilitator] No matching transfer found in tx ${proof.umbraSignature.slice(0, 16)}... for recipient ${cfg.recipientWallet ?? 'any'} amount ${cfg.priceAtomic}`);
  return false;
}
