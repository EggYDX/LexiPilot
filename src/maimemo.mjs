import { z } from 'zod';

export const API_ORIGIN = 'https://open.maimemo.com';
export const API_BASE = `${API_ORIGIN}/open/api/v1/memo`;
export const RESPONSE_MEANINGS = Object.freeze({
  FAMILIAR: '认识', VAGUE: '模糊', FORGET: '忘记',
  WELL_FAMILIAR: '熟知', CANCEL_WELL_FAMILIAR: '取消熟知',
});
const voc = z.object({ id: z.string(), spelling: z.string() });
const todayItem = z.object({
  voc_id: z.string(), voc_spelling: z.string(), order: z.number().int(),
  first_response: z.string().optional(), is_new: z.boolean(), is_finished: z.boolean(),
});
const record = z.object({
  voc_id: z.string(), voc_spelling: z.string(), add_date: z.string(),
  first_study_date: z.string().optional(), last_study_date: z.string().optional(),
  next_study_date: z.string().optional(), last_response: z.string().optional(),
  study_count: z.number().int().nonnegative(), tags: z.union([z.string(), z.array(z.string())]),
});
const schemas = {
  '/study/get_today_items': z.object({ today_items: z.array(todayItem).max(1000) }),
  '/study/get_study_progress': z.object({ progress: z.object({
    finished: z.number().int().nonnegative(), total: z.number().int().nonnegative(),
    study_time: z.number().int().nonnegative(),
  }) }),
  '/vocabulary': z.object({ voc }),
  '/study/query_study_records': z.object({ records: z.array(record).max(1000), count: z.number().int().nonnegative() }),
};

export class BridgeError extends Error {
  constructor(code, message, retryAfterSeconds) {
    super(message);
    this.code = code;
    if (retryAfterSeconds !== undefined) this.retry_after_seconds = retryAfterSeconds;
  }
}

// Error text and arbitrary upstream fields never cross the trust boundary.
export function redact(value, secrets = []) {
  if (typeof value === 'string') {
    for (const secret of secrets.filter(Boolean)) value = value.split(secret).join('[REDACTED]');
    return value;
  }
  if (Array.isArray(value)) return value.map(v => redact(v, secrets));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, secrets)]));
  return value;
}

export class MaiMemoClient {
  constructor(token, { fetchImpl = fetch, now = Date.now, timeoutMs = 20000 } = {}) {
    this.token = token?.trim();
    this.fetch = fetchImpl.bind(globalThis);
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.requests = [];
    this.blockedUntil = 0;
  }

  reserveRequest() {
    const now = this.now();
    this.requests = this.requests.filter(t => now - t < 18000000);
    let wait = this.blockedUntil - now;
    for (const [duration, maximum] of [[10000, 20], [60000, 40], [18000000, 2000]]) {
      const recent = this.requests.filter(t => now - t < duration);
      if (recent.length >= maximum) wait = Math.max(wait, recent[recent.length - maximum] + duration - now);
    }
    if (wait > 0) throw new BridgeError('RATE_LIMITED', '墨墨请求过于频繁，请稍后重试。', Math.ceil(wait / 1000));
    this.requests.push(now);
  }

