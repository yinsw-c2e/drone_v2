# drone_v2 模拟真人全流程测试报告

## 1. 基本信息

| 项目 | 内容 |
|---|---|
| 执行日期 | 2026-07-06 |
| 执行代理 | Codex |
| 仓库 | `/Users/yinswc2e/Code/drone_v2` |
| 分支 / commit | `cc-drone/auth-registration-plan` / `9a2d162` |
| 测试口径 | 本地全量 + 线上只读 |
| 浏览器 | Playwright Core + 系统 Chrome；内置 Browser DOM 快照能力不可用，降级原因按计划记录 |
| 后端 | `http://localhost:8088` |
| H5 | `http://localhost:5173` |
| 截图目录 | `output/human-walkthrough/2026-07-06/` |
| 临时机器结果 | `/tmp/drone-v2-human-sim-2026-07-06/` |

本轮不在生产执行 reset、验证码发送、注册、下单、支付、空域、遥测、评价等写操作。生产只做 health、首页、snapshot、CORS、登录入口和只读渲染验证。

## 2. 本轮实际修复

本地全流程在确认下单阶段发现一个真实阻断：

| 文件 | 问题 | 修复 |
|---|---|---|
| `src/stores/order.ts` | 本地 mock 支付会生成前端本地 `paymentId`，但 Go 后端数据库没有对应 `payment_orders` 记录；确认订单时传入该 id 会触发 `支付单不存在或不属于当前订单`。 | `prepay.provider === 'local-mock'` 时不把 `paymentId` 传给后端；生产/provider 支付仍传真实 `paymentId`。 |

修复后重新跑了 type-check、lint、Vitest 和 H5 build，均通过。

## 3. 环境门禁

| 检查 | 结果 |
|---|---|
| `git status --short --branch` | `## cc-drone/auth-registration-plan`，本轮源码改动仅 `src/stores/order.ts`；报告写入本文件 |
| `GET /api/v1/health` | `{"data":{"status":"ok"},"ok":true}` |
| MySQL | `users=8`，`capacity_units=4`，表结构可读 |
| `.env.local` 高德 key | `VITE_AMAP_WEB_KEY`、`VITE_AMAP_SECURITY_CODE`、`VITE_AMAP_WEB_SERVICE_KEY` 均 set |
| `POST /api/v1/reset` | 本地基线 reset OK |

## 4. 自动门禁命令

| 命令 | 结果 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS，Already up to date |
| `pnpm backend:test` | PASS，`cmd/server` 与 `internal/app` 均通过 |
| `pnpm type-check` | PASS |
| `pnpm lint` | PASS，`--max-warnings=0` |
| `pnpm test` | PASS，32 files / 166 tests |
| `VITE_BACKEND_URL=http://localhost:8088 pnpm exec uni build -p h5` | PASS，`DONE Build complete` |

构建仍有既有 Sass deprecation 与字体 runtime resolve warning；没有 TS、ESLint、测试或构建失败。

## 5. 关键数据

| 类型 | ID / 用户 | 状态 |
|---|---|---|
| 主订单 | `o_NZQ5oswys9o1` | `settled` |
| 实际飞手 | `u_p3` / `13800000003` | 匹配策略真实选中 |
| 实际运力 | `cap3` | `EHang EH-216` |
| 实际机主 | `u_o2` / `13800000005` | `cap3` 所属机主 |
| 超载边界订单 | `o_X25AU_xgL-mq` | `matching`，候选数 0 |

最终 SQL：

```text
orders:
o_NZQ5oswys9o1  settled   pilot=u_p3  cap=cap3  settlement=19171
o_X25AU_xgL-mq  matching  pilot=NULL  cap=NULL  weight=999

ledger_entries for o_NZQ5oswys9o1:
u_p3      飞手劳务        9586  T+1       pending
platform  平台技术服务费  1916  realtime  available
u_o2      设备使用费      5751  T+7       pending

reviews:
count=1, star=5, text=准时响应，吊运稳定
```

