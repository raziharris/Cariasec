import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createActionId } from '../frontend/src/actionId';

test('action IDs remain valid unique UUIDs on HTTP without randomUUID', () => {
  const original = crypto.randomUUID;
  Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
  try {
    const ids = Array.from({ length: 1000 }, () => createActionId());
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  } finally { Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true }); }
});
