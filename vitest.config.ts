import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**', 'src/models/**'],
      exclude: ['src/utils/telemetry.ts'],
      thresholds: { lines: 85, functions: 80, branches: 70 },
    },
  },
});
