import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ignored = new Set(['.git', 'node_modules', 'dist', 'outputs', 'work', '.deploy', '.secrets', '.sites-local']);
const forbidden = [
  /\b(?:appgprj|appgdep|appgver)_[A-Za-z0-9]{12,}\b/,
  /\bplugin_asdk_app_sites_[A-Za-z0-9]{12,}\b/,
  /https?:\/\/[^\s"'<>]+\.chatgpt\.site\b/,
  /\b[A-Za-z]:[\\/](?:Users|Codex)[\\/]/i,
  /\b(?:ghp|gho|ghu|ghs|github_pat|sk)[_-][A-Za-z0-9_]{20,}\b/,
];
const files = [];
async function visit(directory = '.') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory() && !ignored.has(entry.name)) await visit(filename);
    else if (entry.isFile() && !entry.name.endsWith('.log') && (!entry.name.startsWith('.env') || entry.name === '.env.example')) files.push(filename);
  }
}
await visit();
const failures = [];
for (const filename of files) {
  const content = await readFile(filename, 'utf8');
  if (forbidden.some(pattern => pattern.test(content)) || (process.env.MAIMEMO_TOKEN && content.includes(process.env.MAIMEMO_TOKEN))) failures.push(filename);
}
const manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
if (manifest.project_id) failures.push('.openai/hosting.json: contains project_id');
const tracked = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', windowsHide: true });
if (tracked.status === 0) {
  for (const filename of tracked.stdout.split('\0').filter(Boolean)) {
    if (/^(?:\.secrets|\.deploy|node_modules|dist|outputs|assets)\//.test(filename) || filename.endsWith('.log') || /(^|\/)\.env(?:\.|$)/.test(filename) && !filename.endsWith('.env.example')) failures.push(filename);
  }
}
if (failures.length) { console.error('公开发布检查未通过：\n' + [...new Set(failures)].join('\n')); process.exitCode = 1; }
else console.log(`公开发布检查通过：${files.length} 个文件。`);
