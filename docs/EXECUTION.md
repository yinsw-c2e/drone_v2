# 无人机货物吊运智慧服务平台 —— Codex `/goal` 执行手册
### v4.1 · 自包含（含 §13 设计卷）· 可直接投喂 · 以「可验证终态」驱动

> **本文件是给 Codex CLI `/goal` 模式的完整执行手册，单文件自包含。** 把它存为仓库内 `docs/EXECUTION.md`，按 §1 粘贴一条 `/goal` 命令即可，无需额外口头指挥。
> v4.1 取代 v1–v3 作为**唯一投喂文件**：契约（类型）、规则、**全套测试**、**验证脚本**、红线、分阶段验收门、**以及 §13 设计系统（视觉/交互/组件规格）** 全部在文内。
> **设计说明**：Codex 审美/版面规划较弱，§13 已把设计决策**前置为可照搬的 token 与布局骨架**，并把"必须取 token、禁止裸写颜色/字号"做成**机器可检查的设计门**——执行体照搬即可，无需自有品味。
> **核心机制**：Codex 的 `/goal` 循环只在"验证通过"时停止。本文把验证做成**一条机器可判定、无法作弊的命令 `pnpm verify`**——它绿了，功能就真做出来了；它红着，循环就继续。**你（Claude/作者）是大脑（定契约与验证），Codex 是手（写实现直到 `pnpm verify` 绿）。**

---

## §0 · 操作者须知（你本人读，1 分钟）

**前置条件**
- Codex CLI **v0.128.0+**，并已开启 `goals` 特性开关（在 Codex 配置中启用）。
- Node.js ≥ 18，已安装 `pnpm`，Git 仓库已初始化。
- 把本文件放到仓库 `docs/EXECUTION.md`。

**随附材料与优先级（连同本文件一起给 Codex）**
- `docs/EXECUTION.md`（本文件，v4.2，含 §13 设计卷）= **唯一权威施工指令**，一切以它为准。
- `drone-lift-core/`（已跑绿的地基工程）= **直接采用**（引擎/契约/测试/设计令牌/核心组件已验证），并入方法见 **附录 D**。
- 原始需求说明书《无人机货物吊运智慧服务平台》= **仅作参考**（产品意图/术语/验收意图），用法与边界见 **附录 E**。冲突一律以本文件为准，且不得据它扩大到 §0.2 范围外。

**你只需两步**
1. 在 Codex 里进入该仓库目录。
2. 粘贴 §1 的 `/goal` 命令（或其"一句话版"）。然后等待；它会自主分阶段开发、自测、提交。

**常用操作**
- `/goal` 查看当前目标与进度；`/goal pause` 暂停（保留状态）；`/goal resume` 继续；`/goal clear` 放弃。
- **重要**：`/goal` 会长时间自主产出大量代码改动，合并前请 review diff、自己再跑一遍 `pnpm verify`。验证体系是为防"花架子"，不是替你免去把关。

---

## §1 · 启动命令（直接复制到 Codex）

**三段式 `/goal`（推荐，照搬）：**
```
/goal 按 docs/EXECUTION.md 交付"无人机货物吊运智慧服务平台"小程序 MVP，达到该文档 §3 定义的端到端可运行终态（uni-app 微信小程序，业主/飞手/机主三端 + 管理后台，全流程：发单→智能匹配→确认→空域→合规→飞行监控→卸货→结算分账→评价，数据贯通且刷新不丢）；verified by 在仓库根目录执行 `pnpm verify` 退出码为 0（该命令依次跑 install、type-check、lint、test 含覆盖率阈值、build:mp-weixin、check-integrity 含设计完整性子检查），且 docs/PROGRESS.md 所有清单项均已勾选，且 docs/ui-review/ 下各关键页面截图齐全、docs/EXECUTION.md §13.14-B 走查清单逐项通过；while preserving docs/EXECUTION.md §2 的全部红线与工作约定（单一数据源经 repo、纯函数核心+仓储包装、状态只经 transition、金额整数分、外部依赖仅在 api/providers 用 Mock、严禁削弱或删除既有测试、严禁用 stub/写死数据冒充实现、完成前 src 下不得残留 TODO/未实现）以及 §13.0 设计宪法（颜色/字号/间距/圆角/阴影只取 §13 token、禁止裸写 hex/px、docs/EXECUTION.md §13 为唯一视觉风格真源）。
```

**一句话版（若你只想说一句）：**
```
/goal 请严格按 docs/EXECUTION.md 执行，分阶段实现其中定义的 MVP，直到 `pnpm verify` 退出码为 0 且 docs/PROGRESS.md 全部勾选为止；严禁削弱测试或用 mock/写死数据冒充业务逻辑。
```

> 两条等价；三段式把"终态/验证/约束"显式喂给循环，**漂移与钻空子的概率最低**。

---

## §2 · 红线与工作约定（= goal 的 constraints，最高优先级）

> Codex 必须把本节当作高于一切的规则。违反任一条即视为未完成。

### 2.1 反"花架子 / reward-hack"硬条款（不可协商）
1. **测试是契约，不是障碍**：§9 提供的测试**禁止修改、禁止删除、禁止 `skip`/`only`/注释**。测试失败只能改实现去满足它。你**可以新增**测试（用于补覆盖率），但不能削弱既有断言。
2. **禁止用 stub 冒充实现**：除 `src/api/providers/` 内的外部依赖 Mock 外，`src/{models,utils,stores,api}` 任何文件**不得**出现 `TODO`/`FIXME`/`未实现`/`占位`/`placeholder`/`throw new Error('not implemented')`。
3. **禁止写死数据**：页面/Store 的列表与详情**必须经 `repo` 读取**；不得在 `.vue`/`.ts` 里内联假数组冒充数据来源（种子数据只允许在 `src/mock/`）。
4. **禁止跳过验证**：未跑通 `pnpm verify` 不得声称完成；不得为过门而降低覆盖率阈值、删检查脚本、改 verify 链。
5. **业务逻辑不许 Mock**：匹配/定价/分账/信用/状态机/钱包必须真实计算。Mock 只能是"外部世界返回的数据"（支付通道、空域审批、保险报价、征信、无人机遥测）。

### 2.2 架构红线
6. **单一数据源**：业务数据只存在内存库 `db`（持久化到 storage），一切读写经 `repo`。
7. **纯函数核心 + 仓储包装**：计算写成不依赖 `db` 的纯函数（可单测）；副作用放包装层。
8. **状态只经 `transition()` 变更**，禁止直接给 `order.status` 赋值。
9. **金额一律整数分**；时间一律 ISO 字符串；魔数集中在 `src/stores/config-data.ts`。
10. **强制规则必须真实拦截**：三者险≥500万、贵重货物强制投保、合规门、起飞前安检清单、提现余额校验。
11. **(R-design-1)** 颜色/字号/字重/行高/间距/圆角/阴影一律取 §13 token，**禁止裸写 hex/px**；§13 是唯一视觉风格真源。
12. **(R-design-2)** 优先用 wot-design-uni 组件并主题化对齐 token（§13.13）；仅库缺失才按 §13.8 自建，**禁止重复造基础组件**。
13. **(R-design-3)** 状态用"色+图标+文案"三件套；不可逆操作必二次确认；列表/详情/表单必须含**加载(骨架)/空/错误**三态。

### 2.3 遇到阻塞怎么办
11. 若遇到无法逾越的阻塞（如依赖装不上、平台限制），**不得造假绕过**：在 `docs/PROGRESS.md` 的 `## Blockers` 记录现象+已尝试方案+你需要的决策，然后停止该项、继续其它可推进项；不要为"看起来完成"而伪造。

### 2.4 提交与进度协议（让 `/goal` 可中断可恢复）
12. **每完成一个 Phase**：跑该 Phase 验收门 → 绿则 `git commit`（信息 `feat(phaseN): ...`）→ 勾选 `docs/PROGRESS.md` 对应项。
13. **每个循环开始**先读 `docs/PROGRESS.md`，从第一个未勾项继续；据此实现"resume 从上次已验证状态继续"。
14. 维护 `docs/PROGRESS.md`（模板见 §12）。

---

## §3 · 技术栈、环境与"终态"定义（固定）

**技术栈（不可替换）**：uni-app + Vue3 `<script setup>` + TypeScript；Pinia(+`pinia-plugin-persistedstate`)；UI `wot-design-uni`；图表 `qiun-data-charts`；`dayjs`；`nanoid`。测试 Vitest(+v8 覆盖率)；ESLint。编译目标**微信小程序为主**、H5 可跑（管理后台走 H5）。

**Phase 0 需 Codex 完成的初始化**（命令仅供参考，最终以装好且 `pnpm verify` 骨架可跑为准）：
```bash
pnpm create uni-app@latest . -t vue3-ts        # 在当前空仓库初始化
pnpm add pinia pinia-plugin-persistedstate luch-request dayjs wot-design-uni qiun-data-charts nanoid
pnpm add -D vitest @vitest/coverage-v8 eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```
并在 `package.json` `scripts` 写入（§4 详述）：`type-check`、`lint`、`test`、`build:mp-weixin`、`check:integrity`、`verify`。

