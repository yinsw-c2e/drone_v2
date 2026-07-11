# 生产就绪实施状态

更新时间：2026-07-10

## 已落地的 P0

- 所有业务 API 默认要求 access token；订单、支付、认证审核及供应商接口按角色和资源归属授权。
- 生产禁用匿名 snapshot/reset；普通用户快照按订单和本人数据裁剪，手机号脱敏，不返回会话、验证码和审计日志。
- 验证码、access token、refresh token 只保存哈希；access token 15 分钟，refresh token 单次轮换；切换角色撤销旧会话。
- 短信按手机号和来源 IP 限流，请求 JSON 上限 256 KiB；写请求在当前单实例内串行，避免 JSON 文档存储的丢失更新。
- 前端不再携带供应商共享密钥，只调用后端鉴权业务 API。`INTEGRATION_MODE=sandbox|live` 明确区分内测与真实供应商。
- `/api/v1/ready` 同时检查数据库、生产短信和供应商配置；CORS 使用精确 HTTPS 白名单。
- 发布流水线执行前后端测试、lint、release preflight 和 H5 构建；镜像以 commit SHA 标记，失败恢复上一前端目录和 API 镜像。

## 正式开放前的外部阻塞项

这些工作需要账号、合同或基础设施，不能仅靠仓库代码完成：

- 将 `INTEGRATION_MODE` 从 `sandbox` 切换为 `live`，接入并验收支付、短信、空域、保险、征信、飞控供应商的真实凭证与回调。
- 微信 AppID、备案域名、合法域名、隐私协议和平台审核。
- 认证材料/图片迁移到对象存储，配置私有桶、短期签名 URL、病毒扫描和生命周期策略。
- 数据库自动备份、异地副本与恢复演练；当前全局写锁只适用于单 API 实例，不支持多实例扩容。
- 监控告警、集中日志、审计日志独立保留、容量压测和故障演练。

## 已知依赖风险

`pnpm audit --prod --audit-level=high` 的 high 已从 6 项降到 1 项。剩余项是 uni-app 当前版本将 Vite peer dependency 固定为 `5.2.8`，而该公告只在 Vite `6.4.3+` 完全修复；漏洞影响 Windows 开发服务器的文件拒绝规则，不进入已构建的 H5/小程序运行包。仓库已升级到兼容的 Vite `5.4.21`，继续强制升级到 6.x 会越过 uni-app 的 peer contract，应在升级 uni-app 工具链后清零。

## 发布判定

闭环内测可在真实 SMS、HTTPS/CORS、备份和监控就绪后发布，保持 `INTEGRATION_MODE=sandbox` 并在 UI/运营规则中明确“沙箱，不发生真实交易”。正式交易发布必须先清空全部“外部阻塞项”，并对 `/api/v1/ready`、支付回调、权限越权、备份恢复和回滚做一次发布演练。
