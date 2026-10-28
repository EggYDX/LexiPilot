import { cp, mkdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
const target = path.resolve(source, process.argv[2] ?? '.deploy/lexipilot');
const manifest = JSON.parse(await readFile(path.join(source, '.openai/hosting.json'), 'utf8'));
if (manifest.project_id) throw new Error('当前目录已有 Site 配置，请直接更新现有部署。');
try {
  await access(target);
  throw new Error('目标目录已存在，请选择新目录。');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
await mkdir(target, { recursive: true });
for (const entry of ['src', 'scripts', 'test', 'docs', '.openai', '.gitignore', '.gitattributes', '.env.example', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'README.md', 'AGENTS.md', 'LICENSE', '安全配置.cmd']) {
  await cp(path.join(source, entry), path.join(target, entry), { recursive: true, errorOnExist: true, force: false });
}
console.log(JSON.stringify({ deployment_directory: target, next_step: '在此目录创建私人 Site，保存返回的 project_id，再构建和发布。' }));
