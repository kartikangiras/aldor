import type { NextFunction, Request, Response } from 'express';
import type { MiddlewareConfig, PaymentProofV1, X402Challenge } from './eventtypes.js';
import { serverConfig } from './config.js';
import { verifyPayment as verifyPaymentDefault } from './facilitator.js';

const MAX_DEPTH = 3;

type VerifyFn = (proof: PaymentProofV1, cfg: MiddlewareConfig) => Promise<boolean>;

function readDepth(req: Request): number {
  const raw = req.header('X-Aldor-Max-Depth');
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildChallenge(req: Request, cfg: MiddlewareConfig): X402Challenge {
  const mint = cfg.tokenKind === 'SOL' ? 'SOL' : serverConfig.palmUsdMint;
  return {
    x402Version: 1,
    recipient: cfg.snsDomain,
    amount: String(cfg.priceAtomic),
    asset: mint,
    network: 'solana-devnet',
    expiresAt: Date.now() + 60_000,
    description: cfg.description,
    resource: `${serverConfig.serverBaseUrl}${cfg.resourcePath}`,
    paymentMode: cfg.paymentMode ?? serverConfig.paymentMode,
    recipientWallet: cfg.recipientWallet,
    mint,
    decimals: cfg.tokenKind === 'SOL' ? 9 : 6,
  };
}

export function x402Required(cfg: MiddlewareConfig, verifyFn: VerifyFn = verifyPaymentDefault) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const depth = readDepth(req);
    if (depth > MAX_DEPTH) {
      res.status(400).json({ error: 'MAX_DEPTH_EXCEEDED' });
      return;
    }

    const signature = req.header('X-Aldor-Payment-Signature') ?? req.header('X-Payment-Signature');
    const ephemeralKey = req.header('X-Aldor-Ephemeral-Key') ?? req.header('X-Aldor-Payment-Ephemeral');
    if (!signature) {
      res.status(402).json(buildChallenge(req, cfg));
      return;
    }

    const proof: PaymentProofV1 = {
      umbraSignature: signature,
      umbraEphemeralKey: ephemeralKey ?? '',
      payer: req.header('X-Aldor-Payer') ?? undefined,
      timestamp: Date.now(),
    };
    const valid = await verifyFn(proof, cfg);
    if (!valid) {
      res.status(402).json({ error: 'PAYMENT_INVALID' });
      return;
    }

    (req as any).aldor = {
      paymentProof: proof,
      depth,
      budgetRemaining: req.header('X-Aldor-Budget-Remaining') ?? null,
    };

    next();
  };
}
