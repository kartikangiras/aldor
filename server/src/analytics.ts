import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { serverConfig } from './config.js';
import { AGENTS } from './agents.js';
import { getPaymentStats, listPayments } from './ledger.js';
import type { PaymentRecord } from './ledger.js';

export interface PaymentActivity {
  recentPayments: Array<{
    hash: string;
    timestamp: string;
    kind: string;
    agent: string;
    amount: number;
    token: string;
    depth: number;
    payer?: string;
  }>;
  stats: {
    totalPayments: number;
    uniqueAgents: number;
    totalVolumeSol: string;
    totalVolumePalm: string;
    palmVolumeUsd: number;
  };
  agentBalances: Array<{
    agent: string;
    address: string;
    solBalance: string;
    palmBalance: string;
  }>;
  velocity: number[];
}

function getConnection(): Connection {
  return new Connection(serverConfig.solanaRpcUrl, 'confirmed');
}

export async function fetchPaymentActivity(): Promise<PaymentActivity> {
  const connection = getConnection();
  const walletMap = (() => {
    const raw = process.env.ALDOR_AGENT_WALLET_MAP;
    if (!raw) return {} as Record<string, string>;
    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      return {} as Record<string, string>;
    }
  })();

  // 1. Real recent payments from in-memory ledger
  const payments = listPayments(20, 0);
  const recentPayments = payments.map((p: PaymentRecord) => ({
    hash: p.txSignature ?? p.id.slice(0, 16),
    timestamp: p.timestamp,
    kind: p.depth > 0 ? 'A2A_PAYMENT' : 'X402_SETTLED',
    agent: p.snsDomain,
    amount: p.amountAtomic,
    token: p.token,
    depth: p.depth,
    payer: p.payer,
  }));

  // 2. Stats from real payment data
  const stats = getPaymentStats();
  const palmVolumeUsd = Number(stats.totalsByToken.PALM_USD) / 1_000_000;

  // 3. Agent balances from Solana RPC
  const agentBalances = await Promise.all(
    AGENTS.map(async (agent) => {
      const address = walletMap[agent.domain];
      if (!address) {
        return {
          agent: agent.name,
          address: 'N/A',
          solBalance: '0',
          palmBalance: '0',
        };
      }

      try {
        const pubkey = new PublicKey(address);
        
        // SOL balance
        const solBalanceLamports = await connection.getBalance(pubkey);
        const solBalance = (solBalanceLamports / 1_000_000_000).toFixed(4);

        // PALM_USD token balance
        let palmBalance = '0';
        try {
          const mint = new PublicKey(serverConfig.palmUsdMint);
          const ata = getAssociatedTokenAddressSync(mint, pubkey);
          const tokenAccount = await connection.getTokenAccountBalance(ata);
          palmBalance = tokenAccount.value.uiAmountString ?? '0';
        } catch {
          // ATA doesn't exist or no balance
          palmBalance = '0';
        }

        return {
          agent: agent.name,
          address,
          solBalance,
          palmBalance,
        };
      } catch {
        return {
          agent: agent.name,
          address,
          solBalance: '0',
          palmBalance: '0',
        };
      }
    }),
  );

  // 4. Velocity: tx count per 5-min bucket over last hour
  const now = Date.now();
  const buckets = new Array(12).fill(0);
  payments.forEach((p: PaymentRecord) => {
    const t = new Date(p.timestamp).getTime();
    const minutesAgo = (now - t) / 60000;
    if (minutesAgo >= 0 && minutesAgo < 60) {
      const bucket = Math.min(11, Math.floor(minutesAgo / 5));
      buckets[11 - bucket] += 1;
    }
  });

  return {
    recentPayments,
    stats: {
      totalPayments: stats.totalPayments,
      uniqueAgents: stats.uniqueAgents,
      totalVolumeSol: stats.totalsByToken.SOL,
      totalVolumePalm: stats.totalsByToken.PALM_USD,
      palmVolumeUsd,
    },
    agentBalances,
    velocity: buckets,
  };
}
