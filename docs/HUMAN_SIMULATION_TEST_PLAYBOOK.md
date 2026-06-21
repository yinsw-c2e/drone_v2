# drone_v2 模拟真人全流程验收测试剧本

更新时间：2026-06-13
适用对象：Claude Fable 5、Codex、具备浏览器操作能力的测试代理，或人工测试员。
测试目标：像真实用户一样在 H5 端完成业主、飞手、机主、后台四类角色的端到端操作，并用 MySQL 落库结果交叉验证每个关键状态变化。

---

## 0. 执行原则

### 0.1 本文优先级

1. 本文是本轮“模拟真人测试”的执行剧本。
2. `docs/UI_WALKTHROUGH_PLAYBOOK.md` 是前一版基础剧本，可作参考。
3. `docs/EXECUTION.md` 是产品和验证总契约；若本文与执行手册冲突，以 `docs/EXECUTION.md` 为准。

### 0.2 模拟真人的含义

测试代理必须模拟真实用户对页面的操作，不允许把页面当 API 调试台绕过交互。

必须做到：
- 点击使用真实鼠标/触屏点击。
- 文本输入使用真实键盘输入，尤其是高德选点搜索框。
- 页面跳转、toast、loading、地图加载都按真人可观察节奏等待。
- 断言优先基于可见页面状态，再用 SQL 交叉验证。
- 每个阶段至少保留一张截图，失败时必须额外截图。

禁止行为：
- 禁止用 JS 直接调用 Vue 方法、Pinia action、页面函数来推进业务。
- 禁止用 JS 直接设置输入框值后派发合成事件代替键盘输入。
- 禁止直接改 localStorage/sessionStorage 来伪造登录、订单、角色或阶段。
- 禁止直接写数据库推进订单状态。
- 禁止把历史事件文案误判为当前可点击按钮。
- 禁止只跑接口或单测后声称 UI 流程通过。

允许行为：
- 环境准备时可执行 `localStorage.clear(); sessionStorage.clear(); location.reload();` 清理旧状态。
- 可用 curl 创建独立边界订单，例如后台锁定和超载订单。
- 可用 SQL 只读查询验证状态。
- 若用户明确要求“测试并修复”，可在记录失败后修代码；否则只输出测试报告。

### 0.3 人类节奏建议

为了避免异步 UI 被误判，按以下节奏执行：

| 场景 | 建议等待 |
|---|---:|
| 普通页面打开 | 1.5-2.5 秒 |
| 点击按钮后页面跳转 | 1-3 秒 |
| 高德原生选点首次打开 | 4-10 秒 |
| 高德 POI 搜索输入后 | 3-5 秒 |
| 后台点击“刷新订单” | 2-3 秒 |
| 飞手起飞执行后 | 每 3 秒轮询一次，最长 65 秒 |
| toast 取证 | 立即截图；抓不到时用页面状态 + SQL |

注意：高德周边 POI 首次打开可能有一次加载抖动。若地图底图可见但 POI 为空，不要立刻判 FAIL，等待到 10 秒并检查 console。只有持续为空且出现 `INVALID_USER_SCODE` / `USERKEY_PLAT_NOMATCH`，才归因地图 key 配置。

---

## 1. 结果交付格式

### 1.1 测试报告文件

测试结束后写入：

```bash
docs/ui-human-test-results-2026-06-13.md
```

报告必须包含：
- 执行人/代理名称。
- 测试开始和结束时间。
- 当前 git commit 或 `git status --short` 摘要。
- H5、后端、MySQL 的健康状态。
- 每个用例结果表。
- 关键订单 ID。
- SQL 校验摘要。
- 失败截图路径和 console 错误。
- 最终门禁命令结果。

结果表格式：

| 用例编号 | 用户视角 | 操作摘要 | 结果(PASS/FAIL/BLOCKED/SKIP) | 订单ID | 证据 |
|---|---|---|---|---|---|

### 1.2 截图目录

截图统一放到：

```bash
output/human-walkthrough/2026-06-13/
```

截图命名建议：

```text
A01-client-order-initial.png
A06-amap-picker-poi.png
A10-match-after-submit.png
D05-pilot-inflight.png
F03-review-submitted.png
H01-overload-guard.png
S-admin-audit.png
```

失败截图命名：