**"终态" Definition of Done（§1 的 end state 展开）**：
- `pnpm verify` 退出码 0。
- `docs/PROGRESS.md` 全部勾选、无未决 Blockers。
- 应用可 `pnpm dev:mp-weixin` 在微信开发者工具打开，按 §11 端到端冒烟走通全流程；可 `pnpm dev:h5` 打开管理后台。
- 满足 §2 全部红线（由 `check:integrity` + 人工抽查保证）。

---

## §4 · 验证体系（= goal 的 verified by，机器可判定）

### 4.1 `package.json` scripts（Codex 按此落地）
```jsonc
{
  "scripts": {
    "type-check": "vue-tsc --noEmit -p tsconfig.json",
    "lint": "eslint \"src/**/*.{ts,vue}\" --max-warnings=0",
    "test": "vitest run --coverage",
    "build:mp-weixin": "uni build -p mp-weixin",
    "check:integrity": "node scripts/check-integrity.mjs",
    "verify": "pnpm install && pnpm type-check && pnpm lint && pnpm test && pnpm build:mp-weixin && pnpm check:integrity"
  }
}
```
> `verify` 是 `/goal` 的唯一停止判据：**任一子步骤非 0 → 循环继续**。

### 4.2 覆盖率阈值（`vitest.config.ts`，防"引擎空壳"）
```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/models/**'],
      exclude: ['src/utils/telemetry.ts'],          // 定时器逻辑，免覆盖率波动
      thresholds: { lines: 85, functions: 80, branches: 70 },
    },
  },
});
```

### 4.3 完整性脚本（`scripts/check-integrity.mjs`，全量，禁止删改）
```js
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOTS = ['src/models', 'src/utils', 'src/stores', 'src/api'];
const FORBIDDEN = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /not implemented/i, /未实现/, /占位/, /placeholder/i, /\blocalStorage\b/, /\bsessionStorage\b/];
const errors = [];
function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); if (s.isDirectory()) walk(p); else if (['.ts', '.vue', '.js'].includes(extname(p))) scan(p); } }
function scan(p) { const src = readFileSync(p, 'utf8'); for (const re of FORBIDDEN) if (re.test(src)) errors.push(`${p} 含禁止内容: ${re}`); }
for (const r of ROOTS) { try { walk(r); } catch {} }
const MUST = [
  ['src/utils/db.ts', /export const db/], ['src/utils/repo.ts', /export const repo/],
  ['src/utils/price.ts', /export function priceOrder/], ['src/utils/match.ts', /export function matchPure/],
  ['src/utils/order-machine.ts', /export const canTransition/], ['src/utils/settlement.ts', /export function computeSettlement/],
  ['src/utils/credit.ts', /export function pilotCredit/], ['src/utils/wallet.ts', /export function walletWithdraw/],
  ['src/utils/telemetry.ts', /export function startTelemetry/], ['src/utils/compliance.ts', /export function checkCompliance/],
];
for (const [file, re] of MUST) { try { if (!re.test(readFileSync(file, 'utf8'))) errors.push(`${file} 缺少必需导出 ${re}`); } catch { errors.push(`缺少文件 ${file}`); } }
// —— 设计完整性子检查：页面/组件里颜色与字号必须取 token（禁止裸 hex / 裸 px 字号） ——
const D_ROOTS = ['src/pages', 'src/components'];   // tokens.scss 在 src/styles，天然不在此范围
const D_FORBID = [/#[0-9a-fA-F]{3,8}\b/, /font-size\s*:\s*\d+px/];
function dwalk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); if (s.isDirectory()) dwalk(p); else if (/\.(vue|scss|css)$/.test(p)) { const src = readFileSync(p, 'utf8'); for (const re of D_FORBID) if (re.test(src)) errors.push(`[设计] ${p} 含禁止值(应改用 §13 token): ${re}`); } } }
for (const r of D_ROOTS) { try { dwalk(r); } catch {} }
if (errors.length) { console.error('❌ 完整性检查失败:\n' + errors.join('\n')); process.exit(1); }
console.log('✅ 完整性检查通过');
```

### 4.4 ESLint（最小规则，`.eslintrc.cjs`）
启用 `@typescript-eslint/recommended`；**额外规则**：禁止 `// @ts-ignore` 滥用、禁止 `any` 作为函数返回（warn 即可，但 `--max-warnings=0` 故等于禁止）、未使用变量报错。Codex 自行补 `tsconfig.json` 的 `@/*` paths。

---

## §5 · 目录、构建顺序与分阶段验收门

> 严格按 Phase 顺序。**每个 Phase 末尾的"门"是该阶段的局部 `verify`**；全部 Phase 完成后跑总 `pnpm verify`。
> **若随附了 `drone-lift-core/`（见附录 D）：P1–P5（契约/配置/测试/引擎/数据底座）与 P3 测试、P7 设计令牌+核心组件均已随附并验证 → 改为"按附录 D 并入既有实现并使其在 uni-app 工程内跑绿"，不要重写。**

**目录骨架**
```
src/
  models/   index.ts factory.ts validate.ts
  utils/    id.ts money.ts time.ts geo.ts safe-run.ts routes.ts
            db.ts repo.ts selectors.ts
            price.ts match.ts order-machine.ts compliance.ts settlement.ts wallet.ts credit.ts telemetry.ts notify.ts
  api/      request.ts mock-server.ts providers/index.ts providers/mock.ts
  stores/   config-data.ts config.ts user.ts order.ts telemetry.ts
  mock/     rng.ts seed.ts
  components/  StatusTag MoneyText StepFlow MapTrack MetricCard EmptyState RoleBadge
  styles/   tokens.scss
  pages/ pages-client/ pages-pilot/ pages-owner/ pages-admin/
  static/
tests/      setup.ts geo.spec.ts price.spec.ts settlement.spec.ts order-machine.spec.ts credit.spec.ts match.spec.ts wallet.spec.ts integration.spec.ts
scripts/    check-integrity.mjs
docs/       EXECUTION.md PROGRESS.md
```

| Phase | 目标 | 验收门（命令/判据） |
| --- | --- | --- |
| **0 脚手架与工具链** | 初始化工程、装依赖、写 §4 全部 scripts/config/脚本，建空目录 | `pnpm type-check` 绿；`pnpm check:integrity` 因"缺文件"红是预期（仅证明脚本可运行）；`pnpm build:mp-weixin` 绿 |
| **1 契约层** | 落地 §6 类型/枚举/工厂/校验（`models/`） | `pnpm type-check` 绿 |
| **2 配置层** | 落地 §7 配置（`config-data.ts`） | `pnpm type-check` 绿 |
| **3 测试先行** | 把 §9 全套测试 + `tests/setup.ts` 放进仓库 | `pnpm test` **红**（实现未写，预期）——证明测试已就位 |
| **4 工具与引擎** | 实现 `utils/` 全部（geo/price/match/order-machine/compliance/settlement/wallet/credit/telemetry/notify + id/money/time/safe-run/routes），按 §8 规格写到点绿对应测试 | `pnpm test`（除集成测试可能依赖 db 外）单测全绿；覆盖率达阈值 |
| **5 数据底座** | `db.ts`/`repo.ts`/`selectors.ts` + `mock/rng.ts`+`seed.ts` | `pnpm test` 含 `integration.spec.ts` 全绿 |
| **6 API 与 Provider** | `request.ts`/`mock-server.ts`/`providers/*`（外部依赖 Mock，内部调真实引擎） | `pnpm test` 绿；`pnpm type-check` 绿 |
| **7 Stores + 设计系统** | `stores/*`；`styles/tokens.scss`（§13.3–13.5 全 token）；wot-design-uni 主题化对齐 token（§13.13）；按 §13.8 自建组件（StatusTag/StepFlow/MatchCandidateCard/MetricCard/MoneyText/BottomActionBar/EmptyState/Skeleton 等） | `pnpm build:mp-weixin` 绿；**`pnpm check:integrity` 设计子检查绿**（无裸 hex/px） |
| **8 业务页面** | 按 §10 实现三端 + 管理后台所有页面，接 `repo`/引擎/`notify`，套用 §13.7 布局骨架与 §13.9 页面范式 | `pnpm build:mp-weixin` 绿；§11 冒烟手测走通；**每页按 §13.14-B 走查并截图存 `docs/ui-review/`** |
| **9 收口** | 全链路自测、补覆盖率、清理 | **`pnpm verify` 退出码 0** + PROGRESS 全勾 |

---

## §6 · 契约：类型与枚举（全量，禁止改动语义）

> `src/models/index.ts`。测试与实现都依赖此。新增字段可以，**删改既有字段/枚举值会破坏测试与契约**。

