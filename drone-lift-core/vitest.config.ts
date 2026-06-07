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
      exclude: ['src/utils/telemetry.ts', 'src/utils/routes.ts', 'src/utils/safe-run.ts'],
      thresholds: { lines: 85, functions: 80, branches: 70 },
    },
  },
});
