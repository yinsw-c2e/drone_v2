# drone_v2 真实闭环验收步骤

更新时间：2026-06-12

本文用于验收当前仓库的本地真实闭环：前端 H5 调用 Go API，Go API 写入 MySQL 8，订单从发单、匹配、接单、空域、执行、结算、评价到后台查看都能形成可查证的数据闭环。

## 0. 当前实测结论

我已按本文流程先跑过一遍（2026-06-12 全量复测通过），结论如下：

- Go 后端：`GET http://localhost:8088/api/v1/health` 返回 `{"status":"ok"}`。
- MySQL：容器 `drone-v2-mysql` 正常，数据库 `drone_v2` 可查到 `orders`、`ledger_entries`、`wallets`、`reviews` 等表。
- API 闭环订单：最近一次执行得到 `o_-1BmTOBqTgiT`，从 `matching` 推进到 `settled`，SQL 查到保单、空域申请、3 条分账流水、评价记录。
- 前端闭环订单：已从业主发单页进入匹配页，确认候选运力，飞手端连续推进（含等待模拟飞行进入终点 200m 围栏后确认卸货），业主端提交评价，SQL 最终状态为 `settled`。
- 后台订单推进：已在后台订单管理页点击“锁定推荐运力”，SQL 查到订单变为 `confirmed`，并写入 `pilotId`、`droneId`、`capacityId`、`policyId`，`cap1`/`d1` 变为 `busy`。
- 自动全量快照写回已默认关闭，避免前端旧本地状态覆盖 MySQL。核心链路通过订单 API 写库。
- 飞行围栏门禁：`inflight` 推进到 `unloading` 前，后端要求最新遥测进入终点 200m 围栏，否则返回“尚未收到飞行遥测”或“尚未到达卸货点”。

你自己执行时订单 ID 会不同，以你终端输出的 `orderId` 为准。

## 1. 真实边界和暂缓边界

已真实落地：

- 后端：`backend/` Go API，本地端口 `8088`。
- 数据库：MySQL 8.0，本地端口 `3308`，用户/密码/库名为 `drone/drone/drone_v2`。
- 前端：uni-app H5 默认连接 `http://localhost:8088`。
- 核心订单：创建订单、候选运力、确认接单、阶段推进、结算、评价都通过后端 API 持久化。
- 飞行围栏：订单 `inflight` 后必须通过 `POST /orders/:id/telemetry` 上报遥测，且最新位置进入终点 200m 围栏才能确认卸货；前端飞行中会自动按航线模拟上报。
- 管理后台：订单管理页推进匹配中订单时调用后端 API，并写入 MySQL。
- 地图选点：H5 优先调起高德 `chooseLocation`；无法调起时使用内置高德瓦片选点层，选点坐标进入订单。
- 逆地理：优先走本地高德代理或环境变量配置，其次走 OpenStreetMap Nominatim 作为最后兜底；没有高德 key 或外网不稳定时可能退回经纬度文本。

暂缓外部联调：

- 支付、提现、分账打款：当前只做金额计算、钱包与流水入库；真实微信/支付宝/银联商户资质后再接。
- 空域 UOM：当前是后端状态机里的审批记录；真实 UOM 资质和接口拿到后再联调。
- 保险公司：当前生成保单和保费记录；真实保险 API、定损、打款后续接入。
- 无人机硬件 SDK：当前轨迹和遥测按订单起终点模拟；真实 DJI/XAG/EHang/Autel/MAVLink 或设备数据链路后再接。
- 人脸、实名、征信：当前保留认证/风控流程入口；真实第三方资质后再联调。

验收时不要把上述暂缓项当成已生产联通，但也不要把它们和“没有后端/没有数据库”混为一谈。当前要验收的是本地真实服务端和数据库闭环。

## 2. 启动服务

在仓库根目录执行：

```bash
cd /Users/yinswc2e/Code/drone_v2
pnpm backend:up
pnpm dev:h5
```

如果 `5173` 已被占用，终端会显示新的 H5 地址，以终端输出为准。默认验收地址是：

```text
http://localhost:5173/#/
```

