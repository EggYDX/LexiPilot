import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import worker from '../src/worker.mjs';

export function localServer(env = process.env, workerInstance = worker) {
  const accessToken = env.LEXIPILOT_ACCESS_TOKEN;
  if (!accessToken || accessToken.length < 32) throw new Error('本机访问密钥至少需要 32 个字符，请运行安全配置脚本。');
  const port = Number(env.PORT ?? 8787);
  const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  return createServer(async (req, res) => {
    try {
      if (!allowedHosts.has(req.headers.host)) { res.writeHead(403).end(); return; }
      const given = Buffer.from(req.headers.authorization ?? '');
      const expected = Buffer.from(`Bearer ${accessToken}`);
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
        res.writeHead(401, { 'Cache-Control': 'no-store' }).end('Unauthorized'); return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 128 * 1024) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (!key.startsWith('oai-') && !['authorization', 'host', 'connection', 'content-length'].includes(key) && typeof value === 'string') headers.set(key, value);
      }
      // Incoming identity headers are always discarded. Only our own validated key establishes identity.
      headers.set('oai-authenticated-user-id', 'local-owner');
      const response = await workerInstance.fetch(new Request(`http://127.0.0.1:${port}${req.url}`, {
        method: req.method, headers, ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: Buffer.concat(chunks) }),
      }), env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch { res.writeHead(500).end('Request failed'); }
  });
}

if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith(process.argv[1].replaceAll('\\', '/').toLowerCase())) {
  localServer().listen(Number(process.env.PORT ?? 8787), '127.0.0.1', () => console.log('LexiPilot 本机服务已启动，仅监听 127.0.0.1；每次请求需要访问密钥。'));
}
