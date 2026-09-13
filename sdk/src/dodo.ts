/**
 * Dodo Payments integration — comprehensive auth probing.
 * Dodo's API auth is not well documented. We try every pattern.
 */

interface DodoDestinationDetails {
  [key: string]: unknown;
}

function getBaseUrl(env: NodeJS.ProcessEnv): string {
  return (env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com').replace(/\/$/, '');
}

function getApiKey(env: NodeJS.ProcessEnv): string | null {
  const key = env.DODO_API_KEY;
  if (!key || key === 'replace_me') return null;
  return key;
}

/**
 * Try every known auth pattern against the Dodo API.
 * Returns which one works, or detailed failure info.
 */
export async function probeDodoAuth(env: NodeJS.ProcessEnv = process.env): Promise<{
  ok: boolean;
  mode: 'test' | 'live';
  workingPattern: string | null;
  lastError: string;
  lastStatus: number;
  attempts: Array<{ pattern: string; status: number; error: string }>;
}> {
  const apiKey = getApiKey(env);
  if (!apiKey) {
    return {
      ok: false,
      mode: 'test',
      workingPattern: null,
      lastError: 'DODO_API_KEY missing',
      lastStatus: 0,
      attempts: [],
    };
  }

  const baseUrl = getBaseUrl(env);
  const mode = baseUrl.includes('test') ? 'test' : 'live';

  // Try multiple endpoints — Dodo API may or may not use /v1/ prefix
  const endpoints = ['/payments', '/products', '/health', '/v1/payments', '/v1/products', '/v1/health'];

  // Try every auth pattern known to payment APIs
  const patterns = [
    { name: 'Bearer', headers: { Authorization: `Bearer ${apiKey}` } as Record<string, string> },
    { name: 'Bearer+ApiKey', headers: { Authorization: `Bearer ${apiKey}`, 'X-Api-Key': apiKey } as Record<string, string> },
    { name: 'PlainAuth', headers: { Authorization: apiKey } as Record<string, string> },
    { name: 'Dodo-Api-Key', headers: { 'Dodo-Api-Key': apiKey } as Record<string, string> },
    { name: 'X-API-Key', headers: { 'X-API-Key': apiKey } as Record<string, string> },
    { name: 'Api-Key', headers: { 'Api-Key': apiKey } as Record<string, string> },
  ];

  const attempts: Array<{ pattern: string; status: number; error: string }> = [];

  for (const endpoint of endpoints) {
    for (const pattern of patterns) {
      try {
        const url = `${baseUrl}${endpoint}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...pattern.headers,
          },
        });

        const text = await response.text().catch(() => 'No body');

        attempts.push({
          pattern: `${endpoint} + ${pattern.name}`,
          status: response.status,
          error: text.slice(0, 120),
        });

        if (response.ok) {
          return {
            ok: true,
            mode,
            workingPattern: `${endpoint} + ${pattern.name}`,
            lastError: '',
            lastStatus: response.status,
            attempts,
          };
        }
      } catch (error: any) {
        attempts.push({
          pattern: `${endpoint} + ${pattern.name}`,
          status: 0,
          error: error?.message ?? 'Network error',
        });
      }
    }
  }

  // None worked — return the best attempt
  const nonNetwork = attempts.filter((a) => a.status > 0);
  const last = nonNetwork.length > 0 ? nonNetwork[nonNetwork.length - 1] : attempts[attempts.length - 1];

  return {
    ok: false,
    mode,
    workingPattern: null,
    lastError: last?.error ?? 'All auth patterns failed',
    lastStatus: last?.status ?? 0,
    attempts,
  };
}

/**
 * Check if Dodo Payments API is reachable.
 */
export async function checkDodoHealth(env: NodeJS.ProcessEnv = process.env): Promise<{
  ok: boolean;
  mode: 'test' | 'live';
  message: string;
}> {
  const probe = await probeDodoAuth(env);
  if (probe.ok) {
    return {
      ok: true,
      mode: probe.mode,
      message: `Dodo API reachable (${probe.workingPattern})`,
    };
  }
  return {
    ok: false,
    mode: probe.mode,
    message: probe.lastError,
  };
}

/**
 * Ensure a Dodo product exists for agent credits.
 * Returns the product_id, creating one if necessary.
 */
async function ensureDodoProduct(
  baseUrl: string,
  authHeaders: Record<string, string>,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const existingId = env.DODO_PRODUCT_ID;
  if (existingId && existingId !== 'replace_me') {
    // Verify it exists
    const check = await fetch(`${baseUrl}/products/${existingId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
    });
    if (check.ok) return existingId;
  }

  // Create a generic agent credit product
  const createRes = await fetch(`${baseUrl}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      name: 'Aldor Agent Credit',
      description: 'Credits for agent services on Aldor',
      price: {
        type: 'one_time_price',
        price: 100,
        currency: 'USD',
        discount: 0,
        purchasing_power_parity: false,
      },
      tax_category: 'digital_products',
    }),
  });

  const text = await createRes.text();
  if (!createRes.ok) {
    throw new Error(`Failed to create Dodo product: ${createRes.status} ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text) as { product_id?: string };
  const productId = data.product_id;
  if (!productId) {
    throw new Error(`Dodo product creation response missing product_id. Keys: ${Object.keys(data).join(', ')}`);
  }
  return productId;
}

/**
 * Create a Dodo Payments checkout session to fund a wallet.
 *
 * @param amountUsd - Amount in dollars (e.g., 10.00)
 * @param walletAddress - Solana address to receive tokens
 * @param customerData - { email, name, countryCode }
 * @param returnUrl - URL to redirect after successful payment
 * @param cancelUrl - URL to redirect if user cancels
 * @returns checkout_url - redirect user to this URL
 */
export async function fundAgentViaDodo(
  amountUsd: number,
  walletAddress: string,
  customerData: { email: string; name: string; countryCode: string },
  returnUrl?: string,
  cancelUrl?: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if ((env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return `https://mock-checkout.aldor.network/fund?wallet=${walletAddress}&amount=${amountUsd}&_=${Date.now()}`;
  }

  const apiKey = getApiKey(env);
  if (!apiKey) {
    throw new Error('DODO_API_KEY is not configured. Set it in server/.env');
  }

  const baseUrl = getBaseUrl(env);
  const amountInCents = Math.round(amountUsd * 100);

  // Probe auth first to find working pattern
  const probe = await probeDodoAuth(env);
  if (!probe.ok) {
    throw new Error(
      `Dodo API authentication failed after trying ${probe.attempts.length} combinations. ` +
      `Last error: ${probe.lastError} (status ${probe.lastStatus}). ` +
      `This usually means the API key lacks permissions or the auth format is wrong. ` +
      `Debug: GET /api/dodo/debug shows all attempts.`
    );
  }

  // Extract the working auth headers from the pattern
  const patternName = probe.workingPattern?.split(' + ')[1] ?? 'Bearer';
  let authHeaders: Record<string, string> = {};
  switch (patternName) {
    case 'Bearer':
    case 'Bearer+ApiKey':
      authHeaders = { Authorization: `Bearer ${apiKey}` };
      break;
    case 'PlainAuth':
      authHeaders = { Authorization: apiKey };
      break;
    case 'Dodo-Api-Key':
      authHeaders = { 'Dodo-Api-Key': apiKey };
      break;
    case 'X-API-Key':
      authHeaders = { 'X-API-Key': apiKey };
      break;
    case 'Api-Key':
      authHeaders = { 'Api-Key': apiKey };
      break;
    default:
      authHeaders = { Authorization: `Bearer ${apiKey}` };
  }

  // Ensure we have a valid product
  const productId = await ensureDodoProduct(baseUrl, authHeaders, env);

  // Dodo requires product_cart for payment link generation
  const body: Record<string, unknown> = {
    payment_link: true,
    product_cart: [
      { product_id: productId, quantity: 1 },
    ],
    customer: {
      email: customerData.email,
      name: customerData.name,
    },
    billing: {
      country: customerData.countryCode,
    },
    metadata: {
      solana_wallet: walletAddress,
      network: env.SOLANA_CLUSTER ?? 'devnet',
      purpose: 'agent_funding',
      requested_amount_usd: String(amountUsd),
      requested_amount_cents: String(amountInCents),
    },
  };

  if (returnUrl) body.return_url = returnUrl;
  if (cancelUrl) body.cancel_url = cancelUrl;

  const response = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Dodo API key lacks permission to create payments (status ${response.status}). ` +
        `Response: ${text.slice(0, 200)}`
      );
    }
    throw new Error(`Dodo request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = JSON.parse(text) as {
    checkout_url?: string;
    payment_link?: string | null;
    url?: string;
  };

  const url = data.checkout_url ?? data.payment_link ?? data.url;
  if (!url) {
    throw new Error(`Dodo response missing checkout URL. Keys: ${Object.keys(data).join(', ')}`);
  }

  return url;
}

/**
 * Create an invoice for off-ramping agent earnings.
 */
export async function offRampEarnings(
  agentAddress: string,
  amountStablecoin: number,
  destinationDetails: DodoDestinationDetails,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if ((env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return `mock-invoice-${Date.now()}`;
  }

  const apiKey = getApiKey(env);
  if (!apiKey) throw new Error('DODO_API_KEY not configured');

  const baseUrl = getBaseUrl(env);
  const probe = await probeDodoAuth(env);
  if (!probe.ok) throw new Error(`Dodo auth failed: ${probe.lastError}`);

  const patternName = probe.workingPattern?.split(' + ')[1] ?? 'Bearer';
  let authHeaders: Record<string, string> = {};
  switch (patternName) {
    case 'Bearer': authHeaders = { Authorization: `Bearer ${apiKey}` }; break;
    case 'PlainAuth': authHeaders = { Authorization: apiKey }; break;
    case 'Dodo-Api-Key': authHeaders = { 'Dodo-Api-Key': apiKey }; break;
    case 'X-API-Key': authHeaders = { 'X-API-Key': apiKey }; break;
    case 'Api-Key': authHeaders = { 'Api-Key': apiKey }; break;
    default: authHeaders = { Authorization: `Bearer ${apiKey}` };
  }

  const response = await fetch(`${baseUrl}/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      amount: Math.round(amountStablecoin * 100),
      currency: 'USD',
      customer: {
        email: 'agent-treasury@aldor.network',
        name: `Agent ${agentAddress.slice(0, 8)}`,
      },
      metadata: { agent_address: agentAddress, ...destinationDetails },
    }),
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Dodo off-ramp failed: ${text}`);

  const data = JSON.parse(text) as { invoice_id?: string; id?: string };
  return data.invoice_id ?? data.id ?? '';
}