```text
FAIL-<用例编号>-<简短原因>.png
```

### 1.3 失败记录要求

每个失败必须记录：
- 当前 URL。
- 当前可见页面文字摘要。
- 浏览器 console 的 error/warn。
- 相关订单 ID。
- 截图路径。
- SQL 查询结果。
- 判断：代码缺陷 / 环境问题 / 测试脚本问题 / 外部地图波动。

---

## 2. 环境准备

### 2.1 打开仓库

```bash
cd /Users/yinswc2e/Code/drone_v2
```

记录当前工作区状态：

```bash
git status --short
```

不要清理、回滚或覆盖现有改动，除非用户明确要求。

### 2.2 启动服务

```bash
pnpm backend:up
pnpm dev:h5
```

若端口已被占用，先确认是不是本项目已有服务：

```bash
lsof -nP -iTCP:8088 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
```

### 2.3 健康检查

```bash
curl -s http://localhost:8088/api/v1/health
```

期望：

```json
{"data":{"status":"ok"},"ok":true}
```

### 2.4 高德地图 key 检查

```bash
test -f .env.local && awk -F= '
/^VITE_AMAP_WEB_KEY=/{a=length($2)>0}
/^VITE_AMAP_SECURITY_CODE=/{b=length($2)>0}
/^VITE_AMAP_WEB_SERVICE_KEY=/{c=length($2)>0}
END{
  print "VITE_AMAP_WEB_KEY=" (a?"set":"missing");
  print "VITE_AMAP_SECURITY_CODE=" (b?"set":"missing");
  print "VITE_AMAP_WEB_SERVICE_KEY=" (c?"set":"missing")
}' .env.local
```

三项都应为 `set`。

地图错误归因：
- `INVALID_USER_SCODE`：安全密钥或安全配置问题。
- `USERKEY_PLAT_NOMATCH`：key 平台类型不匹配，应为 Web端 JS API。
- 地图底图正常、POI 搜索正常、仅首次周边列表慢：可重试，不直接判代码失败。

### 2.5 重置基线数据

```bash
curl -s -X POST http://localhost:8088/api/v1/reset
```

期望返回 JSON 且 `"ok":true`。

### 2.6 清理浏览器状态

打开：

```text
http://localhost:5173/#/
```

在浏览器控制台执行一次：

```js
localStorage.clear();
sessionStorage.clear();
location.reload();
```

只允许在本步骤清理浏览器状态。后续业务状态必须靠 UI、接口造单或后端自然流转产生。

---

## 3. 常用 SQL

所有 SQL 都只读。不要用 SQL 修改数据。

### 3.1 最新订单摘要

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := (
  SELECT id COLLATE utf8mb4_unicode_ci FROM orders
  ORDER BY JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdAt')) DESC LIMIT 1
);
SELECT @order_id AS order_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pilotId')) AS pilot_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.policyId')) AS policy_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.to.address')) AS to_address
FROM orders WHERE id COLLATE utf8mb4_unicode_ci = @order_id;
SQL
```

### 3.2 指定订单摘要

把 `o_xxx` 替换为订单 ID：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := _utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci;
SELECT id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pilotId')) AS pilot_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.droneId')) AS drone_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.capacityId')) AS capacity_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.policyId')) AS policy_id,
  CAST(JSON_EXTRACT(doc, '$.settlement.totalCent') AS SIGNED) AS settlement_total
FROM orders WHERE id COLLATE utf8mb4_unicode_ci = @order_id;
SQL
```

### 3.3 空域审批状态

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT id,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.orderId')) AS order_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status
FROM airspace_requests ORDER BY updated_at DESC LIMIT 3;"
```

### 3.4 评价状态

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT CAST(JSON_EXTRACT(doc,'$.star') AS SIGNED) AS star,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.text')) AS text
FROM reviews ORDER BY updated_at DESC LIMIT 1;"
```

### 3.5 钱包流水

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'$.userId')) AS user_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.orderId')) AS order_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.note')) AS note,
  CAST(JSON_EXTRACT(doc,'$.amountCent') AS SIGNED) AS amount,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status
FROM ledger_entries ORDER BY updated_at DESC LIMIT 8;"
```

### 3.6 运力状态

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e \
"SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status FROM capacity_units ORDER BY id;"
```

