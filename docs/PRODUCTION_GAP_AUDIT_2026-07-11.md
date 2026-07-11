# 生产差距复核（2026-07-11）

## 结论

当前代码已经具备严格的生产失败策略、鉴权/RBAC、供应商隔离、发布回滚和候选镜像预检，但**仍不满足正式交易开放条件，也尚未部署本轮加固**。

本次只读核验的线上状态：

- 线上记录提交仍为 `c2c5c29ff21bbf7273fce5eae640ca8267c92d81`。
- `GET /api/v1/health` 返回 200；旧镜像没有 `/api/v1/ready`，因此容器健康状态为 unhealthy。
- MySQL 有 7 个用户，ID 全部属于历史演示种子：`u_c1/u_c2/u_o1/u_o2/u_p1/u_p2/u_p3`。
- MySQL 还有 2 个订单，均关联上述演示身份；当前没有可证明的生产管理员初始化流程或活动管理员数据。
- 服务器缺少真实 SMS、`SMS_CODE_PEPPER`、对象存储白名单和明确的 `INTEGRATION_MODE`；live 供应商配置也未设置。

## 本轮已加固

- 生产库为空时不再自动灌入 demo；生产启动和 `/ready` 同时拒绝历史种子数据、无活动管理员的数据库。
- 新增显式运维命令 `/server bootstrap-admin`；管理员不能通过用户端自助申请产生。
- 生产订单禁止隐式使用演示起点，校验坐标、重量、货值、预算、预约时间、支付模式、图片数和文本长度。
- 生产匹配不再使用硬编码信用分或固定 4.7 评分；飞手和机主都必须有未过期的供应商信用回执。
- 支付、空域、保险、征信和飞控响应增加金额、主体、状态、保额、授权期限、设备序列号等一致性校验。
- 对象材料 URL 必须来自 `OBJECT_STORAGE_ALLOWED_HOSTS` 的精确 HTTPS 主机，拒绝任意外链、IP、端口、内嵌凭证和 fragment。
- 安全随机源失败时不再降级到固定验证码或时间戳 token/ID。
- 生产前端的本地仓库改为只读授权快照；演示信用、演示订单、演示任务、模拟遥测和本地业务写入全部 fail closed。
- 管理后台在生产隐藏流程演练、demo 导出和重置；尚无后端 API 的提现、结算释放、理赔、运力投放、飞控指令会明确提示“尚未接入”，不再伪造成功。
- 发布脚本在替换前端/容器前启动候选 API 并检查 `/ready`；不合格时线上零变更。
- 发布前自动备份 MySQL、保留 14 天本机备份，并同时回滚前端、API、Compose 与 Caddy 配置。
- API 镜像升级到 Go 1.26.5，使用非 root UID 10001、只读根文件系统、cap drop、进程数限制和日志轮转；MySQL/Caddy 固定补丁版本。

## 仍然阻塞正式生产

### P0：必须在下一次部署前完成

1. 维护窗口内备份并清理现网历史种子数据。不能自动删除，因为当前 2 个订单也关联种子身份，必须由业务方确认保留、迁移或整库清空。
2. 使用受控手机号显式初始化首个管理员：

   ```bash
   API_IMAGE_TAG=<candidate-sha> \
   BOOTSTRAP_ADMIN_PHONE=<controlled-phone> \
   docker compose --env-file .env -f docker-compose.prod.yml \
     run --rm --no-deps api /server bootstrap-admin
   ```

3. 配置真实 SMS 网关和至少 32 字符的 `SMS_CODE_PEPPER`。
4. 配置 `OBJECT_STORAGE_ALLOWED_HOSTS`，并完成私有桶、对象归属校验、短期签名 URL、病毒扫描和生命周期策略。
5. 明确发布级别：闭环内测设置 `INTEGRATION_MODE=sandbox`；真实交易必须设置 `live` 并补齐支付、空域、保险、征信和飞控接口。

### P1：正式运营能力仍缺失

- 提现、结算释放、账单分页/对账没有服务端 API、幂等键、风控或财务审批。
- 理赔报案、补充材料、定损、赔付、仲裁没有服务端状态机和保险方回调。
- 机主运力投放/撤回、设备维护、飞手在线状态没有服务端写接口。
- 返航、降落、异常上报和设备遥测接入缺少设备身份认证、指令回执和防重放设计。
- 通知已读没有服务端接口。
- H5 token 仍位于 JS 可访问的 uni storage；正式 H5 建议迁移为 HttpOnly + Secure + SameSite Cookie，并配套 CSRF 策略。
- 当前 JSON 文档存储和进程内写锁只支持单 API 实例；多实例前需要行级模型、版本号/乐观锁或集中式事务方案。
- 支付回调目前是通用 HMAC 适配层；接真实微信/支付宝时仍需平台原生证书、时间戳/nonce、防重放和证书轮换。
- 审计日志与业务状态同库同事务，可被整表保存覆盖；正式审计需要追加写、独立保留和防篡改存储。
- 只有服务器本机 14 天备份，仍需异地副本、加密、恢复演练和 RPO/RTO 验收。
- 缺少集中日志、SLO、告警、磁盘/证书/MySQL/外部供应商监控、压测和故障演练。

## 依赖与构建风险

- `govulncheck ./...`：实际调用链 0 个漏洞。
- `pnpm audit --prod`：剩余 1 high、2 moderate，均来自 Vite 开发/构建服务文件访问边界；静态 H5 运行包不包含 Vite 服务端。
- 2026-07-11 核对的最新 uni-app Vue 3 发布线仍把 Vite peer 固定为 `5.2.8`，强升 Vite 6.4.3 会越过工具链契约；应在 DCloud 官方升级 peer 后清零。

## 发布完成的证据标准

只有以下证据全部成立才能称为“已部署并可正式开放”：

1. 本地与 CI：Go vet/race、前端 type-check/lint/tests、release preflight、H5 build 全绿。
2. 候选容器：连接生产库的 `/ready` 通过，且没有 demo 数据、无管理员或配置缺失。
3. GitHub Actions：目标 commit 的 `Deploy main to production` 结论为 success。
4. 线上：`/api/v1/health` 和 `/api/v1/ready` 均为 200，容器 healthy，部署记录 commit 等于目标 SHA。
5. 浏览器：未登录页、短信登录、授权快照、核心订单流无控制台错误且不出现 demo 数据。
6. 真实集成：短信、支付回调、保险/空域/征信/飞控至少各完成一次供应商验收或明确处于 sandbox 闭环内测。

