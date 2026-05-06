import type { NextFunction, Request, Response } from 'express';
import type { MiddlewareConfig, PaymentProofV1, X402Challenge } from './eventtypes.js';
import { serverConfig } from './config.js';
import { verifyPayment as verifyPaymentDefault } from './facilitator.js';
import { recordPayment } from './ledger.js';

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
    recipientWallet: (cfg.paymentMode ?? serverConfig.paymentMode) === 'wallet' ? cfg.recipientWallet : undefined,
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

    const sessionId = (() => {
      const header = req.header('X-Aldor-Session');
      if (header) return header;
      return typeof req.query.session === 'string' ? req.query.session : undefined;
    })();

    const requestId = req.header('X-Aldor-Request-Id') ?? undefined;
    const jobId = req.header('X-Aldor-Job-Id') ?? undefined;
    const parentJobId = req.header('X-Aldor-Parent-Job-Id') ?? undefined;

    recordPayment({
      snsDomain: cfg.snsDomain,
      amountAtomic: cfg.priceAtomic,
      token: cfg.tokenKind,
      depth,
      payer: proof.payer,
      txSignature: proof.umbraSignature,
      ephemeralKey: proof.umbraEphemeralKey,
      paymentMode: cfg.paymentMode ?? serverConfig.paymentMode,
      sessionId,
      requestId,
      jobId,
      parentJobId,
      resource: cfg.resourcePath,
      headers: {
        'x-aldor-payment-signature': signature,
        'x-aldor-ephemeral-key': proof.umbraEphemeralKey,
        'x-aldor-max-depth': String(depth),
        'x-aldor-budget-remaining': req.header('X-Aldor-Budget-Remaining') ?? '',
        'x-aldor-request-id': requestId ?? '',
        'x-aldor-job-id': jobId ?? '',
        'x-aldor-parent-job-id': parentJobId ?? '',
        'x-aldor-session': sessionId ?? '',
      },
    });

    (req as any).aldor = {
      paymentProof: proof,
      depth,
      budgetRemaining: req.header('X-Aldor-Budget-Remaining') ?? null,
      sessionId,
      requestId,
      jobId,
      parentJobId,
    };

    next();
  };
}