确认后端健康：

```bash
curl -s http://localhost:8088/api/v1/health
```

期望返回：

```json
{"data":{"status":"ok"},"ok":true}
```

确认 MySQL：

```bash
docker exec drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 -e "SELECT @@version AS mysql_version, DATABASE() AS db_name; SHOW TABLES;"
```

期望看到 `db_name=drone_v2`，并且表中包含 `orders`、`capacity_units`、`drones`、`wallets`、`ledger_entries`、`reviews`。

## 3. 重置基线数据

每次正式验收前先重置后端数据库：

```bash
curl -s -X POST http://localhost:8088/api/v1/reset
```

如果你之前在浏览器里测过很多旧数据，建议在 Chrome 当前站点控制台执行一次：

```js
localStorage.clear();
sessionStorage.clear();
location.reload();
```

说明：

- H5 启动时会从后端 `GET /api/v1/snapshot` 拉取 MySQL 当前快照。
- 默认不要设置 `VITE_ENABLE_SNAPSHOT_PUSH=1`。这个开关只给演示全量快照同步用，真实验收走订单 API。
- 默认不要设置 `VITE_DISABLE_BACKEND=1`。设置后前端会退回本地演示数据，不能作为真实验收。

## 4. API 自动闭环验收

这一段用于快速证明后端和数据库闭环可用。复制执行：

```bash
node --input-type=module <<'NODE'
const base = 'http://localhost:8088/api/v1';

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error(`${path} failed: ${JSON.stringify(body)}`);
  }
  return body.data;
}

const post = (path, data) => request(path, {
  method: 'POST',
  body: data === undefined ? undefined : JSON.stringify(data),
});
const get = (path) => request(path);

await post('/reset');

const payload = {
  clientId: 'u_c1',
  cargoType: 'equipment',
  weightKg: 20,
  valueCent: 600000,
  budgetCent: 36000,
  insured: true,
  shockProof: true,
  tempControl: false,
  special: '验收自动化订单',
  remark: 'API real-flow acceptance',
  volume: '1.2m x 0.8m x 0.7m',
  timeMode: 'instant',
  paymentMode: 'escrow',
  invoiceTitle: '验收测试公司',
  from: {
    lng: 116.397128,
    lat: 39.916527,
    address: '北京市东城区天安门广场',
  },
  to: {
    lng: 116.481488,
    lat: 39.990464,
    address: '北京市朝阳区望京SOHO',
  },
};

const created = await post('/orders', payload);
const orderId = created.order.id;
console.log('created:', orderId, created.order.status);

const matched = await get(`/orders/${orderId}/candidates?strategy=global`);
if (!matched.candidates.length) throw new Error('no candidates');
const candidate = matched.candidates[0];
console.log('candidate:', candidate.capacityId, candidate.pilotId, candidate.droneId, candidate.quoteCent);

const confirmed = await post(`/orders/${orderId}/confirm`, { capacityId: candidate.capacityId });
console.log('confirmed:', confirmed.order.status);

let current = (await post(`/orders/${orderId}/advance`)).order;
console.log('advance 1:', current.status);

try {
  await post(`/orders/${orderId}/advance`);
  throw new Error('expected airspace approval gate to block advance');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes('空域尚未审批')) throw error;
  console.log('blocked before approval:', '空域尚未审批');
}

const airspace = await post(`/orders/${orderId}/airspace`, { status: 'approved' });
console.log('airspace approved:', airspace.airspace.status, airspace.order.status);

let step = 2;
const advanceOnce = async () => {
  const advanced = await post(`/orders/${orderId}/advance`);
  current = advanced.order;
  console.log(`advance ${step}:`, current.status);
  step += 1;
};

// preparing -> loading -> inflight
await advanceOnce();
await advanceOnce();
await advanceOnce();
if (current.status !== 'inflight') throw new Error(`expected inflight, got ${current.status}`);

// 飞行围栏门禁：没有遥测时确认卸货应被拦截
try {
  await post(`/orders/${orderId}/advance`);
  throw new Error('expected telemetry gate to block advance');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes('尚未收到飞行遥测')) throw error;
  console.log('blocked without telemetry:', '尚未收到飞行遥测');
}

// 上报一帧仍在起点附近的遥测：应提示尚未进入 200m 围栏
await post(`/orders/${orderId}/telemetry`, {
  source: 'pilot',
  frame: {
    ts: new Date().toISOString(),
    pos: payload.from,
    altM: 30,
    speedMs: 10,
    batteryPct: 60,
    heading: 0,
    swingDeg: 5,
  },
});
try {
  await post(`/orders/${orderId}/advance`);
  throw new Error('expected destination fence gate to block advance');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes('尚未到达卸货点')) throw error;
  console.log('blocked outside fence:', '尚未到达卸货点');
}

// 上报到达终点的遥测帧，模拟飞抵卸货点
await post(`/orders/${orderId}/telemetry`, {
  source: 'pilot',
  frame: {
    ts: new Date().toISOString(),
    pos: payload.to,
    altM: 5,
    speedMs: 1,
    batteryPct: 45,
    heading: 0,
    swingDeg: 2,
  },
});
console.log('telemetry arrived at destination');

for (let i = 0; i < 10 && current.status !== 'settled'; i += 1) {
  await advanceOnce();
}

if (current.status !== 'settled') {
  throw new Error(`expected settled, got ${current.status}`);
}

const reviewed = await post(`/orders/${orderId}/review`, {
  star: 5,
  text: '验收测试：准时响应，吊运稳定，闭环通过。',
});

console.log(JSON.stringify({
  orderId,
  finalStatus: current.status,
  reviewId: reviewed.review.id,
}, null, 2));
NODE
```