```ts
// 枚举
export enum Role { Client='client', Pilot='pilot', Owner='owner', Admin='admin' }
export enum CargoType { Normal='normal', Valuable='valuable', Dangerous='dangerous', Agricultural='agricultural' }
export enum AuditStatus { Pending='pending', Approved='approved', Rejected='rejected', Expired='expired' }
export enum OrderStatus { Created='created', Matching='matching', Confirmed='confirmed', AirspaceApplying='airspace', Preparing='preparing', Loading='loading', InFlight='inflight', Unloading='unloading', Completed='completed', Settled='settled', Cancelled='cancelled', Exception='exception' }
export enum DispatchStrategy { Nearest='nearest', MaxProfit='maxProfit', GlobalOptimal='global', Chain='chain' }
export enum CapacityStatus { Online='online', Busy='busy', Offline='offline' }
export enum LedgerType { SettleIn='settle_in', Withdraw='withdraw', Refund='refund', Bonus='bonus' }
export enum LedgerStatus { Pending='pending', Available='available', Paid='paid' }
export enum NotificationType { Dispatch='dispatch', Audit='audit', Settlement='settlement', Alert='alert', System='system' }

export interface GeoPoint { lng: number; lat: number; address?: string }

// 用户与三方画像（stats 是信用分唯一数据来源）
export interface User { id: string; phone: string; nickname: string; avatar?: string; roles: Role[]; currentRole: Role; realNameVerified: boolean }
export interface PilotStats { orders: number; completed: number; cancelled: number; onTimeRate: number; complaintRate: number; accidentRate: number; violationCount: number; flightHours: number; onlineHours: number; avgRespSec: number; avgStar: number }
export interface PilotProfile { userId: string; caacLevel: 'VLOS'|'BVLOS'|'instructor'; caacExpire: string; noCrimeProof: AuditStatus; healthProof: AuditStatus; trainingCerts: string[]; online: boolean; location: GeoPoint; stats: PilotStats }
export interface OwnerStats { deviceUptime: number; faultRate: number; maintainTimely: number; completeRate: number; cancelRate: number; respSec: number; cooperation: number }
export interface OwnerProfile { userId: string; entityType: 'person'|'company'; drones: string[]; uomVerified: boolean; stats: OwnerStats }
export interface ClientStats { payTimely: number; defaultCount: number; infoTrust: number; complaintRate: number; orderAccuracy: number; cancelRate: number }
export interface ClientProfile { userId: string; entityType: 'person'|'company'; creditBureauScore?: number; stats: ClientStats }

export interface Drone { id: string; brand: 'DJI'|'XAG'|'EHang'|'Autel'|'Other'; model: string; sn: string; maxPayloadKg: number; airworthiness: AuditStatus; insured: { hull: boolean; thirdParty: boolean; thirdPartyAmount: number }; maintenanceLog: { date: string; note: string }[]; ownerId: string; status: 'idle'|'busy'|'maintenance' }

// 运力单元：可下单运力的唯一真源
export interface CapacityUnit { id: string; pilotId: string; droneId: string; ownerId: string; location: GeoPoint; status: CapacityStatus; serviceWindow?: { start: string; end: string }; priceFactor?: number }

export interface PriceBreakdown { baseCent: number; mileageCent: number; durationCent: number; weightCent: number; difficultyFactor: number; insuranceCent: number; extraCent: number; totalCent: number }
export interface OrderEvent { at: string; status: OrderStatus; note?: string; actor?: Role }
export interface Order { id: string; clientId: string; cargo: { type: CargoType; weightKg: number; volume?: string; valueCent: number; photos: string[]; remark?: string }; from: GeoPoint; to: GeoPoint; distanceKm?: number; timeMode: 'instant'|'scheduled'; scheduledAt?: string; needs: { tempControl?: boolean; shockProof?: boolean; insurance?: boolean }; budgetCent: number; status: OrderStatus; pilotId?: string; droneId?: string; capacityId?: string; policyId?: string; priceBreakdown?: PriceBreakdown; settlement?: Settlement; events: OrderEvent[]; createdAt: string }
export interface MatchCandidate { pilotId: string; droneId: string; capacityId: string; distanceKm: number; etaMin: number; creditScore: number; quoteCent: number; score: number; reasons: string[]; priceBreakdown: PriceBreakdown }

export interface Settlement { orderId: string; totalCent: number; items: { party: 'platform'|'pilot'|'owner'|'insurance'|'tax'; ratio: number; amountCent: number; cycle: 'realtime'|'T+1'|'T+7'|'-'; note: string }[] }
export interface Wallet { id: string; userId: string; balanceCent: number; pendingCent: number }
export interface LedgerEntry { id: string; userId: string; orderId?: string; type: LedgerType; amountCent: number; cycle: string; status: LedgerStatus; note?: string; createdAt: string }

export interface CreditScore { userId: string; role: Role; total: number; level: 'A'|'B'|'C'|'D'; dimensions: { name: string; score: number; max: number }[] }
export interface InsurancePolicy { id: string; orderId: string; cargoType: CargoType; coverages: string[]; insuredAmountCent: number; premiumCent: number; status: 'active'|'claiming'|'closed' }
export interface Claim { id: string; policyId: string; orderId: string; reportedAt: string; evidence: string[]; liability?: string; payoutCent?: number; status: 'reported'|'investigating'|'assessed'|'paid'|'arbitration' }
export type AirspaceStatus = 'draft'|'submitted'|'approved'|'rejected';
export interface AirspaceRequest { id: string; orderId: string; area: GeoPoint[]; altitudeM: number; window: { start: string; end: string }; status: AirspaceStatus }
export interface Telemetry { ts: string; pos: GeoPoint; altM: number; speedMs: number; batteryPct: number; heading: number; swingDeg: number }
export interface Review { id: string; orderId: string; byRole: Role; targetUserId: string; star: 1|2|3|4|5; tags: string[]; text?: string }
export interface Notification { id: string; userId: string; type: NotificationType; title: string; body: string; read: boolean; createdAt: string; ref?: string }
```

**工厂/校验（`factory.ts`/`validate.ts`）**：
- `createOrder(input)` → `Order`（`status=Created`，`events` 含 1 条创建事件）。
- `createCapacity(input)` → `CapacityUnit`（默认 `status=Online`）。
- `validateOrder(o): string[]` → 重量≤0 / 预算≤0 / 起终点缺失 / **贵重货物未投保** 各返回一条错误。

---

## §7 · 配置（全量，`src/stores/config-data.ts`）

```ts
import type { CargoType } from '@/models';
export interface PriceConfig { mileageTiers: [number, number][]; perMinYuan: number; per10kgYuan: number; cruiseMs: number; prepMin: number; thresholdKm: number; minThirdParty: number }
export const PRICE_CONFIG: PriceConfig = { mileageTiers: [[5, 15], [15, 10], [Infinity, 5]], perMinYuan: 3, per10kgYuan: 20, cruiseMs: 13, prepMin: 3, thresholdKm: 5, minThirdParty: 5_000_000 };
export const SETTLEMENT_RULES = [
  { party: 'platform',  ratio: 0.10, cycle: 'T+1',      note: '技术服务费' },
  { party: 'pilot',     ratio: 0.50, cycle: 'T+1',      note: '劳务报酬'   },
  { party: 'owner',     ratio: 0.30, cycle: 'T+7',      note: '设备使用费' },
  { party: 'insurance', ratio: 0.05, cycle: 'realtime', note: '保险费用'   },
  { party: 'tax',       ratio: 0.05, cycle: '-',        note: '代扣代缴'   },
] as const;
export const INSURANCE_PLANS: Record<string, { coverages: string[]; suggest: string; mustInsure: boolean; needApproval: boolean }> = {
  normal:       { coverages: ['机身险', '第三者责任险'],          suggest: '50-100万', mustInsure: false, needApproval: false },
  valuable:     { coverages: ['机身险', '第三者责任险', '货物险'], suggest: '货值200%', mustInsure: true,  needApproval: false },
  dangerous:    { coverages: ['全险种', '特殊附加险'],            suggest: '200万以上', mustInsure: false, needApproval: true  },
  agricultural: { coverages: ['机身险', '第三者责任险'],          suggest: '30-50万',  mustInsure: false, needApproval: false },
};
export const NO_FLY_ZONES: GeoPoint[][] = [
  [{ lng: 116.30, lat: 39.95 }, { lng: 116.34, lat: 39.95 }, { lng: 116.34, lat: 39.99 }, { lng: 116.30, lat: 39.99 }], // 示例禁飞多边形
];
```

---

## §8 · 引擎行为规格（Codex 写实现，测试是契约）

> 以下是**每个纯函数/包装的精确行为与签名**。Codex 据此实现，并以 §9 测试为准绳。**纯核不得 import `db`/`repo`。**

**geo（`utils/geo.ts`）**：`distanceKm(a,b)` Haversine（km，对称）；`lerp(a,b,t)`；`bearing(a,b)`∈[0,360)；`deviationM(p,route)` 点到折线最近距离（米，小范围平面近似）；`pointInPolygon(p,poly)` 射线法；`insideNoFlyZone(p,zones)`。

