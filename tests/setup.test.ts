import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('test infrastructure', () => {
  it('runs a TypeScript test successfully', () => {
    assert.equal(1 + 1, 2);
  });
});