## 6. 用例结果

| 用例 | 视角 | 操作 | 结果 | 证据 |
|---|---|---|---|---|
| AUTH-01 | 登录 | 非法手机号阻断短信 | PASS | `AUTH-01-invalid-phone.png` |
| AUTH-02 | 登录 | 未注册手机号进入注册补全 | PASS | `AUTH-02-register-mode.png` |
| AUTH-03 | 业主 | 自助注册进入业主首页 | PASS | `AUTH-03-client-register-home.png` |
| AUTH-04 | 路由 | 未登录业务页跳登录并保留登录守卫 | PASS | `AUTH-04-route-guard.png` |
| A01 | 业主 | 发单页初始信息架构 | PASS | `A01-order-initial.png` |
| A02 | 业主 | 重量/货值输入与预算联动 | PASS | `A02-estimate-linkage.png` |
| A03 | 业主 | 预约/立即与中英文切换 | PASS | `A03-language-schedule.png` |
| A04 | 业主 | 真实地图选起点、目的地 | PASS | `A04-origin-picked.png`、`A04-destination-picked.png` |
| A05 | 业主 | 提交订单进入匹配，SQL=`matching` | PASS | `A05-match-after-submit.png` |
| B01 | 业主 | 策略切换、费用明细、重新匹配 | PASS | `B01-match-strategy-cost.png` |
| B02 | 业主 | 确认下单，SQL=`confirmed` | PASS | `B02-track-confirmed.png` |
| B03 | 业主 | 重开匹配页防重复确认 | PASS | `B03-duplicate-confirm-guard.png` |
| D01 | 飞手 | 实际分配飞手加载任务并提交空域 | PASS | `D01-pilot-task-confirmed.png`、`D02-airspace-submitted.png` |
| D02 | 飞手 | 审批前刷新不能推进 | PASS | `D03-before-approval-blocked.png` |
| E01 | 后台 | 通过空域审批，后台不推进飞行阶段 | PASS | `E01-admin-orders-airspace.png`、`E02-admin-airspace-approved.png` |
| D04 | 飞手 | 准备检查、装货、起飞 | PASS | `D04b-checklist-complete.png`、`D05-loading.png`、`D06-inflight.png` |
| D06 | 飞手 | 未到达终点围栏不能卸货；等待后可卸货 | PASS | `D07-geofence-blocked.png`、`D07b-arrival-ready.png` |
| D07 | 飞手 | 卸货、完成、结算 | PASS | `D08-unloading.png`、`D09-completed.png`、`D10-settled.png` |
| F01 | 业主 | 五方分账可见，提交 5 星评价 | PASS | `F01-review-settlement.png`、`F02-review-submitted.png` |
| W01 | 飞手 | 钱包显示本单飞手劳务与待结算金额 | PASS | `W01-pilot-wallet.png` + SQL `T+1 pending` |
| W02 | 机主 | 实际机主钱包显示本单设备使用费 | PASS | `W03-assigned-owner-wallet.png` + SQL `T+7 pending` |
| H01 | 边界 | 999kg 超载订单候选数 0 | PASS | SQL + candidates API |
| H02 | 边界 | 超载匹配页 0 候选空态不崩 | PASS | `S-H02-overload.png` |
| S1-S11 | 冒烟 | 后台/飞手/机主/业主 11 页非白屏、无横向溢出 | PASS | `S-*.png`，consoleEvents=0 |

说明：计划默认飞手 `13800000001`、机主 `13800000004` 已在账号/登录口径覆盖；主订单实际匹配到了 `u_p3/cap3/u_o2`，因此执行和钱包核验使用实际分配角色，符合真实匹配结果。

## 7. 响应式与页面冒烟

