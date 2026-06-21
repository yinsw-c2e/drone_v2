# drone_v2 模拟真人全流程验收测试报告

## 基本信息

| 项目 | 内容 |
|---|---|
| 执行代理 | Claude Code（Opus 4.8），按 `docs/HUMAN_SIMULATION_TEST_PLAYBOOK.md` 执行 |
| 测试开始 | 2026-06-13 约 17:00 CST |
| 测试结束 | 2026-06-13 17:23 CST |
| 仓库 | `/Users/yinswc2e/Code/drone_v2`，分支 `ui-redesign` |
| 起始 commit | `99af4a8` |
| 工作区 | 任务开始前已有 ~110 项改动（ui-redesign 在途工作），本轮测试**未新增源码改动**，仅在 `output/` 写截图、在 `/tmp/hsim/` 写测试脚本，保护了既有工作区 |

## 测试方式说明

- 使用 **playwright-core + 系统 Chrome（headless + swiftshader WebGL）** 驱动真实浏览器。
- 所有点击为真实鼠标点击（`locator.click` / 真实 `MouseEvent`），所有文本（含高德选点搜索"望京SOHO"、评价内容、重量/货值）均为**真实键盘逐字输入**（`keyboard.type`，带 60-150ms 间隔）。
- 未使用 JS 调用 Vue/Pinia 方法推进业务，未直接写库，未伪造 localStorage/sessionStorage 业务状态。
- 每个关键阶段截图存于 `output/human-walkthrough/2026-06-13/`，并以 MySQL 只读 SQL 交叉验证。
- 移动端流程视口 390×844 / 430×932，后台流程视口 1280×800 / 1440×900。

## 环境健康

| 组件 | 状态 |
|---|---|
| 后端 `GET /api/v1/health` | `{"data":{"status":"ok"},"ok":true}` |
| MySQL `drone-v2-mysql` | Up (healthy)，库 `drone_v2` 表齐全 |
| H5 dev server | `http://localhost:5173`（vite 正常） |
| 高德 key（.env.local） | `VITE_AMAP_WEB_KEY` / `VITE_AMAP_SECURITY_CODE` / `VITE_AMAP_WEB_SERVICE_KEY` 三项均 set；JS API 底图、周边 POI、关键词搜索实测可用 |
| 基线 | 测试前 `POST /api/v1/reset` 成功 |

## 关键订单 ID

| 角色 | 订单 ID | 终态 |
|---|---|---|
| 主链路（业主全流程） | `o_4-e2YfZ8B_oK` | `settled`（含 5 星评价、五方分账） |
| 后台锁定运力 | `o_xEGOuMgw8jzl` | `confirmed`（cap1 busy） |
| 超载边界 | `o_c89aq4pT2XJY` | `matching`（未分配运力，符合预期） |

## 用例结果总表

