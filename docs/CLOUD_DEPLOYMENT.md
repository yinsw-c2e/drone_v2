# drone_v2 云端后端部署说明

更新时间：2026-07-11

本文用于把当前 `backend/` Go API + MySQL 8 后端部署到单台云服务器。当前建议先按内测/演示云后端上线，不要直接承载真实交易、实名、支付或飞控数据。

## 1. 当前项目状态

- 后端入口：`backend/cmd/server`。
- 默认端口：`8088`。
- 存活检查：`GET /api/v1/health`；发布就绪检查：`GET /api/v1/ready`。
- 数据库：MySQL 8，业务数据以 JSON 文档表为主。
- 本地启动：`pnpm backend:up`。
- 生产示例：`backend/docker-compose.prod.yml`，包含 `api`、`mysql`、`caddy`。

生产 compose 默认关闭两个演示/验收接口：

- `ENABLE_RESET_ENDPOINT=false`：禁止公网重置数据库。
- `ENABLE_SNAPSHOT_WRITE_ENDPOINT=false`：禁止公网全量覆盖快照。

本地 `backend/docker-compose.yml` 不受影响，仍按原验收文档工作。

## 2. 推荐购买方案

先买单台 Linux 云服务器即可。阿里云 ECS、腾讯云 CVM、阿里云轻量应用服务器、腾讯云 Lighthouse 都能跑当前后端。

推荐内测配置：

- 地域：大陆用户优先选华南/华东/华北中离用户近的地域；如果要上微信正式版，域名还要能完成 ICP 备案。
- 系统：Ubuntu Server 22.04 LTS 或 24.04 LTS。
- 规格：2 vCPU / 4 GB RAM 起步。
- 系统盘：40 GB 可跑；建议 80 GB 更稳。
- 公网：分配公网 IPv4。
- 带宽：内测 3-5 Mbps 通常够用，图片/视频另走对象存储时再调整。
- 安全组：只放行 `22/tcp`、`80/tcp`、`443/tcp`。不要放行 `3306/tcp`。

如果只是验证接口，轻量服务器更省心；如果准备长期经营，优先 ECS/CVM，并开启快照备份。

## 3. 你需要完成的事

1. 注册云账号并完成实名认证。
2. 购买服务器，并把以下信息发给我：
   - 云厂商：阿里云或腾讯云。
   - 服务器公网 IP。
   - SSH 登录方式：用户名、密码或私钥。
   - 操作系统版本。
3. 如果要给微信小程序正式使用：
   - 购买或准备域名，例如 `api.your-domain.com`。
   - 完成 ICP 备案。
   - DNS 添加 A 记录：`api.your-domain.com -> 服务器公网 IP`。
   - 在微信公众平台配置 `request` 合法域名。

没有域名和备案时，我仍可以先部署到云服务器做内部测试；但微信正式版不能依赖 IP 或未备案域名。

## 4. 我可以代办的事

拿到 SSH 后，我可以直接处理：

1. 安装 Docker 和 Docker Compose。
2. 上传或拉取当前仓库代码。
3. 生成生产 `.env`，替换默认数据库密码。
4. 启动 `docker compose -f docker-compose.prod.yml up -d --build`。
5. 配置 HTTPS 反向代理。
6. 验证：
   - `curl https://api.your-domain.com/api/v1/ready`
   - `docker compose ps`
   - `docker compose logs`
   - MySQL 表和数据是否正常。
7. 帮你把前端构建环境改成 `VITE_BACKEND_URL=https://api.your-domain.com`。

## 5. 服务器部署命令

下面命令在云服务器上执行。

### 5.1 安装基础工具

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

重新登录 SSH 后确认：

```bash
docker version
docker compose version
```

### 5.2 放置代码

如果代码已经有 Git 远程仓库：

```bash
sudo mkdir -p /opt/drone_v2
sudo chown "$USER:$USER" /opt/drone_v2
git clone <your-git-repo-url> /opt/drone_v2
```

如果还没有远程仓库，我可以从本机同步：

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude output \
  /Users/yinswc2e/Code/drone_v2/ \
  root@<server-ip>:/opt/drone_v2/
