import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { randomUUID } from 'node:crypto';
import { AGENTS } from './agents.js';
import { runOrchestrator } from './manager.js';
import { x402Required } from './middleware.js';
import { handlers } from './specialists.js';
import { getSessionEmitter } from './sessions.js';
import { enrichAgentsWithBalances, getRecentTransactions } from './covalent.js';
import { serverConfig } from './config.js';
import { fundAgentViaDodo, offRampEarnings } from '../../sdk/src/dodo.js';
import { getAgentWalletForDomain, getAgentWalletMap, isValidSolanaAddress } from './wallets.js';
import { getUmbraSecretForDomain } from './umbra.js';
import { getPaymentStats, listPayments } from './ledger.js';
import { fetchRegistryAgents, getStealthKeyForDomain } from './registry.js';
import { seedRegistryAgents } from './registrySeed.js';
import { fetchPalmUsdCirculation } from './palmusd.js';
import { runIntegrationDiagnostics } from './diagnostics.js';
import { networkFromRequest } from './network.js';
import { fulfillWalletPayment, cancelWalletPayment, listPendingPayments } from './walletPayments.js';
import { fetchPaymentActivity } from './analytics.js';
import { checkDodoHealth } from '../../sdk/src/dodo.js';

function asyncHandler<T extends express.RequestHandler>(fn: T): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(morgan('combined'));
  app.set('getSessionEmitter', getSessionEmitter);

  app.use(express.json());

  // Network middleware: attaches per-request network config
  app.use((req, _res, next) => {
    (req as any).networkConfig = networkFromRequest(req);
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/payment/config', (req, res) => {
    const netConfig = networkFromRequest(req);
    res.json({
      paymentMode: serverConfig.paymentMode,
      network: netConfig.solanaCluster === 'mainnet' ? 'solana-mainnet' : 'solana-devnet',
      palmUsdMint: netConfig.palmUsdMint,
      umbraEnabled: serverConfig.umbraEnabled,
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

    const missingUmbraSecrets = serverConfig.umbraEnabled
      ? requiredDomains.filter((domain) => !getUmbraSecretForDomain(domain))
      : [];

    const missingEnv: string[] = [];
    if (!process.env.SOLANA_RPC_URL) missingEnv.push('SOLANA_RPC_URL');
    const cluster = (process.env.SOLANA_CLUSTER ?? 'devnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'devnet';
    const hasPalmMint = Boolean(process.env.PALM_USD_MINT)
      || (cluster === 'mainnet' && Boolean(process.env.PALM_USD_MINT_MAINNET))
      || (cluster === 'devnet' && Boolean(process.env.PALM_USD_MINT_DEVNET));
    if (!hasPalmMint) missingEnv.push('PALM_USD_MINT (or PALM_USD_MINT_DEVNET/MAINNET)');
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
      umbraEnabled: serverConfig.umbraEnabled,
      checks: {
        walletMapCount: Object.keys(walletMap).length,
        missingWallets,
        invalidWallets,
        missingUmbraSecrets,
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

  app.get('/api/agents', asyncHandler(async (req, res) => {
    const netConfig = networkFromRequest(req);
    const registryAgents = await fetchRegistryAgents(process.env, netConfig.solanaRpcUrl);
    const walletMap = getAgentWalletMap(process.env);

    // Merge on-chain registry with hardcoded agents so all known agents always appear
    const registryMap = new Map(registryAgents.map((a) => [a.snsDomain, a]));
    const merged = AGENTS.map((agent) => {
      const onChain = registryMap.get(agent.domain);
      if (onChain) return onChain;
      return {
        snsDomain: agent.domain,
        name: agent.name,
        category: agent.category,
        priceMicroStablecoin: String(agent.priceAtomic),
        reputationBps: String(agent.reputation),
        totalJobs: '0',
        successfulJobs: '0',
        isActive: true,
        isRecursive: agent.recursive,
        capabilities: [agent.category],
        description: agent.description,
        owner: walletMap[agent.domain] ?? '',
        registeredAt: '0',
        umbraStealthPublicKey: getStealthKeyForDomain(agent.domain, process.env),
        walletAddress: walletMap[agent.domain],
      };
    });

    const enriched = await enrichAgentsWithBalances(merged, netConfig.palmUsdMint, netConfig.solanaCluster);
    res.json(enriched);
  }));

  app.get('/api/tools', (_req, res) => {
    res.json({ tools: AGENTS.map((agent) => ({
      name: agent.name,
      snsDomain: agent.domain,
      path: agent.path,
      category: agent.category,
      priceAtomic: agent.priceAtomic,
      token: agent.token,
      recursive: agent.recursive,
      description: agent.description,
    })) });
  });

  app.get('/api/registry', (req, res) => {
    const netConfig = networkFromRequest(req);
    fetchRegistryAgents(process.env, netConfig.solanaRpcUrl).then((agents) => res.json(agents)).catch((error: any) => {
      res.status(500).json({ error: 'REGISTRY_LOAD_FAILED', detail: error?.message ?? String(error) });
    });
  });

  app.post('/api/registry/seed', asyncHandler(async (_req, res) => {
    if ((process.env.ALLOW_REGISTRY_SEED ?? 'false').toLowerCase() !== 'true') {
      res.status(403).json({ error: 'REGISTRY_SEED_DISABLED' });
      return;
    }
    const result = await seedRegistryAgents();
    res.json(result);
  }));

  app.get('/api/payments', (req, res) => {
    const limit = Number(req.query.limit ?? 100);
    const offset = Number(req.query.offset ?? 0);
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100;
    const safeOffset = Number.isFinite(offset) ? Math.max(offset, 0) : 0;
    const items = listPayments(safeLimit, safeOffset);
    res.json({ items, limit: safeLimit, offset: safeOffset });
  });

  app.get('/api/stats', (_req, res) => {
    res.json(getPaymentStats());
  });

  app.get('/api/analytics/recent-transactions', asyncHandler(async (req, res) => {
    const netConfig = networkFromRequest(req);
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
    try {
      const txs = await getRecentTransactions(addresses, netConfig.solanaCluster);
      res.json({ items: txs });
    } catch (error: any) {
      res.status(503).json({
        error: 'COVALENT_UNAVAILABLE',
        message: error?.message ?? 'Covalent request failed',
      });
    }
  }));

  app.get('/api/analytics/palmusd-circulation', asyncHandler(async (_req, res) => {
    const circulation = await fetchPalmUsdCirculation();
    res.json(circulation);
  }));

  app.get('/api/analytics/payment-activity', asyncHandler(async (_req, res) => {
    const activity = await fetchPaymentActivity();
    res.json(activity);
  }));

  app.get('/api/integrations/diagnostics', asyncHandler(async (req, res) => {
    const diagnostics = await runIntegrationDiagnostics(process.env);
    res.status(diagnostics.ok ? 200 : 503).json(diagnostics);
  }));

  app.get('/api/dodo/health', asyncHandler(async (_req, res) => {
    const health = await checkDodoHealth(process.env);
    res.status(health.ok ? 200 : 503).json(health);
  }));

  // Debug endpoint: test Dodo auth directly and return raw response
  app.get('/api/dodo/debug', asyncHandler(async (_req, res) => {
    const { probeDodoAuth } = await import('../../sdk/src/dodo.js');
    const result = await probeDodoAuth(process.env);
    res.json(result);
  }));

  // Raw Dodo test — lets you try any endpoint with any header
  app.get('/api/dodo/probe', asyncHandler(async (req, res) => {
    const endpoint = String(req.query.endpoint ?? '/payments');
    const authStyle = String(req.query.auth ?? 'Bearer');
    const apiKey = process.env.DODO_API_KEY;
    const baseUrl = (process.env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com').replace(/\/$/, '');

    if (!apiKey) {
      res.status(400).json({ error: 'DODO_API_KEY not set' });
      return;
    }

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    switch (authStyle) {
      case 'Bearer': headers.Authorization = `Bearer ${apiKey}`; break;
      case 'Plain': headers.Authorization = apiKey; break;
      case 'Dodo-Api-Key': headers['Dodo-Api-Key'] = apiKey; break;
      case 'X-API-Key': headers['X-API-Key'] = apiKey; break;
      case 'Api-Key': headers['Api-Key'] = apiKey; break;
      default: headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, { method: 'GET', headers });
    const text = await response.text();

    res.json({
      url: `${baseUrl}${endpoint}`,
      authStyle,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text.slice(0, 500),
    });
  }));

  app.post('/api/dodo/fund', asyncHandler(async (req, res) => {
    const amountUsd = Number(req.body?.amountUsd ?? 0);
    const walletAddress = String(req.body?.walletAddress ?? '');
    const customerData = req.body?.customerData ?? { email: 'guest@example.com', name: 'Guest User', countryCode: 'US' };
    const returnUrl = req.body?.returnUrl ? String(req.body.returnUrl) : undefined;
    const cancelUrl = req.body?.cancelUrl ? String(req.body.cancelUrl) : undefined;
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || !walletAddress) {
      res.status(400).json({ error: 'INVALID_REQUEST' });
      return;
    }
    if (!process.env.DODO_API_KEY || process.env.DODO_API_KEY === 'replace_me') {
      res.status(503).json({ error: 'DODO_UNAVAILABLE', message: 'DODO_API_KEY is not configured. Set it in server/.env' });
      return;
    }
    try {
      const urlOrId = await fundAgentViaDodo(amountUsd, walletAddress, customerData, returnUrl, cancelUrl);
      res.json({ payment: urlOrId });
    } catch (error: any) {
      res.status(503).json({
        error: 'DODO_UNAVAILABLE',
        message: error?.message ?? 'Dodo request failed',
      });
    }
  }));

  app.post('/api/dodo/offramp', asyncHandler(async (req, res) => {
    const agentAddress = String(req.body?.agentAddress ?? '');
    const amountStablecoin = Number(req.body?.amountStablecoin ?? 0);
    const destinationDetails = (req.body?.destinationDetails ?? {}) as Record<string, unknown>;
    if (!agentAddress || !Number.isFinite(amountStablecoin) || amountStablecoin <= 0) {
      res.status(400).json({ error: 'INVALID_REQUEST' });
      return;
    }
    if (!process.env.DODO_API_KEY || process.env.DODO_API_KEY === 'replace_me') {
      res.status(503).json({ error: 'DODO_UNAVAILABLE', message: 'DODO_API_KEY is not configured.' });
      return;
    }
    try {
      const invoiceId = await offRampEarnings(agentAddress, amountStablecoin, destinationDetails);
      res.json({ invoiceId });
    } catch (error: any) {
      res.status(503).json({
        error: 'DODO_UNAVAILABLE',
        message: error?.message ?? 'Dodo request failed',
      });
    }
  }));

  // Dodo webhook handler for payment confirmations
  app.post('/api/dodo/webhook', asyncHandler(async (req, res) => {
    // TODO: verify webhook signature when Dodo provides signing secret
    const event = req.body as {
      event_type?: string;
      payment?: {
        payment_id?: string;
        status?: string;
        metadata?: Record<string, unknown>;
        total_amount?: number;
        currency?: string;
      };
    };

    const eventType = event?.event_type ?? 'unknown';
    const payment = event?.payment;

    console.log('[DodoWebhook]', eventType, JSON.stringify(payment));

    if (eventType === 'payment.success' && payment) {
      const walletAddress = String(payment.metadata?.solana_wallet ?? '');
      const amountCents = Number(payment.total_amount ?? 0);
      const amountUsd = amountCents / 100;

      if (walletAddress && amountUsd > 0) {
        console.log(`[DodoWebhook] Funding confirmed: ${amountUsd} USD -> ${walletAddress} (payment_id: ${payment.payment_id})`);
        // TODO: trigger on-chain token mint/transfer to walletAddress
      }
    }

    // Acknowledge receipt immediately
    res.json({ received: true });
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
    const requestId = req.header('X-Aldor-Request-Id') ?? randomUUID();
    const netConfig = networkFromRequest(req);
    const result = await runOrchestrator(query, emitter, budget, depth, { sessionId, requestId }, netConfig.solanaCluster);
    res.json({ result, requestId });
  }));

  // Wallet-signed payment submission
  app.post('/api/agent/pay', asyncHandler(async (req, res) => {
    const requestId = String(req.body?.requestId ?? '');
    const signature = String(req.body?.signature ?? '');
    const payer = String(req.body?.payer ?? '');
    const ephemeralKey = String(req.body?.ephemeralKey ?? '');

    if (!requestId || !signature) {
      res.status(400).json({ error: 'MISSING_PROOF' });
      return;
    }

    const fulfilled = fulfillWalletPayment(requestId, {
      umbraSignature: signature,
      umbraEphemeralKey: ephemeralKey,
      payer,
      timestamp: Date.now(),
    });

    if (!fulfilled) {
      res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'No pending payment found for this requestId' });
      return;
    }

    res.json({ ok: true, requestId });
  }));

  // Wallet payment rejection (user declined in UI or wallet)
  app.post('/api/agent/pay/reject', asyncHandler(async (req, res) => {
    const requestId = String(req.body?.requestId ?? '');
    const reason = String(req.body?.reason ?? 'USER_REJECTED');

    if (!requestId) {
      res.status(400).json({ error: 'MISSING_REQUEST_ID' });
      return;
    }

    const cancelled = cancelWalletPayment(requestId, reason);

    if (!cancelled) {
      res.status(404).json({ error: 'REQUEST_NOT_FOUND', message: 'No pending payment found for this requestId' });
      return;
    }

    res.json({ ok: true, requestId, reason });
  }));

  app.get('/api/agent/payments/pending', (_req, res) => {
    res.json({ items: listPendingPayments() });
  });

  const weather = AGENTS.find((a) => a.name === 'WeatherBot')!;
  const summarize = AGENTS.find((a) => a.name === 'Summarizer')!;
  const math = AGENTS.find((a) => a.name === 'MathSolver')!;
  const sentiment = AGENTS.find((a) => a.name === 'SentimentAI')!;
  const codeExplain = AGENTS.find((a) => a.name === 'CodeExplainer')!;
  const translate = AGENTS.find((a) => a.name === 'TranslateBot')!;
  const research = AGENTS.find((a) => a.name === 'DeepResearch')!;
  const coding = AGENTS.find((a) => a.name === 'CodingAgent')!;
  const sovereign = AGENTS.find((a) => a.name === 'SovereignSpecialist')!;

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

  app.post(
    sovereign.path,
    x402Required({
      priceAtomic: sovereign.priceAtomic,
      tokenKind: sovereign.token,
      snsDomain: sovereign.domain,
      recipientWallet: getAgentWalletForDomain(sovereign.domain),
      paymentMode: serverConfig.paymentMode,
      description: sovereign.description,
      resourcePath: sovereign.path,
    }),
    asyncHandler(handlers.sovereign),
  );

  const dataAnalyst = AGENTS.find((a) => a.name === 'DataAnalyst')!;
  const contractAuditor = AGENTS.find((a) => a.name === 'ContractAuditor')!;
  const defiStrategist = AGENTS.find((a) => a.name === 'DeFiStrategist')!;
  const imageGenerator = AGENTS.find((a) => a.name === 'ImageGenerator')!;
  const marketOracle = AGENTS.find((a) => a.name === 'MarketOracle')!;
  const legalAdvisor = AGENTS.find((a) => a.name === 'LegalAdvisor')!;
  const socialMediaBot = AGENTS.find((a) => a.name === 'SocialMediaBot')!;
  const tradingBot = AGENTS.find((a) => a.name === 'TradingBot')!;
  const medicalAdvisor = AGENTS.find((a) => a.name === 'MedicalAdvisor')!;

  app.post(
    dataAnalyst.path,
    x402Required({
      priceAtomic: dataAnalyst.priceAtomic,
      tokenKind: dataAnalyst.token,
      snsDomain: dataAnalyst.domain,
      recipientWallet: getAgentWalletForDomain(dataAnalyst.domain),
      paymentMode: serverConfig.paymentMode,
      description: dataAnalyst.description,
      resourcePath: dataAnalyst.path,
    }),
    asyncHandler(handlers.dataAnalyst),
  );

  app.post(
    contractAuditor.path,
    x402Required({
      priceAtomic: contractAuditor.priceAtomic,
      tokenKind: contractAuditor.token,
      snsDomain: contractAuditor.domain,
      recipientWallet: getAgentWalletForDomain(contractAuditor.domain),
      paymentMode: serverConfig.paymentMode,
      description: contractAuditor.description,
      resourcePath: contractAuditor.path,
    }),
    asyncHandler(handlers.contractAuditor),
  );

  app.post(
    defiStrategist.path,
    x402Required({
      priceAtomic: defiStrategist.priceAtomic,
      tokenKind: defiStrategist.token,
      snsDomain: defiStrategist.domain,
      recipientWallet: getAgentWalletForDomain(defiStrategist.domain),
      paymentMode: serverConfig.paymentMode,
      description: defiStrategist.description,
      resourcePath: defiStrategist.path,
    }),
    asyncHandler(handlers.defiStrategist),
  );

  app.post(
    imageGenerator.path,
    x402Required({
      priceAtomic: imageGenerator.priceAtomic,
      tokenKind: imageGenerator.token,
      snsDomain: imageGenerator.domain,
      recipientWallet: getAgentWalletForDomain(imageGenerator.domain),
      paymentMode: serverConfig.paymentMode,
      description: imageGenerator.description,
      resourcePath: imageGenerator.path,
    }),
    asyncHandler(handlers.imageGenerator),
  );

  app.post(
    marketOracle.path,
    x402Required({
      priceAtomic: marketOracle.priceAtomic,
      tokenKind: marketOracle.token,
      snsDomain: marketOracle.domain,
      recipientWallet: getAgentWalletForDomain(marketOracle.domain),
      paymentMode: serverConfig.paymentMode,
      description: marketOracle.description,
      resourcePath: marketOracle.path,
    }),
    asyncHandler(handlers.marketOracle),
  );

  app.post(
    legalAdvisor.path,
    x402Required({
      priceAtomic: legalAdvisor.priceAtomic,
      tokenKind: legalAdvisor.token,
      snsDomain: legalAdvisor.domain,
      recipientWallet: getAgentWalletForDomain(legalAdvisor.domain),
      paymentMode: serverConfig.paymentMode,
      description: legalAdvisor.description,
      resourcePath: legalAdvisor.path,
    }),
    asyncHandler(handlers.legalAdvisor),
  );

  app.post(
    socialMediaBot.path,
    x402Required({
      priceAtomic: socialMediaBot.priceAtomic,
      tokenKind: socialMediaBot.token,
      snsDomain: socialMediaBot.domain,
      recipientWallet: getAgentWalletForDomain(socialMediaBot.domain),
      paymentMode: serverConfig.paymentMode,
      description: socialMediaBot.description,
      resourcePath: socialMediaBot.path,
    }),
    asyncHandler(handlers.socialMediaBot),
  );

  app.post(
    tradingBot.path,
    x402Required({
      priceAtomic: tradingBot.priceAtomic,
      tokenKind: tradingBot.token,
      snsDomain: tradingBot.domain,
      recipientWallet: getAgentWalletForDomain(tradingBot.domain),
      paymentMode: serverConfig.paymentMode,
      description: tradingBot.description,
      resourcePath: tradingBot.path,
    }),
    asyncHandler(handlers.tradingBot),
  );

  app.post(
    medicalAdvisor.path,
    x402Required({
      priceAtomic: medicalAdvisor.priceAtomic,
      tokenKind: medicalAdvisor.token,
      snsDomain: medicalAdvisor.domain,
      recipientWallet: getAgentWalletForDomain(medicalAdvisor.domain),
      paymentMode: serverConfig.paymentMode,
      description: medicalAdvisor.description,
      resourcePath: medicalAdvisor.path,
    }),
    asyncHandler(handlers.medicalAdvisor),
  );

  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error?.message ?? 'Internal Server Error';
    res.status(500).json({ error: 'INTERNAL_ERROR', message });
  });

  return app;
}