| 页面 | 视口 | 结果 |
|---|---:|---|
| `pages-admin/dashboard/index` | 1280x900 | PASS |
| `pages-admin/orders/index` | 1280x900 | PASS |
| `pages-admin/risk/index` | 1280x900 | PASS |
| `pages-admin/reports/index` | 1440x900 | PASS |
| `pages-admin/audit/index` | 1440x900 | PASS |
| `pages-pilot/wallet/index` | 390x844 | PASS |
| `pages-owner/wallet/index` | 390x844 | PASS |
| `pages-owner/dispatch/index` | 430x932 | PASS |
| `pages-client/home/index` | 390x844 | PASS |
| `pages-client/review/index` | 430x932 | PASS |
| 超载匹配空态 | 390x844 | PASS |

这些补充冒烟使用本地开发演示入口进行角色切换，只验证渲染/响应式；认证链路证据仍以手机号验证码登录段为准。

## 8. 线上只读复测

| 检查 | 结果 |
|---|---|
| `GET https://swvictory.com/api/v1/health` | 200，`{"data":{"status":"ok"},"ok":true}` |
| `HEAD https://swvictory.com/` | 200 |
| `GET /api/v1/snapshot` | 200，摘要：`users=7`、`orders=2`、`capacity=4` |
| CORS OPTIONS evil origin | 204，但 `access-control-allow-origin` 固定为 `https://swvictory.com` |
| CORS OPTIONS swvictory | 204，allow-origin=`https://swvictory.com` |
| 生产首页 | PASS，无演示直进 |
| 生产登录页 | PASS，无演示直进 |
| 首页点“进入控制台” | PASS，跳到 `#/pages/login/index`，console error=0 |

线上只读截图：

- `PROD-root.png`
- `PROD-login.png`
- `PROD-enter-console.png`

生产边界观察：直接访问 `https://swvictory.com/#/pages-admin/dashboard/index` 会出现 provider 配置缺失错误：`生产模式必须设置 VITE_PROVIDER_MODE=bridge`。从首页正常入口进入控制台不会触发该错误，会跳登录页。此项符合“生产缺真实 provider/SMS 外部集成变量会阻断全量链路”的边界判断，但建议后续补齐 provider 环境或在未登录深链优先走登录守卫，避免配置错误先于登录页暴露。

## 9. 过程中的测试脚本修正项

以下都不是业务失败，已在执行中修正并保留证据：

| 现象 | 处理 |
|---|---|
| uni-app H5 的 placeholder 不是 input attribute | 改用真实 input 顺序 + 键盘输入 |
| `getByText('EN')` 匹配到 `science` 中的 `en` | 改点 `.language-switch` |
| 地图目的地在起点未确认时被业务守卫转为选起点 | 改为先选起点，再选目的地 |
| 实际匹配飞手不是计划默认飞手 | 按真实匹配结果使用 `u_p3/13800000003` 执行 |
| 飞手检查项被底部固定操作栏遮挡 | 用触屏 tap + 滚动后再 tap，模拟手机真人操作 |
| 钱包页不显示 `T+1` 文案 | 用页面金额/订单号 + SQL 周期交叉验证 |

## 10. Console 与非阻断观察

- 本地 auth 负向用例和审批前刷新产生的 400 属预期门禁。
- 本地地图/Canvas 有 `getImageData willReadFrequently` 性能提示，不影响流程。
- H5 build 的 Sass deprecation 和字体 runtime resolve warning 是既有构建告警，不影响本轮通过结论。
- 主流程页面推进没有出现 `Invalid Object: Bounds` 刷屏。

## 11. 结论

本地完整真人模拟主链路已通过：手机号登录、地图选点、发单、智能匹配、确认下单、飞手空域申请、后台审批、飞手准备/装货/起飞、围栏拦截、卸货、完成、结算、业主 5 星评价、飞手/机主钱包分账核验全部闭环。

线上只读入口健康、生产首页/登录页/控制台入口均通过；生产深链后台暴露 provider 配置缺失，作为生产边界缺口记录，不在本轮只读范围内造数据或修线上配置。