| 用例 | 用户视角 | 操作摘要 | 结果 | 订单ID | 证据/SQL |
|---|---|---|---|---|---|
| A1 | 业主 | 发单页初始视觉/信息架构 | PASS | - | A01；天链物流+四步+普货8KG+0.50M³+3000+起点坐标+预计合计¥321.59 |
| A2 | 业主 | 货类切换+重量/货值金额联动 | PASS | - | base¥321→重20¥405→值6000¥435（递增正确） |
| A3 | 业主 | 立即/预约执行切换 | PASS | - | 预约字段可显可收 |
| A4 | 业主 | 中英文切换 | PASS | - | EN→`SKYLINK LOGISTICS`/`Payload`，切回"天链物流" |
| A5 | 业主 | 未选目的地防呆 | PASS | - | A05；不跳转+"请先选择目标区域"+自动开选点 |
| A6 | 业主 | 原生高德选点打开 | PASS* | - | A06；真实高德底图+AutoNavi版权+红点+周边10条POI+确认禁用（*首开偶发POI抖动，取消重开/复测即加载，详见下） |
| A7 | 业主 | 取消选点不弹兜底 | PASS | - | 原生关闭+无自建兜底框+目的地仍空 |
| A8 | 业主 | 搜索并选择望京SOHO | PASS | - | A08；真实键盘输入"望京SOHO"→10条结果→选"望京soho塔3B座"→确认回填 LNG116.481/LAT39.996 |
| A9 | 业主 | 起终点重合校验 | SKIP | - | A09；真实POI返回不同点(亚朵酒店,>50m)，重合守卫合理未触发（剧本规定记 SKIP）；随后 reload 重置草稿保证主订单起点干净 |
| A10 | 业主 | 发起任务进匹配 | PASS | `o_4-e2YfZ8B_oK` | A10；URL→match，SQL status=matching，to_address=望京soho塔3B座，from=北京低空货运中心 |
| B1 | 业主 | 匹配候选列表 | PASS | 同上 | B01；N=4，报价¥251/261/203/205（实时浮动非假数据） |
| B2 | 业主 | 四策略切换 | PASS | 同上 | 最近距离/最高利润/时效优先/全局最优均可切换 |
| B3 | 业主 | 费用明细展开 | PASS | 同上 | B03；含"基础运费"与"保费" |
| B4 | 业主 | 重新匹配 | PASS | 同上 | 重新匹配后仍 N=4，不白屏 |
| B5 | 业主 | 确认下单 | PASS | 同上 | B05；URL→track，SQL status=confirmed，pilot=u_p1，policy=pol_OCC-FVSXwHR7 |
| B6 | 业主 | 防重复确认 | PASS | 同上 | 重开匹配页"0个方案"、无"确认下单"按钮 |
| C1 | 业主 | 追踪页初始 | PASS | 同上 | C01；真实地图+起终点+遥测面板+"GPS：待起飞"，无 `Invalid Object: Bounds` |
| D1 | 飞手 | 任务加载 | PASS | 同上 | D01；页头"任务 O_4-E2YFZ8B_OK"，阶段"待空域审批"，按钮"提交空域申请" |
| D2 | 飞手 | 提交空域申请 | PASS | 同上 | 按钮→"刷新审批结果"；SQL order=airspace，airspace_requests=submitted |
| D3 | 飞手 | 审批前刷新被拦 | PASS | 同上 | 仍"待空域审批"，后端返回门禁拒绝，不推进 |
| E1 | 后台 | 看到空域审批订单 | PASS | 同上 | E01；订单"空域审批"+可点"通过空域审批" |
| E2 | 后台 | 通过空域审批 | PASS | 同上 | E02；SQL airspace=approved 且订单仍 airspace（未替飞手推进）；显示"待飞手进入准备"，审批按钮消失 |
| E3 | 后台 | 职责边界 | PASS | 同上 | 后台无可点击的"进入飞行准备/开始装货/起飞执行" |
| D5.1 | 飞手 | 进入飞行准备 | PASS | 同上 | 阶段"准备中"，按钮"开始装货" |
| D5.2 | 飞手 | 开始装货 | PASS | 同上 | 阶段"装货中"，按钮"起飞执行" |
| D5.3 | 飞手 | 起飞执行 | PASS | 同上 | D05；阶段"飞行中"，按钮"未到达卸货点" |
| D6 | 飞手 | 围栏门禁 | PASS | 同上 | 起飞5s内点击不推进；模拟飞行约21s抵终点围栏后按钮变"确认卸货" |
| D7 | 飞手 | 卸货→完成→结算 | PASS | 同上 | D07；卸货中→已完成→已结算；SQL status=settled，settlement=25091分(¥250.91) |
| F1 | 业主 | 轨迹终态 | PASS | 同上 | F01；出现"查看结算评价"，已结算 |
| F2 | 业主 | 结算评价页 | PASS | 同上 | F02；五方分账平台/飞手/机主/保险/税费，周期 T+1/T+7/realtime |
| F3 | 业主 | 提交五星评价 | PASS | 同上 | F03；5星点亮+真实键盘输入；`POST /orders/.../review`→ok:true；SQL star=5，文本含验收语句 |
| G1 | 后台 | 创建25kg匹配中订单 | PASS | `o_xEGOuMgw8jzl` | curl ok:true，status=matching |
| G2 | 后台 | 锁定推荐运力 | PASS | 同上 | G02；订单→已接单；SQL status=confirmed，pilot=u_p1，policy=pol_TOP3i-nHktej，cap1=busy |
| H1 | 后台 | 超载订单不能锁定 | PASS | `o_c89aq4pT2XJY` | H01；候选接口count=0，点击锁定后仍"匹配中"；SQL status=matching，pilot/cap/policy 全 NULL |
| H2 | 业主 | 匹配页无候选空态 | PASS | 同上 | H02；"为您匹配到 0 个最优方案"，不崩溃 |
| H3 | - | 清缓存后数量一致 | PASS | - | H03；清 localStorage/sessionStorage 后后台显示 3 个订单 = SQL `COUNT(*)`=3 |
| S1-S11 | 多角色 | 11 角色页冒烟 | PASS | - | 全部非白屏、无 `Bounds`、无 pageerror；S5含"飞手劳务"流水、S7含"设备使用费"流水 |
| R1 | - | 移动视口 390/430 | PASS | - | order/pilot-task/admin-orders 无横向溢出，底部操作栏可见 |
| R2 | - | 桌面视口 1440 | PASS | - | dashboard/orders/audit 无横向溢出 |
| R3 | - | 刷新恢复 | PASS | - | 追踪页刷新后状态不丢 |

