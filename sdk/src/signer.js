import { Keypair, PublicKey, SystemProgram, Transaction, } from '@solana/web3.js';
import { buildPalmUsdTransferTx } from './palmUsd.js';
function parseAmountToBigInt(value) {
    return BigInt(value);
}
function parseAssetKind(asset) {
    return asset === 'SOL' ? 'SOL' : 'PALM_USD';
}
export class PaymentSigner {
    connection;
    payer;
    palmUsdMint;
    commitment;
    constructor(options) {
        this.connection = options.connection;
        this.payer = Keypair.fromSecretKey(options.keypairSecretKey);
        this.palmUsdMint = options.palmUsdMint;
        this.commitment = options.commitment ?? 'confirmed';
    }
    async signChallenge(challenge) {
        const payTo = new PublicKey(challenge.payTo);
        const amountRaw = parseAmountToBigInt(challenge.maxAmountRequired);
        const kind = parseAssetKind(challenge.asset);
        let tx;
        if (kind === 'SOL') {
            tx = new Transaction().add(SystemProgram.transfer({
                fromPubkey: this.payer.publicKey,
                toPubkey: payTo,
                lamports: Number(amountRaw),
            }));
        }
        else {
            tx = buildPalmUsdTransferTx({
                from: this.payer.publicKey,
                to: payTo,
                mint: this.palmUsdMint,
                amountDollars: Number(amountRaw) / 1_000_000,
            });
        }
        tx.feePayer = this.payer.publicKey;
        tx.recentBlockhash = (await this.connection.getLatestBlockhash(this.commitment)).blockhash;
        tx.sign(this.payer);
        const signature = await this.connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: this.commitment,
        });
        await this.connection.confirmTransaction(signature, this.commitment);
        return {
            signature,
            payer: this.payer.publicKey.toBase58(),
            amount: challenge.maxAmountRequired,
            asset: challenge.asset,
            resource: challenge.resource,
        };
    }
}
