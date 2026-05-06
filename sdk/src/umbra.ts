import type { Connection, Keypair, PublicKey } from '@solana/web3.js';

export interface UmbraSendParams {
  connection: Connection;
  payer: Keypair;
  stealthPublicKey: string;
  assetMint: PublicKey;
  amount: bigint;
  memo?: string;
}

export interface UmbraSendResult {
  signature: string;
  ephemeralKey?: string;
}

export interface UmbraVerifyParams {
  connection: Connection;
  receiverSecretKey: Uint8Array;
  stealthPublicKey: string;
  assetMint: PublicKey;
  expectedAmount: bigint;
  signature: string;
  ephemeralKey?: string;
}

function getUmbraModuleName(env: NodeJS.ProcessEnv): string {
  return env.UMBRA_SDK_MODULE ?? 'umbra-sdk';
}

async function loadUmbraModule(env: NodeJS.ProcessEnv): Promise<any> {
  const moduleName = getUmbraModuleName(env);
  try {
    return await import(moduleName);
  } catch (error: any) {
    throw new Error(`Unable to load Umbra SDK module '${moduleName}': ${error?.message ?? String(error)}`);
  }
}

function pickFunction(mod: any, name: string): ((...args: any[]) => any) | undefined {
  return mod?.[name] ?? mod?.default?.[name] ?? mod?.Umbra?.[name];
}

export async function executeUmbraTransfer(
  params: UmbraSendParams,
  env: NodeJS.ProcessEnv = process.env,
): Promise<UmbraSendResult> {
  if ((env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return {
      signature: `mock-umbra-${Date.now()}`,
      ephemeralKey: params.payer.publicKey.toBase58(),
    };
  }

  const mod = await loadUmbraModule(env);
  const send = pickFunction(mod, 'send');
  if (!send) {
    throw new Error('Umbra SDK missing send() function');
  }

  const result = await send({
    connection: params.connection,
    payer: params.payer,
    stealthPublicKey: params.stealthPublicKey,
    assetMint: params.assetMint,
    amount: params.amount,
    memo: params.memo,
  });

  if (typeof result === 'string') {
    return { signature: result };
  }

  return {
    signature: String(result?.signature ?? result?.txSignature ?? ''),
    ephemeralKey: String(result?.ephemeralKey ?? result?.ephemeralPublicKey ?? ''),
  };
}

export async function verifyUmbraTransfer(
  params: UmbraVerifyParams,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if ((env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return true;
  }

  const mod = await loadUmbraModule(env);
  const verify = pickFunction(mod, 'verifyTransfer') ?? pickFunction(mod, 'verify');
  if (verify) {
    const result = await verify({
      connection: params.connection,
      receiverSecretKey: params.receiverSecretKey,
      stealthPublicKey: params.stealthPublicKey,
      assetMint: params.assetMint,
      expectedAmount: params.expectedAmount,
      signature: params.signature,
      ephemeralKey: params.ephemeralKey,
    });
    return Boolean(result);
  }

  const scan = pickFunction(mod, 'scan');
  if (!scan) {
    throw new Error('Umbra SDK missing verifyTransfer() or scan() function');
  }

  const results = await scan({
    connection: params.connection,
    receiverSecretKey: params.receiverSecretKey,
  });

  if (!Array.isArray(results)) {
    return false;
  }

  return results.some((entry) => {
    const sig = String(entry?.signature ?? entry?.txSignature ?? '');
    const amount = BigInt(String(entry?.amount ?? '0'));
    const asset = String(entry?.asset ?? entry?.mint ?? '');
    return sig === params.signature && amount >= params.expectedAmount && asset === params.assetMint.toBase58();
  });
}
