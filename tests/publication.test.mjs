import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "vite";
import {
  auditOutput,
  auditSource,
  publicationGuard,
} from "../scripts/audit-publication.mjs";

const policy =
  '<meta name="robots" content="noindex, nofollow, nosnippet, noimageindex"><meta name="referrer" content="no-referrer">';
async function fixture(t, html = policy) {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "aide-publication-test-")),
  );
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "public"));
  await writeFile(
    join(root, "index.html"),
    `<!doctype html><html><head>${html}</head><body><div>private tool</div></body></html>`,
  );
  return root;
}
async function asset(root, name, value) {
  const path = join(root, "public", name);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, value);
}
const workspace = {
  version: 1,
  tasks: [],
  attempts: [],
  favorites: [],
  templates: [],
  preferences: { name: "fixture", grade: 1 },
};
function production(root, extra = {}) {
  return build({
    root,
    configFile: false,
    logLevel: "silent",
    plugins: [publicationGuard()],
    build: { outDir: "output", ...extra },
  });
}

test("公开词库、许可和页面策略可以正常发布，公共共享 API 参数不误报", async (t) => {
  const root = await fixture(t);
  await asset(
    root,
    "dictionaries/v1/word/0.json",
    JSON.stringify({ version: 1, kind: "word", entries: [] }),
  );
  await asset(root, "licenses/library-LICENSE.txt", "MIT License");
  await asset(
    root,
    "client.js",
    'fetch("https://example.test/?id=88888888&key=88888888")',
  );
  assert.equal((await auditSource(root)).files, 3);
});
test("页面必须含真实生效的禁止收录和来源策略，注释与脚本里的声明不能顶替", async (t) => {
  for (const html of [
    "",
    `<!-- ${policy} -->`,
    `<script>const example = '${policy}'</script>`,
    `</head><body>${policy}`,
    policy.replace("noindex", "index"),
    policy.replace("no-referrer", "origin"),
  ]) {
    const root = await fixture(t, html);
    await assert.rejects(auditSource(root), /缺少/);
  }
  const root = await fixture(
    t,
    "<META content='NOINDEX,NOFOLLOW,NOSNIPPET,NOIMAGEINDEX' NAME='ROBOTS'><meta content=no-referrer name=referrer>",
  );
  await assert.doesNotReject(auditSource(root));
});
test("误放的环境文件、源码映射、数据库、备份和源码目录会阻断发布", async (t) => {
  for (const name of [
    ".env.prod",
    ".git/config",
    "client.js.map",
    "export.sql",
    "account.pem",
    "music.zip",
    "小伴-备份.json",
    "src/private.js",
    "package.json",
  ]) {
    const root = await fixture(t);
    await asset(root, name, "test-only-content");
    await assert.rejects(auditSource(root), /不允许发布/);
  }
});
test("个人备份改成普通 JSON 文件名仍会阻断，当前与旧版契约均覆盖", async (t) => {
  for (const value of [
    workspace,
    { type: "aide-profile-backup", version: 1, profileId: "one", workspace },
  ]) {
    const root = await fixture(t);
    await asset(root, "data.json", JSON.stringify(value));
    await assert.rejects(auditSource(root), /个人工作区备份/);
  }
});
test("符号链接不会绕过公开资源扫描", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "private.txt"), "test-only-content");
  await symlink(join(root, "private.txt"), join(root, "public", "link.txt"));
  await assert.rejects(auditSource(root), /符号链接/);
});
test("常见令牌及内联源码映射会阻断，错误信息不输出匹配内容", async (t) => {
  const token = `ghp_${"x".repeat(36)}`;
  const root = await fixture(t);
  await asset(root, "client.js", `const credential = '${token}'`);
  await assert.rejects(
    auditSource(root),
    (error) =>
      /私钥或访问令牌/.test(error.message) && !error.message.includes(token),
  );
  const inlineRoot = await fixture(t);
  await asset(
    inlineRoot,
    "client.js",
    "//# sourceMappingURL=data:application/json;base64,e30=",
  );
  await assert.rejects(auditSource(inlineRoot), /内联源码映射/);
});
test("Vite 真实构建保留页面声明并执行产物检查", async (t) => {
  const root = await fixture(t);
  await production(root);
  const html = await readFile(join(root, "output", "index.html"), "utf8");
  assert.match(html, /noindex/);
  assert.equal((await auditOutput(join(root, "output"))).files, 1);
});
test("构建无法开启 sourcemap，public 或其他插件生成的映射也会使构建失败", async (t) => {
  const root = await fixture(t);
  await assert.rejects(
    production(root, { sourcemap: true }),
    /禁止开启生产源码映射/,
  );
  const publicRoot = await fixture(t);
  await asset(publicRoot, "client.js.map", "{}");
  await assert.rejects(production(publicRoot), /不允许发布/);
  const generatedRoot = await fixture(t);
  await assert.rejects(
    build({
      root: generatedRoot,
      configFile: false,
      logLevel: "silent",
      plugins: [
        publicationGuard(),
        {
          name: "fixture-generated-map",
          generateBundle() {
            this.emitFile({
              type: "asset",
              fileName: "client.js.map",
              source: "{}",
            });
          },
        },
      ],
      build: { outDir: "output" },
    }),
    /不允许发布/,
  );
});
test("GitHub Pages 根域 robots 示例仅限制项目资源，HTML 入口可读取 noindex", async () => {
  const robots = await readFile(
    new URL("../deployment/github-pages/robots.txt", import.meta.url),
    "utf8",
  );
  const blocked = [...robots.matchAll(/^Disallow:\s*(\S+)$/gm)].map(
    ([, path]) => path,
  );
  assert.ok(
    blocked.some((path) =>
      "/audio/dictionaries/v1/word/0.json".startsWith(path),
    ),
  );
  assert.ok(
    blocked.some((path) => "/audio/static/js/client.js".startsWith(path)),
  );
  for (const path of [
    "/audio/",
    "/audio/index.html",
    "/audio/?tool=focus",
    "/other-site/",
  ])
    assert.equal(
      blocked.some((rule) => path.startsWith(rule)),
      false,
    );
});