期望输出包含：

```text
created: o_xxx matching
candidate: cap1 u_p1 d1 ...
confirmed: confirmed
advance 1: airspace
blocked before approval: 空域尚未审批
airspace approved: approved airspace
advance 2: preparing
advance 3: loading
advance 4: inflight
blocked without telemetry: 尚未收到飞行遥测
blocked outside fence: 尚未到达卸货点
telemetry arrived at destination
advance 5: unloading
advance 6: completed
advance 7: settled
```

记下最后输出的 `orderId`，下一节 SQL 要用。

## 5. SQL 校验 API 闭环

把下面命令里的 `o_xxx` 替换成上一节输出的 `orderId`：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := _utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci;

SELECT
  id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pilotId')) AS pilot_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.droneId')) AS drone_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.capacityId')) AS capacity_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.policyId')) AS policy_id,
  CAST(JSON_EXTRACT(doc, '$.settlement.totalCent') AS SIGNED) AS settlement_total_cent,
  JSON_LENGTH(JSON_EXTRACT(doc, '$.events')) AS event_count
FROM orders
WHERE id COLLATE utf8mb4_unicode_ci = @order_id;

SELECT
  id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS airspace_status
FROM airspace_requests
WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.orderId')) COLLATE utf8mb4_unicode_ci = @order_id;

SELECT
  id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS policy_status,
  CAST(JSON_EXTRACT(doc, '$.premiumCent') AS SIGNED) AS premium_cent
FROM policies
WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.orderId')) COLLATE utf8mb4_unicode_ci = @order_id;

SELECT
  id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.userId')) AS user_id,
  CAST(JSON_EXTRACT(doc, '$.amountCent') AS SIGNED) AS amount_cent,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.cycle')) AS cycle,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.note')) AS note
FROM ledger_entries
WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.orderId')) COLLATE utf8mb4_unicode_ci = @order_id
ORDER BY id;

SELECT
  id,
  CAST(JSON_EXTRACT(doc, '$.star') AS SIGNED) AS star,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.text')) AS review_text
FROM reviews
WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.orderId')) COLLATE utf8mb4_unicode_ci = @order_id;

SELECT
  id,
  CAST(JSON_EXTRACT(doc, '$.balanceCent') AS SIGNED) AS balance_cent,
  CAST(JSON_EXTRACT(doc, '$.pendingCent') AS SIGNED) AS pending_cent
