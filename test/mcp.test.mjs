import test from 'node:test';
import assert from 'node:assert/strict';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { createWorker } from '../src/worker.mjs';
import { fakeToken, mockFetch, todayItems, records } from './fixtures.mjs';

for (const mode of ['legacy', 'auto']) {
  test(`real SDK client discovers and calls all four tools (${mode})`, async t => {
    const calls = [];
    const worker = createWorker({ fetchImpl: mockFetch(calls), now: () => new Date('2026-10-28T17:00:00.000Z') });
    const transport = new StreamableHTTPClientTransport(new URL('https://lexipilot.test/mcp'), {
      fetch: (url, init) => {
        const request = new Request(url, init);
        request.headers.set('oai-authenticated-user-id', 'site-owner-fixture');
        return worker.fetch(request, { MAIMEMO_TOKEN: fakeToken });
      },
    });
    const client = new Client({ name: 'LexiPilot-test', version: '1.0' }, { versionNegotiation: { mode } });
    await client.connect(transport);
    t.after(() => client.close());
    const listed = await client.listTools();
    assert.deepEqual(listed.tools.map(t => t.name).sort(), ['get_study_progress', 'get_today_words', 'get_word_info', 'get_study_records'].sort());
    assert.ok(listed.tools.every(v => v.annotations.readOnlyHint === true && v.annotations.destructiveHint === false && v.inputSchema && v.outputSchema));
    const invoke = async (name, args = {}) => {
      const result = await client.callTool({ name, arguments: args });
      assert.ok(!result.isError, JSON.stringify(result));
      assert.ok(result.structuredContent.ok);
      return result.structuredContent;
    };
    const today = await invoke('get_today_words');
    assert.deepEqual(today.data.today_items, todayItems);
    assert.equal(today.scope.pagination_supported, false);
    assert.equal(today.scope.local_calendar_date_at_fetch, '2026-10-29');
    assert.equal(today.data.today_items[4].first_response, 'CANCEL_WELL_FAMILIAR');
    assert.equal('first_response' in today.data.today_items[5], false);
    assert.equal(today.data.today_items[6].first_response, 'FUTURE_RESPONSE');
    assert.equal('warnings' in today, false);
    assert.equal(today.source.retrieved_at, '2026-10-29T01:00:00.000+08:00');
    const progress = await invoke('get_study_progress');
    assert.deepEqual(progress.data.progress, { finished: 17, total: 40, study_time: 123456 });
    const word = await invoke('get_word_info', { spelling: 'apple' });
    assert.deepEqual(word.data.voc, { id: 'word-1', spelling: 'apple' });
    const studyRecords = await invoke('get_study_records');
    assert.deepEqual(studyRecords.data.records, records);
    assert.equal(studyRecords.scope.count_valid, false);
    const count = await invoke('get_study_records', { as_count: true });
    assert.equal(count.data.count, 1234);
    assert.equal(count.scope.count_valid, true);
    assert.equal(count.scope.possibly_truncated, false);
    const capped = await invoke('get_today_words', { limit: 2 });
    assert.equal(capped.scope.possibly_truncated, true);
    assert.equal(capped.data.today_items.length, 2);
    await invoke('get_today_words', { is_new: false, is_finished: false });
    assert.deepEqual(calls.at(-1).body, { is_new: false, is_finished: false, limit: 50 });
    await invoke('get_study_records', { next_study_date: { start: '2026-10-30T00:00:00+08:00', end: '2026-10-30T23:59:59+08:00' }, tags: 'STICKING' });
    assert.ok(calls.at(-1).body.next_study_date.start.endsWith('+08:00'));
    const before = calls.length;
    for (const args of [{ limit: 1001 }, { spellings: ['apple'], voc_ids: ['id'] }, { spellings: ['apple'], is_new: true }, { date: '2026-09-01' }]) {
      const result = await client.callTool({ name: 'get_today_words', arguments: args });
      assert.equal(result.isError, true);
    }
    assert.equal(calls.length, before);
    assert.ok(!JSON.stringify([today, progress, word, studyRecords, listed]).includes(fakeToken));
  });
}

test('empty data and failure results are explicit over MCP and do not reveal tokens', async () => {
  for (const [fetchImpl, expected] of [
    [async () => Response.json({ today_items: [] }), null],
    [async () => new Response(fakeToken, { status: 401 }), 'AUTHENTICATION_FAILED'],
    [async () => new Response(fakeToken, { status: 500 }), 'UPSTREAM_ERROR'],
    [async () => { throw new Error(fakeToken); }, 'NETWORK_ERROR'],
  ]) {
    const worker = createWorker({ fetchImpl });
    const client = new Client({ name: 'error-test', version: '1' }, { versionNegotiation: { mode: 'auto' } });
    await client.connect(new StreamableHTTPClientTransport(new URL('https://lexipilot.test/mcp'), { fetch: (url, init) => {
      const request = new Request(url, init); request.headers.set('oai-authenticated-user-id', 'fixture');
      return worker.fetch(request, { MAIMEMO_TOKEN: fakeToken });
    } }));
    try {
      const result = await client.callTool({ name: 'get_today_words', arguments: {} });
      assert.ok(!JSON.stringify(result).includes(fakeToken));
      if (expected) { assert.equal(result.isError, true); assert.equal(result.structuredContent.error.code, expected); }
      else { assert.deepEqual(result.structuredContent.data.today_items, []); assert.equal(result.structuredContent.scope.possibly_truncated, false); }
    } finally { await client.close(); }
  }
});
