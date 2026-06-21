# drone_v2 浏览器全流程手操测试剧本

更新时间：2026-06-12
适用对象：具备浏览器操作能力的测试代理（Codex / Claude 等）或人工测试员。
测试目标：模拟真实用户在 H5 端的完整操作，覆盖业主发单、原生高德选点、智能匹配、飞手执行、后台审批、结算评价的全部交互细节，并用 MySQL 落库结果交叉验证。

---

## 0. 给执行代理的说明（先读完再动手）

### 0.1 交互约定

- 所有点击都用**真实点击**（鼠标事件/触屏事件），不要用 JS 直接调用页面函数。
- **原生高德选点的搜索框必须用真实键盘逐字输入**。用 JS 设置 `input.value` 再派发合成 `input` 事件不会触发搜索（uni-input 组件不响应合成事件）。
- 页面是 uni-app H5，按钮大多是 `uni-view` 而非 `<button>`，定位时**优先按可见文本找元素**。
- toast 提示存活约 1.5~2 秒，截图或断言要快；抓不到 toast 时以页面状态和 SQL 校验为准。
- 涉及金额的断言只验证"为正数/变化方向正确"，不要断言具体数值（估价随距离、参数浮动）。
- POI 名称依赖高德实时数据，只断言"列表非空/包含搜索关键词"，不要断言具体店名。

### 0.2 等待策略

- 页面跳转后等待 1~2 秒再断言。
- 原生选点打开后等 3~4 秒让 POI 列表加载。
- 飞手"起飞执行"后是约 25 秒的模拟飞行：**轮询主按钮文本**（每 3 秒一次，最长 60 秒），从"未到达卸货点"变为"确认卸货"才继续。

### 0.3 失败处理

某一步失败时：截图 + 抓浏览器 console 错误 + 记录当前 URL 和订单 ID，**终止当前用例组**，继续执行后续用例组（除非是 A 组发单失败——后续 B~F 组依赖 A 组的订单，此时全部标记 blocked）。

### 0.4 结果记录

在 `docs/ui-test-results-<日期>.md` 按下表记录：

| 用例编号 | 名称 | 结果(PASS/FAIL/BLOCKED) | 订单ID | 失败详情/截图 |
|---|---|---|---|---|

---

## 1. 环境准备与基线重置

### 1.1 启动服务（终端）

```bash
cd /Users/yinswc2e/Code/drone_v2
pnpm backend:up
pnpm dev:h5
```

### 1.2 健康检查（终端）

```bash
curl -s http://localhost:8088/api/v1/health
# 期望: {"data":{"status":"ok"},"ok":true}
```

### 1.3 重置基线数据（终端）

```bash
curl -s -X POST http://localhost:8088/api/v1/reset
# 期望: 返回 JSON 且 "ok":true
```

### 1.4 清理浏览器旧状态（浏览器）

打开 `http://localhost:5173/#/`，在控制台执行：

```js
localStorage.clear(); sessionStorage.clear(); location.reload();
```

### 1.5 地图 key 前提

`.env.local` 需已配置 `VITE_AMAP_WEB_KEY`（Web端 JS API 平台）+ `VITE_AMAP_SECURITY_CODE` + `VITE_AMAP_WEB_SERVICE_KEY`。判断方法：执行 A6 时若 POI 列表为空且控制台报 `USERKEY_PLAT_NOMATCH` 或 `INVALID_USER_SCODE`，是 key 配置问题，按 [REAL_ACCEPTANCE_TEST.md](REAL_ACCEPTANCE_TEST.md) §9 排查，不算代码缺陷。

### 1.6 常用 SQL（终端，后续步骤用 `<SQL:最新订单>` 指代）

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := (
  SELECT id COLLATE utf8mb4_unicode_ci FROM orders
  ORDER BY JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdAt')) DESC LIMIT 1
);
SELECT @order_id AS order_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pilotId')) AS pilot_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.to.address')) AS to_address
FROM orders WHERE id COLLATE utf8mb4_unicode_ci = @order_id;
SQL
```

---

## 2. 用例组 A：业主发单页（全细节）

入口：`http://localhost:5173/#/pages-client/order/index`

### A1 页面初始状态