FROM wallets
ORDER BY id;
SQL
```

通过标准：

- `orders.status` 是 `settled`。
- `pilot_id`、`drone_id`、`capacity_id`、`policy_id` 都不是空。
- `event_count` 大于等于 `10`。
- `airspace_requests.airspace_status` 是 `approved`。
- `policies.policy_status` 是 `active`。
- `ledger_entries` 至少有 3 条，分别对应平台、飞手、机主分账。
- `reviews` 有一条 5 星评价。
- `wallets` 中平台余额、飞手 pending、机主 pending 有对应增长。

## 6. 前端人工闭环验收

前提：后端和 H5 都已启动。

本节是核心链路的精简走查。若需要逐点击、全细节的浏览器手操测试（含选点搜索、策略切换、取消行为、边界用例、角色页冒烟），按 [UI_WALKTHROUGH_PLAYBOOK.md](UI_WALKTHROUGH_PLAYBOOK.md) 执行。

浏览器打开：

```text
http://localhost:5173/#/pages-client/order/index
```

按以下步骤执行：

1. 在“航线向量”区域确认起点已有默认地址。
2. 点击目的地卡片“选择目标区域...”。配置了有效的「Web端(JS API)」高德 key（`VITE_AMAP_WEB_KEY` + `VITE_AMAP_SECURITY_CODE`）时会打开原生高德选点（真实高德底图 + POI 搜索）；完全没配地图 key 时退回自建坐标选点弹层。注意：`VITE_AMAP_WEB_KEY` 填 Web服务（REST）平台的 key 会出现“地图能显示但 POI 列表为空、确认按钮禁用”，这是 key 平台类型不对，不是代码问题。
3. 在选点界面选择目标位置（原生选点从 POI 列表选择；自建弹层直接点地图）。
4. 原生选点点右上角确认；自建弹层点“使用该点”。
5. 返回发单页后，目的地卡片应显示一个可读地址；如果没有配置高德 key 且 OSM 解析失败，可能显示“经纬度点 ...”，但坐标仍会写入订单。
6. 根据需要调整重量、货值、保障等字段。
7. 点击底部“发起任务”。
8. 页面应跳转到：

```text
http://localhost:5173/#/pages-client/match/index
```

9. 在匹配页查看候选运力卡片，确认候选不是固定假卡片，而是来自后端候选接口。
10. 点击“确认下单”。
11. 页面应跳转到：

```text
http://localhost:5173/#/pages-client/track/index
```

12. 轨迹页应显示真实地图底图、订单起终点、当前状态和遥测信息。注意：遥测点当前是按订单路线模拟，不是硬件 SDK 实时数据。
13. 如果刚通过脚本或后端接口创建/确认订单，先刷新浏览器页面，让 H5 重新拉取后端快照。
14. 打开飞手任务驾驶舱：

```text
http://localhost:5173/#/pages-pilot/task/index
```

注意不要在“接单大厅”里找这笔已确认订单：大厅主要承接未锁定的待接订单；业主确认方案后，订单已经分配给飞手，应进入飞手任务驾驶舱推进。若从大厅进入，应点击“当前任务 / 继续执行”卡片。

15. 在飞手任务驾驶舱点击“提交空域申请”。预期订单进入“待空域审批”。
16. 再次点击飞手主按钮时，不应进入准备或装货，应提示“空域尚未审批”或保持待审批。
17. 打开后台订单页：

```text
http://localhost:5173/#/pages-admin/orders/index
```

18. 找到该订单，点击“通过空域审批”。这一步只改变 `airspace_requests.status = approved`，订单仍应处于空域审批阶段；后台不替飞手进入准备、装货或起飞。
19. 回到飞手任务驾驶舱，点击主操作按钮继续推进。审批通过后页面会感知结果，主按钮直接显示“进入飞行准备”。预期按钮顺序：

```text
进入飞行准备 -> 准备中
开始装货 -> 装货中
起飞执行 -> 飞行中
确认卸货 -> 卸货中
完成任务 -> 已完成
生成结算 -> 已结算
```

20. 注意“起飞执行”后页面会按订单航线自动模拟遥测并上报后端，全程约 25 秒。无人机进入终点 200m 围栏前，主按钮显示“未到达卸货点”，点击不会推进；等按钮变成“确认卸货”再点击。
21. 回到业主轨迹页：

```text
http://localhost:5173/#/pages-client/track/index
```

22. 轨迹页任务阶段应全部完成，底部出现“查看结算评价”入口。
23. 点击“查看结算评价”进入评价结算页（也可直接打开）：

```text
http://localhost:5173/#/pages-client/review/index
```

24. 评价结算页应显示“已结算”和平台、飞手、机主、保险、税费的分账金额。
25. 选择 5 星，填写评价，点击“提交评价”。
26. 页面应提示评价已提交。

前端人工验收通过标准：

- 发单后进入匹配页，不停留在本地 toast 或假弹窗。
- 匹配页候选能确认，确认后进入追踪页。
- 飞手端每次点击都会推进真实订单状态。
- 结算页能看到平台、飞手、机主、保险、税费等拆分。
- 评价提交后，MySQL `reviews` 表能查到对应订单评价。

如果你想查人工流程生成的最新订单，不复制订单 ID 也可以用下面 SQL：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := (
  SELECT id COLLATE utf8mb4_unicode_ci
  FROM orders
  ORDER BY JSON_UNQUOTE(JSON_EXTRACT(doc, '$.createdAt')) DESC
  LIMIT 1
);
SELECT @order_id AS latest_order_id;
SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status
FROM orders
WHERE id COLLATE utf8mb4_unicode_ci = @order_id;
SELECT id, CAST(JSON_EXTRACT(doc, '$.star') AS SIGNED) AS star, JSON_UNQUOTE(JSON_EXTRACT(doc, '$.text')) AS text
FROM reviews
WHERE JSON_UNQUOTE(JSON_EXTRACT(doc, '$.orderId')) COLLATE utf8mb4_unicode_ci = @order_id;
SQL
```