**price（`utils/price.ts`）**：
- `etaMinutes(distKm): number = max(3, round(distKm / (cruiseMs*3.6) * 60) + prepMin)`。
- 基础服务费按载重档：≤5kg→50元、≤15→100、≤30→150、其余→200（×100 为分）。
- 里程费按 `mileageTiers` 阶梯（元/km）。时长费 `perMinYuan`×etaMin。重量费 `ceil(kg/10)`×`per10kgYuan`。
- 难度系数 `difficultyFactor∈[1,2]`：夜间(≥19点)+0.3、防震+0.2、温控+0.2，封顶 2。
- 保险费：投保时 货值×费率（贵重/危险品 3%，其余 1%）；未投保为 0。
- `priceOrder(o, drone, etaMin, km?=distanceKm(o.from,o.to)): PriceBreakdown`，其中 `totalCent = round((base+mileage+duration+weight)*difficultyFactor) + insurance + extra`（**难度系数作用于运营小计**，说明书未明确，取此通行口径并在注释标注）。

**match（`utils/match.ts`）**：
- `matchPure(o, views: CapacityView[], strategy): MatchCandidate[]`。`CapacityView = { unit:{id,location}, drone:{id,maxPayloadKg,airworthiness,insured:{thirdPartyAmount}}, pilot:{userId}, credit, rating }`。
- 过滤顺序（不满足即剔除）：距离≤`thresholdKm` → `maxPayloadKg≥货重` → `airworthiness==='approved' && thirdPartyAmount≥minThirdParty` → 若预约则 `eta≤距预约时间分钟` → 报价 `≤预算`。命中维度写入 `reasons`。
- 每个候选带 `priceBreakdown` 与 `quoteCent=priceBreakdown.totalCent`、`capacityId`。
- 打分排序（降序）：`nearest`=`0.6*(1-dist/maxDist)+0.25*(credit/1000)+0.15*(rating/5)`；`maxProfit`=`quote/maxQuote`；`global`=`0.5*距离分+0.5*信用分`（贪心近似，注释标注完整应为匈牙利二分图最优）；`chain`=`0.7*距离分+0.3*信用分`。
- 包装 `match(o, strategy='nearest')` = `matchPure(o, availableCapacityViews(), strategy)`。

**order-machine（`utils/order-machine.ts`）**：
- 导出 `NEXT: Record<OrderStatus, OrderStatus[]>`（合法流转表）与纯核 `canTransition(from,to)`。流转表：
  Created→[Matching,Cancelled]；Matching→[Confirmed,Cancelled]；Confirmed→[AirspaceApplying,Cancelled]；AirspaceApplying→[Preparing,Cancelled,Exception]；Preparing→[Loading,Cancelled,Exception]；Loading→[InFlight,Exception]；InFlight→[Unloading,Exception]；Unloading→[Completed,Exception]；Completed→[Settled]；Settled→[]；Cancelled→[]；Exception→[Preparing,Cancelled]。
- 包装 `transition(orderId,to,ctx:{actor,note?})`：非法流转 `throw`；进 `Preparing` 先 `checkCompliance`，不过则 `throw`；进 `Confirmed` 置运力/设备 busy；进 `Completed` 置运力 Online/设备 idle 并 `bumpStatsOnComplete`；进 `Settled` 调 `settleOrder` 写 `settlement` 并 `creditAfterOrder`；每次 push 一条 `OrderEvent` 并 `repo.orders.update`。

**compliance（`utils/compliance.ts`）**：`checkCompliance(o): {pass,failed[]}`，检查 业主实名 / 指派飞手且执照未过期 / 指派设备且适航 approved、三者险≥500万、载荷≥货重 / 贵重货物已投保（`o.policyId`）。

**settlement（`utils/settlement.ts`）**：纯核 `computeSettlement(totalCent): items[]`——按 `SETTLEMENT_RULES` 比例 `round`，**尾差并入 platform 使加总恒等 totalCent**。包装 `settleOrder(o): Settlement`——算出 items，并对 飞手/机主 `walletCredit`（金额取对应项，周期取对应 cycle）。

**wallet（`utils/wallet.ts`）**：`walletCredit(userId,orderId,amountCent,cycle,note)`——`realtime` 入 `balanceCent`，否则入 `pendingCent`，并写一条 `LedgerEntry`。`walletWithdraw(userId,amountCent)`——余额不足 `throw '可用余额不足'`，否则扣 `balanceCent` 并写提现流水。`releasePending(userId)`——把 pending 转 available（演示到账）。

**credit（`utils/credit.ts`）**：纯核 `pilotCredit(uid, stats): CreditScore`——四维 `clamp` 到 [200,300,300,200]，`total=四维和`，等级 A≥850/B≥700/C≥550/D；服务质量随 `onTimeRate`↑、`complaintRate`↓而升，安全随 `accidentRate/violationCount` 降。包装 `computeCredit(userId,role)` 写 `repo.credits`；`bumpStatsOnComplete(o)`、`bumpStatsOnReview(r)` 更新 `stats`；`creditAfterOrder(o)` 在结算后重算。owner/client 同构（维度 250/300/250/200 与 200/300/300/200）。

**telemetry（`utils/telemetry.ts`）**：`startTelemetry(route, onTick, durationSec=60)`——每秒沿 `route` 插值推帧，电量随时间下降，返回停止函数。

**notify（`utils/notify.ts`）**：`notify(userId,type,title,body,ref?)` 写 `repo.notifications`。在 `transition(Confirmed/Settled)` 与后台审批处调用。

**db/repo/selectors（`utils/`）**：`db` 响应式内存库（`reactive` + `watch` 持久化到 `uni` storage，key 含版本号）；`resetDB()`；强类型 `repo`（`all/find/where/insert/update/remove`，覆盖全部集合）；`selectors`：`getPilot/getDrone/getCredit/getRating/availableCapacityViews`（只取 `CapacityStatus.Online` 且能 join 到 drone+pilot 的运力）。

---

## §9 · 全套测试（契约锚，全量，禁止削弱/删除）

> 放入 `tests/`。Phase 3 先落地（此时红），Phase 4–5 写实现转绿。**断言多为不变量**，给实现留自由，但钉死关键契约。

