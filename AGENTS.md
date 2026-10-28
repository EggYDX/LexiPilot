# LexiPilot：给 Codex 的部署指引

这是可复用的源码模板。目标是把当前用户的墨墨今日数据接入其自己的 ChatGPT 私人插件。

## 项目约定

- 名称：LexiPilot。
- 简介：你的墨墨背词副驾：查看今日进度与单词，让复习和出题更顺手。部署作者：@EggYDX。
- 保留作者署名与 MIT 许可证，不添加头像。
- 工具说明保持简洁，聚焦当天查询。保留反馈原值、来源、北京时间和查询条数。
- ChatGPT 负责教学和内容创作；服务使用墨墨官方 API 取数。

## 开始前

1. 读取 `docs/DEPLOY.md`、`docs/API.md`、`docs/NOTES.md`。
2. 发现当前环境的 Sites 工具，读取已安装 Sites 技能及其 MCP 服务、身份和 Secrets 指引。使用当前工具与官方文档中的流程。
3. 安装依赖并运行 `pnpm test`、`pnpm build`。公开源码发布另运行 `pnpm check:public`。

## 首次部署

1. 在源码模板根目录运行 `node scripts/prepare-site.mjs`，使用输出的 `deployment_directory`。默认副本位于被 Git 忽略的 `.deploy/lexipilot/`。
2. 后续 Site 操作、构建、Git 同步均在该部署副本中进行，与 GitHub 源码仓库分开。
3. 检查副本的 `.openai/hosting.json`。有真实 `project_id` 时先查询并复用对应 Site；没有时创建一个新的 owner 私有 Site，标题为 LexiPilot，简介采用上面的文案。
4. 创建返回后立即原样保存 `project_id`；保留 `capabilities: ["mcp"]`。同一次创建只执行一次，等待或恢复原操作即可。
5. 通过平台支持的私密输入和 Sites Secret 配置用户自己的 `MAIMEMO_TOKEN`。Windows 可使用 `scripts/Configure-Secrets.ps1` 的 DPAPI 输入方式；其他环境使用平台的安全配置入口。只回传配置是否成功。
6. 在部署副本安装依赖、运行测试、构建，再用 Sites 提供的 source workflow 同步源码和打包。仓库写入凭证通过隐藏 stdin 传递，按照 Sites 技能执行。
7. 推送后，使用同一提交的部署包私有发布，检查最终部署状态。
8. Sites 会创建对应的 App 与私人插件。复用它，检查工具是否已安装；需要时用返回的真实插件 ID 提供安装入口，再完成连接。
9. 实际调用 `get_study_progress` 和 `get_today_words`（前 5 个），给用户展示结果。输出插件名称、个人 Site 地址和使用方法；测试状态以实际调用为准。

如果 Sites 能力或账号权限尚未启用，继续完成源码验证，说明需要用户开启的具体入口。不要用一个本地端口替代云端部署结果。

## 更新已有部署

复用原 `project_id`、Site 访问范围、插件身份与 Secrets。按当前 Sites 技能读取原源码、修改、检查、同步并发布。没有必要时不改用户的 Token。

## 维护重点

- 生产 API 固定为墨墨官方地址；新增字段先核对官方规范或真实返回。
- 保留访问控制、参数校验、限流、超时和凭证脱敏。
- Worker 使用 `redirect: "manual"` 并检查 3xx。
- `.openai/hosting.json` 在公开模板中只有 capabilities；个人 ID 留在私人部署副本。
- `.secrets/`、`.deploy/`、环境文件和运行日志已配置为 Git 忽略项。
- 执行 `pnpm check:public` 检查准备公开的源码；私人部署副本中的项目 ID 属于正常配置，无需运行此公开检查。

只在账号授权、私密凭证、费用或必须由用户操作的环节请求用户参与，其他开发与部署步骤自主完成。
