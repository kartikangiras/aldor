import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createPaidAxios, PaymentSigner, resolveRecipientStealthKey } from '../../sdk/src/index.js';
import { AGENTS, byName } from './agents.js';
import { serverConfig } from './config.js';
import { resolveNetworkConfig } from './network.js';
import type { AgentDefinition, StepEvent, X402Challenge } from './eventtypes.js';
import { recordJobOutcomeOnChain } from './reputation.js';
import { runQvacEmbedding } from './qvac.js';
import { requestWalletPayment } from './walletPayments.js';
import { getAgentWalletForDomain } from './wallets.js';

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

function emit(emitter: EventEmitter | undefined, event: Omit<StepEvent, 'timestamp'>): void {
  if (!emitter) return;
  emitter.emit('step', { ...event, timestamp: now() } satisfies StepEvent);
}

export function calculateValueScore(reputation: number, price: number): number {
  return (reputation * reputation) / (price * 10_000);
}

/**
 * Autonomous hiring decision based on reputation and cost.
 * Returns the best agent for a given capability need.
 */
export function autonomousHiringDecision(
  candidates: AgentDefinition[],
  budgetRemaining: number,
  preferRecursive = false,
): AgentDefinition | null {
  const affordable = candidates.filter((a) => {
    const cost = a.token === 'PALM_USD' ? a.priceAtomic / 1_000_000 : a.priceAtomic / 1_000_000_000;
    return cost <= budgetRemaining;
  });

  if (affordable.length === 0) return null;

  const scored = affordable.map((agent) => ({
    agent,
    score: calculateValueScore(agent.reputation, agent.priceAtomic),
    recursiveMatch: agent.recursive === preferRecursive ? 1 : 0,
  }));

  // Sort by recursive match first, then by value score
  scored.sort((a, b) => {
    if (b.recursiveMatch !== a.recursiveMatch) return b.recursiveMatch - a.recursiveMatch;
    return b.score - a.score;
  });

  return scored[0]?.agent ?? null;
}

