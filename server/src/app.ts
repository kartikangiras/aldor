import express from 'express';
import { EventEmitter } from 'node:events';
import { AGENTS } from './agents.js';
import { getAgentRegistry, runOrchestrator } from './manager.js';
import { x402Required } from './middleware.js';
import { handlers } from './specialists.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  const sseEmitter = new EventEmitter();
  app.set('sseEmitter', sseEmitter);

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/agent/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const onStep = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    sseEmitter.on('step', onStep);
    req.on('close', () => {
      sseEmitter.off('step', onStep);
      res.end();
    });
  });

  app.get('/api/agents', (_req, res) => {
    res.json(getAgentRegistry());
  });

  app.post('/api/agent/query', async (req, res) => {
    const query = String(req.body?.query ?? '');
    const depth = Number(req.header('X-Aldor-Max-Depth') ?? 0);
    if (depth > 3) {
      res.status(400).json({ error: 'MAX_DEPTH_EXCEEDED' });
      return;
    }

    const budget = Number(req.body?.budget ?? req.header('X-Aldor-Budget-Remaining') ?? 0.01);
    const result = await runOrchestrator(query, sseEmitter, budget, depth);
    res.json({ result });
  });

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
      recipient: weather.recipient,
      description: weather.description,
      resourcePath: weather.path,
    }),
    handlers.weather,
  );

  app.post(
    summarize.path,
    x402Required({
      priceAtomic: summarize.priceAtomic,
      tokenKind: summarize.token,
      recipient: summarize.recipient,
      description: summarize.description,
      resourcePath: summarize.path,
    }),
    handlers.summarize,
  );

  app.post(
    math.path,
    x402Required({
      priceAtomic: math.priceAtomic,
      tokenKind: math.token,
      recipient: math.recipient,
      description: math.description,
      resourcePath: math.path,
    }),
    handlers.mathSolve,
  );

  app.post(
    sentiment.path,
    x402Required({
      priceAtomic: sentiment.priceAtomic,
      tokenKind: sentiment.token,
      recipient: sentiment.recipient,
      description: sentiment.description,
      resourcePath: sentiment.path,
    }),
    handlers.sentiment,
  );

  app.post(
    codeExplain.path,
    x402Required({
      priceAtomic: codeExplain.priceAtomic,
      tokenKind: codeExplain.token,
      recipient: codeExplain.recipient,
      description: codeExplain.description,
      resourcePath: codeExplain.path,
    }),
    handlers.codeExplain,
  );

  app.post(
    translate.path,
    x402Required({
      priceAtomic: translate.priceAtomic,
      tokenKind: translate.token,
      recipient: translate.recipient,
      description: translate.description,
      resourcePath: translate.path,
    }),
    handlers.translate,
  );

  app.post(
    research.path,
    x402Required({
      priceAtomic: research.priceAtomic,
      tokenKind: research.token,
      recipient: research.recipient,
      description: research.description,
      resourcePath: research.path,
    }),
    handlers.deepResearch,
  );

  app.post(
    coding.path,
    x402Required({
      priceAtomic: coding.priceAtomic,
      tokenKind: coding.token,
      recipient: coding.recipient,
      description: coding.description,
      resourcePath: coding.path,
    }),
    handlers.coding,
  );

  return app;
}
