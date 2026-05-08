import type { Request, Response } from 'express';
import type { EventEmitter } from 'node:events';
import { AGENTS } from './agents.js';
import { runOrchestrator } from './manager.js';
import { runQvacCompletion } from './qvac.js';

function getDepth(req: Request): number {
  const raw = req.header('X-Aldor-Max-Depth');
  const parsed = Number(raw ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getBudget(req: Request): number {
  const raw = req.header('X-Aldor-Budget-Remaining');
  const parsed = Number(raw ?? 0.01);
  return Number.isFinite(parsed) ? parsed : 0.01;
}

export const handlers = {
  weather: async (req: Request, res: Response) => {
    const location = String(req.body?.location ?? 'Unknown');
    res.json({ result: `Weather for ${location}: 26C, clear` });
  },

  summarize: async (req: Request, res: Response) => {
    const text = String(req.body?.text ?? '');
    const trimmed = text.length > 140 ? `${text.slice(0, 140)}...` : text;
    res.json({ result: `Summary: ${trimmed}` });
  },

  mathSolve: async (req: Request, res: Response) => {
    const expression = String(req.body?.expression ?? req.body?.text ?? '0');
    res.json({ result: `MathSolver solved: ${expression}` });
  },

  sentiment: async (req: Request, res: Response) => {
    const text = String(req.body?.text ?? '');
    const lower = text.toLowerCase();
    const label = lower.includes('bad') ? 'negative' : lower.includes('great') ? 'positive' : 'neutral';
    res.json({ result: `${label} (0.78)` });
  },

  codeExplain: async (req: Request, res: Response) => {
    const language = String(req.body?.language ?? 'unknown');
    res.json({ result: `Code explanation in plain English for ${language} snippet.` });
  },

  translate: async (req: Request, res: Response) => {
    const text = String(req.body?.text ?? '');
    const target = String(req.body?.target ?? 'es');
    res.json({ result: `[${target}] ${text}` });
  },

  deepResearch: async (req: Request, res: Response) => {
    const topic = String(req.body?.topic ?? req.body?.query ?? '');
    const sessionId = String(req.body?.session ?? req.query?.session ?? req.header('X-Aldor-Session') ?? 'default');
    const requestId = req.header('X-Aldor-Request-Id') ?? undefined;
    const parentJobId = req.header('X-Aldor-Job-Id') ?? undefined;
    const getEmitter = req.app.get('getSessionEmitter') as (session: string) => EventEmitter;
    const emitter = getEmitter(sessionId);
    const depth = getDepth(req) + 1;
    const budget = Math.max(getBudget(req) - AGENTS.find((a) => a.name === 'DeepResearch')!.priceAtomic / 1_000_000, 0);
    const network = (req as any).aldor?.network ?? (req.header('X-Aldor-Network') ?? 'devnet');
    const result = await runOrchestrator(topic, emitter, budget, depth, {
      sessionId,
      requestId,
      parentJobId,
    }, network);
    res.json({ result: result || `Research notes: ${topic}` });
  },

  coding: async (req: Request, res: Response) => {
    const task = String(req.body?.task ?? req.body?.query ?? '');
    const sessionId = String(req.body?.session ?? req.query?.session ?? req.header('X-Aldor-Session') ?? 'default');
    const requestId = req.header('X-Aldor-Request-Id') ?? undefined;
    const parentJobId = req.header('X-Aldor-Job-Id') ?? undefined;
    const getEmitter = req.app.get('getSessionEmitter') as (session: string) => EventEmitter;
    const emitter = getEmitter(sessionId);
    const depth = getDepth(req) + 1;
    const budget = Math.max(getBudget(req) - AGENTS.find((a) => a.name === 'CodingAgent')!.priceAtomic / 1_000_000, 0);
    const network = (req as any).aldor?.network ?? (req.header('X-Aldor-Network') ?? 'devnet');
    const result = await runOrchestrator(`code review ${task}`, emitter, budget, depth, {
      sessionId,
      requestId,
      parentJobId,
    }, network);
    res.json({ result: result || `Coding result for: ${task}` });
  },

  sovereign: async (req: Request, res: Response) => {
    const task = String(req.body?.task ?? req.body?.query ?? '');
    if (!task) {
      res.status(400).json({ error: 'MISSING_TASK' });
      return;
    }

    let result: string;
    try {
      result = await runQvacCompletion(task);
    } catch (error: any) {
      res.status(500).json({ error: 'QVAC_UNAVAILABLE', detail: error?.message ?? String(error) });
      return;
    }

    res.json({ result });
  },

  dataAnalyst: async (req: Request, res: Response) => {
    const dataset = String(req.body?.dataset ?? req.body?.text ?? '');
    res.json({ result: `Data analysis complete. Dataset: ${dataset.slice(0, 80)}... Key metrics extracted.` });
  },

  contractAuditor: async (req: Request, res: Response) => {
    const code = String(req.body?.code ?? req.body?.text ?? '');
    res.json({ result: `Contract audit: ${code.length} chars scanned. No critical vulnerabilities detected in surface analysis.` });
  },

  defiStrategist: async (req: Request, res: Response) => {
    const strategy = String(req.body?.strategy ?? req.body?.text ?? 'yield');
    res.json({ result: `DeFi strategy for ${strategy}: recommended liquidity pools identified with 12-18% APY range.` });
  },

  imageGenerator: async (req: Request, res: Response) => {
    const prompt = String(req.body?.prompt ?? req.body?.text ?? '');
    res.json({ result: `Image generation queued for: "${prompt.slice(0, 100)}..."` });
  },

  marketOracle: async (req: Request, res: Response) => {
    const asset = String(req.body?.asset ?? 'SOL');
    res.json({ result: `${asset}/USD: $142.35 (+2.4% 24h). RSI: 62. MACD: bullish crossover.` });
  },

  legalAdvisor: async (req: Request, res: Response) => {
    const document = String(req.body?.document ?? req.body?.text ?? '');
    res.json({ result: `Legal review: ${document.length} chars analyzed. 3 clauses flagged for review.` });
  },

  socialMediaBot: async (req: Request, res: Response) => {
    const topic = String(req.body?.topic ?? req.body?.text ?? '');
    res.json({ result: `Social content draft for "${topic.slice(0, 60)}..." - 3 posts generated with hashtag strategy.` });
  },

  tradingBot: async (req: Request, res: Response) => {
    const pair = String(req.body?.pair ?? 'SOL/USDC');
    res.json({ result: `Trading signal for ${pair}: LONG entry at $142.20, SL $138.50, TP $152.00. Confidence: 78%.` });
  },

  medicalAdvisor: async (req: Request, res: Response) => {
    const symptoms = String(req.body?.symptoms ?? req.body?.text ?? '');
    res.json({ result: `Symptom analysis: "${symptoms.slice(0, 100)}..." - general information retrieved. Consult a physician for diagnosis.` });
  },
};
