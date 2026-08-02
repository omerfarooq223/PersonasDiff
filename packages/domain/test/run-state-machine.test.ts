import { describe, expect, it } from 'vitest';

import { assertTransition, canTransition } from '../src/run-state-machine.js';

describe('run state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('draft', 'queued')).toBe(true);
    expect(canTransition('queued', 'running')).toBe(true);
    expect(canTransition('running', 'completed')).toBe(true);
  });

  it('rejects mutation of terminal states', () => {
    expect(() => assertTransition('completed', 'running')).toThrow('Illegal run transition');
  });
});