| 检查项 | 预期 |
|---|---|
| 页头 | 显示"天链物流"、返回箭头、"EN"语言切换按钮 |
| 步骤指示器 | 四步："货物参数 / 航线规划 / 保障预案 / 预算结算" |
| 货物类别 | 四个选项：普货、大件、危化、温控，默认选中"普货" |
| 货物重量 | 默认 8（KG） |
| 体积尺寸 | 默认 0.50（M³） |
| 申报价值 | 默认 3000（CNY） |
| 起点坐标卡片 | 已有默认地址（"北京低空货运中心"）和 LNG/LAT 坐标 |
| 目的地卡片 | 显示"选择目标区域..."和"点击进入真实地图选点" |
| 执行时段 | "立即执行 / 预约执行"两个选项，默认"立即执行" |
| 保障等级 | "高级保障"（全额价值保障+延误补偿）与"标准责任"两项 |
| 底部栏 | 左侧"预计合计 ¥<正数>"，右侧"发起任务"按钮（火箭图标） |

### A2 货物参数交互

1. 依次点击"大件"、"危化"、"温控"、"普货"——每次点击选中态切换，无报错。
2. 把重量从 8 改为 20——"预计合计"金额**变大**。
3. 把申报价值改为 6000——金额不减小（保费随价值增长）。
4. 改回重量 8、价值 3000。

### A3 执行时段切换

1. 点击"预约执行"——出现预约时间选择（日期/时间字段）。
2. 点回"立即执行"——时间字段收起。

### A4 语言切换

1. 点击页头"EN"——页面文案变英文（如 CARGO 等），出现 toast "Switched to English"。
2. 再点一次切回——文案恢复中文，toast "已切换为中文"。

### A5 未选目的地直接发起（防呆校验）

1. 不选目的地，直接点"发起任务"。
2. 预期：**不跳转**，页面出现提示"请先选择目标区域"，并自动打开选点界面。
3. 关闭选点界面（点左上角 ×）回到发单页。

### A6 原生高德选点——打开与周边 POI

1. 点击目的地卡片"选择目标区域..."。
2. 预期（等 3~4 秒）：
   - 全屏选点界面打开，**真实高德地图底图**（可见街道、地名标注、左下角"高德地图 © AutoNavi"字样）；
   - 地图中央有红色定位 marker；
   - 顶部左 × 右 √ 两个圆形按钮，**√ 此时为禁用态（灰）**；
   - 中部"搜索地点"输入框；
   - 底部 POI 列表**非空**（约 10 条周边地点，每条含名称、距离、地址）。
3. 失败特征对照：列表空 + 控制台 `INVALID_USER_SCODE` → 安全密钥未配；列表空 + `USERKEY_PLAT_NOMATCH` → key 平台类型错。

### A7 原生选点——取消不弹兜底

1. 点击左上角 × 关闭。
2. 预期：选点界面关闭，**直接回到发单页**，不弹出任何其他选点弹窗（修复点：用户主动取消不再弹"真实地图选点"兜底框）。

### A8 原生选点——POI 搜索 + 选择 + 确认

1. 再次点击目的地卡片打开选点。
2. 在"搜索地点"框**真实键盘输入**：`望京SOHO`。
3. 预期（等 2~3 秒）：POI 列表刷新为搜索结果，首条名称含"望京SOHO"。
4. 点击列表第一条。
5. 预期：该条出现选中标记，**右上角 √ 变为可用（高亮）**。
6. 点击 √ 确认。
7. 预期：选点界面关闭，目的地卡片回填：
   - 名称含"望京SOHO"；
   - 一行 `LNG xxx.xxx / LAT xx.xxx · x.x km · ETA xx min`（坐标合理：LNG≈116.48，LAT≈39.99）。

### A9 起终点重合校验

1. 点击**起点**卡片打开选点，搜索 `望京SOHO` 并选择同一条，点 √。
2. 预期：发单页出现错误提示"起点和目的地不能重合"，起点**不被修改**（仍为原地址）。
   （若选点选了相邻不同 POI 导致距离 >50m 而未触发，记 SKIP 不记 FAIL。）

### A10 发起任务

1. 点击底部"发起任务"。
2. 预期：1~2 秒内跳转到 `#/pages-client/match/index`。
3. 终端校验 `<SQL:最新订单>`：status=`matching`，to_address 含"望京SOHO"。

---

## 3. 用例组 B：智能匹配页

承接 A10，当前应在 `#/pages-client/match/index`。

### B1 页面初始状态

