$ErrorActionPreference = 'Stop'
$secretPath = Join-Path (Split-Path -Parent $PSScriptRoot) '.secrets\maimemo-token.xml'
if (Test-Path -LiteralPath $secretPath) { Remove-Item -LiteralPath $secretPath }
Write-Host '本机加密凭证已清除。托管 Secret 需要另行更新；此操作不会在墨墨撤销 Token。'
