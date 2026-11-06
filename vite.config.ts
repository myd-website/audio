import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "unplugin-vue-components/resolvers";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { publicationGuard } from "./scripts/audit-publication.mjs";

export default defineConfig({
  base: "./",
  server: {
    open: true,
    host: "127.0.0.1",
    port: 8090,
    proxy: {
      "/music-api": {
        target: "https://www.qqmp3.vip",
        changeOrigin: true,
        // 上游搜索接口校验来源页；浏览器的 no-referrer 策略下由服务端代理补充。
        headers: { Referer: "https://www.qqmp3.vip/" },
        rewrite: (path) => path.replace(/^\/music-api/, "/api"),
        timeout: 15000,
        proxyTimeout: 15000,
      },
    },
  },
  plugins: [
    publicationGuard(),
    vue(),
    vueJsx(),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    outDir: "docs",
    sourcemap: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        entryFileNames: "static/js/[name]-[hash].js",
        assetFileNames: "static/[ext]/[name]-[hash].[ext]",
      },
    },
  },
});
