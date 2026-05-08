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

async function executeWithUmbraPrivacySdk(
  mod: any,
  params: UmbraSendParams,
  env: NodeJS.ProcessEnv,
): Promise<UmbraSendResult> {
  const createSignerFromPrivateKeyBytes = pickFunction(mod, 'createSignerFromPrivateKeyBytes');
  const getUmbraClient = pickFunction(mod, 'getUmbraClient');
  const getUserRegistrationFunction = pickFunction(mod, 'getUserRegistrationFunction');
  const getPublicBalanceToEncryptedBalanceDirectDepositorFunction = pickFunction(
    mod,
    'getPublicBalanceToEncryptedBalanceDirectDepositorFunction',
  );

  if (
    !createSignerFromPrivateKeyBytes ||
    !getUmbraClient ||
    !getUserRegistrationFunction ||
    !getPublicBalanceToEncryptedBalanceDirectDepositorFunction
  ) {
    throw new Error('Umbra Privacy SDK exports are incomplete for adapter mode.');
  }

  const signer = await createSignerFromPrivateKeyBytes(params.payer.secretKey);
  const network = (env.SOLANA_CLUSTER ?? 'devnet').toLowerCase() === 'mainnet' ? 'mainnet' : 'devnet';
  const rpcUrl = env.SOLANA_RPC_URL;
  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL is required for Umbra Privacy SDK mode.');
  }

  const client = await getUmbraClient({
    signer,
    network,
    rpcUrl,
    rpcSubscriptionsUrl: env.SOLANA_RPC_SUBSCRIPTIONS_URL ?? rpcUrl.replace('https://', 'wss://'),
    indexerApiEndpoint: env.UMBRA_INDEXER_API_ENDPOINT,
  });

  const register = getUserRegistrationFunction({ client });
  try {
    await register();
  } catch {
    // registration is idempotent in Umbra SDK; ignore when already registered
  }

  const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
  const signature = await deposit(
    params.stealthPublicKey,
    params.assetMint.toBase58(),
    params.amount,
  );

  return {
    signature: String(signature),
    ephemeralKey: params.payer.publicKey.toBase58(),
  };
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
    const hasUmbraClient = Boolean(pickFunction(mod, 'getUmbraClient'));
    if (hasUmbraClient) {
      return executeWithUmbraPrivacySdk(mod, params, env);
    }
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

  // Umbra Privacy SDK does not currently expose a direct verify primitive compatible
  // with this adapter contract. In that case, we at least require the tx to exist.
  if (pickFunction(mod, 'getUmbraClient')) {
    const tx = await params.connection.getParsedTransaction(params.signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    return Boolean(tx && !tx.meta?.err);
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
