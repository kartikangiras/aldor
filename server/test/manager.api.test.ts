import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import { EventEmitter } from 'node:events';
import { calculateValueScore, getAgentRegistry, runOrchestrator } from '../src/manager.js';

describe('manager and registry', () => {
  it('calculates value score deterministically', () => {
    const score = calculateValueScore(8000, 100);
    assert.equal(score, (8000 * 8000) / (100 * 10_000));
  });

  it('runOrchestrator emits composed flow when budget too low', async () => {
    const emitter = new EventEmitter();
    const events: string[] = [];
    emitter.on('step', (e: any) => events.push(e.type));

    const result = await runOrchestrator('research this topic', emitter, 0, 0);
    assert.equal(typeof result, 'string');
    assert.equal(events[0], 'MANAGER_PLANNING');
    assert.equal(events.includes('BUDGET_EXCEEDED'), true);
    assert.equal(events[events.length - 1], 'RESULT_COMPOSED');
  });

  it('does not emit payment amounts in budget exceeded event payload', async () => {
    const emitter = new EventEmitter();
    const payloads: any[] = [];
    emitter.on('step', (e: any) => payloads.push(e));

    await runOrchestrator('research this topic', emitter, 0, 0);
    const budgetEvent = payloads.find((e) => e.type === 'BUDGET_EXCEEDED');
    assert.equal(Boolean(budgetEvent), true);
    assert.equal('cost' in budgetEvent, false);
    assert.equal('spent' in budgetEvent, false);
    assert.equal('token' in budgetEvent, false);
  });

  it('registry returns all specialists in expected shape', () => {
    const registry = getAgentRegistry();
    assert.equal(Array.isArray(registry), true);
    assert.equal(registry.length, 8);
    assert.equal(typeof registry[0].name, 'string');
    assert.equal(typeof registry[0].domain, 'string');
    assert.equal(typeof registry[0].priceDisplay, 'string');
  });
});