| 检查项 | 预期 |
|---|---|
| 标题区 | "智能匹配方案"，文案"为您匹配到 N 个最优方案"，N ≥ 1 |
| 策略 tab | 四个："最近距离 / 最高利润 / 全局最优 / 时效优先"，默认"全局最优" |
| 策略说明卡 | 含"当前首选: 飞手x · ETA xx · x.xkm · 信用分 xxx" |
| 候选缩略卡 | N 张，每张含飞手名 + 报价（¥正数），报价**各不相同**（来自后端实时计算，非固定假数据） |
| 候选详情卡 | 飞手名(ID)、星级图标、"x.x · 信用分 xxx"、预估报价、设备型号（如 DJI FlyCart 30 (SN-D1)）、载重剩余、距离、到达起点/送达终点时间、合规保障行、推荐理由（含距离/载重/预算/信用要素） |
| 底部 | "重新匹配"和"确认下单"两个按钮 |

### B2 策略切换

1. 依次点击"最近距离"→"最高利润"→"时效优先"→"全局最优"。
2. 预期：每次切换，策略说明卡文案随之变化，首选候选可能不同，无报错。

### B3 费用明细展开

1. 点击详情卡内"费用明细"行（expand 图标）。
2. 预期：展开费用拆分行（基础运费/保费等），金额为正数。

### B4 重新匹配

1. 点击"重新匹配"。
2. 预期：候选列表刷新（短暂 loading 后仍有 N ≥ 1 个候选），无报错。

### B5 确认下单

1. 点击"确认下单"。
2. 预期：跳转到 `#/pages-client/track/index`。
3. 终端校验 `<SQL:最新订单>`：status=`confirmed`，pilot_id 非空（如 `u_p1`）。

### B6 防重复确认

1. 浏览器后退（或直接访问 `#/pages-client/match/index`）。
2. 预期：页面提示订单已确认/不允许重复确认（不会再次产生确认动作），SQL 中订单状态仍为 `confirmed` 且 pilotId 不变。

---

## 4. 用例组 C：业主追踪页

当前应在 `#/pages-client/track/index`。

### C1 页面初始状态

| 检查项 | 预期 |
|---|---|
| 地图 | 真实高德底图，起点/终点两个 marker，青色航线连接 |
| 状态徽章 | "GPS：待起飞" + 距离徽章（如 "x.x km"） |
| 地址面板 | 起点"北京低空货运中心"，终点为 A8 选择的地址 |
| 遥测面板 | 高度 0 m、地速 0、电量、姿态等字段 |
| 任务阶段条 | 起飞前/起飞/飞行中/降落/完成，当前进度未完成 |
| 底部 | "返回上一页"等操作按钮 |

控制台不应出现持续刷屏的 `Invalid Object: Bounds` 错误（修复点）。

---

## 5. 用例组 D：飞手任务驾驶舱（执行全程）

入口：`http://localhost:5173/#/pages-pilot/task/index`（直接改 URL 即可，无需登录切换）。

### D1 任务加载

| 检查项 | 预期 |
|---|---|
| 页头 | "任务 O_XXXX"（大写订单号，与 SQL 订单 ID 一致） |
| 地图 | 高德底图 + 起终点 marker + 航线 |
| 阶段卡 | "当前阶段：待空域审批"，下一步提示"提交空域申请，审批通过后进入起飞前准备。" |
| 遥测 | 高度/速度/电量/偏航四宫格 |
| 主按钮 | "提交空域申请" |

### D2 提交空域申请

1. 点击主按钮"提交空域申请"。
2. 预期：按钮变为"刷新审批结果"。
3. 终端校验：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.status')) FROM orders ORDER BY JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.createdAt')) DESC LIMIT 1;"
# 期望: airspace
```

### D3 审批前推进被拦（门禁验证）

1. 点击"刷新审批结果"。
2. 预期：阶段不变（仍"待空域审批"），不会进入准备/装货；SQL 状态仍 `airspace`。

### D4 → 跳转执行用例组 E（后台审批），完成后回到本页继续 D5。

### D5 审批通过后的推进链

回到 `#/pages-pilot/task/index`（刷新页面）。逐步点击主按钮，每步之间等 1~2 秒：