```ts
// tests/setup.ts —— 让接触 uni 的模块在 node 测试环境可运行
(globalThis as any).uni = { getStorageSync: () => '', setStorageSync: () => {}, removeStorageSync: () => {}, showToast: () => {} };
```
```ts
// tests/geo.spec.ts
import { it, expect } from 'vitest';
import { distanceKm, bearing, pointInPolygon } from '@/utils/geo';
const sq = [{ lng: 0, lat: 0 }, { lng: 1, lat: 0 }, { lng: 1, lat: 1 }, { lng: 0, lat: 1 }];
it('距离对称且非负', () => { const a = { lng: 116.39, lat: 39.90 }, b = { lng: 116.45, lat: 39.95 }; expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 3); expect(distanceKm(a, b)).toBeGreaterThan(0); });
it('方位角在 [0,360)', () => { const v = bearing({ lng: 0, lat: 0 }, { lng: 1, lat: 1 }); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(360); });
it('点在多边形内外判定', () => { expect(pointInPolygon({ lng: 0.5, lat: 0.5 }, sq)).toBe(true); expect(pointInPolygon({ lng: 2, lat: 2 }, sq)).toBe(false); });
```
```ts
// tests/price.spec.ts
import { it, expect } from 'vitest';
import { priceOrder, etaMinutes } from '@/utils/price';
const drone: any = { maxPayloadKg: 10 };
const order: any = { cargo: { type: 'normal', weightKg: 8, valueCent: 1_000_000 }, from: { lng: 116.39, lat: 39.90 }, to: { lng: 116.45, lat: 39.95 }, needs: { insurance: true }, timeMode: 'instant' };
it('定价是纯函数(可复现)', () => { expect(priceOrder(order, drone, 20)).toEqual(priceOrder(order, drone, 20)); });
it('total = 运营小计*难度 + 保险 + 附加', () => { const p = priceOrder(order, drone, 20); const op = Math.round((p.baseCent + p.mileageCent + p.durationCent + p.weightCent) * p.difficultyFactor); expect(p.totalCent).toBe(op + p.insuranceCent + p.extraCent); });
it('难度系数∈[1,2]', () => { const p = priceOrder(order, drone, 20); expect(p.difficultyFactor).toBeGreaterThanOrEqual(1); expect(p.difficultyFactor).toBeLessThanOrEqual(2); });
it('未投保则保险费为0', () => { const p = priceOrder({ ...order, needs: {} }, drone, 20); expect(p.insuranceCent).toBe(0); });
it('ETA≥3 且含准备时长', () => { expect(etaMinutes(10)).toBeGreaterThanOrEqual(3); expect(etaMinutes(0)).toBeGreaterThanOrEqual(3); });
```
```ts
// tests/settlement.spec.ts
import { it, expect } from 'vitest';
import { computeSettlement } from '@/utils/settlement';
it('任意金额分账加总恒等总额', () => { for (let k = 0; k < 300; k++) { const t = Math.floor(Math.random() * 1e7) + 1; expect(computeSettlement(t).reduce((s, i) => s + i.amountCent, 0)).toBe(t); } });
it('五方齐全且比例正确', () => { const items = computeSettlement(1_000_000); const parties = items.map(i => i.party).sort(); expect(parties).toEqual(['insurance', 'owner', 'pilot', 'platform', 'tax']); for (const i of items) if (i.party !== 'platform') expect(i.amountCent).toBe(Math.round(1_000_000 * i.ratio)); });
```
```ts
// tests/order-machine.spec.ts
import { it, expect } from 'vitest';
import { canTransition, NEXT } from '@/utils/order-machine';
import { OrderStatus as S } from '@/models';
it('合法性与流转表自洽', () => { for (const f of Object.values(S)) for (const t of Object.values(S)) expect(canTransition(f, t)).toBe(NEXT[f].includes(t)); });
it('Created 不能直达 Completed', () => { expect(canTransition(S.Created, S.Completed)).toBe(false); });
it('终态不可再流转', () => { expect(NEXT[S.Settled]).toEqual([]); expect(NEXT[S.Cancelled]).toEqual([]); });
```
```ts
// tests/credit.spec.ts
import { it, expect } from 'vitest';
import { pilotCredit } from '@/utils/credit';
const base: any = { orders: 100, completed: 95, cancelled: 5, onTimeRate: 0.95, complaintRate: 0.02, accidentRate: 0, violationCount: 0, flightHours: 600, onlineHours: 300, avgRespSec: 20, avgStar: 4.8 };
it('维度上限 200/300/300/200 且总分=四维和', () => { const c = pilotCredit('p', base); expect(c.dimensions.map(d => d.max)).toEqual([200, 300, 300, 200]); expect(c.total).toBe(c.dimensions.reduce((s, d) => s + d.score, 0)); expect(c.total).toBeLessThanOrEqual(1000); });
it('投诉率↑→总分↓', () => { expect(pilotCredit('p', { ...base, complaintRate: 0.5 }).total).toBeLessThan(pilotCredit('p', base).total); });
it('准时率↑→总分↑', () => { expect(pilotCredit('p', { ...base, onTimeRate: 0.5 }).total).toBeLessThan(pilotCredit('p', base).total); });
```
```ts
// tests/match.spec.ts
import { it, expect } from 'vitest';
import { matchPure } from '@/utils/match';
const view = (id: string, loc: any, kg: number, extra: any = {}) => ({ unit: { id, location: loc }, drone: { id: id + 'd', maxPayloadKg: kg, airworthiness: 'approved', insured: { thirdPartyAmount: 5_000_000 } }, pilot: { userId: id + 'p' }, credit: extra.credit ?? 700, rating: extra.rating ?? 4.5 }) as any;
const order: any = { cargo: { type: 'normal', weightKg: 8, valueCent: 0 }, from: { lng: 116.397, lat: 39.908 }, budgetCent: 999_999, needs: {}, timeMode: 'instant' };
it('超载/超距的运力被过滤', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10), view('b', { lng: 116.40, lat: 39.91 }, 5), view('c', { lng: 117.6, lat: 40.6 }, 10)], 'nearest'); expect(r.find(c => c.capacityId === 'b')).toBeUndefined(); expect(r.find(c => c.capacityId === 'c')).toBeUndefined(); expect(r.length).toBe(1); });
it('超预算被过滤', () => { const r = matchPure({ ...order, budgetCent: 1 }, [view('a', { lng: 116.40, lat: 39.91 }, 10)], 'nearest'); expect(r.length).toBe(0); });
it('展示报价 === 候选 priceBreakdown.totalCent', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10)], 'nearest'); expect(r[0].quoteCent).toBe(r[0].priceBreakdown.totalCent); });
it('maxProfit 策略报价最高者排首', () => { const r = matchPure(order, [view('a', { lng: 116.40, lat: 39.91 }, 10), view('b', { lng: 116.41, lat: 39.92 }, 30)], 'maxProfit'); expect(r[0].quoteCent).toBe(Math.max(...r.map(c => c.quoteCent))); });
```
```ts
// tests/wallet.spec.ts
import { it, expect, beforeEach } from 'vitest';
import { resetDB } from '@/utils/db'; import { repo } from '@/utils/repo';
import { walletCredit, walletWithdraw } from '@/utils/wallet';
beforeEach(() => resetDB());
it('实时入账进 balance，非实时进 pending', () => { walletCredit('u1', 'o1', 5000, 'realtime', 'x'); walletCredit('u1', 'o2', 3000, 'T+1', 'y'); const w = repo.wallets.find('u1')!; expect(w.balanceCent).toBe(5000); expect(w.pendingCent).toBe(3000); });
it('提现超额抛错、足额成功', () => { walletCredit('u2', 'o', 1000, 'realtime', 'x'); expect(() => walletWithdraw('u2', 2000)).toThrow(); walletWithdraw('u2', 600); expect(repo.wallets.find('u2')!.balanceCent).toBe(400); });
```
```ts
// tests/integration.spec.ts —— 全链路（发单→匹配→确认→…→结算→提现）不变量
import { it, expect, beforeEach } from 'vitest';
import { resetDB } from '@/utils/db'; import { repo } from '@/utils/repo';
import { createOrder } from '@/models/factory'; import { match } from '@/utils/match';
import { transition } from '@/utils/order-machine'; import { releasePending, walletWithdraw } from '@/utils/wallet';
import { OrderStatus as S, Role } from '@/models';
beforeEach(() => resetDB());
it('一笔订单可走通全流程且不变量成立', () => {
  const client = repo.clients.all()[0];
  const o = repo.orders.insert(createOrder({ clientId: client.userId, from: { lng: 116.397, lat: 39.908 }, to: { lng: 116.45, lat: 39.95 }, budgetCent: 200000, cargo: { type: 'normal' as any, weightKg: 6, valueCent: 0, photos: [] } }));
  transition(o.id, S.Matching, { actor: Role.Client });
  const cands = match(o); expect(cands.length).toBeGreaterThan(0);
  const top = cands[0];
  repo.orders.update(o.id, { pilotId: top.pilotId, droneId: top.droneId, capacityId: top.capacityId, priceBreakdown: top.priceBreakdown });
  transition(o.id, S.Confirmed, { actor: Role.Client });
  expect(repo.drones.find(top.droneId)!.status).toBe('busy');
  transition(o.id, S.AirspaceApplying, { actor: Role.Client });
  transition(o.id, S.Preparing, { actor: Role.Pilot });     // 合规通过才不抛
  (['loading', 'inflight', 'unloading', 'completed'] as S[]).forEach(s => transition(o.id, s, { actor: Role.Pilot }));
  expect(repo.drones.find(top.droneId)!.status).toBe('idle');
  const settled = transition(o.id, S.Settled, { actor: Role.Client });
  expect(settled.settlement!.items.reduce((a, i) => a + i.amountCent, 0)).toBe(settled.priceBreakdown!.totalCent);
  const w = repo.wallets.find(top.pilotId)!; expect(w.balanceCent + w.pendingCent).toBeGreaterThan(0);
  releasePending(top.pilotId); expect(() => walletWithdraw(top.pilotId, 1)).not.toThrow();
});
it('非法流转必抛错', () => { const o = repo.orders.insert(createOrder({ clientId: repo.clients.all()[0].userId, from: { lng: 116.4, lat: 39.9 }, to: { lng: 116.4, lat: 39.9 }, budgetCent: 1000, cargo: { type: 'normal' as any, weightKg: 1, valueCent: 0, photos: [] } })); expect(() => transition(o.id, S.Completed, { actor: Role.Client })).toThrow(); });
```

> 注：`integration.spec.ts` 依赖 `seed.ts` 至少产出 1 名 client、若干在线运力且其中有满足"距中心点≤5km、载重≥6kg、三者险≥500万"的运力——种子必须满足，否则集成测试红，会驱动 Codex 修种子。

---

## §10 · 业务卷规格（Phase 8，每条带断言）

> 页面接 `repo`/引擎/`notify`。路由常量在 `utils/routes.ts`。验收为断言式。

