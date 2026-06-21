# UI Walkthrough Test Results - 2026-06-12

Environment:
- H5: `http://localhost:5173/#/`
- Backend: `http://localhost:8088`
- MySQL container: `drone-v2-mysql`
- Browser automation: Playwright with real click/keyboard input

Primary orders:
- Main end-to-end order: `o_usexRl8OUCaq`
- Admin lock order: `o_elpPwQDTWh8M`
- Overload guard order: `o_kobPNHsRbc87`

| 用例编号 | 名称 | 结果 | 订单ID | 失败详情/截图 |
|---|---|---|---|---|
| A1 | 业主发单页初始状态 | PASS | - | 头部、步骤、默认货物参数、起点/目的地、保障、底部金额均渲染 |
| A2 | 货物参数交互 | PASS | - | 重量 8->20 后金额增大；价值 3000->6000 后金额不下降 |
| A3 | 执行时段切换 | PASS | - | 预约时间字段显示/收起正常 |
| A4 | 语言切换 | PASS | - | 中英切换正常，英文页显示 `SKYLINK LOGISTICS` / `PAYLOAD SPECIFICATIONS` |
| A5 | 未选目的地直接发起 | PASS | - | 修复后保留“请先选择目标区域”提示并打开选点层；截图 `output/playwright/A5-after-fix.png` |
| A6 | 原生高德选点打开与周边 POI | PASS | - | 高德底图可见，确认按钮初始禁用，周边 POI 复测 10 条；截图 `output/playwright/A6-retest.png` |
| A7 | 原生选点取消不弹兜底 | PASS | - | 点击原生返回后回到发单页，无自建兜底弹窗 |
| A8 | 原生选点搜索/选择/确认 | PASS | - | 真实键盘输入 `望京SOHO`，回填 LNG/LAT 与 ETA；截图 `output/playwright/A8-after-fix.png` |
| A9 | 起终点重合校验 | PASS | - | 修复后提示“起点和目的地不能重合”，起点保持北京低空货运中心 |
| A10 | 发起任务 | PASS | `o_usexRl8OUCaq` | 跳转匹配页；SQL: `status=matching`, `to_address` 含望京 SOHO |
| B1 | 智能匹配页初始状态 | PASS | `o_usexRl8OUCaq` | 4 个候选，报价不同，详情/推荐理由/设备信息完整；截图 `output/playwright/B1-match.png` |
| B2 | 策略切换 | PASS | `o_usexRl8OUCaq` | 最近距离/最高利润/时效优先/全局最优均可切换 |
| B3 | 费用明细展开 | PASS | `o_usexRl8OUCaq` | 修复文案为“基础运费 / 保费”，金额拆分为正 |
| B4 | 重新匹配 | PASS | `o_usexRl8OUCaq` | 刷新后仍有候选，无报错 |
| B5 | 确认下单 | PASS | `o_usexRl8OUCaq` | 跳转追踪页；SQL: `status=confirmed`, `pilot_id=u_p1` |
| B6 | 防重复确认 | PASS | `o_usexRl8OUCaq` | 返回匹配页显示查看追踪/无确认按钮，不重复确认 |
| C1 | 业主追踪页初始状态 | PASS | `o_usexRl8OUCaq` | 高德底图、起终点、遥测、阶段条正常；无 `Invalid Object: Bounds`；截图 `output/playwright/C1-track.png` |
| D1 | 飞手任务加载 | PASS | `o_usexRl8OUCaq` | 任务号、地图、阶段、遥测、提交空域申请按钮正常 |
| D2 | 提交空域申请 | PASS | `o_usexRl8OUCaq` | 按钮变为“刷新审批结果”；SQL: 订单 `airspace` |
| D3 | 审批前推进被拦 | PASS | `o_usexRl8OUCaq` | 刷新审批结果后仍停留待空域审批 |
| E1 | 后台订单列表 | PASS | `o_usexRl8OUCaq` | 订单显示空域审批与“通过空域审批” |
| E2 | 通过空域审批 | PASS | `o_usexRl8OUCaq` | 状态仍空域审批，下一动作“待飞手进入准备”；SQL: airspace request `approved` |
| E3 | 后台职责边界 | PASS | `o_usexRl8OUCaq` | 无可点击飞手推进按钮；历史事件保留“提交空域申请”记录 |
| D5.1 | 进入飞行准备 | PASS | `o_usexRl8OUCaq` | 阶段准备中，按钮变“开始装货” |
| D5.2 | 开始装货 | PASS | `o_usexRl8OUCaq` | 阶段装货中，按钮变“起飞执行” |
| D5.3 | 起飞执行 | PASS | `o_usexRl8OUCaq` | 阶段飞行中，遥测开始变化；截图 `output/playwright/D5-inflight.png` |
| D6 | 飞行围栏门禁 | PASS | `o_usexRl8OUCaq` | 未到终点点击不推进，轮询后出现“确认卸货” |
| D7 | 卸货到结算 | PASS | `o_usexRl8OUCaq` | 卸货中 -> 已完成 -> 已结算；SQL: `settled`, `total=25091`；截图 `output/playwright/D7-settled.png` |
| F1 | 业主轨迹页终态 | PASS | `o_usexRl8OUCaq` | 五阶段全部完成，出现“查看结算评价” |
| F2 | 评价结算页 | PASS | `o_usexRl8OUCaq` | 平台/飞手/机主/保险/税费五方分账和周期显示正常 |
| F3 | 提交五星评价 | PASS | `o_usexRl8OUCaq` | SQL: `star=5`, 文本为“验收测试：准时响应，吊运稳定。” |
| G1 | 创建匹配中订单 | PASS | `o_elpPwQDTWh8M` | curl 创建成功，`weightKg=25` |
| G2 | 后台锁定推荐运力 | PASS | `o_elpPwQDTWh8M` | 刷新后台后锁定成功；SQL: `status=confirmed`, pilot/policy 非空, `cap1=busy` |
| H1 | 超载订单无候选 | PASS | `o_kobPNHsRbc87` | 点击锁定后不推进；SQL: `status=matching` |
| H2 | 匹配页超载/无候选表现 | PASS | `o_kobPNHsRbc87` | 显示 0 个方案和“暂无可选方案”，无 JS fatal |
| H3 | 浏览器旧数据干扰自查 | PASS | - | 清理 local/session storage 后后台刷新显示 `ORDERS: 3` / `3 单`，与 SQL count 一致 |

