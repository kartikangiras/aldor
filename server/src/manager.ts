import { EventEmitter } from 'node:events';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createPaidAxios, PaymentSigner, resolveAgent } from '../../sdk/src/index.js';
import { AGENTS, byName } from './agents.js';
import { serverConfig } from './config.js';
import type { AgentDefinition, StepEvent } from './phase3-types.js';

interface PlannedTask {
  agent: string;
  route: string;
  payload: Record<string, unknown>;
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

function planner(query: string, depth: number): PlannedTask[] {
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

function parsePayerSecret(secret: string): Uint8Array {
  if (!secret) {
    return Keypair.generate().secretKey;
  }
  if (secret.trim().startsWith('[')) {
    return Uint8Array.from(JSON.parse(secret));
  }
  return Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secret, 'base64'))).secretKey;
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
): Promise<string> {
  emit(emitter, { type: 'MANAGER_PLANNING', depth, message: query });
  const tasks = planner(query, depth);
  emit(emitter, { type: 'PLAN_CREATED', depth, message: JSON.stringify(tasks) });

  let spentPalm = 0;
  const parts: string[] = [];

  const signer = new PaymentSigner({
    connection: new Connection(serverConfig.solanaRpcUrl, 'confirmed'),
    keypairSecretKey: parsePayerSecret(serverConfig.payerSecretKey),
    palmUsdMint: new PublicKey(serverConfig.palmUsdMint),
  });

  for (const task of tasks) {
    const agent = chooseAgent(task.agent);
    const palmCost = agent.token === 'PALM_USD' ? agent.priceAtomic / 1_000_000 : 0;

    if (spentPalm + palmCost > budget) {
      emit(emitter, {
        type: 'BUDGET_EXCEEDED',
        depth,
        agent: agent.name,
        cost: palmCost,
        token: agent.token,
        spent: spentPalm,
      });
      continue;
    }

    const resolved = await resolveAgent(agent.domain, process.env);
    emit(emitter, { type: 'SNS_RESOLVED', depth, agent: agent.name, domain: agent.domain, message: resolved, spent: spentPalm });

    const paid = createPaidAxios({
      signChallenge: (challenge) => signer.signChallenge(challenge),
      budget: {
        maxDepth: 3,
        budgetRemaining: String(Math.max(budget - spentPalm, 0)),
      },
    });

    emit(emitter, {
      type: 'X402_INITIATED',
      depth,
      agent: agent.name,
      token: agent.token,
      cost: agent.priceAtomic,
      spent: spentPalm,
    });

    const response = await paid.post(`${serverConfig.serverBaseUrl}${agent.path}`, task.payload, {
      headers: {
        'X-Aldor-Max-Depth': String(depth),
        'X-Aldor-Budget-Remaining': String(Math.max(budget - spentPalm, 0)),
      },
    });

    const responseText = typeof response.data?.result === 'string' ? response.data.result : JSON.stringify(response.data);
    parts.push(`${agent.name}: ${responseText}`);

    const txSig = (response.config.headers as any)?.['X-Payment'] ?? null;
    spentPalm += palmCost;

    emit(emitter, {
      type: 'X402_SETTLED',
      depth,
      agent: agent.name,
      cost: agent.priceAtomic,
      token: agent.token,
      spent: spentPalm,
      txSignature: typeof txSig === 'string' ? txSig : undefined,
    });
  }

  const result = parts.join('\n');
  emit(emitter, { type: 'RESULT_COMPOSED', depth, spent: spentPalm, message: result });
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