---

## 4. 用例 A：业主发单页深测

入口：

```text
http://localhost:5173/#/pages-client/order/index
```

### A1 初始视觉和信息架构

用户意图：业主进入发单页，确认这是“天链物流”的吊运任务创建界面。

操作：
1. 打开发单页。
2. 等待 2 秒。
3. 截图 `A01-client-order-initial.png`。

预期：
- 页头显示“天链物流”、返回箭头、`EN` 切换按钮。
- 四步流程存在：货物参数、航线规划、保障预案、预算结算。
- 货物类别显示：普货、大件、危化、温控。
- 默认选中普货。
- 货物重量为 8 KG。
- 体积为 0.50 M³。
- 申报价值为 3000 CNY。
- 起点为“北京低空货运中心”，有 LNG/LAT。
- 目的地为“选择目标区域... / 点击进入真实地图选点”。
- 底部有“预计合计 ¥<正数>”和“发起任务”。

失败判断：
- 白屏、主要文案缺失、底部按钮不可见，记 FAIL。
- 金额具体数字不同不判失败，只要为正数。

### A2 货物类型和金额联动

用户意图：业主调整货物类型、重量和价值，预估费用应合理变化。

操作：
1. 依次点击“大件”“危化”“温控”“普货”。
2. 每次点击后观察选中态是否切换。
3. 记录当前预计合计金额，记为 `baseAmount`。
4. 将重量从 `8` 改为 `20`，等待 0.5 秒，记录金额 `heavyAmount`。
5. 将申报价值从 `3000` 改为 `6000`，等待 0.5 秒，记录金额 `valueAmount`。
6. 改回重量 `8`，价值 `3000`。

预期：
- 每个类型点击后选中态唯一。
- `heavyAmount > baseAmount`。
- `valueAmount >= heavyAmount`。
- 无 console error。

### A3 预约执行

用户意图：业主确认可以从立即执行切换到预约执行。

操作：
1. 点击“预约执行”。
2. 等待 0.5 秒。
3. 确认出现预约时间字段。
4. 点击“立即执行”。

预期：
- 预约字段显示后可收起。
- 金额区和发起按钮仍可见。

### A4 中英文切换

用户意图：用户误点语言切换后可以切回中文。

操作：
1. 点击 `EN`。
2. 等待 toast。
3. 截图或记录页面文字。
4. 点击“中文”切回。

预期：
- 英文页显示 `SKYLINK LOGISTICS`、`PAYLOAD SPECIFICATIONS` 等英文文案。
- 中文页恢复“天链物流”“货物参数”等文案。
- toast 文案可见则记录；抓不到 toast 不直接失败。

### A5 未选目的地防呆

用户意图：业主忘记选择目的地，系统应阻止发单并引导选点。

操作：
1. 不选择目的地。
2. 点击底部“发起任务”。
3. 立即截图 `A05-destination-guard.png`。

预期：
- 页面不跳转。
- 显示“请先选择目标区域”。
- 自动打开原生高德选点层。

失败判断：
- 若直接跳到匹配页，FAIL。
- 若打开选点层但提示一闪而过，结合截图/页面状态判断；最好再次重试一次。

### A6 原生高德选点打开

用户意图：业主使用真实地图选择目的地。

操作：
1. 若 A5 已打开选点层，可直接继续；否则点击目的地卡片。
2. 等待 4 秒；若 POI 为空，继续等到 10 秒。
3. 截图 `A06-amap-picker-poi.png`。

预期：
- 看到高德地图底图、街道或地图块。
- 看到 `AutoNavi` 或高德版权信息。
- 中央有红色 marker。
- 顶部/侧边有返回和确认控件。
- 未选择 POI 前确认按钮禁用。
- 底部或列表区域有约 10 条周边 POI，每条含名称、距离、地址。

失败归因：
- 底图不可见 + key 错误 console：环境问题。
- 底图可见但 POI 首次为空：等待并复测，不立即失败。
- 无法点击返回或确认：代码/uni 原生层交互问题。

### A7 取消选点不弹兜底

用户意图：用户进入地图后取消，不应被二次弹窗打扰。

操作：
1. 点击原生选点左上角返回/关闭。
2. 等待 1 秒。