- **B1 启动/登录/角色**：引导→手机号+任意6位（写 `userStore`，须命中 `repo.users`）→三色角色卡（设 `currentRole` 后 `reLaunch`）。TabBar 随角色切。**断言**：`userStore.user.id` 指向真实记录。
- **B2 三方认证**（字段照说明书 2.2.1）：`StepFlow` 向导；提交置 `pending`，Mock 2s 置 `approved`；机主提交设备写 `repo.drones` 并生成绑定 `CapacityUnit`；三者险<500万阻断。**断言**：不足被拦；后台驳回→App 端实时 `rejected`。
- **B3 业主端**：首页(信用分/进行中订单读 repo)、发单(`createOrder`+`validateOrder`+`insert`)、匹配(`match()`，展示 reasons/score；保险按 `INSURANCE_PLANS` 推荐)、选定(写 `pilotId/droneId/capacityId/policyId/priceBreakdown`+`transition(Confirmed)`)、支付(`providers.payment.prepay`)、追踪(`StepFlow`+`MapTrack` 读 `telemetryStore`)、评价(`repo.reviews.insert`+`bumpStatsOnReview`+`computeCredit`)。**断言**：候选数=过滤后运力数；`order.priceBreakdown.totalCent===选中候选 quoteCent`；选定后该运力在他人匹配中消失。
- **B4 飞手端**：接单大厅(读 Matching 订单+距离过滤；智能派单推送并 `notify`)、任务执行(起飞前安检清单全勾才放行→装货→飞行监控读遥测+§B6 告警→卸货→完成)、应急(`transition(Exception)`)、轨迹录制复用、钱包(读 `repo.wallets/ledger`，提现 `walletWithdraw`)。**断言**：安检未全勾"放行"禁用；完成后设备 idle；提现超额报错。
- **B5 机主端**：设备管理(写 `repo.drones`)、设备调度(投放=`createCapacity`/置 Online，撤回置 Offline)、钱包(owner 分账入账，T+7)。**断言**：投放后出现在业主候选；撤回后消失；结算后机主 `pendingCent` 增加 30% 分账额。
- **B6 空域与合规**：空域申请(`providers.airspace.apply`→状态机)；合规门 `checkCompliance` 阻断进 Preparing 并列原因；飞行告警(消费遥测)：低电量≤30%、偏航>200m(`deviationM`)、吊框摆度>30°、进入 `NO_FLY_ZONES`(`insideNoFlyZone`)。**断言**：适航改 pending→点准备起飞被拦；电量30%出现告警。
- **B7 支付/分账/钱包**：支付模式(预付/担保/信用/分期 Mock)；完成→`settleOrder` 入账；展示 `Settlement` 明细(10/50/30/5/5+周期)；提现/发票 Mock。**断言**：明细加总=总额；飞手收益=pilot 项金额。
- **B8 信用/风控**：三方信用分雷达图(读 `repo.credits`)；黑名单在 `match()`/发单处拦截。**断言**：改 `stats.complaintRate`→重算后总分降、匹配综合分降。
- **B9 保险/理赔**：按 `INSURANCE_PLANS` 推荐；三者险≥500万底线；贵重强制投保(在 `validateOrder`)；危险品提示需特殊审批；理赔状态机 `reported→investigating→assessed→paid`(可 arbitration)。**断言**：贵重不投保发单被拦；危险品提示审批。
- **B10 数据看板**：数字实时聚合自 `repo`(订单量/完成率/取消率/平台收入)；运力热力图(聚合 capacity 坐标)；报表；决策建议(规则触发)。**断言**：新完成一笔订单→看板完成数+1、平台收入增加该单平台分账额。
- **B11 管理后台(H5)**：认证审核(改 repo 字段+`notify`)、订单管理(走 `transition`)、用户运力、风控、看板。**断言**：后台驳回→用户端实时变；后台流转订单→业主端同步。

---

## §11 · 数据贯通契约 & 端到端冒烟（Phase 9 手测）

**一笔订单的读写主线**（任一步无真实落库即不合格）：发单(`orders+1,Created`)→匹配(`match`计算候选，`Matching`)→选定(写多字段+运力 busy，`Confirmed`)→空域(`airspace+1`,审批)→合规(不过阻断)→装货→飞行(`telemetryStore`逐帧)→卸货→完成(设备回 idle)→结算(`settlement`,钱包入账,加总=总额)→评价(`reviews+1`,信用重算)。

**冒烟脚本（交付当众跑）**：①业主发单(贵重8kg+投保) ②匹配页候选数=过滤数 ③选 Top1，`totalCent`一致、运力 busy ④切飞手账号该单可见(`notify`到达) ⑤空域通过+合规通过+安检清单→起飞，遥测移动、电量下降、可触发告警 ⑥卸货完成设备 idle ⑦结算:明细加总=总额，飞手+50%/机主+30%/平台+10% 入钱包 ⑧业主评价→飞手信用变 ⑨看板完成数+1、平台收入+ ⑩杀进程重进数据仍在。

---

## §12 · `docs/PROGRESS.md` 模板（Codex 维护）

```markdown
# 进度（Codex 自动维护：每 Phase 完成后勾选并 commit）
## Phases
- [ ] P0 脚手架与工具链（type-check/build 绿，scripts/脚本就位）
- [ ] P1 契约层 models（type-check 绿）
- [ ] P2 配置层 config-data（type-check 绿）
- [ ] P3 测试先行（tests 落地，test 红=预期）
- [ ] P4 工具与引擎（单测全绿，覆盖率达阈值）
- [ ] P5 数据底座 db/repo/selectors/seed（integration.spec 绿）
- [ ] P6 API 与 Provider（type-check/test 绿）
- [ ] P7 Stores 与组件（build 绿）
- [ ] P7-设计 tokens + wot 主题化 + 自建组件（check:integrity 设计子检查绿）
- [ ] P8 业务页面 B1–B11（build 绿，冒烟走通）
- [ ] P8-设计 各页 §13.14-B 走查通过 + 截图归档 docs/ui-review/
- [ ] P9 收口（pnpm verify 退出码 0）
## 最近一次 `pnpm verify` 结果
- 时间： / 结果（PASS|FAIL）： / 失败子步骤：
## Blockers（如有，写现象+已试方案+需要的决策；不得造假绕过）
-
```

---

## §13 · 设计卷「低空指挥中心」设计系统（视觉/交互/组件，唯一风格真源）

> Codex 审美/版面规划较弱：本卷把**设计决策前置为可照搬的 token 与骨架**，执行体取数值、套布局、按解剖实现即可。**§13.0 是设计宪法（最高优先级）。**

### §13.0 设计宪法（铁律）
1. **决策已定死**：颜色/字号/字重/行高/间距/圆角/阴影一律取本卷 token，**禁止自创数值、禁止裸写 hex/px**（由 §4.3 设计子检查强制）。
2. **先读后写**：实现任何页面/组件前先读对应章节（骨架 §13.7、组件解剖 §13.8、页面范式 §13.9）。
3. **house 唯一**：本卷是唯一风格真源；即便启用 UI UX Pro Max（§13.1）也只能用它**审计/查缺**，不得覆盖本卷配色与 token。
4. **克制优先**：信息流左对齐、单一强调色、统一 elevation、数字 tabular 对齐。**禁止**紫白渐变、满屏渐变、彩虹色、随机阴影、emoji 当图标、全局居中（详见 §13.12）。
5. **状态三件套**：所有状态用「色 + 图标 + 文案」同时表达。
6. **每页交付前**按 §13.14-B 走查并截图归档 `docs/ui-review/<page>.png`。

### §13.1 可选增强：UI UX Pro Max（作审计，不作风格主宰）
开源设计 skill（支持 Codex/Cursor/Claude Code），用于在生成 UI 前注入设计判断 + 跑无障碍/触控/缺失状态检查。**本项目严格限定**：✅ 允许做审计（对比度、focus、ARIA、触控目标、缺失加载/空/错误态、响应式、平台范式）与组件范式参考；❌ 禁止用它生成/替换本项目的配色/字体/风格 token（避免"两个视觉系统打架"）。安装以其 GitHub 仓库 `nextlevelbuilder/ui-ux-pro-max-skill`（或 `jmerta/codex-skills` 的 `ui-ux-pro-max`）README 当前说明为准（命令随版本变，勿照抄旧命令）；**装不上不阻塞**，本卷自包含。

### §13.2 设计 DNA（方向：低空指挥中心）
**一句话**：像专业飞行调度驾驶舱仪表盘——深沉可信的低空蓝为主、一处高能强调点睛、地图与大数字是主角、分层清晰、留白有节奏、动效只在关键时刻。**关键词**：可信、精密、科技、克制、实时。**记忆点**：关键数据（价格/ETA/信用分/电量）用等宽大号 condensed 数字像仪表读数；地图+底部抽屉的"指挥中心"感；状态色+步骤时间轴贯穿三端。**不是**营销页/玩具风/暗黑炫酷，Light 主题为主，留暗色口。

### §13.3 颜色系统（`src/styles/tokens.scss`，页面只准引用变量）
```scss
/* 品牌主色阶（低空蓝） */
$blue-50:#EAF1FF; $blue-100:#D4E2FF; $blue-200:#A9C5FF; $blue-300:#7BA6FF;
$blue-400:#4D86FF; $blue-500:#1E6FFF; $blue-600:#0E5AE6; $blue-700:#0A47B4; $blue-800:#073584; $blue-900:#052456;
$color-primary:$blue-500; $color-primary-press:$blue-600; $color-primary-weak:$blue-50;
/* 角色色（小面积强调，禁止做渐变大色块） */
$role-client:#1E6FFF; $role-client-weak:#EAF1FF;   // 业主·蓝
$role-pilot:#00B894;  $role-pilot-weak:#E3FBF3;     // 飞手·青绿
$role-owner:#6C5CE7;  $role-owner-weak:#EFECFE;     // 机主·靛紫
/* 语义色（主/弱底/描边/文字） */
$success:#16C784; $success-bg:#E7FAF1; $success-line:#A8ECC9; $success-ink:#0B7A4E;
$warning:#FF9F1C; $warning-bg:#FFF4E5; $warning-line:#FFD79E; $warning-ink:#B26A00;
$danger:#F5455C;  $danger-bg:#FEEAED;  $danger-line:#FBB4BE;  $danger-ink:#B11E33;
$info:#3B82F6;    $info-bg:#EAF1FF;    $info-line:#BFD6FF;    $info-ink:#0A47B4;
/* 中性灰阶（冷调） */
$ink-900:#0F1626; $ink-700:#303A4D; $ink-500:#6B7385; $ink-400:#9AA2B1;
$line:#E7EAF0; $bg-page:#F4F6FA; $bg-sunken:#EEF1F6; $bg-card:#FFFFFF; $overlay:rgba(15,22,38,.45);
/* 订单状态→色：created→$info；matching/confirmed/loading/inflight/unloading→$color-primary；
   airspace/preparing→$warning；completed→$success；settled→$success-ink；cancelled→$ink-400；exception→$danger */
```
暗色口（先不实现，预留 `.theme-dark` 覆盖 `$bg-page:#0B1020;$bg-card:#141A2B;$ink-900:#EAEEF6…`，主色提亮一档）。