| 步骤 | 点击前按钮文本 | 点击后预期 |
|---|---|---|
| D5.1 | 进入飞行准备 | 阶段变"准备中"，按钮变"开始装货" |
| D5.2 | 开始装货 | 阶段变"装货中"，按钮变"起飞执行" |
| D5.3 | 起飞执行 | 阶段变"飞行中"；地图上无人机 marker 开始沿航线移动；遥测数字开始跳动（高度>0、速度>0、电量递减但**不会归零**——终点剩约 35%） |

### D6 飞行围栏门禁（关键验证）

1. 起飞后 **5 秒内**点一次主按钮。
2. 预期：按钮显示"未到达卸货点"且点击**不推进**（仍在飞行中）。
3. 轮询主按钮文本（每 3 秒，最长 60 秒）直到变为"确认卸货"。

### D7 卸货到结算

| 步骤 | 点击按钮 | 预期 |
|---|---|---|
| D7.1 | 确认卸货 | 阶段变"卸货中"，按钮变"完成任务" |
| D7.2 | 完成任务 | 阶段变"已完成"，按钮变"生成结算" |
| D7.3 | 生成结算 | 阶段变"已结算" |

终端校验：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.status')) AS s, CAST(JSON_EXTRACT(doc,'\$.settlement.totalCent') AS SIGNED) AS total FROM orders ORDER BY JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.createdAt')) DESC LIMIT 1;"
# 期望: s=settled, total>0
```

---

## 6. 用例组 E：管理后台（空域审批，承接 D3）

入口：`http://localhost:5173/#/pages-admin/orders/index`

### E1 订单列表

1. 找到当前订单（大写 ID，如 `O_XXXX`，与 D1 页头一致）。
2. 预期：该行状态"空域审批"，显示动作按钮"通过空域审批"。

### E2 通过空域审批

1. 点击"通过空域审批"。
2. 预期：
   - 该行状态**仍是"空域审批"**（审批只批空域，不替飞手推进——这是设计行为）；
   - 下一动作变为"待飞手进入准备"，且**不再是可点击按钮**。
3. 终端校验：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.status')) FROM airspace_requests ORDER BY id DESC LIMIT 1;"
# 期望: approved
```

### E3 职责边界

确认后台该订单行**没有**"提交空域申请 / 开始装货 / 起飞"等替飞手操作的按钮（只显示"待飞手…"的禁用提示）。

→ 返回用例组 D 的 D5 继续。

---

## 7. 用例组 F：结算与评价（承接 D7）

### F1 业主轨迹页终态

1. 打开 `http://localhost:5173/#/pages-client/track/index`（刷新）。
2. 预期：任务阶段条五个节点全部完成（√），底部出现"查看结算评价"按钮。

### F2 评价结算页

1. 点击"查看结算评价"（应跳到 `#/pages-client/review/index`）。
2. 预期页面包含：
   - "已结算"标识；
   - 分账明细五行：**平台 / 飞手 / 机主 / 保险 / 税费**，各有金额（¥正数），周期标注（T+1 / T+7 / realtime）；
   - 五个星形按钮 + 评价输入框（占位"请输入评价内容..."）+ "提交评价"按钮。

### F3 提交五星评价

