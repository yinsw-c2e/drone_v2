# 组件库接管设计方向

本轮不再沿用“白卡 + 手写航线 CSS”继续微调，目标是让 `wot-design-uni` 接管页面结构、状态、反馈与动作。`RouteHero` 只保留给追踪、匹配、飞手任务等真正需要航线视觉的页面；首页和后台优先用组件化工作流组织信息。

## A 调度控制台（推荐）

**风格定位**：低空货运调度台。首屏强调“当前任务、状态、下一步动作”，地图只在真实航线页出现，列表、状态和动作由组件库承载。

**页面落地**

| 端 | 落地方式 |
| --- | --- |
| 业主 | 首页用 wot 按钮组切换当前任务、快速发单、资产能力；当前任务用 `wd-card + wd-cell + wd-tag + wd-steps`，发单 CTA 用 `wd-button`。 |
| 飞手 | 首页是任务队列；任务页是驾驶舱：航线 visual + `wd-notice-bar` + `wd-steps` + `wd-checkbox` 安检 + `wd-action-sheet` 应急。 |
| 机主 | 资产与运力池用 `wd-card + wd-cell-group + wd-cell + wd-tag`，设备操作用 `wd-button` 操作组，调度状态用 tag 和队列说明表达。 |
| 后台 | 桌面保留 sidebar/grid，但订单、认证、理赔队列改成 `wd-card + wd-cell + wd-tag + wd-button`；移动端动作区分行展示。 |

**使用组件**

已核对 `wot-design-uni@^1.11.1` 可用：`wd-navbar`、`wd-cell`、`wd-cell-group`、`wd-card`、`wd-tag`、`wd-notice-bar`、`wd-steps`、`wd-step`、`wd-button`、`wd-action-sheet`、`wd-checkbox`、`wd-checkbox-group`、`wd-table`、`wd-sidebar`、`wd-toast`、`wd-message-box`。`wd-tabs/wd-segmented` 在当前 H5 预览中可用性不足以稳定输出可见文本，因此第一版用 `wd-button` 组成可见、可测试的分段控件，不引入第二套 UI 系统。

落地时已在 `src/pages.json` 配置 `wd-*` easycom 解析，H5 复核中 `.wd-button`、`.wd-card` 等真实组件类已进入 DOM；不是把 `wd-*` 标签当普通自定义标签直出。

**首屏草图**

```text
┌ wd-navbar：业主指挥台 / 角色状态 ┐
│ wot 按钮组: 当前任务 | 快速发单 | 资产能力 │
├ 当前任务 tab ──────────────────────┤
│ wd-card: 精密设备吊运              │
│   wd-tag: 匹配中 / 空域 / 结算       │
│   wd-cell: 起点 -> 终点             │
│   wd-cell: 下一步 / 责任方 / 预算     │
│   wd-steps: 发单 -> 确认 -> 执行 -> 结算 │
│   wd-button: 去匹配 / 追踪            │
├ 快速动作 cell group: 认证 / 信用 / 保险 │
└ bottom action: 主操作               ┘
```

**优点**：最符合 `docs/EXECUTION.md` §13 的低空指挥中心目标，同时避免每个首页重复假地图；可快速落到现有 uni-app 技术栈。

## B 移动物流 App

**风格定位**：接近 GoTruck / Droply 的移动物流体验。强调订单旅程、联系人、ETA、付款和评价，适合业主端与飞手端。

**页面落地**

| 端 | 落地方式 |
| --- | --- |
| 业主 | 首页像包裹物流 App，用 `wd-card` 展示当前订单，`wd-steps` 表达发单到送达；发单入口是大按钮。 |
| 飞手 | 任务页像配送详情，用 `wd-cell` 展示起终点、货物、安检、报酬，应急用 action sheet。 |
| 机主 | 作为设备资产页存在感较弱，仍需补资产管理结构。 |
| 后台 | 不适合后台桌面密度，需要额外设计 SaaS 管理台。 |

**使用组件**

`wd-navbar`、`wd-card`、`wd-cell`、`wd-tag`、`wd-steps`、`wd-notice-bar`、`wd-button`、`wd-action-sheet`、`wd-rate`、`wd-upload`。

**首屏草图**

```text
┌ wd-navbar：订单旅程 ┐
│ 当前订单 wd-card：起点/终点/ETA/报价 │
│ wd-steps：已发单 -> 已接单 -> 飞行中 -> 已送达 │
│ wd-cell-group：飞手、设备、保险、支付 │
│ wd-button：继续追踪 / 评价 │
└ 快捷入口：发单、理赔、钱包 ┘
```

**不足**：对后台和机主资产调度表达偏弱，不适合作为全项目统一方向。

## C 政企 SaaS 管理台

**风格定位**：更接近 TailAdmin / Flowbite Admin 的运营管理系统，突出表格、筛选、审批和报表。

**页面落地**

| 端 | 落地方式 |
| --- | --- |
| 业主 | 容易变成管理页，不够移动发单。 |
| 飞手 | 驾驶舱感不足，任务执行不如移动物流直观。 |
| 机主 | 适合资产管理和运力池。 |
| 后台 | 最适合，可用 sidebar、table、queue、metric panel。 |

**使用组件**

`wd-sidebar`、`wd-table`、`wd-card`、`wd-cell`、`wd-tag`、`wd-button`、`wd-tabs`、`wd-segmented`、`wd-notice-bar`。

**首屏草图**

```text
┌ sidebar: 概览 / 审核 / 订单 / 风控 / 报表 ┐
│ 顶部状态栏：在线运力 / 待处理 / 收入       │
│ wd-table: 订单队列                         │
│ wd-card: 认证审核 / 风控理赔 / 审计日志      │
└ 报表区：完成率 / 取消率 / 热力点            ┘
```

**不足**：移动端三端用户会显得过重，难以体现物流旅程。

## 推荐选择

选择 **A 调度控制台**。

理由：

- 它能同时覆盖业主、飞手、机主和后台，不需要引入第二套 UI 系统。
- 首页不再重复使用同一张假航线图，任务/追踪页才使用路线 visual。
- `wot-design-uni` 组件能承担导航、cell、tag、notice、steps、checkbox、action sheet 和按钮反馈，降低手写白卡感；分段切换用 wot 按钮组保证 H5 和小程序文本都可见。
- 保持 `docs/EXECUTION.md` §13 的“低空指挥中心”行业语义，同时更接近真实产品的信息架构。
