import type { NextFunction, Request, Response } from 'express';
import type { MiddlewareConfig, X402Challenge } from './phase3-types.js';
import { serverConfig } from './config.js';
import { verifyPayment as verifyPaymentDefault } from './facilitator.js';

const MAX_DEPTH = 3;

type VerifyFn = (rawHeader: string, cfg: MiddlewareConfig) => Promise<boolean>;

function readDepth(req: Request): number {
  const raw = req.header('X-Aldor-Max-Depth');
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildChallenge(req: Request, cfg: MiddlewareConfig): X402Challenge {
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: 'exact',
        network: 'solana-devnet',
        maxAmountRequired: String(cfg.priceAtomic),
        resource: `${serverConfig.serverBaseUrl}${cfg.resourcePath}`,
        description: cfg.description,
        mimeType: 'application/json',
        payTo: cfg.recipient,
        maxTimeoutSeconds: 120,
        asset: cfg.tokenKind === 'SOL' ? 'SOL' : serverConfig.palmUsdMint,
      },
    ],
  };
}

export function x402Required(cfg: MiddlewareConfig, verifyFn: VerifyFn = verifyPaymentDefault) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const depth = readDepth(req);
    if (depth > MAX_DEPTH) {
      res.status(400).json({ error: 'MAX_DEPTH_EXCEEDED' });
      return;
    }

    const payment = req.header('X-Payment');
    if (!payment) {
      res.status(402).json(buildChallenge(req, cfg));
      return;
    }

    const valid = await verifyFn(payment, cfg);
    if (!valid) {
      res.status(402).json({ error: 'PAYMENT_INVALID' });
      return;
    }

    (req as any).aldor = {
      payment,
      depth,
      budgetRemaining: req.header('X-Aldor-Budget-Remaining') ?? null,
    };

    next();
  };
}
