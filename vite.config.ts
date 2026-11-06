import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import Components from 'unplugin-vue-components/vite';
import { VantResolver } from 'unplugin-vue-components/resolvers';
import vueJsx from '@vitejs/plugin-vue-jsx';

export default defineConfig({
  base: './',
  server: {
    open: true,
    host: true,
    port: 8090,
    proxy: {
      '/api': {
        target: 'https://www.qqmp3.vip/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          Referer: 'https://www.qqmp3.vip/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      },
    },
  },
  plugins: [
    vue(),
    vueJsx(),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'docs',
    sourcemap: false,
    emptyOutDir: true,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output:{
        chunkFileNames: 'static/js/[name].js',
        entryFileNames: 'static/js/[name].js',
        assetFileNames: 'static/[ext]/[name].[ext]',
    }
    },
  },
});
