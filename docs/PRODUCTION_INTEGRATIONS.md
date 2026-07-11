# Production integration checklist

生产前端只允许调用带用户 access token 的业务后端；供应商地址、鉴权头和密钥只能存在于后端运行环境，不能使用 `VITE_*` 下发。

## Integration mode

- 闭环内测：`INTEGRATION_MODE=sandbox`。后端返回明确标记为 `provider=sandbox` 的支付、空域、保险、征信和飞控结果，不静默伪装成真实供应商。
- 正式生产：`INTEGRATION_MODE=live`。后端启动及 `/api/v1/ready` 会校验全部供应商配置，缺项即拒绝就绪。
- 前端：`VITE_PROVIDER_MODE=backend`，只配置 `VITE_BACKEND_URL=https://...`。禁止配置 `VITE_PROVIDER_BRIDGE_URL` 或 `VITE_PROVIDER_BRIDGE_TOKEN`。

Live 模式后端必需配置：

- `PROVIDER_PAYMENT_PREPAY_URL`
- `PROVIDER_PAYMENT_NOTIFY_SECRET`
- `PROVIDER_AIRSPACE_APPLY_URL`
- `PROVIDER_INSURANCE_QUOTE_URL`
- `PROVIDER_CREDIT_SCORE_URL`
- `PROVIDER_DRONE_ARM_URL`
- `PROVIDER_HTTP_AUTH_HEADER` 或 `PROVIDER_HTTP_AUTH_TOKEN`（供应商网关要求鉴权时）

业务端点均位于 `/api/v1/provider/*`，由普通用户 access token 和订单归属/RBAC 保护，不存在供客户端使用的全局共享 bridge token。供应商结果写入支付、空域、保单、征信、遥测和审计记录。

## Payment

1. 客户端调用 `/api/v1/provider/payment/prepay`。
2. 后端调用支付供应商并创建 `status=pending` 的支付单。
3. 小程序执行 `uni.requestPayment`。
4. 支付供应商回调 `/api/v1/provider/payment/notify`。
5. 后端使用 `PROVIDER_PAYMENT_NOTIFY_SECRET` 验签并更新最终状态。
6. 客户端轮询 `/api/v1/payments/{paymentId}/sync`；订单确认只接受后端已支付记录。

客户端 SDK 成功不是最终结算依据。生产空域、保险、征信、飞控和遥测结果同样只能由服务端供应商适配器写入。

## SMS and authentication

本地可使用 `SMS_PROVIDER=mock`。生产必须配置 `SMS_PROVIDER=http|aliyun|tencent` 及真实网关；mock code 不会在非 mock 模式返回。验证码和 access/refresh token 均只保存哈希，access token 15 分钟过期，refresh token 每次使用都轮换；短信同时按手机号和来源 IP 限流。

## Release builds

H5：

```bash
VITE_BACKEND_URL=https://api.example.com \
VITE_PROVIDER_MODE=backend \
pnpm build:h5:release
```

微信小程序还必须设置 `UNI_APP_ID`、`MP_WEIXIN_APPID`、`MP_WEIXIN_URL_CHECK=true`、`MP_WEIXIN_REQUEST_DOMAINS` 和 `MP_WEIXIN_BUSINESS_DOMAINS`，并运行：

```bash
pnpm build:mp-weixin:release
```

## Runtime gates

- `APP_ENV=production`
- `CORS_ALLOW_ORIGIN` 必须是逗号分隔的精确 HTTPS origin，不允许 `*`。
- `/api/v1/health` 只证明进程存活；发布和容器健康检查必须使用 `/api/v1/ready`。
- 生产禁用 snapshot/reset 写入口；快照读取也不对匿名请求开放。
- 发布流水线使用 commit SHA 镜像，切换失败自动恢复上一前端目录和上一 API 镜像。
- `OBJECT_STORAGE_ALLOWED_HOSTS` 必须是逗号分隔的精确对象存储 DNS 主机名；材料 URL 不允许任意外域、IP、端口、内嵌凭证或 fragment。
- 生产库不得包含内置 seed ID，并且必须存在活动管理员；首个管理员只能由 `/server bootstrap-admin` 运维命令显式初始化。

## External credentials still required for live mode

- 支付商户、证书/私钥和回调验签材料。
- 短信账号、签名、模板与网关凭证。
- UOM/空域、保险、征信、无人机/遥测供应商账号及回调合同。
- 微信正式 AppID、合法域名、备案与平台审核。