预期：
- 回到发单页。
- 不出现自建“真实地图选点”兜底框。
- 目的地仍为空。

### A8 搜索并选择望京 SOHO

用户意图：用户通过搜索快速选择目的地。

操作：
1. 再次打开目的地选点。
2. 点击“搜索地点”输入框。
3. 用真实键盘逐字输入：

```text
望京SOHO
```

4. 等待 3-5 秒。
5. 点击第一条含“望京”或“SOHO”的 POI。
6. 确认按钮高亮后点击确认。
7. 截图 `A08-destination-selected.png`。

预期：
- 搜索结果非空。
- 搜索结果至少一条含“望京”或“SOHO”。
- 确认后回到发单页。
- 目的地卡片显示含“望京”或“SOHO”的地址。
- 目的地坐标约为 LNG 116.4x / LAT 39.9x。
- 距离和 ETA 显示为正数。

### A9 起终点重合校验

用户意图：用户误把起点改成目的地，系统应阻止。

操作：
1. 点击起点卡片。
2. 搜索 `望京SOHO`。
3. 尽量选择与 A8 同一条 POI。
4. 点击确认。

预期：
- 页面提示“起点和目的地不能重合”。
- 起点仍为“北京低空货运中心”。
- 目的地仍为 A8 选中的望京地址。

判定细节：
- 若实时 POI 返回的是相邻但距离大于 50m 的不同点，可能不触发重合校验。此时记录 SKIP，不记 FAIL。
- 若选了同一条 POI 仍改掉起点，FAIL。

### A10 发起任务

用户意图：业主确认任务，进入智能匹配。

操作：
1. 点击底部“发起任务”。
2. 等待 1-3 秒。
3. 截图 `A10-match-after-submit.png`。
4. 执行“最新订单摘要”SQL。

预期：
- URL 为 `#/pages-client/match/index`。
- 页面显示“智能匹配方案”。
- SQL：`status=matching`。
- SQL：`to_address` 含“望京”或“SOHO”。

记录：
- 将 SQL 返回的 `order_id` 记为 `MAIN_ORDER_ID`，后续 B-F 都使用它。

---

## 5. 用例 B：智能匹配与确认下单

入口：A10 后的 `#/pages-client/match/index`。

### B1 匹配页初始状态

用户意图：业主查看系统推荐的飞手和报价。

操作：
1. 等待页面稳定 2 秒。
2. 截图 `B01-match-candidates.png`。

预期：
- 标题为“智能匹配方案”。
- 显示“为您匹配到 N 个最优方案”，N >= 1。
- 策略 tab 有：最近距离、最高利润、全局最优、时效优先。
- 默认策略为“全局最优”。
- 候选卡至少 1 张。
- 候选报价为正数，若多张候选则报价不完全相同。
- 详情卡含飞手名、ID、星级、信用分、预估报价、设备型号、载重剩余、距离、时间、合规保障、推荐理由。

失败判断：
- 候选为空且订单重量为默认 8kg，FAIL。
- 报价全为 0 或固定假数据，FAIL。

### B2 策略切换

操作：
1. 点击“最近距离”。
2. 点击“最高利润”。
3. 点击“时效优先”。
4. 点击“全局最优”。

预期：
- 每次点击后策略说明变化。
- “当前首选”文案存在。
- 首选候选可变化，也可不变化；不要求强制变化。
- 无 console error。

### B3 费用明细

操作：
1. 点击“费用明细”行或展开图标。
2. 截图 `B03-cost-breakdown.png`。

预期：
- 展开基础运费、里程费、时长费、载重费、难度系数、保费、总计。
- 金额为正数。
- 文案应包含“基础运费”和“保费”。

### B4 重新匹配

操作：
1. 点击“重新匹配”。
2. 等待 loading 或 toast 结束。

预期：
- 仍显示 N >= 1 个候选。
- 页面不白屏。
- 无错误 toast。

### B5 确认下单

操作：
1. 点击“确认下单”。
2. 等待跳转。
3. 截图 `B05-track-after-confirm.png`。
4. 查询 `MAIN_ORDER_ID`。

预期：
- URL 为 `#/pages-client/track/index`。
- SQL：`status=confirmed`。
- SQL：`pilot_id` 非空。
- SQL：`policy_id` 非空或后续 G/F 保险页能看到保单。