### §13.4 字体与排版
- 中文栈（正文）：`-apple-system,"PingFang SC","Source Han Sans CN","Noto Sans CJK SC",system-ui,sans-serif`（小程序不自载中文字体，用系统字保清晰与性能，这是对"避免系统字"的合理偏离）。
- 数字/拉丁 display（仪表读数感，可选自载子集）：condensed 风格如 **Barlow Semi Condensed / Oswald**，仅用于大号金额/ETA/信用分/电量/看板数字，`wx.loadFontFace` 失败回退系统字（绝不阻塞）。
- 金额/数据一律 `font-variant-numeric: tabular-nums`。

| token | 字号rpx | 行高 | 用途 |
| --- | --- | --- | --- |
| `$fs-display` | 56 | 1.1 | 首屏大金额/大数字 |
| `$fs-metric` | 44 | 1.15 | 卡片关键数字 |
| `$fs-h1` | 40 | 1.25 | 页面主标题 |
| `$fs-h2` | 34 | 1.3 | 区块标题 |
| `$fs-h3` | 30 | 1.35 | 卡片标题 |
| `$fs-body` | 28 | 1.5 | 正文 |
| `$fs-sm` | 24 | 1.45 | 辅助说明 |
| `$fs-cap` | 20 | 1.4 | 标签/脚注 |

字重 `$fw-regular:400/$fw-medium:500/$fw-semibold:600/$fw-bold:700`（标题 600–700、正文 400、数字 display 600）。

### §13.5 间距/圆角/阴影/层级（token）
```scss
$sp-1:8rpx; $sp-2:16rpx; $sp-3:24rpx; $sp-4:32rpx; $sp-5:40rpx; $sp-6:48rpx; $sp-8:64rpx; $sp-10:80rpx;
$page-x:32rpx;                                   // 页面统一左右边距
$r-sm:12rpx; $r-md:20rpx; $r-lg:32rpx; $r-pill:999rpx;
$shadow-1:0 2rpx 12rpx rgba(15,22,38,.06);       // 卡片
$shadow-2:0 8rpx 32rpx rgba(15,22,38,.10);       // 抽屉/抬升
$shadow-3:0 16rpx 48rpx rgba(15,22,38,.16);      // 弹窗/悬浮
$z-base:0; $z-sticky:10; $z-dropdown:100; $z-bottombar:200; $z-sheet:1000; $z-modal:1100; $z-toast:2000;
```
节奏：同组元素 `$sp-2`，区块之间 `$sp-4~6`，卡片内边距 `$sp-4`，页面左右统一 `$page-x`。

### §13.6 图标/插画/图片
统一一套**线性图标族**（如 tabler/lucide，线宽一致，默认 40rpx/密集 32rpx），**严禁 emoji 当功能图标**；空态/品牌插画统一轻量线性风格放 `static/illus/`；头像/货物/地图缩略统一占位 + 骨架；禁止图标家族混用与随意网图。

### §13.7 布局原型（六类页面骨架，照搬）
统一：状态栏安全区 + 自定义导航栏 + 内容区左右 `$page-x` + 底部安全区 `env(safe-area-inset-bottom)`。
1. **标准列表页**：吸顶筛选/分段→卡片列表(间距 `$sp-3`)→下拉刷新+触底加载→空态。
2. **详情页**：折叠信息分区(每区一卡 + SectionHeader)，关键数据上移→**底部固定 BottomActionBar** 放主行动。
3. **表单向导**：顶部 StepFlow→每步只问必要信息(分组卡)→底部"上一步/下一步"固定→错误内联(红字在字段下)。
4. **地图+底部抽屉**：上半屏 MapTrack(标记+轨迹+围栏)→下半屏上拉抽屉(`$shadow-2`，顶 `$r-lg`)→顶部悬浮告警条。
5. **看板**：顶部 4 张 MetricCard→图表分区(折线/柱/热力)，每图配标题+时间维度切换。
6. **资金/钱包**：顶部余额大数字卡(主色纯色卡，非渐变滥用)→待结算/可提现两块→流水时间线→底部"提现"。

### §13.8 组件规格（解剖+尺寸+状态；优先用 wot-design-uni，缺失才自建）
触控目标统一 **≥88rpx** 高，主按钮 96rpx，状态齐全（默认/按压/禁用/加载/选中）。
- **Button**：主(`$color-primary`填充/白字/圆角 `$r-md`/高96rpx)、次(描边 `$line`/`$ink-700`)、文字、危险(`$danger`)；按压变 `$color-primary-press`+缩放0.98；禁用 `$ink-400`+`$bg-sunken`；加载内嵌 spinner+"处理中"禁二击；**文案≤6字**。
- **Field/Input**：标签上(`$fs-sm` `$ink-500`)+输入(`$bg-sunken`/圆角 `$r-sm`/高88rpx)+下方错误(`$danger-ink` `$fs-cap`)；聚焦描边主色。
- **Card**：白底 `$shadow-1` 圆角 `$r-md` 内边距 `$sp-4`；可点卡按压 `$shadow-2`。
- **SectionHeader**：左标题(`$fs-h3` 600)+右操作(`$fs-sm` 主色)。
- **StatusTag**：圆角 `$r-pill`，弱底+同色文字(取 §13.3 映射)+左侧8rpx 圆点+文案（色+点+字）。
- **StepFlow（订单时间轴）**：竖向；已完成实心主色+勾，当前主色脉冲圈，未来 `$line` 空心；右侧标题(`$fs-body`)+时间(`$fs-cap` `$ink-500`)。
- **MatchCandidateCard（比价卡，核心）**：左机型缩略+飞手名/信用徽标；**右上角大号报价**(`$fs-metric` display tabular)；一行 chip：距离/ETA/信用/评分(图标+值)；底部命中维度小标签；可选中(主色描边+角标勾)。层级：**价格最大、指标次之、理由最小**。
- **MetricCard**：标题(`$fs-sm` `$ink-500`)+大数字(`$fs-metric` display)+环比(↑绿/↓红 `$fs-cap`)。
- **MoneyText**：`¥`小一号+整数 display+小数 `.00` 小一号，tabular；负数(提现)用 `$ink-500`。
- **BottomActionBar**：固定底部，白底上描边 `$line`+`$shadow-2`+安全区内边距，1 主(+可选1次)。
- **EmptyState**：插画+主文(`$fs-body`)+辅文(`$fs-sm` `$ink-500`)+可选按钮，居中、上下留白 `$sp-10`。
- **Skeleton**：骨架块(`$bg-sunken`+微光)，**优先于转圈**。
- **Toast / ConfirmSheet**：轻提示用 toast；**不可逆操作**(删除/提现/确认起飞/应急)必 ConfirmSheet 二次确认，主按钮用语义色。
- **RoleBadge/Avatar/Chip/Segmented**：RoleBadge 角色弱底+角色色文字；Segmented 用于派单策略/筛选(选中主色填充)。

### §13.9 关键页面视觉范式（照搬）
- **业主首页**：问候+信用分小卡→**大号"发单"主按钮卡**(主色弱底+插画)→进行中订单卡(迷你 StepFlow+StatusTag)→常用地址。发单入口最大最显眼。
- **发单向导**：StepFlow(货物→地点→时间→保险→预算)；地点地图选点(起绿/终红+连线)；保险按 `INSURANCE_PLANS` 卡片化，贵重默认勾选不可取消并标"强制"；底部固定"下一步"。
- **匹配比价**：顶部"为你匹配到 N 个方案"+策略 Segmented→MatchCandidateCard 列表(按综合分)→选中后底部"确认下单+费用明细展开"(基础/里程/时长/重量/难度/保险 可展开行)。
- **订单追踪**：上图(实时位置+轨迹+围栏)+顶部告警条→抽屉内 StepFlow+遥测小卡(高度/速度/电量/摆度，电量<30% 标红)。
- **飞手任务执行（驾驶舱）**：起飞前安检清单(逐项大复选，全勾"放行"才点亮)→飞行中地图+遥测仪表(大号数字)+应急按钮组(返航/降落/弃绳，danger 色+二次确认)。
- **钱包**：余额大数字卡(主色纯色卡白字)→可提现/待结算→流水时间线(入账绿/提现灰)→底部"提现"。
- **运营看板/后台**：MetricCard×4+折线(收入/订单)+柱(完成/取消)+运力热力图；后台 H5 侧栏布局。