## Smoke Pages

| 页面 | URL | 结果 | 备注 |
|---|---|---|---|
| 业主首页 | `#/pages-client/home/index` | PASS | 非白屏，无 fatal |
| 业主保险 | `#/pages-client/insurance/index` | PASS | 保单展示正常 |
| 飞手首页 | `#/pages-pilot/home/index` | PASS | 非白屏，无 fatal |
| 飞手接单大厅 | `#/pages-pilot/hall/index` | PASS | 已确认订单出现在当前任务/继续执行 |
| 飞手钱包 | `#/pages-pilot/wallet/index` | PASS | 有 `飞手劳务` pending 流水 |
| 机主首页 | `#/pages-owner/home/index` | PASS | 非白屏，无 fatal |
| 机主钱包 | `#/pages-owner/wallet/index` | PASS | 有 `设备使用费` T+7 pending 流水 |
| 机主设备 | `#/pages-owner/drones/index` | PASS | 设备状态可渲染 |
| 后台总览 | `#/pages-admin/dashboard/index` | PASS | 非白屏，无 Bounds 报错 |
| 后台风控 | `#/pages-admin/risk/index` | PASS | 风险队列空态正常 |
| 后台审计 | `#/pages-admin/audit/index` | PASS | 本次订单/空域/支付审计记录可见 |

## Fixes Applied

1. `src/pages-client/order/index.vue`: 未选目的地提交时不再被 `pickLocation()` 清掉防呆提示。
2. `src/pages-client/order/index.vue`: 起点选择到与目的地重合时先拦截，不再修改起点或清空目的地。
3. `src/pages-client/match/index.vue`: 费用明细文案对齐验收剧本为“基础运费 / 保费”。
4. `src/services/admin-console.ts`: 已接单后的后台下一动作对齐为“请由飞手提交空域申请”。

## Notes

- 高德原生选点首次打开的周边 POI 有一次加载抖动，独立复测 10 秒等待后稳定返回 10 条；搜索 POI 始终可用。
- 控制台仅出现 Canvas2D readback 性能 warning，未出现未捕获异常或 `Invalid Object: Bounds`。