### B6 防重复确认

操作：
1. 浏览器后退或直接打开：

```text
http://localhost:5173/#/pages-client/match/index
```

2. 等待 2 秒。
3. 再查 `MAIN_ORDER_ID`。

预期：
- 不再显示可执行的“确认下单”动作，或显示“查看追踪”。
- SQL：`status` 仍为 `confirmed`。
- SQL：`pilot_id` 未变化。

---

## 6. 用例 C：业主追踪页

入口：

```text
http://localhost:5173/#/pages-client/track/index
```

### C1 初始追踪状态

用户意图：业主查看订单是否进入待起飞追踪。

操作：
1. 打开追踪页。
2. 等待地图加载 3-5 秒。
3. 截图 `C01-client-track-confirmed.png`。
4. 读取 console。

预期：
- 真实高德底图可见。
- 起点、终点 marker 可见。
- 有青色航线。
- 状态显示 `GPS：待起飞`。
- 地址面板显示起点“北京低空货运中心”和望京目的地。
- 遥测面板包含高度、地速、电量、姿态。
- 阶段条包含起飞前、起飞、飞行中、降落、完成。
- console 不应持续刷 `Invalid Object: Bounds`。

---

## 7. 用例 D/E：飞手空域门禁与后台审批

这部分要验证职责边界：飞手提交空域，后台只审批空域，不替飞手推进准备、装货或起飞。

### D1 飞手任务加载

入口：

```text
http://localhost:5173/#/pages-pilot/task/index
```

操作：
1. 打开飞手任务页。
2. 等待 3 秒。
3. 截图 `D01-pilot-task-airspace.png`。

预期：
- 页头显示 `任务 O_...`，与 `MAIN_ORDER_ID` 大写形式一致。
- 地图、起终点、航线可见。
- 当前阶段为“待空域审批”。
- 下一步提示提交空域申请。
- 主按钮为“提交空域申请”。

### D2 提交空域申请

操作：
1. 点击“提交空域申请”。
2. 等待 1-2 秒。
3. 查询 `MAIN_ORDER_ID` 和空域申请状态。

预期：
- 主按钮变为“刷新审批结果”。
- SQL：订单 `status=airspace`。
- `airspace_requests` 最新记录存在，初始为 `submitted` 或等待审批状态。

### D3 审批前刷新被拦

操作：
1. 在飞手页点击“刷新审批结果”。
2. 等待 1 秒。

预期：
- 阶段仍是“待空域审批”。
- 主按钮仍是“刷新审批结果”。
- 不能进入准备中。
- 注意：说明文字里出现“通过后进入飞行准备”不代表已经推进；只看当前阶段和主按钮。

### E1 后台看到空域审批订单

入口：

```text
http://localhost:5173/#/pages-admin/orders/index
```

操作：
1. 打开后台订单管理。
2. 点击“刷新订单”。
3. 找到 `MAIN_ORDER_ID` 对应的大写订单号。
4. 截图 `E01-admin-airspace-order.png`。

预期：
- 状态显示“空域审批”。
- 有可点击“通过空域审批”。

### E2 后台通过空域审批

操作：
1. 点击“通过空域审批”。
2. 等待 2 秒。
3. 查询空域申请状态。
4. 截图 `E02-admin-airspace-approved.png`。

预期：
- 后台订单状态仍显示“空域审批”。
- 下一动作显示“待飞手进入准备”。
- SQL：`airspace_requests.status=approved`。
- SQL：订单仍为 `airspace`，不应被后台推进到 `preparing`。

### E3 职责边界

操作：
1. 查看后台列表按钮和订单明细的下一动作。

预期：
- 后台不显示可点击的“提交空域申请”“进入飞行准备”“开始装货”“起飞执行”。
- 历史事件里可以出现“提交空域申请”，这不是按钮，不算失败。

---

## 8. 用例 D：飞手执行全程

回到：

```text
http://localhost:5173/#/pages-pilot/task/index
```

刷新页面。

### D5.1 进入飞行准备

操作：
1. 点击“进入飞行准备”。
2. 等待 1-2 秒。

预期：
- 当前阶段“准备中”。
- 主按钮“开始装货”。

### D5.2 开始装货

操作：
1. 点击“开始装货”。
2. 等待 1-2 秒。

