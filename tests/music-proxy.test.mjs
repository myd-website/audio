import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createServer, loadConfigFromFile } from "vite";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function close(server) {
  server.closeAllConnections();
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("音乐开发代理补充来源页，并保留搜索、下载和解析请求的路径参数", async (t) => {
  const sourceSite = "https://www.qqmp3.vip/";
  const received = [];
  const upstream = createHttpServer((request, response) => {
    const allowed = request.headers.referer === sourceSite;
    received.push({ url: request.url, referer: request.headers.referer });
    response.writeHead(allowed ? 200 : 403, {
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ code: allowed ? 200 : 403 }));
  });
  t.after(() => close(upstream));
  const upstreamUrl = await listen(upstream);
  const denied = await fetch(`${upstreamUrl}/api/songs.php?type=search`);
  assert.equal(denied.status, 403);

  const root = fileURLToPath(new URL("../", import.meta.url));
  const loaded = await loadConfigFromFile(
    { command: "serve", mode: "development" },
    fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
    root,
  );
  const proxy = loaded.config.server.proxy["/music-api"];
  // 使用真实代理配置，仅把外部服务替换成隔离的本机上游。
  const vite = await createServer({
    root,
    configFile: false,
    logLevel: "silent",
    server: {
      middlewareMode: true,
      hmr: false,
      proxy: { "/music-api": { ...proxy, target: upstreamUrl } },
    },
  });
  t.after(() => vite.close());
  const gateway = createHttpServer(vite.middlewares);
  t.after(() => close(gateway));
  const gatewayUrl = await listen(gateway);

  const endpoints = [
    `songs.php?type=search&keyword=${encodeURIComponent("天使的翅膀")}`,
    "songs.php?type=download&rid=3007",
    "kw.php?rid=3007&type=json&level=exhigh&lrc=true",
  ];
  for (const endpoint of endpoints) {
    const response = await fetch(`${gatewayUrl}/music-api/${endpoint}`, {
      // 本机浏览器的来源地址也必须被固定的上游来源页覆盖。
      headers: { Referer: `${gatewayUrl}/` },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { code: 200 });
    assert.deepEqual(received.at(-1), {
      url: `/api/${endpoint}`,
      referer: sourceSite,
    });
  }
});