### §13.10 交互与动效（克制、有目的）
反馈即时(点击 100ms 内有视觉反馈，写操作乐观更新+失败回滚+toast)；加载用**骨架屏**不用全屏转圈；过渡页面/抽屉 200–250ms、组件 120–160ms，缓动统一 `cubic-bezier(.22,.61,.36,1)`；高价值时刻(发单成功/匹配完成/到账)可一次克制成功动效；首屏卡片可 staggered 淡入(delay 30–50ms 递增，仅首屏)；关键确认用 `uni.vibrateShort()`；不可逆操作必二次确认，长任务显示进度/骨架不假装秒回。**禁止**无意义弹跳旋转、过场>300ms、滚动视差炫技。

### §13.11 移动人因 & 无障碍（硬指标）
触控目标 ≥88rpx(≈44px)，主操作放底部拇指热区；顶部状态栏与底部 `env(safe-area-inset-bottom)` 让位；正文对比度 ≥4.5:1、大字/图标 ≥3:1(灰阶已据此选)；状态用色+图标+文案；正文字号 ≥28rpx；focus/选中态可见、表单错误有文案；地图标注带文字气泡、轨迹/围栏与底图对比充分。

### §13.12 反「通用 AI 审美」清单
**Don't（出现即返工）**：紫白/满屏渐变背景；全居中；emoji 当功能图标；随机/硬黑阴影；彩虹多色；圆角/间距忽大忽小；纯大色块无层次；按钮文案过长；图标家族混搭；卡片密集无留白。
**Do**：克制配色(蓝为主+一处强调)；信息流**左对齐**、标题—正文—辅助三级清晰；统一线性图标族；统一 `$shadow-1`；数字 tabular；留白有节奏(区块 `$sp-4~6`)；强调用大小/字重/颜色而非装饰。

### §13.13 wot-design-uni 主题化
**优先用库组件**(Button/Cell/Input/Tag/Popup/Tabs/Toast 等)，全局覆盖其 CSS 变量对齐本卷(主色→`$color-primary`、圆角→`$r-md`、文字→`$ink-900/700/500`、语义色→对应)；仅库缺失才按 §13.8 自建(MatchCandidateCard/StepFlow/MapTrack/MetricCard)；**禁止**与库重复造基础组件、禁止逐页内联样式覆盖(要改在主题层改)。

### §13.14 设计可验收化
**A. 机器检查（已并入 §4.3 `check-integrity.mjs`）**：`src/pages`/`src/components`(排除 `src/styles`、`static`)禁止裸 hex `/#[0-9a-fA-F]{3,8}\b/` 与裸 px 字号 `/font-size:\s*\d+px/`——强制取 token。
**B. 人工走查清单（每页交付前对照，截图存 `docs/ui-review/<page>.png`）**：
- [ ] 左右边距统一 `$page-x`；区块间距 `$sp-4~6`，无忽大忽小。
- [ ] 文字仅用 `$ink-900/700/500`；状态色取 §13.3 映射；无 off-system 颜色。
- [ ] 关键数字用 display 字号+tabular；金额用 MoneyText。
- [ ] 主操作在底部拇指区，触控≥88rpx；不可逆操作有二次确认。
- [ ] 列表/详情/表单有 加载(骨架)/空/错误 三态。
- [ ] 图标同一线性家族、无 emoji 图标；阴影统一 `$shadow-1`。
- [ ] 状态用 色+图标+文案；对比度达标。
- [ ] 动效克制(≤250ms 统一缓动)，仅高价值时刻有成功动效。

---

## 附录 A · 给 Codex 的总系统约束（已并入 §2，此处为提炼，循环每轮自检）
单一数据源经 repo｜纯核+包装｜状态只经 transition｜金额整数分｜外部依赖仅 providers 用 Mock｜**禁止削弱测试**｜**禁止 stub/写死冒充实现**｜完成前 src 无 TODO/未实现｜未过 `pnpm verify` 不得声称完成。

## 附录 B · Mock 演示账号（seed 须包含）
| 角色 | 手机号 | 验证码 |
| --- | --- | --- |
| 业主 | 13800000001 | 任意6位 |
| 飞手 | 13800000002 | 任意6位 |
| 机主 | 13800000003 | 任意6位 |
| 管理员 | admin | 任意6位 |

## 附录 C · 接真实系统演进路线（MVP 之后，超出本 goal 范围）
关 `USE_MOCK`→`mock-server` 换真后端(先单体 NestJS/uniCloud)→依次替换 `IPaymentProvider`(支付牌照)/`IAirspaceProvider`(UOM 授权)/`IInsurance·ICreditProvider`(机构签约)/`IDroneAdapter`(拆 App 端原生 SDK 插件)→最后谈高并发/等保三级/监控告警。

---

## 附录 D · 地基工程并入指南（随附 `drone-lift-core/`，已跑绿，直接采用）
随附的 `drone-lift-core/` 是本手册 PART I 地基的**已验证实现**：`tsc` 类型检查、Vitest **30 用例全过**（含完整下单→匹配→确认→空域→合规→飞行→结算→提现 集成测试）、覆盖率达 85/80/70、`check-integrity` 退出码 0；并含**设计令牌 `tokens.scss` 与 4 个核心组件**（MoneyText/StatusTag/StepFlow/MatchCandidateCard，均已通过设计完整性子检查）。**Codex 必须采用它，不得重写引擎/契约/测试/令牌。**

并入步骤（在 Phase 0 脚手架之后）：
1. 复制以下到 uni-app 工程对应位置、**保持内容不变**：`src/models/`、`src/utils/`（全部引擎+底座）、`src/stores/config-data.ts`、`src/mock/`、`src/styles/tokens.scss`、`src/components/`、`tests/`、`scripts/check-integrity.mjs`。
2. 配置（与 §4 一致）：`tsconfig.json` 加 `paths:{"@/*":["src/*"]}`，**类型检查改用 vue-tsc**（会额外检查 .vue；core 的 tsc 不查 SFC，并入后按 vue-tsc 报错修正组件类型）；`vitest.config.ts` 设 alias `@`→`src`、`setupFiles`、阈值 85/80/70；全局注入令牌：`vite.config` 的 `css.preprocessorOptions.scss.additionalData` 注入 `@import "@/styles/tokens.scss";`（或保留组件内相对 `@import`，二选一）；`package.json` scripts 按 §4.1 落地。
3. 安装依赖：`pinia pinia-plugin-persistedstate wot-design-uni qiun-data-charts nanoid dayjs luch-request` + dev `vitest @vitest/coverage-v8 eslint @typescript-eslint/* vue-tsc`。
4. `db.ts` 已用 `uni.*` storage，原生 uni-app 直接可用（core 测试用 stub、真机用原生，无需改）。
5. 续做：Phase 6（`api/request.ts`+`mock-server.ts`+`providers/*`）、Phase 7（wot-design-uni 主题化对齐令牌 + 其余 §13.8 组件）、Phase 8（页面 B1–B11）、Phase 9（`pnpm verify` 全绿）。
> 采用原则：**引擎/契约/测试/令牌/组件 = 既有验证资产，照搬，不要重新发明；测试是契约，不得削弱。**

## 附录 E · 投喂材料清单与优先级（务必遵守）
交给 Codex 的材料及**优先级（高→低）**：
1. **`docs/EXECUTION.md`（本手册 v4.2，含 §13 设计卷）** —— 唯一权威施工指令。
2. **`drone-lift-core/`（已验证地基工程）** —— 直接采用（见附录 D），不得重写。
3. **原始需求说明书《无人机货物吊运智慧服务平台》** —— 仅作参考：理解产品意图、业务术语与验收意图（其第七章验收对应本手册 §11 端到端冒烟；其**分账表/保险表已编码**于 §7 `SETTLEMENT_RULES`/`INSURANCE_PLANS`）。

**冲突与范围规则**：凡原始说明书与本手册冲突，**以本手册为准**；**不得**据原始说明书实现本手册 §0.2 列为"范围外"的内容（微服务架构、民航局 UOM 真实对接、真实支付分账、保险/征信真实 API、真机 SDK 控制、10 万并发/等保三级/99.99% 等基建）——这些在 MVP 中仅以 Mock/接口预留体现。
> 一句话：**EXECUTION.md 说"怎么做"；core 给你"现成地基"；原始说明书只告诉你"做成什么样、叫什么名、验收看什么"。**

---

*v4.2（终版）· 自包含 Codex `/goal` 执行手册（含 §13 设计卷 + 附录 D 地基并入 + 附录 E 材料优先级）· 验证即停止条件：`pnpm verify`（含设计完整性子检查）退出码 0 + PROGRESS 全勾 + ui-review 截图齐全 · 随附 `drone-lift-core` 地基已跑绿可直接采用 · 仅 §C 所列外部依赖为 Mock（其内部业务逻辑仍真实计算）· 视觉方向「低空指挥中心」*