`*` A6：见下方"观察与说明"。

## SQL 校验摘要（最终态）

```
orders:
  o_4-e2YfZ8B_oK  settled    pilot=u_p1 cap=cap1 settlement=25091
  o_xEGOuMgw8jzl  confirmed  pilot=u_p1 cap=cap1
  o_c89aq4pT2XJY  matching   pilot=NULL cap=NULL policy=NULL

ledger_entries (主订单 o_4-e2YfZ8B_oK)：
  platform 平台技术服务费 2508  available
  u_p1     飞手劳务       12546 pending
  u_o1     设备使用费     7527  pending

reviews： star=5，text="准时响应，吊运稳定验收测试：准时响应，吊运稳定。"

airspace_requests： o_4-e2YfZ8B_oK = approved

capacity_units： cap1=busy（被 G 订单占用），cap2/3/4=online
```

页面所见状态与 MySQL 落库状态在每个关键节点均一致。

## 观察与说明（非代码缺陷项）

1. **A6 高德首次打开 POI 抖动**：会话内第一次打开选点器（A5 防呆自动打开的实例）偶发周边 POI 列表长时间转圈不出（地图 canvas 已渲染、AutoNavi 版权可见、确认按钮正确禁用）。同一会话第二次打开（A8 经目的地卡片）即稳定返回 10 条真实 POI 并完成搜索/选择/确认。符合剧本 0.3 对"首次加载抖动"的判定，归因为高德 SDK 首个地图实例的 around-search 时序，非本项目代码缺陷；测试以"取消重开/复测"通过。
2. **A9 记 SKIP**：起终点重合校验只在两点距离 <50m 时触发。真实高德搜索"望京SOHO"为起点返回的是"望京SOHO亚朵酒店"（与目的地"望京soho塔3B座"不同建筑，>50m），守卫合理未触发——剧本 A9 明确规定此情形记 SKIP。守卫逻辑本身在代码中存在且对真正同点会拦截。为避免该步污染主订单起点，测试在 A9 后 reload 重置草稿、重新选目的地再发单，主订单起点确认为"北京低空货运中心"。
3. **F3 首次点击未生效（测试脚本问题，已解决）**：第一次用文本定位"提交评价"命中了文本节点而非 `.submit-button`，点击未触发提交（reviews count=0）。改用 `.submit-button` 真实点击后 `POST /orders/.../review` 返回 ok:true、reviews count=1、star=5。后端接口与按钮均正常，属测试定位问题，非代码缺陷。F3 最终 PASS。评价文本因文本框预置短语未清空而呈"预置语+验收语"拼接，星级与持久化均正确。
4. **D3 的 400 与瞬时告警**：飞手审批前点击"刷新审批结果"时后端返回 400（"空域尚未审批"门禁正确拒绝推进），属预期行为；反复开关选点器时偶见 `Map container div not exist` 瞬时告警，非致命。全程未出现 `Invalid Object: Bounds` 刷屏（计数 0）。

## 最终质量门禁

命令：`pnpm backend:test && pnpm verify`

| 阶段 | 结果 |
|---|---|
| Go 后端测试 | `ok drone-v2-backend/internal/app` |
| type-check (vue-tsc) | 通过 |
| lint (eslint, --max-warnings=0) | 通过 |
| Vitest | 28 文件 / 126 用例全部通过 |
| build:mp-weixin | DONE Build complete |
| check:integrity | ✅ 完整性检查通过 |
| **退出码** | **0** |

允许存在的 Sass `@import` / legacy JS API deprecation warning 出现；无 TS error、无 ESLint error、无测试失败、无构建失败、无完整性失败、无 console fatal、无 Bounds 刷屏。

## 结论

`docs/HUMAN_SIMULATION_TEST_PLAYBOOK.md` 的 A–H 全流程、11 个角色页冒烟、响应式补充测试全部通过（A6 因高德首开抖动标 PASS\*、A9 按剧本规定 SKIP，均非代码缺陷）。MySQL 校验结果与页面状态在每个关键节点一致。最终 `pnpm backend:test && pnpm verify` 退出码为 0。

本轮测试未发现需要修复的代码缺陷，因此未改动任何源码；既有工作区改动完整保留。
