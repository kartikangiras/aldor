import axios from 'axios';
function decodeChallenge(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid 402 challenge payload');
    }
    return data;
}
export function createPaidAxios(options) {
    const instance = axios.create();
    instance.interceptors.request.use((config) => {
        config.headers = config.headers ?? {};
        if (!config.headers['X-Aldor-Max-Depth']) {
            config.headers['X-Aldor-Max-Depth'] = String(options.budget.maxDepth);
        }
        if (!config.headers['X-Aldor-Budget-Remaining']) {
            config.headers['X-Aldor-Budget-Remaining'] = options.budget.budgetRemaining;
        }
        return config;
    });
    instance.interceptors.response.use((response) => response, async (error) => {
        if (!error.response || error.response.status !== 402 || !error.config) {
            throw error;
        }
        const original = error.config;
        if (original._aldorRetried) {
            throw error;
        }
        const challenge = decodeChallenge(error.response.data);
        const accept = challenge.accepts?.[0] ?? (
            challenge.recipient && challenge.amount && challenge.asset && challenge.resource
                ? {
                    scheme: 'exact',
                    network: challenge.network ?? 'solana-devnet',
                    maxAmountRequired: challenge.amount,
                    resource: challenge.resource,
                    description: challenge.description,
                    payTo: challenge.recipient,
                    asset: challenge.asset,
                }
                : undefined
        );
        if (!accept) {
            throw new Error('Missing x402 accepts entry');
        }
        const proof = await options.signChallenge(accept);
        original._aldorRetried = true;
        original.headers = original.headers ?? {};
        original.headers['X-Payment'] = Buffer.from(JSON.stringify(proof)).toString('base64');
        original.headers['X-Aldor-Payment-Signature'] = proof.signature;
        original.headers['X-Aldor-Ephemeral-Key'] = proof.ephemeralKey ?? 'mock-ephemeral-key';
        original.headers['X-Payment-Signature'] = proof.signature;
        return instance.request(original);
    });
    return instance;
}