预期：
- 当前阶段“装货中”。
- 主按钮“起飞执行”。

### D5.3 起飞执行

操作：
1. 点击“起飞执行”。
2. 等待 2 秒。
3. 截图 `D05-pilot-inflight.png`。

预期：
- 当前阶段“飞行中”。
- 地图上的无人机/轨迹开始变化。
- 高度 > 0。
- 速度 > 0。
- 电量递减但不归零。
- 主按钮为“未到达卸货点”。

### D6 围栏门禁

操作：
1. 起飞后 5 秒内点击主按钮。
2. 等待 1 秒。
3. 然后每 3 秒检查一次主按钮文本，最长 65 秒。

预期：
- 未到达终点前点击不推进。
- 阶段仍为“飞行中”。
- 最终按钮变为“确认卸货”。

失败判断：
- 未到终点前进入“卸货中”，FAIL。
- 65 秒仍没有“确认卸货”，记录 FAIL，并附遥测/地图截图。

### D7 卸货到结算

操作：
1. 点击“确认卸货”。
2. 等待 1-2 秒，确认阶段“卸货中”，按钮“完成任务”。
3. 点击“完成任务”。
4. 等待 1-2 秒，确认阶段“已完成”，按钮“生成结算”。
5. 点击“生成结算”。
6. 等待 1-2 秒。
7. 截图 `D07-pilot-settled.png`。
8. 查询 `MAIN_ORDER_ID`。

预期：
- 最终阶段“已结算”。
- SQL：`status=settled`。
- SQL：`settlement.totalCent > 0`。
- 电量终点附近应大于 0，通常约 30%-40%。

---

## 9. 用例 F：业主结算与评价

### F1 轨迹终态

入口：

```text
http://localhost:5173/#/pages-client/track/index
```

操作：
1. 刷新追踪页。
2. 截图 `F01-client-track-settled.png`。

预期：
- 阶段条五个节点全部完成。
- 出现“查看结算评价”。

### F2 结算评价页

操作：
1. 点击“查看结算评价”。
2. 等待跳转。
3. 截图 `F02-review-page.png`。

预期：
- URL 为 `#/pages-client/review/index`。
- 显示“已结算”。
- 显示五方分账：平台、飞手、机主、保险、税费。
- 分账周期包含 `T+1`、`T+7`、`realtime` 或 `-`。
- 显示五颗星、评价输入框、提交评价按钮。

### F3 提交五星评价

操作：
1. 点击第 5 颗星。
2. 在评价框真实输入：

```text
验收测试：准时响应，吊运稳定。
```

3. 点击“提交评价”。
4. 截图 `F03-review-submitted.png`。
5. 查询 review 表。

预期：
- 页面显示“评价已提交”或“已提交评价”。
- SQL：`star=5`。
- SQL：评价文本完全一致。

---

## 10. 用例 G：后台锁定推荐运力（独立订单）

这组不依赖 `MAIN_ORDER_ID`，用于验证后台可以对一笔新匹配中订单锁定推荐运力。

### G1 创建 25kg 匹配中订单

执行：

```bash
curl -s -X POST http://localhost:8088/api/v1/orders -H 'content-type: application/json' -d '{
  "clientId":"u_c1","cargoType":"equipment","weightKg":25,"valueCent":500000,
  "budgetCent":36000,"insured":true,"shockProof":true,
  "special":"后台推进验收订单","remark":"admin acceptance","timeMode":"instant","paymentMode":"escrow",
  "from":{"lng":116.397128,"lat":39.916527,"address":"北京市东城区天安门广场"},
  "to":{"lng":116.481488,"lat":39.990464,"address":"北京市朝阳区望京SOHO"}
}'
```

记录返回的 `order.id` 为 `ADMIN_ORDER_ID`。

预期：
- 返回 `"ok":true`。
- 订单状态为 `matching`。
- 注意 `weightKg=25` 必须小于等于种子无人机最大载重 30kg。

### G2 后台刷新并锁定

入口：

```text
http://localhost:5173/#/pages-admin/orders/index
```

操作：
1. 打开后台订单管理。
2. 点击“刷新订单”。
3. 找到 `ADMIN_ORDER_ID` 的大写订单号。
4. 点击该行的“锁定推荐运力”。
5. 等待 2-3 秒。
6. 点击该订单行，使右侧明细切到该订单。
7. 截图 `G02-admin-lock-capacity.png`。

