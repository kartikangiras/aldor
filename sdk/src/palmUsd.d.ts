import { PublicKey, Transaction } from '@solana/web3.js';
export declare const PALM_USD_DECIMALS = 6;
export interface PalmUsdTransferParams {
    from: PublicKey;
    to: PublicKey;
    mint: PublicKey;
    amountDollars: number;
}
export declare function dollarsToPalmMicro(amountDollars: number): bigint;
export declare function buildPalmUsdTransferTx(params: PalmUsdTransferParams): Transaction;
