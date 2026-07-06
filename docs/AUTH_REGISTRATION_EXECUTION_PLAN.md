# 注册登录与账号身份体系执行文档

## 目标

在 `drone_v2` 中建立接近生产形态的账号体系：用户通过手机号验证码注册或登录，账号可拥有一个或多个业务身份，业务数据按真实用户归属，不再依赖当前演示用的身份直进和混合数据。

实现后，H5、App 端、小程序端都应走同一套账号逻辑。UI 保持 V2 当前暗色、青色科技风格；手机号短信能力可以借鉴 V1 的实现和配置方式，但不要照搬 V1 的页面样式，也不要把任何密钥写入仓库。

## 当前分支

- 推荐实现分支：`cc-drone/auth-registration-plan`
- 基准分支：`main`
- 部署策略：本功能未稳定前不自动部署。只有用户明确说“部署”时，才同步到服务器。

## 非目标

- 不复制 V1 的 UI。
- 不把 V1 或服务器上的短信密钥提交到 Git。
- 不让生产环境继续暴露“直接选择身份进入系统”的演示入口。
- 不在本轮强行重构所有业务页面，只改登录、身份、权限、数据归属所必需的部分。
- 不让 `official/admin` 这类运营身份开放普通用户自助注册。

## 开始条件

开始实现前先确认：

1. 当前在 `/Users/yinswc2e/Code/drone_v2`。
2. 当前分支是 `cc-drone/auth-registration-plan`，或从该分支继续。
3. 先执行 `git status --short --branch`，确认已有改动，不能误删用户或前序会话留下的文件。
4. 本地后端、前端依赖可运行。
5. V1 仓库可作为参考读取：`/Users/yinswc2e/Code/drone_Rental_platform_v1`。
6. 短信服务密钥只从本地环境变量、服务器环境变量或 GitHub Secrets 读取，不从代码里硬编码。

## 截止与阻塞条件

遇到以下情况应停止并说明原因：

1. 需要真实短信供应商密钥，但本地或服务器没有安全配置。可以先使用 mock 短信模式继续开发。
2. 数据迁移可能覆盖或删除现有订单、认证、钱包、设备等数据，且没有备份。
3. 登录改造导致核心流程无法进入，必须先修复再继续扩展。
4. 管理后台、H5、App、小程序之间的账号状态出现不可兼容分叉。
5. 用户没有明确要求部署，不要把半成品推到服务器。

## 参考 V1 的范围

只借鉴能力和接口模式，不照搬 UI。

可参考文件：

- `/Users/yinswc2e/Code/drone_Rental_platform_v1/backend/internal/api/v1/auth/handler.go`
- `/Users/yinswc2e/Code/drone_Rental_platform_v1/backend/internal/pkg/sms/sms.go`
- `/Users/yinswc2e/Code/drone_Rental_platform_v1/mobile/src/services/auth.ts`
- `/Users/yinswc2e/Code/drone_Rental_platform_v1/web-h5/src/services/auth.ts`
- `/Users/yinswc2e/Code/drone_Rental_platform_v1/backend/config.example.yaml`
- `/Users/yinswc2e/Code/drone_Rental_platform_v1/backend/docs/阿里云短信配置说明.md`

重点参考：

- `send-code`、`register`、`login`、`refresh-token`、`logout` 的接口形态。
- 短信 provider 抽象：mock、阿里云、腾讯云。
- 验证码生成、过期、校验、频率限制。
- token 与 refresh token 的存储和刷新方式。

注意：

- 不能复制 V1 的真实密钥。
- 不能把已有配置文件里的敏感值写进新文档、新代码或提交记录。
- V2 后端应保留自己的目录结构和命名风格。

## 阶段 0：盘点现状

先读 V2 当前账号与演示身份入口：

- `src/pages/login/index.vue`
- `src/stores/user.ts`
- `src/services/app-flow.ts`
- `src/api/backend.ts`
- `backend/internal/app/server.go`
- `backend/internal/app/types.go`
- `backend/internal/app/store.go`