  async request(path, body) {
    if (!schemas[path]) throw new BridgeError('READ_ONLY_ONLY', '不支持的查询接口。');
    if (!this.token || /[\s\x00-\x1f\x7f]/.test(this.token)) {
      throw new BridgeError('CONFIGURATION_REQUIRED', '尚未配置有效的墨墨 Token，请在服务端 Secret 中设置 MAIMEMO_TOKEN。');
    }
    this.reserveRequest();
    const url = new URL(`${API_BASE}${path}`);
    const isVocabulary = path === '/vocabulary';
    if (isVocabulary) url.searchParams.set('spelling', body.spelling);
    const signal = AbortSignal.timeout(this.timeoutMs);
    let response;
    let parsed;
    try {
      response = await this.fetch(url, {
        method: isVocabulary ? 'GET' : 'POST', redirect: 'manual', signal,
        headers: {
          Accept: 'application/json', Authorization: `Bearer ${this.token}`,
          ...(isVocabulary ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(isVocabulary ? {} : { body: JSON.stringify(body ?? {}) }),
      });
      if (response.status >= 300 && response.status < 400) throw new BridgeError('UNEXPECTED_REDIRECT', '墨墨 API 返回重定向，请核对接口地址。');
      if ([401, 403].includes(response.status)) throw new BridgeError('AUTHENTICATION_FAILED', '墨墨拒绝了凭证，请检查 Token 是否失效、已撤销或缺少访问权限。');
      if (response.status === 429) {
        const retry = response.headers.get('Retry-After');
        const seconds = retry && /^\d+$/.test(retry) ? Number(retry)
          : retry ? Math.ceil((Date.parse(retry) - this.now()) / 1000) : 60;
        const wait = Number.isFinite(seconds) ? Math.max(1, Math.min(seconds, 18000)) : 60;
        this.blockedUntil = this.now() + wait * 1000;
        throw new BridgeError('RATE_LIMITED', '墨墨 API 已限流，请等待后重试。', wait);
      }
      if (!response.ok) throw new BridgeError('UPSTREAM_ERROR', `墨墨 API 暂时无法完成查询（HTTP ${response.status}）。`);
      if (!response.headers.get('Content-Type')?.toLowerCase().includes('application/json')) {
        throw new BridgeError('UPSTREAM_SCHEMA_CHANGED', '墨墨响应格式异常（需要 JSON）。');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new BridgeError('UPSTREAM_SCHEMA_CHANGED', '墨墨返回了空响应。');
      const chunks = [];
      let size = 0;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 2 * 1024 * 1024) throw new BridgeError('UPSTREAM_RESPONSE_TOO_LARGE', '墨墨返回的数据过大，请缩小查询范围。');
          chunks.push(value);
        }
      } finally { await reader.cancel().catch(() => {}); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      // Live official responses use this envelope, although api_bundle.yaml describes only its data member.
      if (payload?.success === false) throw new BridgeError('UPSTREAM_API_ERROR', '墨墨查询失败，请稍后重试。');
      const unwrapped = payload?.success === true && Array.isArray(payload.errors) && payload.data && typeof payload.data === 'object' ? payload.data : payload;
      parsed = schemas[path].safeParse(unwrapped);
    } catch (error) {
      if (error instanceof BridgeError) throw error;
      if (signal.aborted || error?.name === 'TimeoutError' || error?.name === 'AbortError') {
        throw new BridgeError('TIMEOUT', '连接墨墨超时，请稍后重试。');
      }
      if (error instanceof SyntaxError) throw new BridgeError('UPSTREAM_SCHEMA_CHANGED', '墨墨响应不是有效 JSON。');
      console.error(JSON.stringify({ event: 'maimemo_network_error', detail: redact(String(error?.message ?? ''), [this.token]).slice(0, 200) }));
      throw new BridgeError('NETWORK_ERROR', '暂时无法连接墨墨，请检查网络或稍后重试。');
    } finally {
      // Discard error bodies too; never log or return them.
      if (response?.body && !response.body.locked) await response.body.cancel().catch(() => {});
    }
    if (!parsed.success) throw new BridgeError('UPSTREAM_SCHEMA_CHANGED', '墨墨返回字段与接口格式不符。');
    return redact(parsed.data, [this.token]);
  }
}

export function resultEnvelope(path, data, scope, now = new Date()) {
  return {
    ok: true,
    source: { name: '墨墨开放 API', url: `${API_BASE}${path}`, retrieved_at: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().replace('Z', '+08:00') },
    scope: {
      ...scope,
      local_calendar_date_at_fetch: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now),
      reference_timezone: 'Asia/Shanghai',
    },
    data,
  };
}

export function listScope(items, args, kind) {
  const selector = args.spellings !== undefined || args.voc_ids !== undefined;
  const limit = selector ? null : (args.limit ?? 50);
  return {
    kind, filters: args,
    returned_count: items.length, effective_limit: limit,
    pagination_supported: false,
    possibly_truncated: selector ? items.length >= 1000 : items.length >= limit,
  };
}
