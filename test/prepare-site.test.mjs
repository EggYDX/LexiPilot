import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, realpath } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

test('deployment copy keeps source and attribution, excludes local state and preserves existing directories', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'lexipilot-copy-'));
  const resolvedTemp = await realpath(temporary);
  const resolvedParent = await realpath(tmpdir());
  assert.ok(resolvedTemp.startsWith(resolvedParent + path.sep));
  t.after(() => rm(resolvedTemp, { recursive: true, force: true }));
  const target = path.join(temporary, 'site');
  const run = () => spawnSync(process.execPath, ['scripts/prepare-site.mjs', target], { encoding: 'utf8', windowsHide: true });
  assert.equal(run().status, 0);
  const entries = await readdir(target);
  for (const omitted of ['.git', '.secrets', '.deploy', 'node_modules', 'dist', 'assets']) assert.ok(!entries.includes(omitted));
  const manifest = JSON.parse(await readFile(path.join(target, '.openai/hosting.json'), 'utf8'));
  assert.deepEqual(manifest, { capabilities: ['mcp'] });
  assert.ok((await readFile(path.join(target, 'pnpm-workspace.yaml'), 'utf8')).includes('esbuild: true'));
  assert.equal(JSON.parse(await readFile(path.join(target, 'package.json'), 'utf8')).author.name, 'EggYDX');
  const before = await readFile(path.join(target, 'README.md'), 'utf8');
  assert.notEqual(run().status, 0);
  assert.equal(await readFile(path.join(target, 'README.md'), 'utf8'), before);
});