## 7. 管理后台验收

先准备一个新的“匹配中”订单，方便后台推进。注意 `weightKg` 必须不超过种子无人机的最大载重 30kg（`d1` FlyCart 30），否则后端候选为空，“锁定推荐运力”会提示“当前没有在线合规运力”：

```bash
node --input-type=module <<'NODE'
const base = 'http://localhost:8088/api/v1';
const response = await fetch(`${base}/orders`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    clientId: 'u_c1',
    cargoType: 'equipment',
    weightKg: 25,
    valueCent: 500000,
    budgetCent: 36000,
    insured: true,
    shockProof: true,
    special: '后台推进验收订单',
    remark: 'admin acceptance',
    timeMode: 'instant',
    paymentMode: 'escrow',
    from: { lng: 116.397128, lat: 39.916527, address: '北京市东城区天安门广场' },
    to: { lng: 116.481488, lat: 39.990464, address: '北京市朝阳区望京SOHO' },
  }),
});
const body = await response.json();
if (!body.ok) throw new Error(JSON.stringify(body));
console.log(body.data.order.id);
NODE
```

打开后台订单页：

```text
http://localhost:5173/#/pages-admin/orders/index
```

执行：

1. 找到刚才输出的订单 ID。页面会以大写显示，例如 `O_...`。
2. 状态应为“匹配中”。
3. 点击该行的“锁定推荐运力”。
4. 页面应把状态改成“已接单”，该行不再显示可点击推进按钮。
5. 后台不显示“提交空域申请”按钮；空域申请由飞手任务驾驶舱提交。
6. 飞手提交后，后台订单页该订单状态变成“空域审批”，动作按钮变成“通过空域审批”。
7. 点击“通过空域审批”，页面仍保持“空域审批”，下一动作变成“待飞手进入准备”，并且不再显示可点击推进按钮。这是正常的：审批只批准空域申请，不直接替飞手进入准备。
8. 回飞手任务驾驶舱点击主按钮，订单才进入“飞行准备”。

SQL 校验，把 `o_xxx` 替换成后台推进订单 ID：

