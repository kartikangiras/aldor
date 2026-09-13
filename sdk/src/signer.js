import { Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { resolveAgent } from './sns.js';
function parseAmountToBigInt(value) {
    return BigInt(value);
}
function parseAssetKind(_asset) {
    return 'SOL';
}
export class PaymentSigner {
    connection;
    payer;
    commitment;
    registryProgramId;
    constructor(options) {
        this.connection = options.connection;
        this.payer = Keypair.fromSecretKey(options.keypairSecretKey);
        this.commitment = options.commitment ?? 'confirmed';
        this.registryProgramId = options.registryProgramId;
    }
    async signChallenge(challenge) {
        const amountRaw = parseAmountToBigInt(challenge.maxAmountRequired);
        const kind = parseAssetKind(challenge.asset);
        console.log('[PaymentSigner] signChallenge', {
            asset: kind,
            amount: String(amountRaw),
            payTo: challenge.payTo,
            payer: this.payer.publicKey.toBase58(),
            resource: challenge.resource,
        });
        let resolvedAddress;
        try {
            resolvedAddress = await resolveAgent(challenge.payTo, process.env);
            console.log('[PaymentSigner] Resolved SOL recipient', { domain: challenge.payTo, address: resolvedAddress });
        }
        catch (resolveError) {
            console.error('[PaymentSigner] Failed to resolve SOL recipient', { domain: challenge.payTo, error: resolveError?.message });
            throw new Error(`Cannot resolve SOL recipient '${challenge.payTo}'. ` +
                `Ensure ALDOR_AGENT_WALLET_MAP or ALDOR_SNS_FALLBACK_MAP contains this domain. ` +
                `Error: ${resolveError?.message ?? resolveError}`);
        }
        const payTo = new PublicKey(resolvedAddress);
        const tx = new Transaction().add(SystemProgram.transfer({
            fromPubkey: this.payer.publicKey,
            toPubkey: payTo,
            lamports: Number(amountRaw),
        }));
        tx.feePayer = this.payer.publicKey;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash(this.commitment)).blockhash;
        tx.sign(this.payer);
        console.log('[PaymentSigner] Sending SOL transfer tx', {
            from: this.payer.publicKey.toBase58(),
            to: (tx.instructions[0].keys.find((k) => k.pubkey !== this.payer.publicKey)?.pubkey ?? this.payer.publicKey).toBase58(),
            lamports: Number(amountRaw),
        });
        try {
            const signature = await this.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                preflightCommitment: this.commitment,
            });
            await this.connection.confirmTransaction(signature, this.commitment);
            return {
                signature,
                ephemeralKey: this.payer.publicKey.toBase58(),
                payer: this.payer.publicKey.toBase58(),
                amount: challenge.maxAmountRequired,
                asset: challenge.asset,
                resource: challenge.resource,
            };
        }
        catch (txError) {
            console.error('[PaymentSigner] SOL transfer failed', { error: txError?.message, logs: txError?.logs });
            throw new Error(`SOL transfer failed: ${txError?.message ?? txError}`);
        }
    }
}
