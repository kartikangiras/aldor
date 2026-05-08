import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createPaidAxios, PaymentSigner, resolveRecipientStealthKey } from '../../sdk/src/index.js';
import { AGENTS, byName } from './agents.js';
import { serverConfig } from './config.js';
import { resolveNetworkConfig } from './network.js';
import type { AgentDefinition, StepEvent } from './eventtypes.js';
import { recordJobOutcomeOnChain } from './reputation.js';
import { runQvacEmbedding } from './qvac.js';

interface PlannedTask {
  agent: string;
  route: string;
  payload: Record<string, unknown>;
}

interface OrchestratorContext {
  sessionId?: string;
  requestId?: string;
  parentJobId?: string;
}

function now(): string {
  return new Date().toISOString();
}

function emit(emitter: EventEmitter, event: Omit<StepEvent, 'timestamp'>): void {
  emitter.emit('step', { ...event, timestamp: now() } satisfies StepEvent);
}

export function calculateValueScore(reputation: number, price: number): number {
  return (reputation * reputation) / (price * 10_000);
}

function ruleBasedPlanner(query: string, depth: number): PlannedTask[] {
  const q = query.toLowerCase();

  if (depth > 0) {
    return [
      { agent: 'Summarizer', route: '/api/summarize', payload: { text: query } },
      { agent: 'SentimentAI', route: '/api/sentiment', payload: { text: query } },
    ];
  }

  if (q.includes('research')) {
    return [{ agent: 'DeepResearch', route: '/api/agent/research', payload: { topic: query } }];
  }
  if (q.includes('code')) {
    return [{ agent: 'CodingAgent', route: '/api/agent/code', payload: { task: query } }];
  }
  if (q.includes('translate')) {
    return [{ agent: 'TranslateBot', route: '/api/agent/translate', payload: { text: query, target: 'es' } }];
  }
  if (q.includes('weather')) {
    return [{ agent: 'WeatherBot', route: '/api/weather', payload: { location: 'Bengaluru' } }];
  }

  return [{ agent: 'Summarizer', route: '/api/summarize', payload: { text: query } }];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function planWithQvacEmbeddings(query: string, depth: number): Promise<PlannedTask[]> {
  if ((process.env.QVAC_EMBED_ENABLED ?? 'false').toLowerCase() !== 'true') {
    return [];
  }
  if (depth > 0) {
    return [];
  }

  const descriptions = AGENTS.map((agent) => `${agent.name}: ${agent.description} (${agent.category})`);
  const embeddings = await runQvacEmbedding([query, ...descriptions]).catch(() => []);
  if (embeddings.length !== descriptions.length + 1) {
    return [];
  }

  const queryEmbedding = embeddings[0];
  const scored = AGENTS.map((agent, index) => ({
    agent,
    score: cosineSimilarity(queryEmbedding, embeddings[index + 1] ?? []),
  }));
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]?.agent;
  if (!best) {
    return [];
  }

  return [{ agent: best.name, route: best.path, payload: { task: query, query } }];
}

function buildPlannerPrompt(query: string, depth: number): { system: string; user: string } {
  const agents = AGENTS.map((agent) => ({
    name: agent.name,
    snsDomain: agent.domain,
    path: agent.path,
    category: agent.category,
    token: agent.token,
    priceAtomic: agent.priceAtomic,
    recursive: agent.recursive,
    reputation: agent.reputation,
    description: agent.description,
  }));

  const system = `You are a planner for agent routing.\nReturn ONLY valid JSON: an array of tasks.\nEach task must be {"agent":"Name","route":"/api/...","payload":{...}}.\nUse only agents from the provided list.\nIf depth > 0, prefer non-recursive specialists.\nNo markdown, no prose.`;
  const user = JSON.stringify({ query, depth, agents });

  return { system, user };
}

function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON array found in LLM response');
  }
  const raw = text.slice(start, end + 1);
  return JSON.parse(raw);
}

function normalizeTasks(raw: unknown): PlannedTask[] {
  if (!Array.isArray(raw)) return [];
  const tasks: PlannedTask[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const agent = String((item as any).agent ?? '');
    const route = String((item as any).route ?? '');
    const payload = (item as any).payload ?? {};
    if (!agent || !route || typeof payload !== 'object') continue;
    const match = byName(agent);
    if (!match || match.path !== route) continue;
    tasks.push({ agent, route, payload: payload as Record<string, unknown> });
  }

  return tasks;
}

