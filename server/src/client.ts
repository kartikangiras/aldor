import axios, { type AxiosResponse } from 'axios';
import bs58 from 'bs58';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import type { AldorRequestConfig, PaidResponse, PaymentProof } from './types.js';
import { parsePaymentRequiredHeader } from './x402.js';

export interface AldorClientOptions {
  rpcUrl: string;
  secretKey: string;
  payer?: Keypair;
}

export class AldorClient {
  readonly connection: Connection;
  readonly payer: Keypair;

  constructor(options: AldorClientOptions) {
    this.connection = new Connection(options.rpcUrl, 'confirmed');
    this.payer = options.payer ?? Keypair.fromSecretKey(bs58.decode(options.secretKey));
  }

  async request<T = unknown>(url: string, config: AldorRequestConfig = {}): Promise<PaidResponse<T>> {
    try {
      return await axios.request<T>({ url, ...config });
    } catch (error: any) {
      const response = error?.response as AxiosResponse | undefined;
      if (response?.status === 402) {
        return this.handlePaymentRequired<T>(url, config, response);
      }
      throw error;
    }
  }

  private async handlePaymentRequired<T = unknown>(
    url: string,
    config: AldorRequestConfig,
    response: AxiosResponse,
  ): Promise<PaidResponse<T>> {
    const { requirements } = parsePaymentRequiredHeader(response);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: this.payer.publicKey,
        toPubkey: new PublicKey(requirements.recipient),
        lamports: requirements.amount,
      }),
    );

    const signature = await sendAndConfirmTransaction(this.connection, transaction, [this.payer]);
    const paymentProof: PaymentProof = {
      signature,
      requestUrl: url,
      network: String(requirements.network),
      amount: requirements.amount,
      currency: requirements.currency,
      recipient: requirements.recipient,
    };

    const retry = await axios.request<T>({
      url,
      ...config,
      headers: {
        ...config.headers,
        'PAYMENT-SIGNATURE': signature,
        'PAYMENT-PROOF': Buffer.from(JSON.stringify(paymentProof)).toString('base64'),
      },
    });

    return Object.assign(retry, { paymentProof });
  }

  describePayment(amount: number, currency: string): string {
    return `${amount} ${currency}`;
  }
}
