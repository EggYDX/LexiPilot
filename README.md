<div align="center">

# LexiPilot

**今天背的词，今天就用起来。**

你的墨墨背词副驾，把今日学习数据带进 ChatGPT，让复习、出题和精读更顺手。

部署作者：[**@EggYDX**](https://github.com/EggYDX) · MCP · ChatGPT Sites · MIT

[部署指南](docs/DEPLOY.md) · [接口说明](docs/API.md) · [开发笔记](docs/NOTES.md)

</div>

---

## 🧭 它能陪你做什么？

LexiPilot 连接墨墨的官方 API，ChatGPT 负责把数据变成你想要的学习内容。

| 场景 | 你可以这样说 |
| --- | --- |
| 每日检查 | “看看我今天完成了多少，还有哪些单词没学完。” |
| 今日词汇精读 | “用今天学的单词写一篇英文文章，陪我精读。” |
| 模糊词强化 | “挑出今天反馈为模糊或忘记的词，帮我辨析，再出几道题。” |
| 一对一小测 | “用今天的词考我，一次一题，我答完后再讲解。” |

**每个人部署自己的私人 Site，连接自己的墨墨账号。** 部署完成后，电脑关机也能继续在 ChatGPT 中使用。

## 🚀 把部署交给 Codex

准备一个拥有 **ChatGPT Sites 部署及插件创建权限** 的账号，再复制下面这段话给 Codex。代码块右上角可以直接复制。

```text
请将 https://github.com/EggYDX/LexiPilot 部署为我自己的私人 ChatGPT 插件，名称保持 LexiPilot。

先获取仓库，阅读 AGENTS.md 和 docs/DEPLOY.md，再实际完成部署：
1. 使用 scripts/prepare-site.mjs 准备独立的部署副本。
2. 使用我账号下的 ChatGPT Sites 创建仅本人可访问的 Site，保存返回的项目 ID。
3. 安装依赖，运行测试并构建，通过安全输入或 Sites Secret 配置我自己的 MAIMEMO_TOKEN。
4. 发布 Site，安装并连接它自动生成的 LexiPilot 插件。
5. 实际调用 get_study_progress 和 get_today_words，展示今日进度与前 5 个单词，完成验收。

保留简介中的“部署作者：@EggYDX”和 MIT 署名。说明保持简洁，聚焦当天查询。
除了账号授权、私密凭证和费用确认，其余步骤请自行完成。
```

**你只需亲自准备：**

1. 墨墨 App 开启自动同步，当天打开一次学习页面。
2. 在「我的 → 更多设置 → 实验功能 → 开放 API」取得自己的 Token。
3. 按 Codex 提供的私密输入或 Sites Secret 入口填写 Token。

Site 发布后会生成对应的私人插件。在 **Plugins → Personal → Created by you → LexiPilot** 中安装并连接，然后在聊天输入框用 `@` 选择它。[官方托管与安装说明](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)

## 📖 来一篇“今天的词”精读

在聊天中选中 `@LexiPilot`，复制：

```text
先读取我今天的墨墨学习单词和第一次反馈，再从中选 20 个词，写一篇约 400–600 词、B2 难度的英文精读文章。

请给文章选一个自然、有趣的主题，将用到的目标词加粗。
随后提供：
- 一段中文导读；
- 目标词在本文语境中的用法与常见搭配；
- 3 个值得精读的句子及结构讲解；
- 5 道阅读理解题；
- 文末列出实际使用的目标词。
```

想练得更有针对性，也可以复制：

```text
查看我今天第一次反馈为 VAGUE（模糊）或 FORGET（忘记）的单词。
先帮我做一个简短复习，再逐题出题，混合词义、搭配和语境填空。
我每答完一题，你再给反馈和下一题。
```

## 工具一览

| 工具 | 返回内容 |
| --- | --- |
| `get_today_words` | 今日单词、学习顺序、新学/完成状态、当天第一次反馈 |
| `get_study_progress` | 今日已完成数、应完成数、学习时长（毫秒） |
| `get_word_info` | 墨墨词汇 ID 和拼写 |
| `get_study_records` | 单词反馈、累计学习次数、标签及下次复习时间 |

日期按北京时间展示；单词查询默认 50 条，最多 1000 条。状态字段保持墨墨原值，完整参数见[接口说明](docs/API.md)。

## 想先跑一下代码？

需要 Node.js 22+ 和 pnpm：

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm check:public
```

这些检查使用模拟数据，无需墨墨 Token。GitHub Actions 会在 Windows 和 Linux 上运行测试与构建。

准备私人部署目录：

```bash
node scripts/prepare-site.mjs
```

脚本生成 `.deploy/lexipilot/`。Codex 在该副本里创建 Site、填写项目 ID 并发布，公开仓库保留通用模板。部署细节见 [AGENTS.md](AGENTS.md) 和[部署指南](docs/DEPLOY.md)。

## 项目思路

```text
墨墨今日学习数据 → LexiPilot / 私人 Site → ChatGPT → 你的复习方式
```

服务负责取数，ChatGPT 负责分析和创作。源码使用官方 MCP SDK、Zod 和一个轻量 Worker；账号访问交给 Sites，墨墨 Token 放在服务端 Secret。

## 署名与许可

部署作者及项目维护：[**@EggYDX**](https://github.com/EggYDX)。欢迎 Fork、改进，也欢迎分享你的玩法。

本项目采用 [MIT License](LICENSE)，使用或分发时保留版权与许可证。Sites 使用已有 ChatGPT 套餐的相应权益与额度，具体以账号可用权限为准。[官方说明](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)
