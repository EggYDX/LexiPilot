import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../src/worker.mjs';
import { fakeToken } from './fixtures.mjs';

test('SDK errors, application errors and logs cannot expose the configured token', async t => {
  const logs = [];
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, (...args) => logs.push(args));
  const worker = createWorker({ fetchImpl: async () => { throw new Error(`Authorization: Bearer ${fakeToken}`); } });
  for (const name of ['get_study_progress', fakeToken]) {
    const result = await worker.fetch(new Request('https://lexipilot.test/mcp', { method: 'POST', headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'oai-authenticated-user-id': 'fixture',
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: {} } }) }), { MAIMEMO_TOKEN: fakeToken });
    assert.ok(!(await result.text()).includes(fakeToken));
  }
  assert.ok(!JSON.stringify(logs).includes(fakeToken));
});
