interface DodoDestinationDetails {
  [key: string]: unknown;
}

function requireApiKey(env: NodeJS.ProcessEnv): string {
  const key = env.DODO_API_KEY;
  if (!key) {
    throw new Error('DODO_API_KEY is required for Dodo integration.');
  }
  return key;
}

export async function fundAgentViaDodo(
  amountUsd: number,
  walletAddress: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if ((env.MOCK_PAYMENTS ?? 'false').toLowerCase() === 'true') {
    return `https://sandbox.dodopayments.example/fund?wallet=${encodeURIComponent(walletAddress)}&amount=${amountUsd}`;
  }
  const apiKey = requireApiKey(env);
  const baseUrl = env.DODO_API_BASE_URL ?? 'https://api.dodopayments.com';
  const response = await fetch(`${baseUrl}/v1/onramp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amountUsd, walletAddress }),
  });

  if (!response.ok) {
    throw new Error(`Dodo fund request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { paymentUrl?: string; transactionId?: string };
  return data.paymentUrl ?? data.transactionId ?? '';
}

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
  const baseUrl = env.DODO_API_BASE_URL ?? 'https://api.dodopayments.com';
  const response = await fetch(`${baseUrl}/v1/invoices`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentAddress, amountStablecoin, destinationDetails }),
  });

  if (!response.ok) {
    throw new Error(`Dodo off-ramp request failed with status ${response.status}`);
  }

  const data = (await response.json()) as { invoiceId?: string; id?: string };
  return data.invoiceId ?? data.id ?? '';
}
