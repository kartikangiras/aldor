import anchorPkg from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import bs58 from 'bs58';
import idl from '../../sdk/src/aldorIdl.js';
import { AGENTS } from './agents.js';
import { serverConfig } from './config.js';
import { getStealthKeyForDomain } from './registry.js';

export interface SeedResult {
  created: string[];
  skipped: string[];
  errors: Array<{ snsDomain: string; error: string }>;
}

const { AnchorProvider, Program, Wallet, BN } = anchorPkg as typeof anchorPkg;

function parsePayerSecret(secret: string): Uint8Array {
  if (!secret) {
    throw new Error('ALDOR_PAYER_SECRET_KEY is required to seed the registry');
  }
  if (secret.trim().startsWith('[')) {
    return Uint8Array.from(JSON.parse(secret));
  }
  return Uint8Array.from(Buffer.from(secret, 'base64'));
}

function parseStealthKey(domain: string): Uint8Array {
  const key = getStealthKeyForDomain(domain);
  if (!key) {
    throw new Error(`Missing Umbra stealth key for ${domain}`);
  }
  return bs58.decode(key);
}

function deriveAgentPda(programId: PublicKey, snsDomain: string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('agent'), Buffer.from(snsDomain)], programId)[0];
}

export async function seedRegistryAgents(): Promise<SeedResult> {
  const connection = new Connection(serverConfig.solanaRpcUrl, 'confirmed');
  const payerSecret = parsePayerSecret(serverConfig.payerSecretKey);
  const payer = Keypair.fromSecretKey(payerSecret);
  const provider = new AnchorProvider(connection, new Wallet(payer), AnchorProvider.defaultOptions());
  const program = new Program(idl as Idl, provider);
  const programId = program.programId as PublicKey;

  const created: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ snsDomain: string; error: string }> = [];

  for (const agent of AGENTS) {
    const snsDomain = agent.domain;
    const stealthKey = parseStealthKey(snsDomain);
    const agentPda = deriveAgentPda(programId, snsDomain);

    try {
      await program.methods
        .registerAgent(
          snsDomain,
          Array.from(stealthKey),
          agent.name,
          agent.category,
          new BN(agent.priceAtomic),
          agent.recursive,
          [agent.category],
        )
        .accounts({
          agent: agentPda,
          owner: payer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      created.push(snsDomain);
    } catch (error: any) {
      const message = error?.message ?? String(error);
      if (message.includes('already in use') || message.includes('Account already exists')) {
        skipped.push(snsDomain);
      } else {
        errors.push({ snsDomain, error: message });
      }
    }
  }

  return { created, skipped, errors };
}
