<div align="center">
  
<pre>
    __             _ ____  _ __      __ 
   / /   ___ _  __(_) __ \(_) /___  / /_
  / /   / _ \ \/ / / /_/ / / / __ \/ __/
 / /___/  __/>  < / ____/ / / /_/ / /_  
/_____/\___/_/\_\/_/   /_/_/\____/\__/  
</pre>
   
# LexiPilot

**今天背的词，今天就用起来。**

别让复习曲线变成跳水心电图。你的墨墨背单词 AI 赛博副驾。

<p align="center">
  <img src="https://img.shields.io/badge/MCP-Compatible-blue?style=flat-square" alt="MCP Compatible">
  <img src="https://img.shields.io/badge/Data%20Source-墨墨背单词-orange?style=flat-square" alt="Momo">
  <img src="https://img.shields.io/badge/Brain_Damage-Prevented-brightgreen?style=flat-square" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-black?style=flat-square" alt="License">
</p>

[部署指南](docs/DEPLOY.md) · [接口说明](docs/API.md) · [开发笔记](docs/NOTES.md)

</div>

---

### 🚨 灵魂发问

- 墨墨每天弹窗催命，你却连点进去的勇气都没有？
- 感觉今天学了 300 词超级充实，切回主页发现 280 个全凭肌肉记忆瞎蒙？
- 想要复盘学习进度，但那一堆艾宾浩斯柱状图看得比高数还头大？

**LexiPilot**专治以上症状。它是一个基于 **Model Context Protocol (MCP)** 的轻量服务，将你的**墨墨背单词**学习数据与ChatGPT深度打通。

从今往后，无需手动截屏看统计，呼唤你的 AI，它就能顺着网线精准定位你的背词战况。

---

---

## 🧭 它能陪你做什么？

你负责背，LexiPilot负责帮你把数据翻译成人话~

| 场景 | 你可以这样说 |
| --- | --- |
| 每日检查 | “看看我今天完成了多少，还有哪些单词没学完。” |
| 今日词汇精读 | “用今天学的单词写一篇英文文章，陪我精读。” |
| 模糊词强化 | “挑出今天反馈为模糊或忘记的词，帮我辨析，再出几道题。” |
| 一对一小测 | “用今天的词考我，一次一题，我答完后再讲解。” |

代码全开源，通过本地安全部署Token，你的**学习黑历史**绝不上传任何第三方云端。

## 🚀 把部署交给 Codex

准备一个拥有 **ChatGPT Sites部署及插件创建权限** 的账号，再复制下面这段话给 Codex。代码块右上角可以直接复制。

**目前ChatGPT Sites的部署及插件创建仅支持Plus、Pro等付费套餐或工作区账户中**，具体请参阅[官方说明](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites)。

```text
请将 https://github.com/EggYDX/LexiPilot 部署为我自己的私人ChatGPT插件。

先获取仓库，阅读 AGENTS.md 和 docs/DEPLOY.md，再实际完成部署：
1. 使用 scripts/prepare-site.mjs 准备独立的部署副本。
2. 使用我账号下的 ChatGPT Sites 创建仅本人可访问的 Site，保存返回的项目 ID。
3. 安装依赖，运行测试并构建，通过安全输入或 Sites Secret 配置我自己的 MAIMEMO_TOKEN。
4. 发布 Site，安装并连接它自动生成的 LexiPilot 插件。
5. 实际调用 get_study_progress 和 get_today_words，展示今日进度与前 5 个单词，完成验收。

说明保持简洁，聚焦当天查询。
除了账号授权、私密凭证和费用确认，其余步骤请自行完成。
```

**你只需亲自准备：**

1. 墨墨 App 开启自动同步，当天打开一次学习页面。
2. 在「我的 → 更多设置 → 实验功能 → 开放 API」取得自己的 Token。
3. 按 Codex 提供的私密输入或 Sites Secret 入口填写 Token。

Site 发布后会生成对应的私人插件。在 **Plugins → Personal → Created by you → LexiPilot** 中安装并连接，然后在聊天输入框用 `@` 选择它。[官方托管与安装说明](https://help.openai.com/en/articles/20001547-hosting-a-plugin-with-chatgpt-sites)

## 💬实弹演练

接入后，你随时可以对你的 AI 发号施令，在聊天中选中 `@LexiPilot`，然后输入：

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

返回的时间均为北京时间；单词查询默认50条 ，最多1000条。状态字段会保持墨墨原值，完整参数见[接口说明](docs/API.md)。

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