```bash
docker exec -i drone-v2-mysql mysql --default-character-set=utf8mb4 -udrone -pdrone drone_v2 <<'SQL'
SET @order_id := _utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci;

SELECT
  id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS status,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.pilotId')) AS pilot_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.droneId')) AS drone_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.capacityId')) AS capacity_id,
  JSON_UNQUOTE(JSON_EXTRACT(doc, '$.policyId')) AS policy_id,
  JSON_LENGTH(JSON_EXTRACT(doc, '$.events')) AS event_count
FROM orders
WHERE id COLLATE utf8mb4_unicode_ci = @order_id;

SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS capacity_status
FROM capacity_units
WHERE id = 'cap1';

SELECT id, JSON_UNQUOTE(JSON_EXTRACT(doc, '$.status')) AS drone_status
FROM drones
WHERE id = 'd1';
SQL
```

通过标准：

- `orders.status` 是 `confirmed`。
- `pilot_id=u_p1`，`drone_id=d1`，`capacity_id=cap1`。
- `policy_id` 不是空。
- `capacity_units.cap1.status` 是 `busy`。
- `drones.d1.status` 是 `busy`。

## 8. 质量门禁

功能验收后，在仓库根目录执行：

```bash
pnpm backend:test
pnpm verify
```

通过标准：

- `pnpm backend:test` 退出码为 0。
- `pnpm verify` 退出码为 0。
- `pnpm verify` 会依次执行安装、类型检查、lint、Vitest、微信小程序构建、完整性检查。

如果只想快速验证前端代码质量，可以先跑：

```bash
pnpm type-check
pnpm lint
pnpm test
```

## 9. 常见问题定位

后端不可用：

- 现象：前端还能点，但 SQL 查不到新订单。
- 检查：`curl -s http://localhost:8088/api/v1/health`。
- 修复：执行 `pnpm backend:up`。

前端退回本地演示数据：

- 现象：页面能流转，但 MySQL 没变化。
- 检查：确认没有设置 `VITE_DISABLE_BACKEND=1`。
- 修复：关掉该环境变量，重启 `pnpm dev:h5`。

浏览器旧数据干扰：

- 现象：页面列表和 SQL 数量不一致。
- 修复：浏览器控制台执行 `localStorage.clear(); sessionStorage.clear(); location.reload();`，再刷新。

确认卸货被拦截：

- 现象：飞行中推进报“尚未收到飞行遥测”或“尚未到达卸货点”，前端主按钮显示“未到达卸货点”。
- 原因：后端要求最新遥测进入终点 200m 围栏后才能确认卸货；前端模拟飞行全程约 25 秒。
- 修复：等模拟飞行到达终点（按钮变“确认卸货”）；走纯 API 验收时按第 4 节脚本先 `POST /orders/:id/telemetry` 上报终点坐标帧。如果飞行页中途关闭导致遥测停了，回到飞手任务驾驶舱刷新页面，模拟会重新开始。

地图显示经纬度而不是中文地址：

- 说明：地图瓦片和坐标选点是真实的；中文地址依赖逆地理服务。
- 修复：配置 `AMAP_API_KEY` 或 `VITE_AMAP_WEB_SERVICE_KEY` 后重启 `pnpm dev:h5`，本地代理会走高德逆地理。

SQL 报 `Illegal mix of collations`：

- 原因：MySQL JSON 字符串和会话变量排序规则不同。
- 修复：按本文 SQL 写法使用 `_utf8mb4'o_xxx' COLLATE utf8mb4_unicode_ci`，或给 JSON_UNQUOTE 结果加 `COLLATE utf8mb4_unicode_ci`。

## 10. 验收结论口径

可以确认：

- 当前项目已经具备本地真实 Go 后端和 MySQL 数据库。
- 核心订单闭环不是纯 UI 假数据，关键步骤可以用 SQL 查证。
- 前端业主端、飞手端、管理后台已能围绕同一批后端数据流转。

不能夸大：

- 这还不是生产级三方联调完成。
- 支付、空域、保险、真机遥测、人脸实名、征信仍需要外部资质和接口。
- 地图地址文本依赖高德 key 或 OSM 逆地理，不能把“经纬度兜底”当成地址解析最终形态。
