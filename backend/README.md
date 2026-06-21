# drone_v2 Go Backend

本后端是 `drone_v2` 的本地真实服务端入口：Go API + MySQL 8.0 持久化。

## Start

```bash
cd backend
docker compose up -d --build mysql api
```

如果要本地 Go 热启动：

```bash
cd backend
docker compose up -d mysql
go run ./cmd/server
```

默认连接：

```text
MYSQL_DSN=drone:drone@tcp(127.0.0.1:3308)/drone_v2?parseTime=true&charset=utf8mb4&loc=Local&multiStatements=true
PORT=8088
```

前端 H5 默认会尝试连接 `http://localhost:8088`。如果后端不可用，会退回本地演示数据，方便前端开发。

## API

- `GET /api/v1/health`
- `GET /api/v1/snapshot`
- `POST /api/v1/snapshot`
- `POST /api/v1/reset`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{id}/candidates?strategy=global`
- `POST /api/v1/orders/{id}/confirm`
- `POST /api/v1/orders/{id}/advance`
- `POST /api/v1/orders/{id}/airspace`
- `GET /api/v1/orders/{id}/telemetry`
- `POST /api/v1/orders/{id}/telemetry`
- `POST /api/v1/orders/{id}/finish`
- `POST /api/v1/orders/{id}/review`

第一版为业务集合表 + JSON 文档落库，保证服务端统一流转与 MySQL 持久化；后续生产化可继续把订单、钱包、审核等拆为范式化表。