async function planWithGroq(query: string, depth: number): Promise<PlannedTask[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return [];
  const { system, user } = buildPlannerPrompt(query, depth);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as any;
    const content = String(payload?.choices?.[0]?.message?.content ?? '').trim();
    if (!content) return [];
    const parsed = extractJsonArray(content);
    return normalizeTasks(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

async function planWithAnthropic(query: string, depth: number): Promise<PlannedTask[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];
  const { system, user } = buildPlannerPrompt(query, depth);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.2,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as any;
    const content = String(payload?.content?.[0]?.text ?? '').trim();
    if (!content) return [];
    const parsed = extractJsonArray(content);
    return normalizeTasks(parsed);
  } finally {
    clearTimeout(timeout);
  }
}

async function planTasks(query: string, depth: number): Promise<PlannedTask[]> {
  const qvacTasks = await planWithQvacEmbeddings(query, depth).catch(() => []);
  if (qvacTasks.length > 0) return qvacTasks;

  const groqTasks = await planWithGroq(query, depth).catch(() => []);
  if (groqTasks.length > 0) return groqTasks;

  const anthropicTasks = await planWithAnthropic(query, depth).catch(() => []);
  if (anthropicTasks.length > 0) return anthropicTasks;

  return ruleBasedPlanner(query, depth);
}

function parsePayerSecret(secret: string): Uint8Array {
  if (!secret) {
    return Keypair.generate().secretKey;
  }
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) {
    return Uint8Array.from(JSON.parse(trimmed));
  }
  try {
    return bs58.decode(trimmed);
  } catch {
    return Uint8Array.from(Buffer.from(trimmed, 'base64'));
  }
}

function chooseAgent(agentName: string): AgentDefinition {
  const candidates = AGENTS.filter((a) => a.name === agentName);
  if (candidates.length === 0) {
    throw new Error(`Agent not found: ${agentName}`);
  }
  return candidates.sort((a, b) => calculateValueScore(b.reputation, b.priceAtomic) - calculateValueScore(a.reputation, a.priceAtomic))[0];
}

