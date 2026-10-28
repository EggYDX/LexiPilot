import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('Windows private-input scripts remain parseable in Windows PowerShell 5', { skip: process.platform !== 'win32' }, () => {
  for (const file of ['scripts/Configure-Secrets.ps1', 'scripts/Reset-Secret.ps1']) {
    const bytes = readFileSync(file);
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], 'PowerShell 5 needs a BOM for these Chinese UTF-8 scripts');
    const command = `$t=$null; $e=$null; [System.Management.Automation.Language.Parser]::ParseFile('${file}',[ref]$t,[ref]$e) | Out-Null; if ($e.Count) { exit 1 }`;
    assert.equal(spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true }).status, 0);
  }
});
