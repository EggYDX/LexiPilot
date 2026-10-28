import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { createWorker } from '../src/worker.mjs';
import { localServer } from '../scripts/local-server.mjs';
import { fakeToken, mockFetch } from './fixtures.mjs';

function request(body, extra = {}) {
  return new Request('https://lexipilot.test/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}
const call = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_study_progress', arguments: {} } };

test('missing identity, cross-origin, malformed JSON and oversize fail before upstream API', async () => {
  const calls = [];
  const worker = createWorker({ fetchImpl: mockFetch(calls) });
  for (const [req, status] of [
    [request(call), 401],
    [request(call, { Origin: 'https://evil.test', 'oai-authenticated-user-id': 'fixture' }), 403],
    [request('{broken'), 400],
    [request('x'.repeat(131073)), 413],
  ]) assert.equal((await worker.fetch(req, { MAIMEMO_TOKEN: fakeToken })).status, status);
  assert.equal(calls.length, 0);
});
test('missing Token yields configuration error, never fake data', async () => {
  const worker = createWorker();
  const response = await worker.fetch(request(call, { 'oai-authenticated-user-id': 'fixture' }));
  const text = await response.text();
  assert.ok(text.includes('CONFIGURATION_REQUIRED'));
});
test('local HTTP adapter rejects forged Sites identity and incorrect Bearer before reading data', async t => {
  const calls = [];
  const access = 'local-owner-random-test-key-at-least-32-characters';
  const server = localServer({ MAIMEMO_TOKEN: fakeToken, LEXIPILOT_ACCESS_TOKEN: access, PORT: '8787' }, createWorker({ fetchImpl: mockFetch(calls) }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/mcp`;
  const headers = { Host: '127.0.0.1:8787', 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'oai-authenticated-user-id': 'forged-owner' };
  const send = extra => new Promise((resolve, reject) => {
    const req = httpRequest(url, { method: 'POST', headers: { ...headers, ...extra } }, response => {
      const chunks = []; response.on('data', c => chunks.push(c));
      response.on('end', () => resolve({ status: response.statusCode, text: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end(JSON.stringify(call));
  });
  for (const extra of [{}, { Authorization: 'Bearer wrong' }]) {
    const response = await send(extra);
    assert.equal(response.status, 401);
  }
  assert.equal(calls.length, 0);
  const valid = await send({ Authorization: `Bearer ${access}` });
  assert.equal(valid.status, 200);
  assert.ok(!valid.text.includes(fakeToken));
  assert.equal(calls.length, 1);
  const rebound = await send({ Host: 'evil.test', Authorization: `Bearer ${access}` });
  assert.equal(rebound.status, 403);
});
