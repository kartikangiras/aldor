import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createPaidAxios, PaymentSigner } from '../../sdk/src/index.js';

type StepEvent = {
  type: string;
  timestamp: string;
  depth?: number;
  agent?: string;
  domain?: string;
  cost?: number;
  token?: string;
  spent?: number;
  txSignature?: string;
  message?: string;
};

interface CliFlags {
  budget: number;
  maxDepth: number;
  mockPayments: boolean;
  baseUrl: string;
}

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    budget: Number(process.env.ALDOR_CLI_BUDGET ?? 0.01),
    maxDepth: Number(process.env.ALDOR_CLI_MAX_DEPTH ?? 3),
    mockPayments: (process.env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true',
    baseUrl: process.env.ALDOR_SERVER_URL ?? 'http://127.0.0.1:3000',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--budget') flags.budget = Number(argv[i + 1]);
    if (arg === '--max-depth') flags.maxDepth = Number(argv[i + 1]);
    if (arg === '--mock-payments') flags.mockPayments = true;
    if (arg === '--base-url') flags.baseUrl = String(argv[i + 1]);
  }

  return flags;
}

function parseSecret(secret: string): Uint8Array {
  if (!secret) return Keypair.generate().secretKey;
  const trimmed = secret.trim();
  if (trimmed.startsWith('[')) return Uint8Array.from(JSON.parse(trimmed));
  try {
    return bs58.decode(trimmed);
  } catch {
    return Uint8Array.from(Buffer.from(trimmed, 'base64'));
  }
}

function formatStep(event: StepEvent): string {
  const depth = Number.isFinite(event.depth) ? Number(event.depth) : 0;
  const indent = '  '.repeat(Math.max(depth, 0));
  const parts = [`${indent}[${event.type}]`];
  if (event.agent) parts.push(`agent=${event.agent}`);
  if (event.domain) parts.push(`domain=${event.domain}`);
  if (event.cost !== undefined) parts.push(`cost=${event.cost}`);
  if (event.token) parts.push(`token=${event.token}`);
  if (event.spent !== undefined) parts.push(`spent=${event.spent}`);
  if (event.txSignature) parts.push(`tx=${event.txSignature}`);
  if (event.message) parts.push(`msg=${event.message}`);
  return parts.join(' | ');
}

async function consumeSse(url: string, onEvent: (step: StepEvent) => void): Promise<() => void> {
  const controller = new AbortController();
  const response = await fetch(url, { signal: controller.signal });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to connect SSE: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';

      for (const chunk of chunks) {
        const line = chunk
          .split('\n')
          .find((row) => row.startsWith('data: '));
        if (!line) continue;
        const payload = line.slice(6);
        try {
          const event = JSON.parse(payload) as StepEvent;
          onEvent(event);
        } catch {
          // ignore malformed frame
        }
      }
    }
  })().catch(() => {});

  return () => controller.abort();
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const rl = createInterface({ input, output });

  const signatures = new Set<string>();
  let hireCount = 0;

  const secret = parseSecret(process.env.ALDOR_PAYER_SECRET_KEY ?? '');
  const signer = new PaymentSigner({
    connection: new Connection(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed'),
    keypairSecretKey: secret,
    palmUsdMint: new PublicKey(process.env.PALM_USD_MINT ?? 'So11111111111111111111111111111111111111112'),
  });

  const paid = createPaidAxios({
    signChallenge: async (challenge) => {
      if (flags.mockPayments) {
        return {
          signature: `mock-${Date.now()}`,
          payer: Keypair.fromSecretKey(secret).publicKey.toBase58(),
          amount: challenge.maxAmountRequired,
          asset: challenge.asset,
          resource: challenge.resource,
        };
      }
      return signer.signChallenge(challenge);
    },
    budget: {
      maxDepth: flags.maxDepth,
      budgetRemaining: String(flags.budget),
    },
  });

  const closeSse = await consumeSse(`${flags.baseUrl}/api/agent/events`, (event) => {
    console.log(formatStep(event));
    if (event.type === 'X402_SETTLED') {
      hireCount += 1;
      if (event.txSignature) signatures.add(event.txSignature);
    }
  });

  console.log('Aldor CLI ready. Type a query or "exit".');

  while (true) {
    const query = (await rl.question('aldor> ')).trim();
    if (!query) continue;
    if (query.toLowerCase() === 'exit') break;

    try {
      const response = await paid.post(`${flags.baseUrl}/api/agent/query`, {
        query,
        budget: flags.budget,
      }, {
        headers: {
          'X-Aldor-Max-Depth': String(flags.maxDepth),
          'X-Aldor-Budget-Remaining': String(flags.budget),
        },
      });

      const result = typeof response.data?.result === 'string' ? response.data.result : JSON.stringify(response.data);
      console.log(`\nResult:\n${result}\n`);
      console.log(`Summary: hires=${hireCount}, budget=${flags.budget}`);
      if (signatures.size > 0) {
        console.log('Transactions:');
        for (const sig of signatures) {
          console.log(`- ${sig}`);
          console.log(`  https://explorer.solana.com/tx/${sig}?cluster=devnet`);
        }
      }
      console.log('');
    } catch (error: any) {
      console.error('Query failed:', error?.message ?? error);
    }
  }

  closeSse();
  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
