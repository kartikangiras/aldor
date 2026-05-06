import { createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';
export const PALM_USD_DECIMALS = 6;
export function dollarsToPalmMicro(amountDollars) {
    return BigInt(Math.round(amountDollars * 10 ** PALM_USD_DECIMALS));
}
export function buildPalmUsdTransferTx(params) {
    const fromAta = getAssociatedTokenAddressSync(params.mint, params.from);
    const toAta = getAssociatedTokenAddressSync(params.mint, params.to);
    const amountMicro = dollarsToPalmMicro(params.amountDollars);
    const tx = new Transaction();
    tx.add(createAssociatedTokenAccountInstruction(params.from, toAta, params.to, params.mint));
    tx.add(createTransferCheckedInstruction(fromAta, params.mint, toAta, params.from, amountMicro, PALM_USD_DECIMALS));
    return tx;
}
