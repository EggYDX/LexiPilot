import test from 'node:test';
import assert from 'node:assert/strict';
import { MaiMemoClient, API_BASE, redact } from '../src/maimemo.mjs';
import { fakeToken, mockFetch, todayItems, records } from './fixtures.mjs';

test('official routes, methods, Bearer header and raw state values', async () => {
  const calls = [];
  const client = new MaiMemoClient(fakeToken, { fetchImpl: mockFetch(calls) });
  const result = await client.request('/study/get_today_items', { limit: 1000, is_new: false });
  assert.deepEqual(result.today_items, todayItems);
  assert.equal(calls[0].url, `${API_BASE}/study/get_today_items`);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${fakeToken}`);
  assert.equal(calls[0].options.redirect, 'manual');
  await client.request('/vocabulary', { spelling: 'ice cream&hello' });
  assert.equal(calls[1].options.method, 'GET');
  assert.equal(new URL(calls[1].url).searchParams.get('spelling'), 'ice cream&hello');
  await assert.rejects(client.request('/study/add_words', {}), { code: 'READ_ONLY_ONLY' });
});

test('only documented fields returned and secrets scrubbed even inside valid fields', async () => {
  const client = new MaiMemoClient(fakeToken, { fetchImpl: async () => Response.json({
    voc: { id: 'id', spelling: fakeToken, token: fakeToken, definition: 'unsupported' }, authorization: fakeToken,
  }) });
  assert.deepEqual(await client.request('/vocabulary', { spelling: 'test' }), { voc: { id: 'id', spelling: '[REDACTED]' } });
  assert.equal(redact({ text: 'with "quoted" secret' }, ['"quoted"']).text, 'with [REDACTED] secret');
});
test('outbound fetch keeps the global receiver required by Worker runtime APIs', async () => {
  const client = new MaiMemoClient(fakeToken, { fetchImpl: function () {
    assert.equal(this, globalThis);
    return Promise.resolve(Response.json({ voc: { id: 'id', spelling: 'apple' } }));
  } });
  await client.request('/vocabulary', { spelling: 'apple' });
});
test('Worker-compatible manual redirects stop without forwarding credentials', async () => {
  let calls = 0;
  const api = new MaiMemoClient(fakeToken, { fetchImpl: async (url, options) => {
    calls++;
    assert.equal(options.redirect, 'manual');
    assert.equal(new URL(url).hostname, 'open.maimemo.com');
    return new Response('', { status: 302, headers: { Location: 'https://untrusted.test/' } });
  } });
  await assert.rejects(api.request('/vocabulary', { spelling: 'apple' }), { code: 'UNEXPECTED_REDIRECT' });
  assert.equal(calls, 1);
});

for (const [status, expected] of [[401, 'AUTHENTICATION_FAILED'], [403, 'AUTHENTICATION_FAILED'], [429, 'RATE_LIMITED'], [500, 'UPSTREAM_ERROR'], [404, 'UPSTREAM_ERROR']]) {
  test(`HTTP ${status} is safe and explicit`, async () => {
    const client = new MaiMemoClient(fakeToken, { fetchImpl: async () => new Response(fakeToken, { status, headers: { 'Retry-After': '7' } }) });
    await assert.rejects(client.request('/study/get_study_progress', {}), e => e.code === expected && !String(e.stack).includes(fakeToken) && (status !== 429 || e.retry_after_seconds === 7));
  });
}
test('empty list is valid; missing progress is not invented', async () => {
  const api = new MaiMemoClient(fakeToken, { fetchImpl: async () => Response.json({ today_items: [] }) });
  assert.deepEqual(await api.request('/study/get_today_items', {}), { today_items: [] });
  await assert.rejects(api.request('/study/get_study_progress', {}), { code: 'UPSTREAM_SCHEMA_CHANGED' });
});
test('observed official response envelope and array tags preserve their meanings', async () => {
  const api = new MaiMemoClient(fakeToken, { fetchImpl: async () => Response.json({ success: true, errors: [], data: { records, count: 0 } }) });
  const result = await api.request('/study/query_study_records', {});
  assert.deepEqual(result.records, records);
  assert.deepEqual(result.records[0].tags, ['STICKING']);
  assert.equal(result.records[1].tags, 'WELL_FAMILIAR');
  const failed = new MaiMemoClient(fakeToken, { fetchImpl: async () => Response.json({ success: false, errors: [{ code: 'example', msg: fakeToken }] }) });
  await assert.rejects(failed.request('/study/get_today_items', {}), e => e.code === 'UPSTREAM_API_ERROR' && !e.stack.includes(fakeToken));
});
test('configuration, malformed data, network and timeout errors do not leak secrets', async () => {
  await assert.rejects(new MaiMemoClient('').request('/study/get_study_progress', {}), { code: 'CONFIGURATION_REQUIRED' });
  for (const [fetchImpl, code] of [
    [async () => { throw new Error(fakeToken); }, 'NETWORK_ERROR'],
    [async () => { throw new DOMException(fakeToken, 'TimeoutError'); }, 'TIMEOUT'],
    [async () => new Response(fakeToken, { headers: { 'Content-Type': 'application/json' } }), 'UPSTREAM_SCHEMA_CHANGED'],
    [async () => new Response(`<html>${fakeToken}</html>`), 'UPSTREAM_SCHEMA_CHANGED'],
    [async () => Response.json({ progress: { finished: '17', total: 40, study_time: 123 } }), 'UPSTREAM_SCHEMA_CHANGED'],
  ]) await assert.rejects(new MaiMemoClient(fakeToken, { fetchImpl }).request('/study/get_study_progress', {}), e => e.code === code && !e.stack.includes(fakeToken));
});
test('actual abort deadline and response size limit', async () => {
  const api = new MaiMemoClient(fakeToken, { timeoutMs: 10, fetchImpl: async (url, { signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(Response.json({})), 1000);
    signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  }) });
  await assert.rejects(api.request('/vocabulary', { spelling: 'x' }), { code: 'TIMEOUT' });
  await assert.rejects(new MaiMemoClient(fakeToken, { fetchImpl: async () => new Response('x'.repeat(2097153), { headers: { 'Content-Type': 'application/json' } }) }).request('/vocabulary', { spelling: 'x' }), { code: 'UPSTREAM_RESPONSE_TOO_LARGE' });
});
test('all three rolling rate limits and upstream cooldown', async () => {
  let now = 0;
  const api = new MaiMemoClient(fakeToken, { now: () => now });
  for (let i = 0; i < 20; i++) api.reserveRequest();
  assert.throws(() => api.reserveRequest(), { code: 'RATE_LIMITED', retry_after_seconds: 10 });
  now = 10000;
  for (let i = 0; i < 20; i++) api.reserveRequest();
  assert.throws(() => api.reserveRequest(), { code: 'RATE_LIMITED', retry_after_seconds: 50 });
  now = 60000; api.reserveRequest();
  api.requests = Array(2000).fill(now - 60001);
  assert.throws(() => api.reserveRequest(), { code: 'RATE_LIMITED' });
  const cooled = new MaiMemoClient(fakeToken, { now: () => now, fetchImpl: async () => new Response('', { status: 429, headers: { 'Retry-After': '10' } }) });
  await assert.rejects(cooled.request('/study/get_study_progress', {}), { code: 'RATE_LIMITED', retry_after_seconds: 10 });
  assert.throws(() => cooled.reserveRequest(), { code: 'RATE_LIMITED', retry_after_seconds: 10 });
});
