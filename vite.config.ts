import { fileURLToPath, URL } from 'node:url';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';
import uniPluginModule from '@dcloudio/vite-plugin-uni';

type UniPluginFactory = () => PluginOption;
const uniModule = uniPluginModule as unknown as UniPluginFactory | { default: UniPluginFactory };
const uni = typeof uniModule === 'function' ? uniModule : uniModule.default;

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/tokens.scss";',
      },
    },
  },
});
