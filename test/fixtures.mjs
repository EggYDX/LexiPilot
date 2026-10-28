export const fakeToken = 'unit-test-secret-that-is-not-a-real-token';
export const responses = ['FAMILIAR', 'VAGUE', 'FORGET', 'WELL_FAMILIAR', 'CANCEL_WELL_FAMILIAR'];
export const todayItems = [...responses, undefined, 'FUTURE_RESPONSE'].map((feedback, i) => ({
  voc_id: `word-${i}`, voc_spelling: `spelling-${i}`, order: i + 1,
  ...(feedback === undefined ? {} : { first_response: feedback }),
  is_new: i % 2 === 0, is_finished: i % 3 === 0,
}));
export const records = [{
  voc_id: 'word-1', voc_spelling: 'apple', add_date: '2026-09-01T00:00:00+08:00',
  first_study_date: '2026-09-02T00:00:00+08:00', last_study_date: '2026-10-27T00:00:00+08:00',
  next_study_date: '2026-10-30T00:00:00+08:00', last_response: 'CANCEL_WELL_FAMILIAR', study_count: 12, tags: ['STICKING'],
}, { voc_id: 'word-2', voc_spelling: 'world', add_date: '2026-09-01T00:00:00+08:00', study_count: 5, tags: 'WELL_FAMILIAR' }];
export function mockFetch(calls = []) {
  return async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ url: String(url), options, body });
    const path = new URL(url).pathname;
    if (path.endsWith('/get_today_items')) return Response.json({ today_items: body.limit ? todayItems.slice(0, body.limit) : todayItems });
    if (path.endsWith('/get_study_progress')) return Response.json({ progress: { finished: 17, total: 40, study_time: 123456 } });
    if (path.endsWith('/query_study_records')) return Response.json({ records: body.as_count ? [] : records, count: body.as_count ? 1234 : 0 });
    if (path.endsWith('/vocabulary')) return Response.json({ voc: { id: 'word-1', spelling: new URL(url).searchParams.get('spelling') } });
    throw new Error('Unexpected API endpoint');
  };
}
