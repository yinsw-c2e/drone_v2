# UI UX Pro Max 重构计划

本轮目标不是继续调色，而是按 `ui-ux-pro-max` 的产品/风格/触控规则，把现有 MVP 页面重构成更接近生产使用的低空物流调度产品。`docs/EXECUTION.md` §13 仍是唯一视觉真源；本计划只吸收结构、层级、触控和响应式检查，不替换项目 token。

## Skill 查询摘要

已执行本地查询：

- `mobile logistics dispatch dashboard matching card`：命中 `Logistics/Delivery` 和 `Autonomous Drone Fleet Manager`。采用 `Real-Time Monitoring + Route Analytics`，但不走过度科幻 HUD。
- `mobile app logistics dispatch`：采用 `Enterprise SaaS Mobile` 的移动工作台结构，保留专业蓝、状态色和卡片分区，不使用高饱和品牌渐变。
- `command center dashboard professional`：后台采用 `Data-Dense Dashboard`，强调 12 列/多面板/表格式队列/审计与报表密度。
- `touch target card button tabs mobile`：所有关键按钮和卡片操作目标不低于 88rpx，按钮间距不低于 16rpx，主屏只保留一个主行动。
- `vue mobile app cards forms dashboard`：继续使用 Vue SFC、Pinia 和现有 wot-design-uni，避免引入第二套 UI 框架。

## 选定方向

选定方向：`低空物流调度工作台`。

移动端采用 `Logistics/Delivery + Enterprise SaaS Mobile + Real-Time Monitoring`：

- 首屏以当前任务、航线、运力池和下一步为主，不再使用同尺寸白卡平铺。
- 候选、订单、任务、设备卡统一为“头部身份 + 状态、主体关键指标、底部保障/风险/操作”。
- 分段控件、底部动作和状态条使用专业控件节奏：等宽、明确选中态、无挤压、无断字。

后台采用 `Data-Dense Operational Dashboard`：

- 桌面 1280 宽度使用真实运营台：侧栏、顶部态势、指标行、表格式订单/审核/风控队列、报表与审计。
- 移动端回落为可读的卡片队列，动作区分行，按钮不竖排。

## 组件规范

新增/强化组件：

- `ProSegmentedControl`：替代挤压胶囊按钮，等宽段、选中态清晰、触控目标达标。
- `MatchCandidateCard`：重构为物流报价卡，价格最大，设备/飞手身份稳定单行，关键指标三列，保障和推荐理由分组。
- `BottomActionBar`：强化为 Action Dock，主/次行动视觉权重分明，按钮不挤压。
- `KpiStrip`：改为紧凑 KPI 行，适合移动工作台和后台小指标，不再像孤立白卡。
- 页面级工作台：业主首页、机主首页、追踪、飞手任务和后台用统一的任务板/资产池/运营队列结构。

## 页面矩阵

| 页面组 | 重构重点 |
| --- | --- |
| 登录/入口/认证/信用 | 角色入口和限制说明保持中文业务语言，使用 cell/tag/notice 组织，不暴露工程词。 |
| 业主首页/发单/匹配/追踪/结算 | 首页为调度任务板；匹配页为专业报价列表；追踪页以地图/遥测/阶段抽屉为主。 |
| 飞手首页/大厅/任务/钱包 | 飞手任务页保持驾驶舱结构，安检、遥测、应急和主推进有明确层级。 |
| 机主首页/设备/资质/调度/钱包 | 资产与运力池突出合规门、在线/忙碌/下线队列和可用动作。 |
| 后台桌面/移动 | 桌面提升数据密度，移动保持动作按钮横向可读。 |

## 验收清单

- 移动端 390/430 宽无横向溢出，重要名称、价格、状态不随意断行。
- 每屏一个主行动；次行动弱化，终态/阻断态给出下一步。
- 筛选/分段控件等宽、对齐、选中态稳定。
- 候选、设备、订单卡按身份、指标、保障、动作分区。
- 金额、距离、时间、电量用 tabular 数字视觉。
- 无 raw enum、内部 id、工程词、状态机技术错误外露。
- `pnpm verify`、H5 核心流程和截图归档全部通过。
