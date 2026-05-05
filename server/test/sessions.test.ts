import { strict as assert } from 'node:assert';
import { describe, it } from 'mocha';
import { getSessionEmitter } from '../src/sessions.js';

describe('session emitters', () => {
  it('reuses emitter for same session id', () => {
    const a = getSessionEmitter('abc');
    const b = getSessionEmitter('abc');
    assert.equal(a, b);
  });

  it('creates distinct emitters for different sessions', () => {
    const a = getSessionEmitter('session-a');
    const b = getSessionEmitter('session-b');
    assert.notEqual(a, b);
  });
});