要确认：

1. 当前是否仍通过 `loginAs(role)` 直接写入演示用户。
2. `drone_mvp_user_id`、当前角色、token、用户资料分别存在哪里。
3. 订单、认证、钱包、设备、任务等数据现在如何绑定用户。
4. 管理后台认证审核是否已经接入真实后端 API。
5. 哪些页面依赖固定 seed 用户或默认用户。

产出：

- 简短记录当前演示入口、数据归属、认证提交、后台审核之间的断点。
- 不做大改动前先明确要替换的入口。

## 阶段 1：后端账号模型与接口

新增或整理账号相关模型：

- `User`
  - `id`
  - `phone`
  - `nickname`
  - `avatar`
  - `roles`
  - `currentRole`
  - `authStatus`
  - `createdAt`
  - `lastLoginAt`
  - `disabled`
- `UserRoleProfile`
  - `userId`
  - `role`
  - `status`: `active | pending | rejected`
  - `certificationId`
  - `createdAt`
  - `updatedAt`
- `AuthSession`
  - `accessToken`
  - `refreshToken`
  - `userId`
  - `expiresAt`
  - `createdAt`

建议接口：

- `POST /api/v1/auth/send-code`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/roles`
- `POST /api/v1/auth/switch-role`

短信能力：

- 默认支持 mock provider，便于本地和测试环境开发。
- 真实环境支持阿里云或腾讯云短信。
- 配置通过环境变量或服务器 secret 注入。
- 验证码要有过期时间、发送间隔、错误次数限制。

官方或运营账号：

- `official/admin` 不开放普通注册。
- 通过 seed、后台创建、邀请或命令行初始化。
- 管理后台登录和普通用户登录可以共用 token 机制，但权限必须区分。

## 阶段 2：前端登录状态与路由守卫

目标是替换生产路径里的身份直进。

需要实现：

1. Auth store
   - 保存 `accessToken`
   - 保存 `refreshToken`
   - 保存 `currentUser`
   - 保存 `currentRole`
   - 支持 `loadMe`
   - 支持 `logout`
   - 支持 `switchRole`
2. API 请求
   - 自动带 `Authorization: Bearer <token>`
   - 遇到 401 尝试 refresh
   - refresh 失败则清空登录态并跳转登录页
3. 路由守卫
   - 未登录访问业务页，跳转登录页并保留 `redirect`
   - 已登录但没有当前角色，进入身份选择或身份申请页
   - 没有对应角色权限时，显示申请入口或无权限状态
4. 演示入口
   - `loginAs(role)` 只允许在开发或显式 demo flag 下使用，例如 `VITE_DEMO_LOGIN=1`
   - 生产环境不显示直接身份选择入口

## 阶段 3：注册登录与身份选择体验

登录页保持 V2 视觉风格。

推荐流程：

1. 用户打开系统，未登录时进入登录页。
2. 输入手机号。
3. 点击获取验证码。
4. 输入验证码后登录。
5. 如果手机号不存在，则进入注册补全流程。
6. 注册时填写昵称，并选择初始身份：
   - 业主：我要发货、查看订单、处理理赔和评价。
   - 飞手：我要接单、执行任务、管理能力与结算。
   - 机主：我有设备或运力，要管理设备、保险、调度和收益。
7. 注册成功后进入对应身份首页。
8. 需要资质的身份进入认证引导，不直接授予完整业务权限。

身份策略：

- 一个账号可以拥有多个身份。
- 初始注册选择一个主身份。
- 后续在“我的 > 身份管理”里申请新增身份。
- 只有用户拥有多个 `active` 身份时，才显示“切换身份”。
- `pending` 或 `rejected` 身份显示在身份管理里，不进入切换身份列表。

## 阶段 4：认证和权限打通

实名认证不应该等同于“我的”页面本身，它只是账号安全和角色准入的一部分。

要打通：

1. 认证提交必须绑定真实 `userId`。
2. 后台认证审核队列必须能看到刚提交的认证。
3. 审核通过后，更新对应 `UserRoleProfile.status = active`。
4. 审核拒绝后，前端显示原因并允许重新提交。
5. 不同身份有不同准入：
   - 业主：可注册后进入，但发起关键订单或支付前可能要求实名。
   - 飞手：未认证通过不能接单或执行。
   - 机主：未认证通过不能发布设备或运力。
   - 官方：不能自助申请，需要后台开通。

## 阶段 5：数据归属整理

现在很多数据是演示数据，可能混在一起。登录体系完成后必须整理归属。

处理原则：

1. 新产生的数据必须绑定当前登录用户。
2. 不再把数据默认挂到固定演示用户。
3. 订单要明确：
   - `clientId`
   - `pilotId`
   - `ownerId`
   - `createdBy`
4. 认证要明确：
   - `userId`
   - `role`
   - `status`
5. 钱包、资产、设备、任务、评价、理赔都要按真实用户过滤。
6. 演示数据保留时，要归到明确的 demo 用户，例如：
   - `demo_client`
   - `demo_pilot`
   - `demo_owner`
   - `demo_official`
7. 生产新用户默认看不到混合演示数据。

数据迁移建议：

- 先写只读检查脚本或测试，列出无主数据。
- 再写迁移逻辑，把历史演示数据归入 demo 用户。
- 对真实提交的数据不要覆盖。
- 迁移前后都要输出数量对比。

## 阶段 6：“我的”页面重构

当前多个身份的“我的”页面都像认证中心，这不适合生产。

应改成：

### 共享账号区

所有身份都应包含：

- 用户头像或昵称
- 手机号脱敏展示
- 当前身份
- 实名认证状态
- 身份管理
- 账号与安全
- 消息通知设置
- 帮助与客服
- 退出登录

### 业主的我的

重点入口：

- 我的订单
- 常用地址或常用航线
- 发票与支付
- 保险与理赔
- 评价记录
- 实名认证
- 切换身份

### 飞手的我的

重点入口：

- 飞手认证
- 能力与证照
- 任务偏好
- 钱包与结算
- 起飞执行设置
- 紧急联系人
- 切换身份

### 机主的我的

重点入口：

- 机主或企业认证
- 设备与运力
- 设备保险
- 调度设置
- 团队或授权飞手
- 钱包与收益
- 切换身份

### 官方或运营的我的

重点入口：

- 运营账号信息
- 权限范围
- 审核工作台
- 系统通知
- 退出登录

官方身份不展示普通用户注册式认证引导。

## 阶段 7：测试与验收

建议命令：

```bash
pnpm backend:test
pnpm type-check
pnpm lint
pnpm test -- --run
pnpm exec uni build -p h5
```

如本次改动触达小程序或 App 条件编译，还需要补充对应构建命令。

关键验收场景：

1. 新手机号可以获取验证码并注册。
2. 已注册手机号可以验证码登录。
3. 刷新页面后登录态仍存在。
4. 退出登录后无法访问受保护业务页。
5. 首次注册可以选择业主、飞手或机主身份。
6. 未审核飞手不能接单或执行任务。
7. 未审核机主不能发布设备或运力。
8. 后台能看到前台刚提交的认证申请。
9. 审核通过后，对应用户能获得该身份权限。
10. 一个用户拥有多个已激活身份时，才出现切换身份。
11. 生产环境不再显示直接身份直进入口。
12. 新用户看不到混合演示数据。
13. 订单、认证、设备、钱包、理赔、评价都能追溯到真实用户。
14. “我的”页面包含账号、退出登录、身份管理和角色专属功能。
15. 没有新增明文密钥或敏感配置进入 Git。

## 完成条件

满足以下条件才算目标完成：

1. 后端 auth API、短信验证码、token、me、logout、role switch 基本闭环。
2. 前端真实登录注册流程可用。
3. H5 至少完成端到端验证。
4. 当前核心业务流程不被破坏。
5. 管理后台认证审核能看到真实用户提交。
6. 数据归属从演示混合模式收敛到真实用户或明确 demo 用户。
7. “我的”页面不再只是认证中心，而是每个身份的个人中心。
8. 所有验收命令通过，或明确记录无法执行的原因。
9. 未经用户确认不部署。

## 给新会话的开始提示词

把下面内容复制到新会话即可：

```text
我现在要在 /Users/yinswc2e/Code/drone_v2 里实现注册登录与账号身份体系。请先读取 docs/AUTH_REGISTRATION_EXECUTION_PLAN.md，然后按文档执行。

