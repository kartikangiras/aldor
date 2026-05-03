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
        recipient: '11111111111111111111111111111111',
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
    assert.equal(res.body.accepts[0].payTo, '11111111111111111111111111111111');
  });

  it('rejects invalid payment proof', async () => {
    const mw = x402Required(
      {
        priceAtomic: 100,
        tokenKind: 'PALM_USD',
        recipient: '11111111111111111111111111111111',
        description: 'desc',
        resourcePath: '/paid',
      },
      async () => false,
    );

    const req: any = { header: (name: string) => (name === 'X-Payment' ? 'ZmFrZQ==' : null) };
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
        recipient: '11111111111111111111111111111111',
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
      recipient: '11111111111111111111111111111111',
      description: 'desc',
      resourcePath: '/paid',
    });
    const sol = buildChallenge(req, {
      priceAtomic: 100,
      tokenKind: 'SOL',
      recipient: '11111111111111111111111111111111',
      description: 'desc',
      resourcePath: '/paid',
    });

    assert.equal(sol.accepts[0].asset, 'SOL');
    assert.equal(typeof palm.accepts[0].asset, 'string');
  });
});
