import { MaiMemoClient, redact } from './maimemo.mjs';
import { createHandler } from './tools.mjs';

export function createWorker({ fetchImpl = fetch, now } = {}) {
  let api;
  let handler;
  return {
    async fetch(request, env = {}) {
      const url = new URL(request.url);
      const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
      if (url.pathname === '/' && request.method === 'GET') {
        return new Response('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LexiPilot</title><body><h1>LexiPilot</h1><p>你的墨墨背词副驾：查看今日进度与单词，让复习和出题更顺手。</p><p>在聊天中 @LexiPilot，看看今天学得怎么样，或让副驾给你出几道题。</p><p>时间：北京时间（UTC+8）。</p><p>部署作者：<a href="https://github.com/EggYDX">@EggYDX</a> · <a href="https://github.com/EggYDX/LexiPilot">GitHub 源码</a></p></body></html>', { headers: { ...headers, 'Content-Type': 'text/html;charset=utf-8', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self' https://chatgpt.com" } });
      }
      if (url.pathname !== '/mcp') return new Response('Not found', { status: 404, headers });
      const origin = request.headers.get('Origin');
      if (origin && origin !== url.origin) return new Response('Forbidden origin', { status: 403, headers });
      if (request.method !== 'POST') return new Response('Use POST', { status: 405, headers: { ...headers, Allow: 'POST' } });
      if (!request.headers.get('Content-Type')?.toLowerCase().includes('application/json')) return new Response('JSON required', { status: 415, headers });
      let message;
      try {
        const reader = request.body?.getReader();
        if (!reader) return new Response('JSON required', { status: 400, headers });
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 128 * 1024) return new Response('Request too large', { status: 413, headers });
            chunks.push(value);
          }
        } finally { await reader.cancel().catch(() => {}); }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        message = JSON.parse(new TextDecoder().decode(bytes));
      } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400, headers }); }
      // Sites dispatch authenticates and replaces identity headers before reaching this Worker.
      // Direct hosting elsewhere must use the authenticated local adapter or OAuth, never trust these headers on the public internet.
      const publicMethods = ['server/discover', 'initialize', 'notifications/initialized', 'tools/list', 'ping'];
      if (!publicMethods.includes(message?.method) && !request.headers.get('oai-authenticated-user-id')) {
        return Response.json({ error: 'UNAUTHORIZED', message: '请登录并连接 LexiPilot。' }, { status: 401, headers });
      }
      if (!api || api.token !== env.MAIMEMO_TOKEN?.trim()) {
        api = new MaiMemoClient(env.MAIMEMO_TOKEN, { fetchImpl });
        handler = createHandler(api, now ? { now } : undefined);
      }
      try {
        const response = await handler.fetch(new Request(request, { body: JSON.stringify(message) }));
        const safeHeaders = new Headers(response.headers);
        for (const [key, value] of Object.entries(headers)) safeHeaders.set(key, value);
        safeHeaders.delete('Content-Length');
        const text = await response.text();
        const scrubJson = text => JSON.stringify(redact(JSON.parse(text), [api.token]));
        let safeText;
        try { safeText = scrubJson(text); } catch {
          safeText = text.split('\n').map(line => line.startsWith('data: ') ? `data: ${scrubJson(line.slice(6))}` : line).join('\n');
        }
        return new Response(safeText || null, { status: response.status, headers: safeHeaders });
      } catch {
        return Response.json({ error: 'INTERNAL_ERROR', message: 'MCP 请求未完成。' }, { status: 500, headers });
      }
    },
  };
}

export default createWorker();
