import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { BridgeError, RESPONSE_MEANINGS, listScope, resultEnvelope, redact } from './maimemo.mjs';

const identifiers = z.array(z.string().trim().min(1).max(300)).min(1).max(1000);
const selectors = { spellings: identifiers.optional(), voc_ids: identifiers.optional() };
const limit = z.number().int().min(1).max(1000).optional();
function exclusive(input, ctx) {
  if (input.spellings && input.voc_ids) ctx.addIssue({ code: 'custom', message: 'spellings 与 voc_ids 只能选择一种。' });
  if ((input.spellings || input.voc_ids) && Object.keys(input).some(k => !['spellings', 'voc_ids', 'as_count'].includes(k))) {
    ctx.addIssue({ code: 'custom', message: '按 ID 或拼写查询时，请单独使用该条件。' });
  }
}
const todayInput = z.strictObject({ ...selectors, is_finished: z.boolean().optional(), is_new: z.boolean().optional(), limit }).superRefine(exclusive);
const dateTime = z.iso.datetime({ offset: true }).describe('下次学习时间，ISO 8601 格式，带时区（如 +08:00）。');
const recordInput = z.strictObject({
  ...selectors, limit, as_count: z.boolean().optional(), tags: z.enum(['STICKING']).optional(),
  next_study_date: z.strictObject({ start: dateTime.optional(), end: dateTime.optional() }).refine(
    v => !v.start || !v.end || Date.parse(v.start) <= Date.parse(v.end), '开始时间不能晚于结束时间。',
  ).optional(),
}).superRefine(exclusive);
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const outputSchema = z.object({ ok: z.literal(true), source: z.object({}).passthrough(), scope: z.object({}).passthrough(), data: z.object({}).passthrough(), field_meanings: z.object({}).passthrough() });

export function createServer(api, { now = () => new Date() } = {}) {
  const server = new McpServer({ name: 'LexiPilot', version: '0.2.0', description: '你的墨墨背词副驾：查看今日进度与单词，让复习和出题更顺手。部署作者：@EggYDX。' }, {
    instructions: '读取当天的墨墨学习数据，帮助用户检查进度、复习和出题。时间按北京时间展示。',
  });
  function register(name, description, inputSchema, path, process) {
    server.registerTool(name, { description, inputSchema, outputSchema, annotations }, async args => {
      try {
        const body = { ...args };
        if (['/study/get_today_items', '/study/query_study_records'].includes(path) && !body.spellings && !body.voc_ids) body.limit ??= 50;
        const data = await api.request(path, body);
        const { scope, meanings } = process(data, args);
        const result = resultEnvelope(path, data, scope, now());
        result.field_meanings = meanings;
        const safe = redact(result, [api.token]);
        return { content: [{ type: 'text', text: JSON.stringify(safe) }], structuredContent: safe };
      } catch (error) {
        const safe = error instanceof BridgeError ? { ok: false, error: { code: error.code, message: error.message, ...(error.retry_after_seconds === undefined ? {} : { retry_after_seconds: error.retry_after_seconds }) } }
          : { ok: false, error: { code: 'INTERNAL_ERROR', message: '查询未完成，请稍后重试。' } };
        return { isError: true, content: [{ type: 'text', text: JSON.stringify(safe) }], structuredContent: safe };
      }
    });
  }
  register('get_today_words', '获取今日学习单词、学习顺序、新学/完成状态及当天第一次反馈。支持按状态、拼写或 ID 筛选，默认 50 条，最多 1000 条。', todayInput, '/study/get_today_items', (data, args) => ({
    scope: listScope(data.today_items, args, 'today_words'),
    meanings: { first_response: '当天第一次反馈（可缺省）', response_values: RESPONSE_MEANINGS, is_new: '是否新学', is_finished: '是否完成当日学习', order: '学习顺序' },
  }));
  register('get_study_progress', '获取今日已完成单词数、应完成单词数和学习时长（毫秒）。', z.strictObject({}), '/study/get_study_progress', () => ({
    scope: { kind: 'today_progress' },
    meanings: { finished: '已完成单词数', total: '今日应完成单词数', study_time: '今日学习时长，单位毫秒' },
  }));
  register('get_word_info', '按单词拼写查询墨墨词汇 ID 和拼写。', z.strictObject({ spelling: z.string().trim().min(1).max(300) }), '/vocabulary', () => ({
    scope: { kind: 'vocabulary_lookup' },
    meanings: { id: '墨墨词汇 ID', spelling: '单词拼写' },
  }));
  register('get_study_records', '补充查询单词学习状态，包含反馈、累计学习次数、标签和下次复习时间。支持按拼写、ID、标签或下次复习时间筛选；as_count=true 返回计数。', recordInput, '/study/query_study_records', (data, args) => ({
    scope: { ...listScope(data.records, args, 'current_study_records'), count_valid: args.as_count === true, ...(args.as_count ? { possibly_truncated: false, count_only: true } : {}) },
    meanings: { study_count: '学习次数，每日最多计 1 次', last_response: '上次反馈', response_values: RESPONSE_MEANINGS, tags: '单词标签', count: '匹配数量，as_count=true 时有效', next_study_date: '下次学习时间；筛选范围包含起止时间' },
  }));
  return server;
}

export function createHandler(api, options) {
  return createMcpHandler(() => createServer(api, options), { maxRequestBodySize: 128 * 1024 });
}