预期：
- 状态变为“已接单”。
- 不再显示可点击推进按钮。
- 下一动作显示“请由飞手提交空域申请”。

SQL 验证：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := _utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci;
SELECT JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.pilotId')) AS pilot,
  JSON_UNQUOTE(JSON_EXTRACT(doc,'$.policyId')) AS policy
FROM orders WHERE id COLLATE utf8mb4_unicode_ci=@order_id;
SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc,'$.status')) AS status FROM capacity_units WHERE id='cap1';
SQL
```

期望：
- `status=confirmed`。
- `pilot` 非空。
- `policy` 非空。
- `cap1=busy`。

---

## 11. 用例 H：边界和异常

### H1 超载订单不能锁定

执行：

```bash
curl -s -X POST http://localhost:8088/api/v1/orders -H 'content-type: application/json' -d '{
  "clientId":"u_c1","cargoType":"equipment","weightKg":280,"valueCent":500000,
  "budgetCent":36000,"insured":true,"shockProof":true,
  "special":"超载边界验收订单","remark":"overload acceptance","timeMode":"instant","paymentMode":"escrow",
  "from":{"lng":116.397128,"lat":39.916527,"address":"北京市东城区天安门广场"},
  "to":{"lng":116.481488,"lat":39.990464,"address":"北京市朝阳区望京SOHO"}
}'
```

记录返回的 `order.id` 为 `OVERLOAD_ORDER_ID`。

操作：
1. 打开后台订单管理。
2. 点击“刷新订单”。
3. 找到 `OVERLOAD_ORDER_ID`。
4. 点击“锁定推荐运力”。
5. 截图 `H01-overload-guard.png`。

预期：
- 页面保持“匹配中”。
- toast 或页面状态提示当前没有在线合规运力。
- SQL：`status=matching`。
- 不应生成 pilotId、capacityId、policyId。

### H2 匹配页无候选空态

入口：

```text
http://localhost:5173/#/pages-client/match/index
```

操作：
1. 保证 `OVERLOAD_ORDER_ID` 是最新订单。
2. 打开匹配页。
3. 截图 `H02-match-empty.png`。

预期：
- 显示“0 个最优方案”或“暂无可选方案”。
- 页面不崩溃。
- 无 console fatal。

### H3 清缓存后后台数量一致

操作：
1. 控制台执行：

```js
localStorage.clear();
sessionStorage.clear();
location.reload();
```

2. 打开后台订单页。
3. 点击“刷新订单”。
4. SQL 查询订单数量：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e "SELECT COUNT(*) AS order_count FROM orders;"
```

预期：
- 后台 `ORDERS` / `TOTAL ORDERS` / “运单列表 N 单”与 SQL 数量一致。

---

## 12. 用例 S：角色页面冒烟

逐页打开，检查页面非白屏、核心内容存在、console 无未捕获异常、无 `Invalid Object: Bounds`。

| 编号 | 角色页面 | URL | 必查点 |
|---|---|---|---|
| S1 | 业主首页 | `#/pages-client/home/index` | 最近订单、当前吊运扫描、底部导航 |
| S2 | 业主保险 | `#/pages-client/insurance/index` | 保单列表、投保方案、当前保单 |
| S3 | 飞手首页 | `#/pages-pilot/home/index` | 当前任务或待命状态、通知、收益入口 |
| S4 | 飞手接单大厅 | `#/pages-pilot/hall/index` | 已确认订单不出现在待接列表，而在当前任务/继续执行 |
| S5 | 飞手钱包 | `#/pages-pilot/wallet/index` | D7 后有“飞手劳务”pending 流水 |
| S6 | 机主首页 | `#/pages-owner/home/index` | 资产运营状态、设备入口 |
| S7 | 机主钱包 | `#/pages-owner/wallet/index` | D7 后有“设备使用费”T+7 pending |
| S8 | 机主设备 | `#/pages-owner/drones/index` | 设备台账、保额、适航、状态 |
| S9 | 后台总览 | `#/pages-admin/dashboard/index` | 指标、订单、认证队列、地图/看板不白屏 |
| S10 | 后台风控 | `#/pages-admin/risk/index` | 风险队列空态或风险项 |
| S11 | 后台审计 | `#/pages-admin/audit/index` | 本次订单、空域、支付、发布订单审计可见 |