function ruleBasedPlanner(query: string, depth: number): PlannedTask[] {
  const q = query.toLowerCase();

  if (depth > 0) {
    // For recursive calls, use autonomous hiring to pick best summarizer + sentiment
    const nlpAgents = AGENTS.filter((a) => a.category === 'nlp');
    const bestNlp = autonomousHiringDecision(nlpAgents, 0.01, false);
    if (bestNlp) {
      return [
        { agent: bestNlp.name, route: bestNlp.path, payload: { text: query } },
      ];
    }
    return [
      { agent: 'Summarizer', route: '/api/summarize', payload: { text: query } },
      { agent: 'SentimentAI', route: '/api/sentiment', payload: { text: query } },
    ];
  }

  if (q.includes('research')) {
    const researchAgents = AGENTS.filter((a) => a.category === 'research');
    const best = autonomousHiringDecision(researchAgents, 0.01, true);
    if (best) {
      return [{ agent: best.name, route: best.path, payload: { topic: query } }];
    }
    return [{ agent: 'DeepResearch', route: '/api/agent/research', payload: { topic: query } }];
  }
  if (q.includes('code')) {
    const codeAgents = AGENTS.filter((a) => a.category === 'code');
    const best = autonomousHiringDecision(codeAgents, 0.01, true);
    if (best) {
      return [{ agent: best.name, route: best.path, payload: { task: query } }];
    }
    return [{ agent: 'CodingAgent', route: '/api/agent/code', payload: { task: query } }];
  }
  if (q.includes('translate')) {
    const best = autonomousHiringDecision(
      AGENTS.filter((a) => a.category === 'nlp'),
      0.01,
      false,
    );
    if (best) {
      return [{ agent: best.name, route: best.path, payload: { text: query, target: 'es' } }];
    }
    return [{ agent: 'TranslateBot', route: '/api/agent/translate', payload: { text: query, target: 'es' } }];
  }
  if (q.includes('weather')) {
    const best = autonomousHiringDecision(
      AGENTS.filter((a) => a.category === 'utility'),
      0.01,
      false,
    );
    if (best) {
      return [{ agent: best.name, route: best.path, payload: { location: 'Bengaluru' } }];
    }
    return [{ agent: 'WeatherBot', route: '/api/weather', payload: { location: 'Bengaluru' } }];
  }

  // Default: hire best nlp agent
  const bestNlp = autonomousHiringDecision(
    AGENTS.filter((a) => a.category === 'nlp'),
    0.01,
    false,
  );
  if (bestNlp) {
    return [{ agent: bestNlp.name, route: bestNlp.path, payload: { text: query } }];
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

  const system = `You are a planner for agent routing.
Return ONLY valid JSON: an array of tasks.
Each task must be {"agent":"Name","route":"/api/...","payload":{...}}.
Use only agents from the provided list.
If depth > 0, prefer non-recursive specialists.
No markdown, no prose.`;
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
        model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
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

async function planWithGemini(query: string, depth: number): Promise<PlannedTask[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];
  const { system, user } = buildPlannerPrompt(query, depth);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.2,
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as any;
    const content = String(payload?.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
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
        model: process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022',
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

async function planTasks(query: string, depth: number, emitter?: EventEmitter, ctx?: { requestId?: string; jobId?: string; parentJobId?: string; sessionId?: string }): Promise<PlannedTask[]> {
  if ((process.env.QVAC_EMBED_ENABLED ?? 'false').toLowerCase() === 'true' && depth === 0) {
    emit(emitter, {
      type: 'QVAC_EMBEDDING',
      depth,
      message: 'Running local QVAC embedding to match query against agent descriptions',
      requestId: ctx?.requestId,
      jobId: ctx?.jobId,
      parentJobId: ctx?.parentJobId,
      sessionId: ctx?.sessionId,
    });
    const qvacTasks = await planWithQvacEmbeddings(query, depth).catch((err) => {
      emit(emitter, {
        type: 'QVAC_EMBEDDING_FAILED',
        depth,
        message: err?.message ?? 'QVAC embedding failed',
        requestId: ctx?.requestId,
        jobId: ctx?.jobId,
        parentJobId: ctx?.parentJobId,
        sessionId: ctx?.sessionId,
      });
      return [] as PlannedTask[];
    });
    if (qvacTasks.length > 0) {
      emit(emitter, {
        type: 'QVAC_MATCHED',
        depth,
        agent: qvacTasks[0]?.agent,
        message: `QVAC selected ${qvacTasks[0]?.agent} via cosine similarity`,
        requestId: ctx?.requestId,
        jobId: ctx?.jobId,
        parentJobId: ctx?.parentJobId,
        sessionId: ctx?.sessionId,
      });
      return qvacTasks;
    }
    emit(emitter, {
      type: 'QVAC_SKIPPED',
      depth,
      message: 'QVAC returned no match, falling back to LLM planner',
      requestId: ctx?.requestId,
      jobId: ctx?.jobId,
      parentJobId: ctx?.parentJobId,
      sessionId: ctx?.sessionId,
    });
  }

  // Chain: Groq -> Gemini -> Anthropic -> ruleBased
  const groqTasks = await planWithGroq(query, depth).catch(() => []);
  if (groqTasks.length > 0) return groqTasks;

  const geminiTasks = await planWithGemini(query, depth).catch(() => []);
  if (geminiTasks.length > 0) return geminiTasks;

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

function buildX402Challenge(agent: AgentDefinition, netConfig: any): X402Challenge {
  const mint = agent.token === 'SOL' ? 'SOL' : netConfig.palmUsdMint;
  const recipientWallet = getAgentWalletForDomain(agent.domain) ?? undefined;
  return {
    x402Version: 1,
    recipient: agent.domain,
    amount: String(agent.priceAtomic),
    asset: mint,
    network: netConfig.solanaCluster === 'mainnet' ? 'solana-mainnet' : 'solana-devnet',
    expiresAt: Date.now() + 60_000,
    description: agent.description,
    resource: `${serverConfig.serverBaseUrl}${agent.path}`,
    paymentMode: serverConfig.paymentMode,
    recipientWallet,
    mint,
    decimals: agent.token === 'SOL' ? 9 : 6,
  };
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

  const isWalletMode = serverConfig.paymentMode === 'wallet';

  emit(emitter, {
    type: 'MANAGER_PLANNING',
    depth,
    message: query,
    requestId,
    jobId: runJobId,
    parentJobId,
    sessionId: context.sessionId,
  });
  const tasks = await planTasks(query, depth, emitter, { requestId, jobId: runJobId, parentJobId, sessionId: context.sessionId });
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

  // Set up server signer for non-wallet mode
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

    // ── A2A Hire Initiated ──
    emit(emitter, {
      type: 'A2A_HIRE_INITIATED',
      depth,
      agent: agent.name,
      domain: agent.domain,
      cost: palmCost,
      token: agent.token,
      message: `Hiring ${agent.name} for ${formatPrice(agent)}`,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });

    emit(emitter, {
      type: 'REPUTATION_CHECK',
      depth,
      agent: agent.name,
      message: `Reputation: ${(agent.reputation / 100).toFixed(0)}%, Value score: ${calculateValueScore(agent.reputation, agent.priceAtomic).toFixed(2)}`,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });

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

    // ── Payment Flow ──
    let paymentSignature: string | undefined;

    if (isWalletMode) {
      // Wallet-signed flow: emit challenge and wait for wallet payment
      const challenge = buildX402Challenge(agent, netConfig);
      try {
        const proof = await requestWalletPayment(challenge, emitter, context.sessionId, 120_000);
        paymentSignature = proof.umbraSignature;
        emit(emitter, {
          type: 'WALLET_SIGN_CONFIRMED',
          depth,
          agent: agent.name,
          txSignature: paymentSignature,
          message: 'Wallet signed payment confirmed',
          requestId,
          jobId: taskJobId,
          parentJobId: runJobId,
          sessionId: context.sessionId,
        });
      } catch (error: any) {
        emit(emitter, {
          type: 'SPECIALIST_FAILED',
          depth,
          agent: agent.name,
          domain: agent.domain,
          message: `WALLET_PAYMENT_FAILED: ${error?.message ?? String(error)}`,
          requestId,
          jobId: taskJobId,
          parentJobId: runJobId,
          sessionId: context.sessionId,
        });
        continue;
      }
    }

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
        if (isWalletMode && paymentSignature) {
          // Return pre-signed proof from wallet
          return Promise.resolve({
            signature: paymentSignature,
            ephemeralKey: payerPublicKey,
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
      const headers: Record<string, string> = {
        'X-Aldor-Max-Depth': String(depth),
        'X-Aldor-Budget-Remaining': String(Math.max(budget - spentPalm, 0)),
        'X-Aldor-Request-Id': requestId,
        'X-Aldor-Job-Id': taskJobId,
        'X-Aldor-Parent-Job-Id': runJobId,
        'X-Aldor-Session': context.sessionId ?? '',
      };
      if (paymentSignature) {
        headers['X-Aldor-Payment-Signature'] = paymentSignature;
        headers['X-Aldor-Payer'] = payerPublicKey;
      }
      console.log(`[Manager] Calling ${agent.path} for ${agent.name} with payment sig: ${paymentSignature?.slice(0, 16) ?? 'none'}`);
      response = await paid.post(`${serverConfig.serverBaseUrl}${agent.path}`, task.payload, { headers });
      console.log(`[Manager] ${agent.name} responded: ${JSON.stringify(response.data).slice(0, 200)}`);
    } catch (error: any) {
      const raw = error?.message ?? String(error);
      const isUmbraError =
        raw.includes('Umbra') ||
        raw.includes('Umbra deposit failed') ||
        raw.includes('stealth key') ||
        raw.includes('Cannot resolve stealth key');
      const isSolError =
        raw.includes('SOL transfer failed') ||
        raw.includes('Cannot resolve SOL recipient') ||
        raw.includes('insufficient funds');
      const isPaymentError = raw.includes('402') || raw.includes('PAYMENT') || raw.includes('challenge');
      const contextPrefix = isUmbraError
        ? '[UMBRA_TRANSFER_FAILED] '
        : isSolError
        ? '[SOL_TRANSFER_FAILED] '
        : isPaymentError
        ? '[X402_PAYMENT_FAILED] '
        : '[SPECIALIST_FAILED] ';
      emit(emitter, {
        type: 'SPECIALIST_FAILED',
        depth,
        agent: agent.name,
        domain: agent.domain,
        message: `${contextPrefix}${raw}`,
        requestId,
        jobId: taskJobId,
        parentJobId: runJobId,
        sessionId: context.sessionId,
      });
      continue;
    }

    const responseText = typeof response.data?.result === 'string' ? response.data.result : JSON.stringify(response.data);
    parts.push(`${agent.name}: ${responseText}`);

    emit(emitter, {
      type: 'AGENT_RESPONDED',
      depth,
      agent: agent.name,
      domain: agent.domain,
      message: responseText,
      requestId,
      jobId: taskJobId,
      parentJobId: runJobId,
      sessionId: context.sessionId,
    });

    const txSig =
      (response.config.headers as any)?.['X-Aldor-Payment-Signature'] ??
      paymentSignature ??
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

    // ── A2A Hire Completed ──
    emit(emitter, {
      type: 'A2A_HIRE_COMPLETED',
      depth,
      agent: agent.name,
      domain: agent.domain,
      message: `Hire completed. Result length: ${responseText.length} chars`,
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

function formatPrice(agent: AgentDefinition): string {
  if (agent.token === 'SOL') {
    return `${agent.priceAtomic / 1_000_000_000} SOL`;
  }
  return `${(agent.priceAtomic / 1_000_000).toFixed(4)} Palm USD`;
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
