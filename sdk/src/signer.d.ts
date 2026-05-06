import type { PaymentProof, PaymentSignerOptions, X402Accept } from './types.js';
export declare class PaymentSigner {
    private readonly connection;
    private readonly payer;
    private readonly palmUsdMint;
    private readonly commitment;
    constructor(options: PaymentSignerOptions);
    signChallenge(challenge: X402Accept): Promise<PaymentProof>;
}
