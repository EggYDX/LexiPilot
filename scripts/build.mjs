import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('.openai/hosting.json', 'utf8'));
if (!manifest.capabilities?.includes('mcp')) throw new Error('Sites MCP hosting manifest required');
await mkdir('dist/server', { recursive: true });
await mkdir('dist/.openai', { recursive: true });
await build({ entryPoints: ['src/worker.mjs'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', conditions: ['workerd', 'worker', 'browser'], minify: true, legalComments: 'eof' });
await writeFile('dist/.openai/hosting.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('dist/package.json', '{"type":"module"}\n');
console.log('Built standalone Sites Worker: dist/server/index.js');
