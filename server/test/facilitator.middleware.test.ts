import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import { buildChallenge, x402Required } from '../src/middleware.js';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };
}

describe('x402 middleware', () => {
  it('returns canonical 402 challenge when no X-Payment', async () => {
    const mw = x402Required(
      {
        priceAtomic: 100,
        tokenKind: 'PALM_USD',
        snsDomain: 'summarizer.aldor.sol',
        description: 'desc',
        resourcePath: '/paid',
      },
      async () => true,
    );

    const req: any = { header: () => null };
    const res = mockRes();
    let called = false;

    await mw(req, res as any, () => {
      called = true;
    });

    assert.equal(called, false);
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.x402Version, 1);
    assert.equal(res.body.recipient, 'summarizer.aldor.sol');
    assert.equal(res.body.amount, '100');
  });

  it('rejects invalid payment proof', async () => {
    const mw = x402Required(
      {
        priceAtomic: 100,
        tokenKind: 'PALM_USD',
        snsDomain: 'summarizer.aldor.sol',
        description: 'desc',
        resourcePath: '/paid',
      },
      async () => false,
    );

    const req: any = { header: (name: string) => (name === 'X-Aldor-Payment-Signature' ? 'fake-sig' : null) };
    const res = mockRes();

    await mw(req, res as any, () => {});
    assert.equal(res.statusCode, 402);
    assert.equal(res.body.error, 'PAYMENT_INVALID');
  });

  it('rejects depth over 3', async () => {
    const mw = x402Required(
      {
        priceAtomic: 100,
        tokenKind: 'PALM_USD',
        snsDomain: 'summarizer.aldor.sol',
        description: 'desc',
        resourcePath: '/paid',
      },
      async () => true,
    );

    const req: any = { header: (name: string) => (name === 'X-Aldor-Max-Depth' ? '4' : null) };
    const res = mockRes();

    await mw(req, res as any, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'MAX_DEPTH_EXCEEDED');
  });

  it('builds challenge asset for SOL/PALM correctly', () => {
    const req = { header: () => null } as any;
    const palm = buildChallenge(req, {
      priceAtomic: 100,
      tokenKind: 'PALM_USD',
      snsDomain: 'summarizer.aldor.sol',
      description: 'desc',
      resourcePath: '/paid',
    });
    const sol = buildChallenge(req, {
      priceAtomic: 100,
      tokenKind: 'SOL',
      snsDomain: 'weather.aldor.sol',
      description: 'desc',
      resourcePath: '/paid',
    });

    assert.equal(sol.asset, 'SOL');
    assert.equal(typeof palm.asset, 'string');
  });
});
