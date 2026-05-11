'use client';

import type { PendingPayment } from '@/lib/useWalletPaymentQueue';
import { fundViaDodo } from '@/lib/api';
import {
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Shield,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import { useState } from 'react';

interface WalletPaymentModalProps {
  payments: PendingPayment[];
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onDismiss: (requestId: string) => void;
  onChooseMethod: (requestId: string, method: 'wallet' | 'dodo') => void;
  walletConnected: boolean;
  solBalance?: number | null;
  palmBalance?: number | null;
}

function formatAmount(challenge: PendingPayment['challenge']): string {
  const amount = Number(challenge.amount);
  if (challenge.asset === 'SOL') {
    return `${(amount / 1_000_000_000).toFixed(6)} SOL`;
  }
  return `${(amount / 1_000_000).toFixed(4)} Palm USD`;
}

function formatAssetLabel(challenge: PendingPayment['challenge']): string {
  if (challenge.asset === 'SOL') return 'SOL';
  return 'PALM_USD';
}

function TokenBadge({ challenge }: { challenge: PendingPayment['challenge'] }) {
  const isSol = challenge.asset === 'SOL';
  return (
    <span
      style={{
        fontSize: 9,
        padding: '2px 6px',
        borderRadius: 4,
        background: isSol ? 'rgba(251,191,36,0.1)' : 'rgba(0,255,148,0.1)',
        border: `1px solid ${isSol ? 'rgba(251,191,36,0.3)' : 'rgba(0,255,148,0.3)'}`,
        color: isSol ? '#fbbf24' : '#00ff94',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {isSol ? 'SOL' : 'PALM USD'}
    </span>
  );
}

function PaymentCard({
  payment,
  onApprove,
  onReject,
  onChooseMethod,
  walletConnected,
  solBalance,
  palmBalance,
}: {
  payment: PendingPayment;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onChooseMethod: (id: string, method: 'wallet' | 'dodo') => void;
  walletConnected: boolean;
  solBalance?: number | null;
  palmBalance?: number | null;
}) {
  const isSigning = payment.status === 'signing';
  const isSubmitted = payment.status === 'submitted';
  const isError = payment.status === 'error';
  const isRejected = payment.status === 'rejected';
  const [dodoLoading, setDodoLoading] = useState(false);
  const [dodoUrl, setDodoUrl] = useState<string | null>(null);

  if (isSubmitted) {
    return (
      <div
        style={{
          padding: 16,
          background: 'rgba(0,255,148,0.05)',
          border: '1px solid rgba(0,255,148,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <CheckCircle size={18} color="#00ff94" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#00ff94' }}>Payment Submitted</div>
          <div style={{ fontSize: 10, color: '#888888' }}>
            {payment.agent ?? 'Agent'} payment confirmed on-chain.
          </div>
        </div>
      </div>
    );
  }

  if (isRejected) {
    return (
      <div
        style={{
          padding: 16,
          background: 'rgba(255,59,48,0.05)',
          border: '1px solid rgba(255,59,48,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <XCircle size={18} color="#ff3b30" />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ff3b30' }}>Payment Declined</div>
          <div style={{ fontSize: 10, color: '#888888' }}>
            {payment.error ?? 'You rejected this payment.'}
          </div>
        </div>
      </div>
    );
  }

  const handleDodo = async () => {
    onChooseMethod(payment.requestId, 'dodo');
    setDodoLoading(true);
    try {
      const walletAddress = payment.challenge.recipientWallet ?? '';
      const returnUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const cancelUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const res = await fundViaDodo(1, walletAddress, returnUrl, cancelUrl);
      if (typeof res.payment === 'string' && res.payment.startsWith('http')) {
        setDodoUrl(res.payment);
        window.open(res.payment, '_blank');
      }
    } catch (e: any) {
      console.error('[Dodo] Failed to create checkout:', e);
    } finally {
      setDodoLoading(false);
    }
  };

  const chosen = payment.chosenMethod;
  const isSol = payment.challenge.asset === 'SOL';
  const userBalance = isSol ? solBalance : palmBalance;
  const requiredAmount =
    Number(payment.challenge.amount) / (isSol ? 1_000_000_000 : 1_000_000);
  const hasEnoughBalance =
    userBalance !== null && userBalance !== undefined && userBalance >= requiredAmount;

  return (
    <div
      style={{
        padding: 16,
        background: '#1a1a1a',
        border: `1px solid ${isError || isRejected ? 'rgba(255,59,48,0.4)' : '#333333'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wallet size={14} color={walletConnected ? '#00ff94' : '#ffa500'} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Payment Required
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            color: '#555555',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {payment.requestId.slice(0, 8)}…
        </span>
      </div>

      {/* Agent info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Zap size={12} color="#9d4edd" />
        <span style={{ fontSize: 12, color: '#ffffff', fontWeight: 600 }}>
          {payment.agent ?? 'Unknown Agent'}
        </span>
        <span style={{ fontSize: 10, color: '#888888' }}>
          {payment.challenge.description}
        </span>
      </div>

      {/* Amount */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.3)',
          border: '1px solid #333333',
        }}
      >
        <Shield size={12} color="#00ff94" />
        <span style={{ fontSize: 10, color: '#888888' }}>Amount:</span>
        <span
          style={{
            fontSize: 13,
            color: '#00ff94',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {formatAmount(payment.challenge)}
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <TokenBadge challenge={payment.challenge} />
        </span>
      </div>

      {/* Balance check */}
      {walletConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            background: hasEnoughBalance
              ? 'rgba(0,255,148,0.05)'
              : 'rgba(255,165,0,0.05)',
            border: `1px solid ${hasEnoughBalance ? 'rgba(0,255,148,0.2)' : 'rgba(255,165,0,0.2)'}`,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: hasEnoughBalance ? '#00ff94' : '#ffa500',
            }}
          >
            Your balance:{' '}
            <strong>
              {isSol
                ? `${(solBalance ?? 0).toFixed(4)} SOL`
                : `${(palmBalance ?? 0).toFixed(2)} Palm USD`}
            </strong>{' '}
            {hasEnoughBalance ? '(sufficient)' : '(insufficient)'}
          </span>
        </div>
      )}

      {!walletConnected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 10px',
            background: 'rgba(255,165,0,0.05)',
            border: '1px solid rgba(255,165,0,0.2)',
          }}
        >
          <AlertTriangle size={12} color="#ffa500" />
          <span style={{ fontSize: 10, color: '#ffa500' }}>
            Wallet not connected. Connect Phantom or Solflare to sign this payment.
          </span>
        </div>
      )}

      {isError && payment.error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 10px',
            background: 'rgba(255,59,48,0.05)',
            border: '1px solid rgba(255,59,48,0.2)',
          }}
        >
          <XCircle size={12} color="#ff3b30" />
          <span style={{ fontSize: 10, color: '#ff3b30' }}>{payment.error}</span>
        </div>
      )}

      {/* Payment Method Selection */}
      {!chosen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, color: '#888888', textAlign: 'center' }}>
            Choose how you want to pay
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onChooseMethod(payment.requestId, 'wallet')}
              disabled={!walletConnected}
              style={{
                flex: 1,
                padding: '12px 8px',
                background: walletConnected ? 'rgba(0,255,148,0.08)' : '#222222',
                border: `1px solid ${walletConnected ? '#00ff94' : '#444444'}`,
                color: walletConnected ? '#00ff94' : '#666666',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: walletConnected ? 'pointer' : 'not-allowed',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Wallet size={18} />
              Pay with Wallet
              <span
                style={{
                  fontSize: 9,
                  color: walletConnected ? '#00ff94aa' : '#666666',
                  fontWeight: 400,
                  textTransform: 'none',
                }}
              >
                {isSol ? 'SOL' : 'Palm USD'}
              </span>
            </button>
            <button
              onClick={handleDodo}
              disabled={dodoLoading}
              style={{
                flex: 1,
                padding: '12px 8px',
                background: 'rgba(157,78,221,0.08)',
                border: '1px solid #9d4edd',
                color: '#9d4edd',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: dodoLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {dodoLoading ? (
                <Loader2 size={18} className="animate-spin-slow" />
              ) : (
                <CreditCard size={18} />
              )}
              {dodoLoading ? 'Opening…' : 'Top Up via Dodo'}
              <span
                style={{
                  fontSize: 9,
                  color: '#9d4eddaa',
                  fontWeight: 400,
                  textTransform: 'none',
                }}
              >
                Card / Apple Pay / Google Pay
              </span>
            </button>
          </div>
          <button
            onClick={() => onReject(payment.requestId)}
            style={{
              padding: '8px',
              background: 'transparent',
              border: '1px solid #333333',
              color: '#888888',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Cancel Request
          </button>
        </div>
      )}

      {/* Wallet Pay Flow */}
      {chosen === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onApprove(payment.requestId)}
              disabled={isSigning || !walletConnected || !hasEnoughBalance}
              style={{
                flex: 1,
                padding: '10px',
                background:
                  walletConnected && hasEnoughBalance
                    ? 'rgba(0,255,148,0.1)'
                    : '#333333',
                border: `1px solid ${walletConnected && hasEnoughBalance ? '#00ff94' : '#555555'}`,
                color: walletConnected && hasEnoughBalance ? '#00ff94' : '#555555',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor:
                  walletConnected && !isSigning && hasEnoughBalance
                    ? 'pointer'
                    : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {isSigning ? (
                <Loader2 size={14} className="animate-spin-slow" />
              ) : (
                <CheckCircle size={14} />
              )}
              {isSigning ? 'Signing…' : 'Sign & Pay'}
            </button>
            <button
              onClick={() => onReject(payment.requestId)}
              disabled={isSigning}
              style={{
                padding: '10px 14px',
                background: 'transparent',
                border: '1px solid #333333',
                color: '#888888',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                cursor: isSigning ? 'not-allowed' : 'pointer',
              }}
            >
              <XCircle size={14} />
            </button>
          </div>
          {!hasEnoughBalance && walletConnected && (
            <button
              onClick={() => onChooseMethod(payment.requestId, 'dodo')}
              style={{
                padding: '6px',
                background: 'transparent',
                border: 'none',
                color: '#9d4edd',
                fontSize: 10,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Insufficient balance — Top Up via Dodo instead
            </button>
          )}
        </div>
      )}

      {/* Dodo Flow */}
      {chosen === 'dodo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dodoUrl ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px',
                  background: 'rgba(157,78,221,0.05)',
                  border: '1px solid rgba(157,78,221,0.3)',
                }}
              >
                <CheckCircle size={14} color="#9d4edd" />
                <span style={{ fontSize: 11, color: '#9d4edd' }}>
                  Dodo checkout opened in a new tab.
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#888888', textAlign: 'center' }}>
                After completing payment in Dodo, return here and click{' '}
                <strong>Pay with Wallet</strong> to finish.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => onApprove(payment.requestId)}
                  disabled={isSigning || !walletConnected}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: walletConnected
                      ? 'rgba(0,255,148,0.1)'
                      : '#333333',
                    border: `1px solid ${walletConnected ? '#00ff94' : '#555555'}`,
                    color: walletConnected ? '#00ff94' : '#555555',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor:
                      walletConnected && !isSigning ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  {isSigning ? (
                    <Loader2 size={14} className="animate-spin-slow" />
                  ) : (
                    <Wallet size={14} />
                  )}
                  {isSigning ? 'Signing…' : 'Pay with Wallet'}
                </button>
                <a
                  href={dodoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(157,78,221,0.1)',
                    border: '1px solid #9d4edd',
                    color: '#9d4edd',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textDecoration: 'none',
                  }}
                >
                  <ArrowUpRight size={14} />
                  Open Dodo
                </a>
              </div>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px',
                background: 'rgba(255,165,0,0.05)',
                border: '1px solid rgba(255,165,0,0.2)',
              }}
            >
              <AlertTriangle size={14} color="#ffa500" />
              <span style={{ fontSize: 11, color: '#ffa500' }}>
                Could not open Dodo checkout. Try again or use wallet payment.
              </span>
            </div>
          )}
          <button
            onClick={() => onChooseMethod(payment.requestId, 'wallet')}
            style={{
              padding: '6px',
              background: 'transparent',
              border: 'none',
              color: '#00ff94',
              fontSize: 10,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Switch to Wallet Payment instead
          </button>
        </div>
      )}
    </div>
  );
}

export default function WalletPaymentModal({
  payments,
  onApprove,
  onReject,
  onDismiss,
  onChooseMethod,
  walletConnected,
  solBalance,
  palmBalance,
}: WalletPaymentModalProps) {
  const activePayments = payments.filter((p) => p.status !== 'submitted');
  if (activePayments.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#0a0a0a',
            border: '1px solid #333333',
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Pending Payments ({activePayments.length})
          </span>
          <button
            onClick={() => activePayments.forEach((p) => onDismiss(p.requestId))}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#555555',
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            Dismiss All
          </button>
        </div>

        {activePayments.map((payment) => (
          <PaymentCard
            key={payment.requestId}
            payment={payment}
            onApprove={onApprove}
            onReject={onReject}
            onChooseMethod={onChooseMethod}
            walletConnected={walletConnected}
            solBalance={solBalance}
            palmBalance={palmBalance}
          />
        ))}
      </div>
    </div>
  );
}
