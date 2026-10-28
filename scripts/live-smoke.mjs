import { MaiMemoClient } from '../src/maimemo.mjs';
import { createHandler } from '../src/tools.mjs';

if (!process.env.MAIMEMO_TOKEN) { console.error('请运行 Configure-Secrets.ps1 -TestLive 安全输入凭证。'); process.exit(1); }
const handler = createHandler(new MaiMemoClient(process.env.MAIMEMO_TOKEN));
for (const name of ['get_study_progress', 'get_today_words', 'get_word_info', 'get_study_records']) {
  const response = await handler.fetch(new Request('https://lexipilot.test/mcp', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: name === 'get_word_info' ? { spelling: 'apple' } : name === 'get_study_progress' ? {} : { limit: 1 } } }) }));
  const text = await response.text();
  let rpc;
  try { rpc = JSON.parse(text); } catch {
    const line = text.split('\n').find(v => v.startsWith('data: '));
    if (line) rpc = JSON.parse(line.slice(6));
  }
  const result = rpc?.result;
  const data = result?.structuredContent;
  const passed = response.ok && data?.ok === true && !result.isError;
  console.log(JSON.stringify({ tool: name, passed, http_status: response.status, ...(passed ? { scope: data.scope.kind } : { error_code: data?.error?.code ?? 'MCP_CALL_FAILED' }) }));
  if (!passed) process.exitCode = 1;
}
console.log('墨墨接口检查完成。');
