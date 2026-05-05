import express from 'express';
import { AGENTS } from './agents.js';
import { getAgentRegistry, runOrchestrator } from './manager.js';
import { x402Required } from './middleware.js';
import { handlers } from './specialists.js';
import { getSessionEmitter } from './sessions.js';
import { getAgentRegistryEnriched, getRecentTransactions } from './covalent.js';
import { serverConfig } from './config.js';
import { fundAgentViaDodo, offRampEarnings } from '../../sdk/src/dodo.js';
import { getAgentWalletForDomain, getAgentWalletMap, isValidSolanaAddress } from './wallets.js';

function asyncHandler<T extends express.RequestHandler>(fn: T): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.set('getSessionEmitter', getSessionEmitter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/payment/config', (_req, res) => {
    res.json({
      paymentMode: serverConfig.paymentMode,
      network: 'solana-devnet',
      palmUsdMint: serverConfig.palmUsdMint,
    });
  });

  app.get('/api/payment/preflight', (_req, res) => {
    const walletMap = getAgentWalletMap();
    const requiredDomains = AGENTS.map((a) => a.domain);
    const missingWallets = requiredDomains.filter((domain) => !walletMap[domain]);
    const invalidWallets = requiredDomains.filter((domain) => {
      const addr = walletMap[domain];
      return addr ? !isValidSolanaAddress(addr) : false;
    });

    const missingEnv: string[] = [];
    if (!process.env.SOLANA_RPC_URL) missingEnv.push('SOLANA_RPC_URL');
    if (!process.env.PALM_USD_MINT) missingEnv.push('PALM_USD_MINT');
    if (serverConfig.paymentMode === 'server' && !process.env.ALDOR_PAYER_SECRET_KEY) {
      missingEnv.push('ALDOR_PAYER_SECRET_KEY');
    }
    if (!process.env.ALDOR_PROGRAM_ID) missingEnv.push('ALDOR_PROGRAM_ID');
    if (!process.env.COVALENT_API_KEY) missingEnv.push('COVALENT_API_KEY');
    if (!process.env.DODO_API_KEY) missingEnv.push('DODO_API_KEY');

    const ok = missingWallets.length === 0 && invalidWallets.length === 0 && missingEnv.length === 0;
    res.json({
      ok,
      paymentMode: serverConfig.paymentMode,
      checks: {
        walletMapCount: Object.keys(walletMap).length,
        missingWallets,
        invalidWallets,
        missingEnv,
      },
      recommendations: [
        'Set ALDOR_AGENT_WALLET_MAP with all agent snsDomain -> wallet address entries.',
        'Use ALDOR_PAYMENT_MODE=wallet for frontend wallet-signed payments.',
        'Set DODO_API_KEY and COVALENT_API_KEY for full sidetrack integrations.',
      ],
    });
  });

  app.get('/api/agent/events', (req, res) => {
    const sessionId = String(req.query.session ?? 'default');
    const emitter = getSessionEmitter(sessionId);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onStep = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    emitter.on('step', onStep);
    req.on('close', () => {
      emitter.off('step', onStep);
      res.end();
    });
  });

  app.get('/api/agents', asyncHandler(async (_req, res) => {
    const agents = await getAgentRegistryEnriched(serverConfig.palmUsdMint);
    res.json(agents);
  }));

  app.get('/api/analytics/recent-transactions', asyncHandler(async (_req, res) => {
    const walletMap = (() => {
      const raw = process.env.ALDOR_AGENT_WALLET_MAP;
      if (!raw) return {} as Record<string, string>;
      try {
        return JSON.parse(raw) as Record<string, string>;
      } catch {
        return {} as Record<string, string>;
      }
    })();
    const addresses = AGENTS.map((agent) => walletMap[agent.domain]).filter((v): v is string => Boolean(v));
    const txs = await getRecentTransactions(addresses);
    res.json({ items: txs });
  }));

  app.post('/api/dodo/fund', asyncHandler(async (req, res) => {
    const amountUsd = Number(req.body?.amountUsd ?? 0);
    const walletAddress = String(req.body?.walletAddress ?? '');
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || !walletAddress) {
      res.status(400).json({ error: 'INVALID_REQUEST' });
      return;
    }
    const urlOrId = await fundAgentViaDodo(amountUsd, walletAddress);
    res.json({ payment: urlOrId });
  }));

  app.post('/api/dodo/offramp', asyncHandler(async (req, res) => {
    const agentAddress = String(req.body?.agentAddress ?? '');
    const amountStablecoin = Number(req.body?.amountStablecoin ?? 0);
    const destinationDetails = (req.body?.destinationDetails ?? {}) as Record<string, unknown>;
    if (!agentAddress || !Number.isFinite(amountStablecoin) || amountStablecoin <= 0) {
      res.status(400).json({ error: 'INVALID_REQUEST' });
      return;
    }
    const invoiceId = await offRampEarnings(agentAddress, amountStablecoin, destinationDetails);
    res.json({ invoiceId });
  }));

  app.post('/api/agent/query', asyncHandler(async (req, res) => {
    const query = String(req.body?.query ?? '');
    const sessionId = String(req.body?.session ?? req.query.session ?? req.header('X-Aldor-Session') ?? 'default');
    const emitter = getSessionEmitter(sessionId);
    const depth = Number(req.header('X-Aldor-Max-Depth') ?? 0);
    if (depth > 3) {
      res.status(400).json({ error: 'MAX_DEPTH_EXCEEDED' });
      return;
    }

    const budget = Number(req.body?.budget ?? req.header('X-Aldor-Budget-Remaining') ?? 0.01);
    const result = await runOrchestrator(query, emitter, budget, depth);
    res.json({ result });
  }));

  const weather = AGENTS.find((a) => a.name === 'WeatherBot')!;
  const summarize = AGENTS.find((a) => a.name === 'Summarizer')!;
  const math = AGENTS.find((a) => a.name === 'MathSolver')!;
  const sentiment = AGENTS.find((a) => a.name === 'SentimentAI')!;
  const codeExplain = AGENTS.find((a) => a.name === 'CodeExplainer')!;
  const translate = AGENTS.find((a) => a.name === 'TranslateBot')!;
  const research = AGENTS.find((a) => a.name === 'DeepResearch')!;
  const coding = AGENTS.find((a) => a.name === 'CodingAgent')!;

  app.post(
    weather.path,
    x402Required({
      priceAtomic: weather.priceAtomic,
      tokenKind: weather.token,
      snsDomain: weather.domain,
      recipientWallet: getAgentWalletForDomain(weather.domain),
      paymentMode: serverConfig.paymentMode,
      description: weather.description,
      resourcePath: weather.path,
    }),
    asyncHandler(handlers.weather),
  );

  app.post(
    summarize.path,
    x402Required({
      priceAtomic: summarize.priceAtomic,
      tokenKind: summarize.token,
      snsDomain: summarize.domain,
      recipientWallet: getAgentWalletForDomain(summarize.domain),
      paymentMode: serverConfig.paymentMode,
      description: summarize.description,
      resourcePath: summarize.path,
    }),
    asyncHandler(handlers.summarize),
  );

  app.post(
    math.path,
    x402Required({
      priceAtomic: math.priceAtomic,
      tokenKind: math.token,
      snsDomain: math.domain,
      recipientWallet: getAgentWalletForDomain(math.domain),
      paymentMode: serverConfig.paymentMode,
      description: math.description,
      resourcePath: math.path,
    }),
    asyncHandler(handlers.mathSolve),
  );

  app.post(
    sentiment.path,
    x402Required({
      priceAtomic: sentiment.priceAtomic,
      tokenKind: sentiment.token,
      snsDomain: sentiment.domain,
      recipientWallet: getAgentWalletForDomain(sentiment.domain),
      paymentMode: serverConfig.paymentMode,
      description: sentiment.description,
      resourcePath: sentiment.path,
    }),
    asyncHandler(handlers.sentiment),
  );

  app.post(
    codeExplain.path,
    x402Required({
      priceAtomic: codeExplain.priceAtomic,
      tokenKind: codeExplain.token,
      snsDomain: codeExplain.domain,
      recipientWallet: getAgentWalletForDomain(codeExplain.domain),
      paymentMode: serverConfig.paymentMode,
      description: codeExplain.description,
      resourcePath: codeExplain.path,
    }),
    asyncHandler(handlers.codeExplain),
  );

  app.post(
    translate.path,
    x402Required({
      priceAtomic: translate.priceAtomic,
      tokenKind: translate.token,
      snsDomain: translate.domain,
      recipientWallet: getAgentWalletForDomain(translate.domain),
      paymentMode: serverConfig.paymentMode,
      description: translate.description,
      resourcePath: translate.path,
    }),
    asyncHandler(handlers.translate),
  );

  app.post(
    research.path,
    x402Required({
      priceAtomic: research.priceAtomic,
      tokenKind: research.token,
      snsDomain: research.domain,
      recipientWallet: getAgentWalletForDomain(research.domain),
      paymentMode: serverConfig.paymentMode,
      description: research.description,
      resourcePath: research.path,
    }),
    asyncHandler(handlers.deepResearch),
  );

  app.post(
    coding.path,
    x402Required({
      priceAtomic: coding.priceAtomic,
      tokenKind: coding.token,
      snsDomain: coding.domain,
      recipientWallet: getAgentWalletForDomain(coding.domain),
      paymentMode: serverConfig.paymentMode,
      description: coding.description,
      resourcePath: coding.path,
    }),
    asyncHandler(handlers.coding),
  );

  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error?.message ?? 'Internal Server Error';
    res.status(500).json({ error: 'INTERNAL_ERROR', message });
  });

  return app;
}
