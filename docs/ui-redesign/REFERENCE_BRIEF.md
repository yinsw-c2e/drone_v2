# 视觉设计重构参考 Brief

## 外部参考

- TailAdmin Vue: https://github.com/TailAdmin/vue-tailwind-admin-dashboard
  - 吸收点：桌面后台左侧 rail、横向指标、密集表格/队列、分层 surface。
  - 未照搬：不引入 Tailwind、不复制组件库、不替换 §13 token。
- Flowbite Admin Dashboard: https://github.com/themesberg/flowbite-admin-dashboard
  - 吸收点：运营后台的 dashboard / CRUD / settings 信息结构，操作列对齐，状态易扫读。
  - 未照搬：不引入 Flowbite，不使用其颜色、字号或 CSS 系统。
- Ant Design Detail Page: https://ant-design.antgroup.com/docs/spec/detail-page
  - 吸收点：信息按接近性分组，减少卡片套卡片和重复标题，让用户直达关键字段和操作。
  - 未照搬：不引入 Ant Design 组件或视觉风格。
- GoTruck / Droply logistics mobile UI kits:
  - GoTruck: https://mansknow.com/gotruck-logistics-delivery-app-ui-kit/
  - Droply: https://craftwork.design/product/droply-parcel-app-ui-kit
  - 吸收点：物流移动端的旅程感，路线、ETA、责任人、支付和评价贯穿首屏。
  - 未照搬：不使用素材包，不做营销式大图，不加入与低空吊运无关的装饰。

## 本项目落地原则

- 视觉真源仍是 `docs/EXECUTION.md` §13 和 `src/styles/tokens.scss`。
- 不接真实 Figma API，不引入重 UI 框架；仅使用 uni-app + Vue3 + TS + wot-design-uni 兼容能力。
- 新增组件围绕低空吊运业务：航线、空域、遥测、电量、合规门、风控、结算节点。
- 页面首屏必须有明确视觉锚点：移动端用航线/任务/资产控制台，后台桌面用运营态势地图和队列。
- 所有生产化外部能力仍按 `docs/ACCEPTANCE_GAP.md` 标注为后续，不在 UI 中伪造成真实接入。

## 新增/强化组件

- `RouteHero`：航线态势首屏，包含起终点、空域状态、飞行器位置、ETA、距离、电量。
- `KpiStrip`：紧凑横向指标，替代大量等权白卡。
- `IconActionGrid`：认证、信用、保险、调度、钱包等入口使用 icon/symbol + label + 状态。
- `StageStepper`：首页/任务的迷你阶段轨道。
- `CommandPanel`：飞手任务、应急、端到端动作的主行动面板。
- `AdminDataPanel`：后台桌面/移动通用运营面板，统一标题、说明和操作位。

## 本轮不做

- 不接真实地图、真机 SDK、支付、保险、征信、UOM 或服务端审计。
- 不引入 Tailwind/Flowbite/Ant Design 等新视觉系统。
- 不做满屏渐变、装饰性 blob/orb、营销 landing 或与低空指挥中心无关的视觉资产。