开始条件：
1. 先运行 git status --short --branch，确认当前分支和未提交改动。
2. 请在 cc-drone/auth-registration-plan 分支继续工作；如果不在这个分支，请先切换或说明原因。
3. 不要误删已有未提交改动。
4. V1 项目 /Users/yinswc2e/Code/drone_Rental_platform_v1 只作为手机号短信服务和 auth 接口模式参考，不要照搬 UI，也不要复制任何真实密钥。
5. 当前功能未稳定前不要部署到服务器，除非我明确说“部署”。

目标：
建立真实手机号验证码登录/注册体系，支持一个账号拥有多个业务身份；取消生产环境身份直进；把订单、认证、钱包、设备、任务、理赔、评价等数据归属到真实用户或明确 demo 用户；把不同身份的“我的”页面改成真正的个人中心，而不是全部都是认证中心。

实现要求：
1. 后端新增或整理 auth API：send-code、register、login、logout、refresh、me、roles、switch-role。
2. 短信服务借鉴 V1 的 mock/阿里云/腾讯云 provider 思路，密钥通过环境变量或 secrets 注入，不能写进代码。
3. 前端建立真实 auth store、token 刷新、路由守卫和 API Authorization header。
4. 登录页保持 V2 当前暗色青色风格，支持手机号验证码登录；首次用户补充昵称并选择初始身份。
5. 业主、飞手、机主可以自助注册或申请；official/admin 不允许普通自助注册。
6. 认证提交必须绑定 userId，后台认证审核队列必须能看到前台刚提交的认证。
7. 只有用户拥有多个 active 身份时，才显示切换身份；pending/rejected 身份只在身份管理里显示。
8. 生产环境不再显示直接选择身份进入系统的演示入口；如需保留，只能放在显式 demo/dev flag 下。
9. “我的”页面要包含账号信息、手机号脱敏、实名认证状态、身份管理、账号安全、退出登录，并根据业主/飞手/机主/官方身份展示不同入口。
10. 数据整理必须谨慎：先检查无主或混合演示数据，再迁移到明确 demo 用户或真实 userId，不能覆盖真实数据。

验收命令：
pnpm backend:test
pnpm type-check
pnpm lint
pnpm test -- --run
pnpm exec uni build -p h5

达成条件：
1. 新手机号可以注册和登录。
2. 登录态刷新后仍保留，退出后受保护页面不可访问。
3. 注册后能选择初始身份，并按身份进入正确首页。
4. 未审核飞手/机主不能使用需要资质的核心能力。
5. 后台能看到新提交的认证并审核，审核结果能影响前台权限。
6. 新产生数据绑定真实 userId，生产新用户看不到混合演示数据。
7. “我的”页面完成角色化个人中心改造。
8. 上述验收命令通过，无法执行的要说明原因。
9. 不部署，除非我明确要求部署。

截止条件：
如果需要真实短信密钥但没有安全配置，先用 mock provider，并说明如何配置真实 provider。
如果数据迁移有覆盖或删除风险，先停止并给出备份和迁移方案。
如果 auth 改造导致核心页面无法进入，先修复阻塞再继续扩展。
```