```

### 5.3 写生产环境变量

```bash
cd /opt/drone_v2/backend
cp .env.example .env
```

编辑 `.env`：

```bash
nano .env
```

至少替换：

```text
API_DOMAIN=api.your-domain.com
MYSQL_PASSWORD=<long-random-password>
MYSQL_ROOT_PASSWORD=<another-long-random-password>
SMS_CODE_PEPPER=<at-least-32-random-characters>
OBJECT_STORAGE_ALLOWED_HOSTS=<private-bucket-host>
INTEGRATION_MODE=sandbox
```

如果还没有域名，只想先验证云服务器能跑，把 `API_DOMAIN` 临时改为：

```text
API_DOMAIN=:80
```

然后用 `http://公网IP/api/v1/ready` 验证。拿到域名和备案后，再改回 `API_DOMAIN=api.your-domain.com` 并重启 compose。

可生成随机密码：

```bash
openssl rand -base64 32
```

### 5.4 启动服务

```bash
cd /opt/drone_v2/backend
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
docker compose --env-file .env -f docker-compose.prod.yml ps
```

验证 HTTPS：

```bash
curl -s https://api.your-domain.com/api/v1/ready
```

期望：

```json
{"data":{"status":"ready"},"ok":true}
```

如果是无域名临时烟测：

```bash
curl -s http://<server-ip>/api/v1/ready
```

### 5.5 备份数据库

```bash
cd /opt/drone_v2/backend
mkdir -p backups
docker compose --env-file .env -f docker-compose.prod.yml exec -T mysql \
  sh -lc 'mysqldump --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > "backups/drone_v2-$(date +%F-%H%M%S).sql"
```

## 6. 前端连接云后端

H5 或小程序构建前设置后端地址。小程序正式发布必须走 release 预检脚本，不能把普通开发构建当成发布包：

```bash
VITE_BACKEND_URL=https://api.your-domain.com \
VITE_PROVIDER_MODE=backend \
pnpm build:mp-weixin:release
```

H5 本地验证：

```bash
VITE_BACKEND_URL=https://api.your-domain.com pnpm dev:h5
```

H5 更新到服务器：

```bash
VITE_BACKEND_URL=https://api.your-domain.com VITE_DISABLE_LOCAL_DB_PERSIST=1 pnpm exec uni build -p h5
rsync -az --delete dist/build/h5/ ubuntu@<server-ip>:/opt/drone_v2/frontend/
```

`backend/docker-compose.prod.yml` 会把主机 `/opt/drone_v2/frontend` bind mount 到 Caddy 容器的 `/srv/drone-v2-frontend`。服务运行时要原地同步目录内容，不要用 `mv frontend.new frontend` 替换整个目录；如果确实替换了目录，需要重启 Caddy 容器让 bind mount 重新挂载。

微信小程序正式版还必须在微信公众平台添加 `https://api.your-domain.com` 到 request 合法域名。

## 7. 上线前必须补的生产项

当前代码已补齐基础鉴权、角色权限、服务端供应商隔离、就绪探针和发布回滚。正式交易开放前仍需完成：

- 支付、提现、保险、实名、飞控硬件接口的真实资质和回调验签。
- 自动数据库备份和恢复演练。
- 监控告警：服务存活、磁盘空间、MySQL 错误、HTTPS 证书状态。
- 上传图片/材料迁移到对象存储，不要长期放在业务数据库 JSON 内。
- 生产库若来自早期演示版本，必须先备份并清理 `u_c1/u_o1/u_p1...` 等 seed 数据；新 API 会拒绝在含 seed 或无活动管理员的数据库上启动。
- 清理后使用候选镜像执行一次 `/server bootstrap-admin`，传入受控管理员手机号；不要在客户端开放管理员自助申请。

完整差距和验收证据见 `docs/PRODUCTION_GAP_AUDIT_2026-07-11.md`。

## 8. 官方参考

- 阿里云 ECS 入门指引：https://help.aliyun.com/zh/ecs/quick-start
- 腾讯云 CVM 创建实例：https://cloud.tencent.com/document/product/213/4855
- 腾讯云 Lighthouse 与 CVM 对比：https://cloud.tencent.com/document/product/1207/49819
- 微信小程序网络/服务器域名限制：https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html
