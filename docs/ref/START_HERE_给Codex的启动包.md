# START HERE · 给 Codex 的启动包
### 无人机货物吊运智慧服务平台 · 小程序 MVP

---

## 一、给 Codex 的三份材料（按优先级）
| # | 材料 | 角色 | 放置位置 |
| --- | --- | --- | --- |
| 1 | **`无人机吊运平台_Codex执行手册_v4.2_终版.md`** | **唯一权威施工指令**（含 §13 设计卷、附录 D 并入指南、附录 E 优先级） | 改名为 `docs/EXECUTION.md` 放入仓库 |
| 2 | **`drone-lift-core/`**（解压 `..._地基验证工程_drone-lift-core.zip`） | **已验证地基**（引擎/契约/测试/设计令牌/核心组件，已跑绿），直接采用、勿重写 | 解压到本地，按 EXECUTION.md 附录 D 并入 |
| 3 | **原始需求说明书《无人机货物吊运智慧服务平台》(.docx)** | **仅作参考**（产品意图/术语/验收意图） | 放入 `docs/ref/` 供 Codex 查阅 |

**优先级（冲突时）**：① EXECUTION.md ＞ ② drone-lift-core ＞ ③ 原始说明书。
**范围红线**：不得据原始说明书实现 EXECUTION.md §0.2 列为"范围外"的内容（微服务、UOM 真实对接、真实支付分账、保险/征信真实 API、真机 SDK、10 万并发/等保三级等）——MVP 仅以 Mock/接口预留体现。

---

## 二、启动前确认（你本人，1 分钟）
- Codex CLI **v0.128.0+**，已开启 `goals` 特性开关。
- 本地有 **Node ≥18 + pnpm**，仓库已 `git init`。
- 三份材料已就位：`docs/EXECUTION.md`、解压好的 `drone-lift-core/`、`docs/ref/原始说明书.docx`。

---

## 三、正式启动提示词（复制到 Codex）

**（可选）先发一句人工开场：**
```
我给你三份材料：docs/EXECUTION.md（权威施工手册，含设计卷）、drone-lift-core/（已跑绿的地基工程，按手册附录 D 并入，不要重写引擎/契约/测试/令牌）、docs/ref/ 下的原始需求说明书（仅作参考；与手册冲突一律以手册为准，且不得据它扩大到手册 §0.2 范围外）。请严格按手册执行。
```

**随后粘贴启动目标（三段式 `/goal`，照搬）：**
```
/goal 按 docs/EXECUTION.md 交付「无人机货物吊运智慧服务平台」小程序 MVP：先按附录 D 把随附的 drone-lift-core 已验证地基并入 uni-app(Vue3+TS) 工程（引擎/契约/测试/设计令牌/核心组件直接采用，不得重写），再按 §5 分阶段续做至 §3 终态（业主/飞手/机主三端 + 管理后台；全流程发单→智能匹配→确认→空域→合规→飞行监控→卸货→结算分账→评价，数据贯通且刷新不丢；页面套用 §13「低空指挥中心」设计卷）；verified by 仓库根目录执行 `pnpm verify` 退出码为 0（依次跑 install、type-check(vue-tsc)、lint、test 含覆盖率阈值 85/80/70、build:mp-weixin、check-integrity 含设计完整性子检查），且 docs/PROGRESS.md 全部勾选、docs/ui-review/ 各关键页面截图齐全；while preserving §2 全部红线与 §13.0 设计宪法（单一数据源经 repo、纯函数核心+仓储包装、状态只经 transition、金额整数分、外部依赖仅在 api/providers 用 Mock、严禁削弱或删除既有测试、严禁用 stub/写死数据冒充实现、完成前 src 下无 TODO/未实现、颜色与字号只取 §13 token 禁止裸写 hex/px、原始说明书仅作参考不得扩大到 §0.2 范围外）。
```

**过程中：** `/goal` 查看进度；`/goal pause` / `/goal resume` 暂停续跑。
**合并前：** 自己再跑一遍 `pnpm verify`、review diff、在微信开发者工具里走一遍 §11 端到端冒烟。

---

## 四、它什么时候算"做完了"
`pnpm verify` 退出码 0（type-check + lint + test 覆盖率达标 + build + 完整性/设计门全过）
＋ `docs/PROGRESS.md` 全勾、无未决 Blockers
＋ `docs/ui-review/` 关键页面截图齐全
＋ 微信开发者工具里 §11 冒烟 12 步走通、杀进程重进数据不丢。
