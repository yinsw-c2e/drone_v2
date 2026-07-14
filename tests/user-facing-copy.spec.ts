import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const vueSurfaces = [
  'src/pages/login/index.vue',
  'src/components/AdminConsolePanels.vue',
  'src/components/LiveRouteMap.vue',
  'src/pages/auth/index.vue',
  'src/pages-client/order/index.vue',
  'src/pages-owner/wallet/index.vue',
  'src/pages-owner/dispatch/index.vue',
  'src/pages-pilot/wallet/index.vue',
  'src/pages-pilot/task/index.vue',
  'src/pages-client/insurance/index.vue',
  'src/pages-admin/dashboard/index.vue',
];

const forbiddenTemplateTerms = [
  /\btoken\b/i,
  /provider bridge/i,
  /支付SDK/i,
  /生产后端/,
  /本地演示库/,
  /账号体系/,
  /真实地图/,
  /数据快照/,
];

it('keeps implementation jargon out of user-facing templates', () => {
  for (const file of vueSurfaces) {
    const source = readFileSync(file, 'utf8');
    const template = source.match(/<template>([\s\S]*?)<\/template>/)?.[1] ?? '';
    for (const pattern of forbiddenTemplateTerms) {
      expect(template, `${file} contains ${pattern}`).not.toMatch(pattern);
    }
  }
});

it('uses action-oriented copy for common user-visible failures', () => {
  const sources = [
    'src/services/payment.ts',
    'src/api/backend.ts',
    'src/api/providers/bridge.ts',
    'src/pages-owner/wallet/index.vue',
    'src/pages-owner/dispatch/index.vue',
    'src/pages-pilot/wallet/index.vue',
    'src/pages-pilot/task/index.vue',
    'src/pages-client/insurance/index.vue',
    'src/pages-admin/dashboard/index.vue',
    'src/utils/repo.ts',
  ].map((file) => readFileSync(file, 'utf8')).join('\n');

  for (const pattern of [/支付SDK/, /provider bridge/i, /生产后端/, /尚未接入/, /生产环境禁止本地/]) {
    expect(sources).not.toMatch(pattern);
  }
});

it('keeps the new client home honest when there is no active order', () => {
  const source = readFileSync('src/pages-client/home/index.vue', 'utf8');

  expect(source).toContain('<view v-if="activeOrder" class="scan-card">');
  expect(source).toContain('<view v-else class="scan-card empty-order-card">');
  expect(source).toContain('暂无进行中的运输任务');
  expect(source).toContain('推荐线路模板与参考预算');
  expect(source).not.toContain('前海深港物流枢纽 A区');
  expect(source).not.toContain('宝安国际机场 货运C站');
});