1. 点击第 5 颗星——预期 5 颗星全部点亮。
2. 输入框键入：`验收测试：准时响应，吊运稳定。`
3. 点击"提交评价"。
4. 预期：toast "评价已提交，信用分已更新"或页面文案"评价已提交，飞手信用分已重算"，按钮变"已提交评价"。
5. 终端校验：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT CAST(JSON_EXTRACT(doc,'\$.star') AS SIGNED) AS star, JSON_UNQUOTE(JSON_EXTRACT(doc,'\$.text')) AS t FROM reviews ORDER BY id DESC LIMIT 1;"
# 期望: star=5, 文本一致
```

---

## 8. 用例组 G：后台锁定推荐运力（独立订单）

### G1 造一笔"匹配中"订单（终端）

```bash
curl -s -X POST http://localhost:8088/api/v1/orders -H 'content-type: application/json' -d '{
  "clientId":"u_c1","cargoType":"equipment","weightKg":25,"valueCent":500000,
  "budgetCent":36000,"insured":true,"shockProof":true,
  "special":"后台推进验收订单","remark":"admin acceptance","timeMode":"instant","paymentMode":"escrow",
  "from":{"lng":116.397128,"lat":39.916527,"address":"北京市东城区天安门广场"},
  "to":{"lng":116.481488,"lat":39.990464,"address":"北京市朝阳区望京SOHO"}
}'
# 记下返回的 order.id
```

注意 weightKg 必须 ≤ 30（种子无人机最大载重），否则候选为空。

### G2 后台锁定

1. 打开/刷新 `#/pages-admin/orders/index`，找到 G1 订单（状态"匹配中"，按钮"锁定推荐运力"）。
2. 点击"锁定推荐运力"。
3. 预期：状态变"已接单"，该行不再显示可点推进按钮（下一步提示"请由飞手提交空域申请"）。
4. 终端校验（替换 o_xxx 为 G1 的 ID）：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := _utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci;
SET @capacity_id := (
  SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'$.capacityId')) COLLATE utf8mb4_unicode_ci
  FROM orders WHERE id COLLATE utf8mb4_unicode_ci=@order_id
);
SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.pilotId')) AS pilot,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.policyId')) AS policy,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.capacityId')) AS capacity
FROM orders WHERE id COLLATE utf8mb4_unicode_ci=@order_id;
SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) FROM capacity_units WHERE id COLLATE utf8mb4_unicode_ci=@capacity_id;
SQL
# 期望: status=confirmed, pilot/policy/capacity 非空，订单锁定的 capacity 状态为 busy
```

---

## 9. 用例组 H：边界与异常

### H1 超载订单无候选

1. 用 G1 的 curl 造一笔 `weightKg: 280` 的订单。
2. 后台订单页点该订单的"锁定推荐运力"。
3. 预期：toast 提示"当前没有在线合规运力，无法锁定推荐方案"，SQL 状态仍 `matching`。

### H2 业主匹配页超预算/无候选表现（可选）

1. 打开 `#/pages-client/match/index`（H1 订单为最新订单时）。
2. 预期：页面不崩溃，显示空态或提示，无 JS 报错。

### H3 浏览器旧数据干扰自查

控制台执行 `localStorage.clear(); sessionStorage.clear(); location.reload();` 后重新打开后台订单页——列表数量应与 SQL `SELECT COUNT(*) FROM orders;` 一致。

---

## 10. 角色页面冒烟（每页打开即查，不深测）

逐个打开，断言：页面渲染出内容、无白屏、控制台无未捕获异常（高德 `Bounds` 报错不应出现）：

| 页面 | URL |
|---|---|
| 业主首页 | `#/pages-client/home/index` |
| 业主保险 | `#/pages-client/insurance/index` |
| 飞手首页 | `#/pages-pilot/home/index` |
| 飞手接单大厅 | `#/pages-pilot/hall/index`（已确认订单不出现在大厅待接列表，而在"当前任务/继续执行"卡片） |
| 飞手钱包 | `#/pages-pilot/wallet/index`（D7 结算后 pending 流水应有"飞手劳务"一笔） |
| 机主首页 | `#/pages-owner/home/index` |
| 机主钱包 | `#/pages-owner/wallet/index`（结算后应有"设备使用费"pending） |
| 机主设备 | `#/pages-owner/drones/index` |
| 后台总览 | `#/pages-admin/dashboard/index` |
| 后台风控 | `#/pages-admin/risk/index` |
| 后台审计 | `#/pages-admin/audit/index`（应能看到本次流程产生的审计记录） |

---

## 11. 通过标准汇总

全部满足才算 PASS：

1. A 组：原生高德选点可打开、可搜索、可选择、可确认、可取消；防呆与重合校验生效；发单跳转匹配页。
2. B 组：候选来自后端（数量/报价动态），四策略可切换，确认下单写库 `confirmed`，不可重复确认。
3. C 组：追踪页真实地图 + 起终点 + 遥测面板，无 `Bounds` 刷屏错误。
4. D 组：空域门禁拦截生效；围栏门禁拦截生效（未到卸货点不可推进）；模拟飞行约 25 秒可达终点（电量不归零）；推进链直至 `settled`。
5. E 组：后台只审批空域不代飞手推进，职责边界正确。
6. F 组：分账五方明细展示，5 星评价写库。
7. G 组：后台锁定运力写库 `confirmed`，运力/无人机变 `busy`。
8. H 组：超载无候选有明确提示且不写脏数据。
9. 10 组冒烟页全部可渲染。

测完后建议在终端补跑一次质量门禁：

```bash
pnpm backend:test && pnpm verify
```