export async function runOrchestrator(
  query: string,
  emitter: EventEmitter,
  budget = 0.01,
  depth = 0,
  context: OrchestratorContext = {},
  networkHint?: string,
): Promise<string> {
  const requestId = context.requestId ?? randomUUID();
  const runJobId = randomUUID();
  const parentJobId = context.parentJobId;

  const netConfig = networkHint ? resolveNetworkConfig(networkHint) : {
    solanaRpcUrl: serverConfig.solanaRpcUrl,
    solanaCluster: serverConfig.solanaCluster,
    palmUsdMint: serverConfig.palmUsdMint,
    covalentChain: 'solana-devnet',
    explorerCluster: '?cluster=devnet',
  };

  emit(emitter, {
    type: 'MANAGER_PLANNING',
    depth,
    message: query,
    requestId,
    jobId: runJobId,
    parentJobId,
    sessionId: context.sessionId,
  });
  const tasks = await planTasks(query, depth);
  emit(emitter, {
    type: 'PLAN_CREATED',
    depth,
    message: JSON.stringify(tasks),
    requestId,
    jobId: runJobId,
    parentJobId,
    sessionId: context.sessionId,
  });

  let spentPalm = 0;
  const parts: string[] = [];

  const payerSecret = parsePayerSecret(serverConfig.payerSecretKey);
  const payerPublicKey = Keypair.fromSecretKey(payerSecret).publicKey.toBase58();
  const signer = new PaymentSigner({
    connection: new Connection(netConfig.solanaRpcUrl, 'confirmed'),
    keypairSecretKey: payerSecret,
    palmUsdMint: new PublicKey(netConfig.palmUsdMint),
    registryProgramId:
      serverConfig.aldorProgramId && serverConfig.aldorProgramId !== '11111111111111111111111111111111'
        ? new PublicKey(serverConfig.aldorProgramId)
        : undefined,
  });

  for (const task of tasks) {
    const agent = chooseAgent(task.agent);
    const taskJobId = randomUUID();
    const palmCost = agent.token === 'PALM_USD' ? agent.priceAtomic / 1_000_000 : 0;

    if (spentPalm + palmCost > budget) {
      emit(emitter, {
        type: 'BUDGET_EXCEEDED',
        depth,
        agent: agent.name,
        message: 'Budget remaining is smaller than specialist price.',
        requestId,
        jobId: taskJobId,
        parentJobId: runJobId,
        sessionId: context.sessionId,
      });
      continue;
    }

    emit(emitter, {
      type: 'SNS_RESOLVING',
      depth,
      agent: agent.name,
      domain: agent.domain,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });
    let resolved: string;
    try {
      resolved = await resolveRecipientStealthKey(agent.domain, new Connection(netConfig.solanaRpcUrl, 'confirmed'));
    } catch (error: any) {
      emit(emitter, {
        type: 'SPECIALIST_FAILED',
        depth,
        agent: agent.name,
        domain: agent.domain,
        message: `SNS_RESOLUTION_FAILED: ${error?.message ?? String(error)}`,
        requestId,
        jobId: taskJobId,
        parentJobId: runJobId,
        sessionId: context.sessionId,
      });
      continue;
    }
    emit(emitter, {
      type: 'SNS_RESOLVED',
      depth,
      agent: agent.name,
      domain: agent.domain,
      message: resolved ? 'stealth key resolved (hidden)' : 'stealth key resolution failed',
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });

    const paid = createPaidAxios({
      signChallenge: (challenge) => {
        if (serverConfig.mockPayments) {
          return Promise.resolve({
            signature: `mock-umbra-${Date.now()}`,
            ephemeralKey: Keypair.generate().publicKey.toBase58(),
            payer: payerPublicKey,
            amount: challenge.maxAmountRequired,
            asset: challenge.asset,
            resource: challenge.resource,
          });
        }
        return signer.signChallenge(challenge);
      },
      budget: {
        maxDepth: 3,
        budgetRemaining: String(Math.max(budget - spentPalm, 0)),
      },
    });

    emit(emitter, {
      type: 'UMBRA_TRANSFER_INITIATED',
      depth,
      agent: agent.name,
      message: 'payment flow started',
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });

    let response;
    try {
      response = await paid.post(`${serverConfig.serverBaseUrl}${agent.path}`, task.payload, {
        headers: {
          'X-Aldor-Max-Depth': String(depth),
          'X-Aldor-Budget-Remaining': String(Math.max(budget - spentPalm, 0)),
          'X-Aldor-Request-Id': requestId,
          'X-Aldor-Job-Id': taskJobId,
          'X-Aldor-Parent-Job-Id': runJobId,
          'X-Aldor-Session': context.sessionId ?? '',
        },
      });
    } catch (error: any) {
      emit(emitter, {
        type: 'SPECIALIST_FAILED',
        depth,
        agent: agent.name,
        domain: agent.domain,
        message: error?.message ?? String(error),
        requestId,
        jobId: taskJobId,
        parentJobId: runJobId,
        sessionId: context.sessionId,
      });
      continue;
    }

    const responseText = typeof response.data?.result === 'string' ? response.data.result : JSON.stringify(response.data);
    parts.push(`${agent.name}: ${responseText}`);

    const txSig =
      (response.config.headers as any)?.['X-Aldor-Payment-Signature'] ??
      (response.config.headers as any)?.['X-Payment-Signature'] ??
      null;
    emit(emitter, {
      type: 'UMBRA_TRANSFER_CONFIRMED',
      depth,
      agent: agent.name,
      txSignature: typeof txSig === 'string' ? txSig : undefined,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });
    spentPalm += palmCost;

    emit(emitter, {
      type: 'X402_SETTLED',
      depth,
      agent: agent.name,
      txSignature: typeof txSig === 'string' ? txSig : undefined,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });
    await recordJobOutcomeOnChain(agent.domain, true);
  }

  const result = parts.join('\n');
  emit(emitter, {
    type: 'RESULT_COMPOSED',
    depth,
    message: result,
    requestId,
    jobId: runJobId,
    parentJobId,
    sessionId: context.sessionId,
  });
  return result;
}

export function getAgentRegistry() {
  return AGENTS.map((agent) => ({
    name: agent.name,
    domain: agent.domain,
    priceDisplay: agent.token === 'SOL' ? `${agent.priceAtomic / 1_000_000_000} SOL` : `${(agent.priceAtomic / 1_000_000).toFixed(4)} Palm USD`,
    recursive: agent.recursive,
    reputation: agent.reputation,
    path: agent.path,
    category: agent.category,
  }));
}
