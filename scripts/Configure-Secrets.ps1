param([switch]$TestLive, [switch]$StartLocal)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$secretDirectory = Join-Path (Get-Location) '.secrets'
$secretPath = Join-Path $secretDirectory 'maimemo-token.xml'
if (-not (Test-Path -LiteralPath $secretPath)) {
    New-Item -ItemType Directory -Force -Path $secretDirectory | Out-Null
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    $acl = New-Object System.Security.AccessControl.DirectorySecurity
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.SetAccessRule($rule)
    Set-Acl -LiteralPath $secretDirectory -AclObject $acl
    Write-Host 'LexiPilot 安全配置：请从墨墨 App：我的 → 更多设置 → 实验功能 → 开放 API 复制 Token。'
    Write-Host '请粘贴到下面的私密输入框，不要发送到聊天中。不需要填写 Bearer 前缀。'
    $secure = Read-Host '墨墨 Token（输入不显示原文）' -AsSecureString
    if ($secure.Length -eq 0) { throw '未输入 Token，未保存。' }
    $secure | Export-Clixml -LiteralPath $secretPath
    Write-Host '已用 Windows DPAPI 加密保存；只有当前 Windows 用户在本机可解密。'
} else { Write-Host '已找到本机加密凭证。若要更新，请运行 scripts\Reset-Secret.ps1 后重新配置。' }
if ($TestLive -or $StartLocal) {
    $secure = Import-Clixml -LiteralPath $secretPath
    $credential = New-Object System.Management.Automation.PSCredential('maimemo', $secure)
    $env:MAIMEMO_TOKEN = $credential.GetNetworkCredential().Password
    try {
        if ($TestLive) { & node scripts/live-smoke.mjs; $taskLiveExit = $LASTEXITCODE }
        if ($StartLocal) {
            $randomBytes = New-Object byte[] 32
            $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
            $rng.GetBytes($randomBytes)
            $rng.Dispose()
            $env:LEXIPILOT_ACCESS_TOKEN = [Convert]::ToBase64String($randomBytes)
            Write-Host '已生成仅此进程使用的本机访问密钥（不输出）。生产使用请通过 Sites 插件。'
            & node scripts/local-server.mjs
        }
    } finally {
        Remove-Item Env:MAIMEMO_TOKEN -ErrorAction SilentlyContinue
        Remove-Item Env:LEXIPILOT_ACCESS_TOKEN -ErrorAction SilentlyContinue
        $credential = $null
    }
}
if ($TestLive -and $taskLiveExit -ne 0) { exit $taskLiveExit }
if (-not $TestLive -and -not $StartLocal) {
    Write-Host '配置完成。回到聊天只回复“安全配置已完成”，不需要提供 Token。'
    Read-Host '按回车关闭'
}
