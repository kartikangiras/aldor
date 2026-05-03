import type { Request, Response } from 'express';
import type { EventEmitter } from 'node:events';
import { AGENTS } from './agents.js';
import { runOrchestrator } from './manager.js';

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
    const emitter = req.app.get('sseEmitter') as EventEmitter;
    const depth = getDepth(req) + 1;
    const budget = Math.max(getBudget(req) - AGENTS.find((a) => a.name === 'DeepResearch')!.priceAtomic / 1_000_000, 0);
    const result = await runOrchestrator(topic, emitter, budget, depth);
    res.json({ result: result || `Research notes: ${topic}` });
  },

  coding: async (req: Request, res: Response) => {
    const task = String(req.body?.task ?? req.body?.query ?? '');
    const emitter = req.app.get('sseEmitter') as EventEmitter;
    const depth = getDepth(req) + 1;
    const budget = Math.max(getBudget(req) - AGENTS.find((a) => a.name === 'CodingAgent')!.priceAtomic / 1_000_000, 0);
    const result = await runOrchestrator(`code review ${task}`, emitter, budget, depth);
    res.json({ result: result || `Coding result for: ${task}` });
  },
};