每页操作：
1. 打开 URL。
2. 等待 2 秒。
3. 截图 `Sxx-<route>.png`。
4. 记录页面首屏关键文字。
5. 记录 console fatal 数量。

---

## 13. 响应式和刷新补充测试

这组不是主流程阻断项，但能发现更像真人使用的问题。

### R1 移动视口

视口建议：

```text
390 x 844
430 x 932
```

检查页面：
- 发单页。
- 匹配页。
- 飞手任务页。
- 后台订单页。

预期：
- 底部操作栏不遮挡关键表单。
- 按钮文字不溢出。
- 地图高度合理，不挤压 POI 列表。

### R2 桌面视口

视口建议：

```text
1280 x 720
1440 x 900
```

检查页面：
- 后台总览。
- 后台订单。
- 后台审计。

预期：
- 内容不横向溢出。
- 右侧明细和左侧列表均可阅读。
- 操作按钮可点击。

### R3 刷新恢复

在以下阶段刷新页面：
- A8 目的地已选但未发单。
- B1 匹配页候选已出现。
- D2 空域申请后。
- D5 飞行中。
- F2 评价页。

预期：
- 已落库阶段刷新后不丢。
- 未落库的纯表单草稿不强制要求恢复，但页面不能白屏。

---

## 14. 最终质量门禁

UI 流程完成后执行：

```bash
pnpm backend:test && pnpm verify
```

通过标准：
- Go 后端测试通过。
- `pnpm type-check` 通过。
- `pnpm lint` 通过。
- Vitest 全部通过。
- `build:mp-weixin` 通过。
- `check:integrity` 通过。

允许存在：
- Sass `@import` deprecation warning。
- Dart Sass legacy JS API warning。
- Canvas2D readback 性能 warning。

不允许存在：
- TypeScript error。
- ESLint error。
- Vitest failed。
- mp-weixin build failed。
- 完整性检查失败。
- 浏览器 console fatal。
- `Invalid Object: Bounds` 持续刷屏。

---

## 15. PASS 标准汇总

全部满足才算本轮模拟真人验收 PASS：

1. 业主能从发单页选择真实高德 POI，完成发单。
2. 未选目的地、起终点重合都有明确拦截。
3. 匹配页候选来自实时计算，价格为正且非固定假数据。
4. 确认下单写库 `confirmed`，重复确认被拦。
5. 追踪页显示真实地图、起终点、遥测和阶段条。
6. 飞手提交空域后，审批前不能推进。
7. 后台只审批空域，不替飞手推进业务阶段。
8. 飞手执行链路能从准备、装货、起飞、围栏门禁、卸货走到结算。
9. 结算产生五方分账和钱包流水。
10. 业主五星评价写入 reviews，并触发信用分相关文案。
11. 后台能对独立匹配订单锁定推荐运力。
12. 超载订单不能锁定运力，状态保持 `matching`。
13. 清缓存后后台订单数量与 SQL 一致。
14. 11 个角色页面全部非白屏、无 fatal。
15. `pnpm backend:test && pnpm verify` 通过。

---

## 16. 给 Claude Fable 5 的直接执行提示

可以把下面这段连同本文一起发给测试代理：

```text
请严格按 docs/HUMAN_SIMULATION_TEST_PLAYBOOK.md 执行 drone_v2 的 H5 模拟真人验收测试。

要求：
1. 使用真实浏览器点击和真实键盘输入，不要用 JS 调页面函数推进业务。
2. 高德选点搜索框必须真实逐字输入“望京SOHO”。
3. 每个关键阶段截图，失败时截图 + console + 当前 URL + SQL。
4. 用 MySQL 只读查询交叉验证订单、空域、结算、评价、钱包和运力状态。
5. 测试报告写到 docs/ui-human-test-results-2026-06-13.md。
6. 截图放到 output/human-walkthrough/2026-06-13/。
7. 最后执行 pnpm backend:test && pnpm verify。
8. 如果失败，先判断是代码缺陷、环境问题、测试脚本问题还是高德外部波动，不要直接跳过。
```
