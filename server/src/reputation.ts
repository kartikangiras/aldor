import { Connection, PublicKey, TransactionInstruction, Transaction, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { createHash } from 'node:crypto';
import { serverConfig } from './config.js';

function parsePayerSecret(secret: string): Uint8Array {
  if (!secret) return Keypair.generate().secretKey;
  if (secret.trim().startsWith('[')) return Uint8Array.from(JSON.parse(secret));
  return Uint8Array.from(Buffer.from(secret, 'base64'));
}

function discriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8);
}

function encodeRecordJobOutcome(success: boolean): Buffer {
  return Buffer.concat([discriminator('record_job_outcome'), Buffer.from([success ? 1 : 0])]);
}

export async function recordJobOutcomeOnChain(_snsDomain: string, success: boolean): Promise<string | null> {
  if ((process.env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return `mock-reputation-${Date.now()}`;
  }

  const programId = serverConfig.aldorProgramId;
  if (!programId || programId === '11111111111111111111111111111111') {
    return null;
  }

  try {
    const payerSecret = parsePayerSecret(serverConfig.payerSecretKey);
    const payer = Keypair.fromSecretKey(payerSecret);
    const connection = new Connection(serverConfig.solanaRpcUrl, 'confirmed');
    const ix = new TransactionInstruction({
      programId: new PublicKey(programId),
      keys: [],
      data: encodeRecordJobOutcome(success),
    });
    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    return sig;
  } catch {
    return null;
  }
}
