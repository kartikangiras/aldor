import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import { getAgentWalletMap, isValidSolanaAddress } from '../src/wallets.js';

describe('wallet utilities', () => {
  it('parses wallet map json', () => {
    const map = getAgentWalletMap({
      ALDOR_AGENT_WALLET_MAP: '{"research.aldor.sol":"11111111111111111111111111111111"}',
    } as NodeJS.ProcessEnv);
    assert.equal(map['research.aldor.sol'], '11111111111111111111111111111111');
  });

  it('validates solana addresses', () => {
    assert.equal(isValidSolanaAddress('11111111111111111111111111111111'), true);
    assert.equal(isValidSolanaAddress('not-a-pubkey'), false);
  });
});
