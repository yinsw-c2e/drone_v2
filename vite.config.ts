import { fileURLToPath, URL } from 'node:url';
import type { PluginOption } from 'vite';
import { defineConfig } from 'vite';
import uniPluginModule from '@dcloudio/vite-plugin-uni';

type UniPluginFactory = () => PluginOption;
const uniModule = uniPluginModule as unknown as UniPluginFactory | { default: UniPluginFactory };
const uni = typeof uniModule === 'function' ? uniModule : uniModule.default;

export default defineConfig({
  plugins: [localAmapProxy(), uni()],
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

function localAmapProxy(): PluginOption {
  return {
    name: 'local-amap-regeocode-proxy',
    configureServer(server) {
      server.middlewares.use('/__amap/regeocode', async (req, res) => {
        const key = process.env.AMAP_API_KEY
          || process.env.VITE_AMAP_WEB_SERVICE_KEY
          || process.env.VITE_AMAP_API_KEY
          || process.env.VITE_AMAP_WEB_KEY;
        if (!key) {
          res.statusCode = 503;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'AMAP_NOT_CONFIGURED' }));
          return;
        }
        const incoming = new URL(req.url ?? '', 'http://localhost');
        const lng = incoming.searchParams.get('lng');
        const lat = incoming.searchParams.get('lat');
        if (!lng || !lat) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'INVALID_LOCATION' }));
          return;
        }
        const upstream = new URL('https://restapi.amap.com/v3/geocode/regeo');
        upstream.searchParams.set('key', key);
        upstream.searchParams.set('location', `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`);
        upstream.searchParams.set('output', 'JSON');
        upstream.searchParams.set('extensions', incoming.searchParams.get('extensions') || 'all');
        upstream.searchParams.set('radius', incoming.searchParams.get('radius') || '1000');
        upstream.searchParams.set('roadlevel', incoming.searchParams.get('roadlevel') || '0');
        upstream.searchParams.set('homeorcorp', incoming.searchParams.get('homeorcorp') || '0');
        try {
          const response = await fetch(upstream);
          const body = await response.text();
          res.statusCode = response.status;
          res.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8');
          res.end(body);
        } catch {
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'AMAP_REQUEST_FAILED' }));
        }
      });

      server.middlewares.use('/__amap/place-around', async (req, res) => {
        const key = process.env.AMAP_API_KEY
          || process.env.VITE_AMAP_WEB_SERVICE_KEY
          || process.env.VITE_AMAP_API_KEY
          || process.env.VITE_AMAP_WEB_KEY;
        if (!key) {
          res.statusCode = 503;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'AMAP_NOT_CONFIGURED' }));
          return;
        }
        const incoming = new URL(req.url ?? '', 'http://localhost');
        const lng = incoming.searchParams.get('lng');
        const lat = incoming.searchParams.get('lat');
        if (!lng || !lat) {
          res.statusCode = 400;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'INVALID_LOCATION' }));
          return;
        }
        const upstream = new URL('https://restapi.amap.com/v5/place/around');
        upstream.searchParams.set('key', key);
        upstream.searchParams.set('location', `${Number(lng).toFixed(6)},${Number(lat).toFixed(6)}`);
        upstream.searchParams.set('output', 'json');
        upstream.searchParams.set('radius', incoming.searchParams.get('radius') || '600');
        upstream.searchParams.set('sortrule', 'distance');
        upstream.searchParams.set('page_size', '6');
        upstream.searchParams.set('page_num', '1');
        upstream.searchParams.set('show_fields', 'indoor,navi');
        try {
          const response = await fetch(upstream);
          const body = await response.text();
          res.statusCode = response.status;
          res.setHeader('content-type', response.headers.get('content-type') || 'application/json; charset=utf-8');
          res.end(body);
        } catch {
          res.statusCode = 502;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ status: '0', info: 'AMAP_REQUEST_FAILED' }));
        }
      });
    },
  };
}
