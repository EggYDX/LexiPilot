# 实作笔记

这里保留可复用的开发经验，方便后续维护。

## 先核对规范，再用真实返回验收

墨墨规范描述的是业务对象，实际生产响应还带有 `{success, errors, data}` 外层。客户端在解包后校验字段；`success=false` 作为接口错误处理。

记录的 `tags` 在规范中声明为字符串，实际也返回字符串数组。源码同时接受两种类型，并原样保留。

## 状态和单位写准就够了

`first_response` 是当天第一次反馈；`is_new` 和 `is_finished` 是独立字段。反馈值、缺省字段都按接口保留。

`study_time` 单位为毫秒，取数时间使用北京时间。界面说明和返回释义只写必要含义。

## Worker 与 Node 存在小差异

Cloudflare Worker 支持 `redirect: "manual"`，`redirect: "error"` 会在请求发出前抛错。源码使用 manual，并检查 3xx。[官方说明](https://developers.cloudflare.com/workers/runtime-apis/request/)

`fetch` 保持全局接收者，打包选择 `workerd` 条件。Node 测试之外，再通过已发布插件调用一次真实数据，才能验证整条云端链路。

## 把部署身份留在私人副本

公开模板的 `.openai/hosting.json` 只有 MCP capability。`prepare-site.mjs` 生成干净的部署目录，个人 Site ID 与 Secrets 在该副本中配置。

Sites 负责账号访问控制，服务校验调用身份；本机适配器使用独立 Bearer 密钥。源码里保留这些检查，日常返回保持简洁。

## Windows 私密输入

带中文的 PowerShell 脚本使用 UTF-8 BOM，兼容 Windows PowerShell 5。启动脚本在失败时保留窗口；本机 Token 由当前 Windows 用户的 DPAPI 加密。

## 轻量维护

已有测试覆盖协议、字段、状态、超时、限流、认证、凭证脱敏和部署副本。新增数据能力时先补一个有意义的用例，再验证实际插件调用。

pnpm 11 的 `pnpm-workspace.yaml` 显式允许 esbuild 构建脚本，安装时自动完成二进制准备。部署副本也会携带该配置。
