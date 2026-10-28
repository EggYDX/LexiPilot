# 部署自己的 LexiPilot

## 最快的方式

把 README 中的部署提示词复制给 Codex。它会读取 AGENTS.md，并按当前环境中的 Sites 流程完成下面这些步骤。

## 1. 准备账号与墨墨同步

- ChatGPT 账号拥有 Sites 部署和插件创建权限。
- 墨墨 App 已开启自动同步，并在当天打开过学习页面。
- 从「我的 → 更多设置 → 实验功能 → 开放 API」取得自己的 Token。

## 2. 准备部署副本

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
node scripts/prepare-site.mjs
```

脚本默认生成 `.deploy/lexipilot/`，仅复制源码、测试和配置模板。指定另一个新目录也可以：

```bash
node scripts/prepare-site.mjs .deploy/my-lexipilot
```

接下来的部署操作都在这个副本中进行。

## 3. 创建私人 Site

由 Codex 使用当前账号的 Sites 工具创建：

| 项目 | 设置 |
| --- | --- |
| 名称 | LexiPilot |
| 简介 | 你的墨墨背词副驾：查看今日进度与单词，让复习和出题更顺手。部署作者：@EggYDX。 |
| 访问范围 | 仅本人 / owner |
| MCP 端点 | `/mcp` |

将创建返回的真实 ID 保存到部署副本 `.openai/hosting.json` 的 `project_id`。原模板只包含：

```json
{
  "capabilities": ["mcp"]
}
```

如果正在更新已有 Site，沿用它的 ID。

## 4. 配置自己的墨墨 Token

在 Sites 的服务端 Secrets 中设置：

```text
名称：MAIMEMO_TOKEN
值：你的墨墨 Token
类型：Secret
```

Windows 用户也可以在部署副本中双击「安全配置.cmd」，通过私密输入保存 DPAPI 加密文件，再由 Codex 安全转存到当前 Site 的 Secret。

## 5. 构建、同步、发布

在部署副本运行：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

Codex 按已安装 Sites 技能执行 source workflow：同步源码、打包 `dist`、发布匹配提交的部署包。发布完成后检查状态为成功，并保留同一个 Site 和插件。

部署使用 Sites 身份认证和 owner 访问策略；源码中的身份头读取依赖这个托管环境。

## 6. 安装并试一下

在 ChatGPT / Codex 中打开 **Plugins → Personal → Created by you → LexiPilot**，点击 **Install**，按提示 **Connect**。插件也可能自动完成安装。

在聊天中 `@LexiPilot`，发送：

```text
读取我今天的墨墨学习进度和前 5 个单词，再给我一个简短复习建议。
```

对照手机 App 的进度和单词即可完成验收。随后可以尝试 README 中的精读或小测提示词。

## 本机开发

Node.js 22+。通过进程环境设置 `MAIMEMO_TOKEN` 和至少 32 字符的 `LEXIPILOT_ACCESS_TOKEN`，再运行 `pnpm start`。服务监听 `127.0.0.1:8787`，请求携带 Bearer 访问密钥。

Windows 真实接口检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/Configure-Secrets.ps1 -TestLive
```

## 常见情况

| 提示 | 下一步 |
| --- | --- |
| `CONFIGURATION_REQUIRED` | 设置 `MAIMEMO_TOKEN` Secret 并发布 |
| `AUTHENTICATION_FAILED` | 更新墨墨 Token |
| `RATE_LIMITED` | 按 `retry_after_seconds` 等待后重试 |
| 当日数据为空 | 打开墨墨，检查自动同步，等待同步完成 |
| 插件工具没出现 | 检查 Site 发布状态与插件连接，在新聊天重新选择插件 |

官方参考：[Sites 托管插件](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)、[Sites 账号与权限](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)。
