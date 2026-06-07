# drone-lift-core —— 地基验证工程（已跑绿）

这是《无人机货物吊运智慧服务平台》v4.1 执行手册中 **PART I 地基卷的真实落地与验证**：
把契约(types)、配置、六大引擎(定价/匹配/状态机/分账/信用/遥测)、数据底座(db/repo/selectors)、
完整性脚本、以及 §9 全套测试全部实现并**跑绿**，证明这套测试与引擎自洽、可作为 Codex 的施工地基。

## 已验证（在 Node 22 上）
- `npm run type-check` → tsc --noEmit 退出码 0
- `npm test` → 30 个用例全过（含完整下单→匹配→确认→空域→合规→飞行→结算→提现 集成测试）
- `npm run test:cov` → 行 94.8% / 函数 89.7% / 分支 75.3%，满足门槛(85/80/70)
- `npm run check:integrity` → 退出码 0；并已反向验证：注入 `TODO` 或裸 `#hex` 颜色会被拦截(退出码 1)

## 与 Codex 工作流的关系
- 真项目用 uni-app(Vue3+TS) + pnpm（本工程为聚焦地基用 npm + 纯 TS，等价证明逻辑层）。
- 把本工程的 `src/models`、`src/utils`、`src/stores/config-data.ts`、`src/mock`、`tests`、`scripts` 直接并入
  uni-app 工程的对应位置即可；Codex 续做 PART II 业务页面(套 §13 设计卷)与 mp-weixin 构建。
- 这相当于"地基验收门 F11"的前三道(type-check/test/integrity)已替 Codex 趟通。

## 目录
src/models | src/utils(引擎+底座) | src/stores/config-data | src/mock(种子) | tests(8+1 spec) | scripts/check-integrity.mjs
