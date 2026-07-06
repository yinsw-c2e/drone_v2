# Production integration checklist

This project keeps local/test mock flows available, but production must not silently use them.

## Provider bridge

Frontend provider selection is controlled by:

- `VITE_PROVIDER_MODE=mock|bridge`
- `VITE_PROVIDER_BRIDGE_URL=https://api.example.com/api/v1/provider`
- `VITE_PROVIDER_BRIDGE_TOKEN=` bearer token for calling the backend bridge

Production mode requires `VITE_PROVIDER_MODE=bridge`, `VITE_PROVIDER_BRIDGE_URL`, and `VITE_PROVIDER_BRIDGE_TOKEN`. The bridge must expose:

- `POST /payment/prepay`
- `POST /airspace/apply`
- `POST /insurance/quote`
- `POST /credit/bureau-score`
- `POST /drone/arm`

Each endpoint may return either the direct response payload or `{ "ok": true, "data": ... }`. A failed upstream call must return a non-2xx HTTP status or `{ "ok": false, "error": "..." }`.

The backend now also exposes the same bridge contract under `/api/v1/provider/*`. Production deployments should point `VITE_PROVIDER_BRIDGE_URL` to the backend bridge, for example:

```bash
VITE_PROVIDER_BRIDGE_URL=https://api.example.com/api/v1/provider
VITE_PROVIDER_BRIDGE_TOKEN=<same value as PROVIDER_BRIDGE_AUTH_TOKEN>
```

Required backend bridge variables:

- `PROVIDER_BRIDGE_AUTH_TOKEN` for inbound frontend-to-backend bridge calls
- `PROVIDER_PAYMENT_PREPAY_URL`
- `PROVIDER_PAYMENT_NOTIFY_SECRET`
- `PROVIDER_AIRSPACE_APPLY_URL`
- `PROVIDER_INSURANCE_QUOTE_URL`
- `PROVIDER_CREDIT_SCORE_URL`
- `PROVIDER_DRONE_ARM_URL`
- `PROVIDER_HTTP_AUTH_HEADER` or `PROVIDER_HTTP_AUTH_TOKEN` when the supplier gateway requires auth

The backend records provider results into `payment_orders`, `airspace_requests`, `policies`, `credits`, `telemetry_snapshots`, and `audit_logs`. In production, order confirmation requires an already paid `payment_orders` record and provider insurance receipt when insurance is needed.

## Payment

Production payment is not complete when prepay succeeds. Required flow:

1. Frontend calls `/api/v1/provider/payment/prepay`.
2. Backend calls `PROVIDER_PAYMENT_PREPAY_URL`, creates a `payment_orders` row with `status=pending`, and returns platform SDK params.
3. Mini-program calls `uni.requestPayment`.
4. Payment provider calls `/api/v1/provider/payment/notify`.
5. Backend verifies `X-Provider-Signature` using `PROVIDER_PAYMENT_NOTIFY_SECRET` and marks the payment `paid`, `failed`, or `cancelled`.
6. Frontend polls `/api/v1/payments/{paymentId}/sync` until the backend row is `paid`.
7. `/api/v1/orders/{id}/confirm` only confirms the order when the payment row is `paid`.

`uni.requestPayment` success is treated as a client-side SDK result only; it is not accepted as final settlement without the signed backend callback.

Production airspace, insurance, credit, drone arm, and telemetry writes must enter through provider bridge endpoints. Local admin airspace approval and ordinary pilot/client telemetry writes are local/test tools and are rejected by the production server options.

## SMS

Local/test may use `SMS_PROVIDER=mock`. Production must set `SMS_PROVIDER=http`, `aliyun`, or `tencent` and configure a real HTTP gateway endpoint:

- `SMS_HTTP_ENDPOINT=` for generic HTTP gateway
- `ALIYUN_SMS_HTTP_ENDPOINT=` or `TENCENT_SMS_HTTP_ENDPOINT=` for provider-specific gateways
- `SMS_HTTP_AUTH_HEADER=` or `SMS_HTTP_AUTH_TOKEN=` for gateway auth
- `SMS_HTTP_TEMPLATE_ID=` / `SMS_HTTP_TEMPLATE_SIGN=` or provider-specific template variables

The backend does not expose `mockCode` for non-mock providers. HTTP gateway failures are returned to the caller and are not treated as success.

## WeChat release

Before packaging a release build, run:

```bash
pnpm preflight:release
```

Required release inputs:

- `VITE_BACKEND_URL=https://api.example.com`
- `VITE_DISABLE_BACKEND` must be unset or false
- `VITE_PROVIDER_MODE=bridge`
- `VITE_PROVIDER_BRIDGE_URL`
- `VITE_PROVIDER_BRIDGE_TOKEN`
- `PROVIDER_BRIDGE_AUTH_TOKEN`
- `PROVIDER_PAYMENT_PREPAY_URL`
- `PROVIDER_PAYMENT_NOTIFY_SECRET`
- `PROVIDER_AIRSPACE_APPLY_URL`
- `PROVIDER_INSURANCE_QUOTE_URL`
- `PROVIDER_CREDIT_SCORE_URL`
- `PROVIDER_DRONE_ARM_URL`
- `SMS_PROVIDER=http|aliyun|tencent`
- `SMS_HTTP_ENDPOINT` or provider-specific SMS HTTP endpoint
- `CORS_ALLOW_ORIGIN`
- `UNI_APP_ID`
- `MP_WEIXIN_APPID`
- `MP_WEIXIN_URL_CHECK=true`
- `MP_WEIXIN_REQUEST_DOMAINS`
- `MP_WEIXIN_BUSINESS_DOMAINS`

The domain values must match the legal request domains and business domains configured in the WeChat public platform.

Release packaging must use:

```bash
pnpm build:mp-weixin:release
```

`pnpm build:mp-weixin` remains a development build command and must not be treated as a publishable package when AppID or release env is empty.

For manual H5 acceptance while code is still changing, avoid the Vite dev server HMR path. Build and serve static H5 output instead:

```bash
pnpm exec uni build -p h5
pnpm exec vite preview --host 0.0.0.0
```

## Backend CORS

Production backend startup requires:

- `APP_ENV=production`
- `CORS_ALLOW_ORIGIN=https://h5.example.com,https://admin.example.com`

`CORS_ALLOW_ORIGIN=*` is only acceptable for local development.

## AMap key hygiene

Do not commit real map keys. Keep them in `.env.local` or CI secrets:

- `VITE_AMAP_WEB_KEY`
- `VITE_AMAP_SECURITY_CODE`
- `VITE_AMAP_WEB_SERVICE_KEY`

## External credentials still required

- Payment merchant account, app ID, private key/certificate, notify URL, and callback verification material.
- SMS provider account, signature, template, and HTTP gateway or direct vendor integration credentials.
- UOM/airspace platform credentials and approval callback contract.
- Insurance quote/bind API credentials and policy callback contract.
- Credit bureau or scoring vendor credentials and authorization contract.
- Drone/telemetry SDK credentials, device binding material, and flight/arm callback contract.
