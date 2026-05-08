import fetch from 'node-fetch';

/**
 * Interface for off-ramping or disbursement details.
 */
interface DodoDestinationDetails {
  [key: string]: unknown;
}

/**
 * Ensures the API key is present in the environment.
 */
function requireApiKey(env: NodeJS.ProcessEnv): string {
  const key = env.DODO_API_KEY;
  if (!key) {
    throw new Error('DODO_API_KEY is missing. Check your .env file.');
  }
  return key;
}

/**
 * Generates a Dodo Payments checkout URL to fund an Orchestrator/Agent.
 * 
 * @param amountUsd - The amount in dollars (e.g., 10.50)
 * @param walletAddress - The Solana PubKey to be funded
 */
export async function fundAgentViaDodo(
  amountUsd: number,
  walletAddress: string,
  customerData: { email: string; name: string; countryCode: string }, // Pass this from frontend
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  try {
    const apiKey = requireApiKey(env);
    const baseUrl = (env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com').replace(/\/$/, '');
    const amountInCents = Math.round(amountUsd * 100);

    // DODO_PRODUCT_ID is optional — if set, use it; otherwise derive a generic one.
    const productId = env.DODO_PRODUCT_ID;
    if (!productId) {
      throw new Error(
        'DODO_PRODUCT_ID is missing in .env. Please create a product in the Dodo Payments dashboard and add its ID to server/.env as DODO_PRODUCT_ID=<your_product_id>.',
      );
    }

    const response = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payment_link: true,
        customer: {
          name: customerData.name,
          email: customerData.email,
        },
        billing: {
          country: customerData.countryCode,
        },
        product_cart: [
          {
            product_id: productId,
            quantity: 1,
            amount: amountInCents,
          },
        ],
        metadata: {
          solana_wallet: walletAddress,
        },
      }),
    });

    const text = await response.text();
    console.log('[DODO FUND RAW RESPONSE]', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    });

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error(
          `Dodo API key does not have permission to create payments (status ${response.status}). ` +
          'Please verify your DODO_API_KEY has Payments write access in the Dodo dashboard, or rotate the key.',
        );
      }
      throw new Error(`Dodo request failed (${response.status}): ${text}`);
    }

    const data = JSON.parse(text) as { checkout_url?: string; payment_link?: string };

    const url = data.checkout_url ?? data.payment_link;
    if (!url) {
      throw new Error('Dodo response did not contain a checkout_url. Response: ' + JSON.stringify(data));
    }

    return url;
  } catch (error) {
    console.error('[DODO FETCH CRASH]', error);
    throw error;
  }
}

/**
 * Creates an invoice for an agent to "bill" the system for earnings.
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

  const apiKey = requireApiKey(env);
  const rawBaseUrl = env.DODO_API_BASE_URL ?? 'https://test.dodopayments.com';
  const baseUrl = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

  const response = await fetch(`${baseUrl}/v1/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Math.round(amountStablecoin * 100),
      currency: 'USD',
      customer: {
        email: 'agent-treasury@aldor.network',
        name: `Agent ${agentAddress.slice(0, 4)}`
      },
      metadata: {
        agent_address: agentAddress,
        ...destinationDetails
      }
    }),
  });

  const text = await response.text();
  console.log('[DODO OFF-RAMP RAW RESPONSE]', {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: text,
  });

  if (!response.ok) {
    throw new Error(`Dodo off-ramp invoice failed: ${text}`);
  }

  const data = JSON.parse(text) as { invoice_id?: string; id?: string };
  return data.invoice_id ?? data.id ?? '';
}