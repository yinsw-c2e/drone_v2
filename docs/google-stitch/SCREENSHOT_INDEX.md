# Google Stitch 截图索引

> 本目录截图生成于 2026-06-08，来源为本地 H5 预览 `http://127.0.0.1:5173/`。移动端截图按 390 宽生成；管理后台额外提供 1280 宽桌面截图。重定向页面使用其实际落地页面截图，并在备注中说明。

## 截图目录

`docs/google-stitch/screenshots/`

## 页面截图清单

| 序号 | 页面 | 路由 | 截图文件 | 尺寸 | 备注 |
| --- | --- | --- | --- | --- | --- |
| 00 | 启动 / 重定向 | `/pages/index/index` | `00-pages-index-index.png` | 390 × 852 | 该入口会自动进入登录页 |
| 01 | 角色登录 | `/pages/login/index` | `01-pages-login-index.png` | 390 × 852 | 角色入口页 |
| 02 | 业主指挥台 | `/pages-client/home/index` | `02-pages-client-home-index.png` | 390 × 1552 | 业主首页工作台 |
| 03 | 发起吊运 | `/pages-client/order/index` | `03-pages-client-order-index.png` | 390 × 2047 | 发单表单、地图选点、上传入口 |
| 04 | 发单重定向 | `/pages-client/publish/index` | `04-pages-client-publish-index.png` | 390 × 2047 | 该入口落地到发单页 |
| 05 | 智能匹配 | `/pages-client/match/index` | `05-pages-client-match-index.png` | 390 × 1036 | 候选运力与报价 |
| 06 | 飞行监控 | `/pages-client/track/index` | `06-pages-client-track-index.png` | 390 × 1074 | 业主侧飞行追踪 |
| 07 | 评价结算 | `/pages-client/review/index` | `07-pages-client-review-index.png` | 390 × 975 | 结算与评价 |
| 08 | 保险理赔 | `/pages-client/insurance/index` | `08-pages-client-insurance-index.png` | 390 × 1184 | 投保与理赔流程 |
| 09 | 信用风控 | `/pages/credit/index` | `09-pages-credit-index.png` | 390 × 896 | 信用雷达与风控维度 |
| 10 | 认证中心 | `/pages/auth/index` | `10-pages-auth-index.png` | 390 × 896 | 当前角色材料提交页 |
| 11 | 飞手驾驶舱 | `/pages-pilot/home/index` | `11-pages-pilot-home-index.png` | 390 × 1048 | 飞手首页 |
| 12 | 接单大厅 | `/pages-pilot/hall/index` | `12-pages-pilot-hall-index.png` | 390 × 1477 | 可接订单 / 空态 |
| 13 | 任务执行 | `/pages-pilot/task/index` | `13-pages-pilot-task-index.png` | 390 × 1409 | 飞手任务驾驶舱 |
| 14 | 飞手钱包 | `/pages-pilot/wallet/index` | `14-pages-pilot-wallet-index.png` | 390 × 1219 | 收益、流水、提现 |
| 15 | 机主管理台 | `/pages-owner/home/index` | `15-pages-owner-home-index.png` | 390 × 1284 | 资产与运力池 |
| 16 | 设备与运力 | `/pages-owner/devices/index` | `16-pages-owner-devices-index.png` | 390 × 1098 | 设备卡与投放动作 |
| 17 | 设备管理 | `/pages-owner/drones/index` | `17-pages-owner-drones-index.png` | 390 × 975 | 设备资质列表 |
| 18 | 运力调度 | `/pages-owner/dispatch/index` | `18-pages-owner-dispatch-index.png` | 390 × 896 | 运力上线/撤回 |
| 19 | 机主钱包 | `/pages-owner/wallet/index` | `19-pages-owner-wallet-index.png` | 390 × 974 | 机主分账钱包 |
| 20 | 管理后台移动 | `/pages-admin/dashboard/index` | `20-pages-admin-dashboard-index-mobile.png` | 390 × 10000 | 后台移动完整长图 |
| 21 | 后台重定向 | `/pages-admin/index/index` | `21-pages-admin-index-index.png` | 390 × 10000 | 该入口落地到管理后台 |
| 22 | 管理后台桌面 | `/pages-admin/dashboard/index` | `22-pages-admin-dashboard-index-desktop.png` | 1280 × 4300 | 后台桌面重设计参考 |

## 推荐上传顺序

1. `PRODUCT_BRIEF.md`
2. 移动端核心流程截图：`02`、`03`、`05`、`06`、`07`、`08`
3. 飞手端截图：`11`、`12`、`13`、`14`
4. 机主端截图：`15`、`16`、`17`、`18`、`19`
5. 后台截图：`20`、`22`
6. 辅助页面：`00`、`01`、`04`、`09`、`10`、`21`

## 设计工具使用提醒

- 管理后台移动图很长，Stitch 如果无法完整识别 `20`，优先使用 `22` 桌面图作为后台主参考。
- `04` 和 `21` 是重定向入口，不需要单独设计独立页面；可以在新设计中保留为兼容路由。
- 当前截图是 MVP 状态，真实生产化能力边界以 `PRODUCT_BRIEF.md` 第 3 节为准。

