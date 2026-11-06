import { lstat, readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const textExtensions = new Set([
  ".html",
  ".js",
  ".mjs",
  ".cjs",
  ".css",
  ".json",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
  ".md",
  ".ts",
  ".tsx",
  ".jsx",
  ".vue",
]);
const privateExtensions = new Set([
  ".map",
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".sql",
  ".sqlite",
  ".sqlite3",
  ".db",
  ".dump",
  ".log",
  ".bak",
  ".backup",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".7z",
  ".rar",
]);
// 只识别高置信度格式；错误只显示文件路径和类型，绝不回显匹配的凭证。
const credentials = [
  /-----BEGIN (?:(?:RSA|EC|DSA|OPENSSH|ENCRYPTED) )?PRIVATE KEY-----/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
];
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
function personalBackup(value) {
  if (!object(value)) return false;
  if (value.type === "aide-profile-backup") return true;
  return (
    value.version === 1 &&
    ["tasks", "attempts", "favorites", "templates"].every((key) =>
      Array.isArray(value[key]),
    ) &&
    object(value.preferences)
  );
}
function metaValues(html, name) {
  // 忽略注释和脚本中的示例，避免把未生效的声明当作页面策略。
  const markup = html.replace(
    /<!--[\s\S]*?-->|<(script|style|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    "",
  );
  const head = /<head\b[^>]*>([\s\S]*?)<\/head\s*>/i.exec(markup)?.[1] ?? "";
  return [...head.matchAll(/<meta\b[^>]*>/gi)].flatMap(([tag]) => {
    const attributes = new Map(
      [
        ...tag.matchAll(
          /([^\s=<>/'"]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g,
        ),
      ].map(([, key, double, single, plain]) => [
        key.toLowerCase(),
        double ?? single ?? plain,
      ]),
    );
    return attributes.get("name")?.toLowerCase() === name
      ? [attributes.get("content") ?? ""]
      : [];
  });
}
function htmlIssues(html, label) {
  const issues = [];
  const directives = new Set(
    metaValues(html, "robots").flatMap((value) =>
      value.toLowerCase().split(/[\s,]+/),
    ),
  );
  if (
    !["noindex", "nofollow", "nosnippet", "noimageindex"].every((value) =>
      directives.has(value),
    )
  )
    issues.push(`${label}：缺少生效的禁止收录声明`);
  if (
    !metaValues(html, "referrer").some(
      (value) => value.toLowerCase() === "no-referrer",
    )
  )
    issues.push(`${label}：缺少 no-referrer 来源策略`);
  return issues;
}
function forbiddenName(name) {
  const lower = name.toLowerCase();
  return (
    (name.startsWith(".") && ![".nojekyll", ".well-known"].includes(name)) ||
    ["node_modules", "src", "tests", "scripts"].includes(lower) ||
    privateExtensions.has(extname(lower)) ||
    /(?:^|[._-])(?:backup|credentials?|secrets?)(?:[._-]|$)|备份|原始数据/i.test(
      name,
    ) ||
    /^(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|vite\.config\..+|tsconfig(?:\..+)?\.json)$/i.test(
      name,
    )
  );
}
async function scan(directory, label, issues) {
  const stat = await lstat(directory);
  if (stat.isSymbolicLink()) {
    issues.push(`${label}：发布目录不允许符号链接`);
    return 0;
  }
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name),
      display = `${label}/${entry.name}`;
    if (entry.isSymbolicLink()) {
      issues.push(`${display}：不允许发布符号链接`);
      continue;
    }
    if (forbiddenName(entry.name)) {
      issues.push(
        `${display}：不允许发布环境、源码映射、备份、源码目录或私密文件`,
      );
      continue;
    }
    if (entry.isDirectory()) {
      count += await scan(path, display, issues);
      continue;
    }
    if (!entry.isFile()) {
      issues.push(`${display}：不支持的发布文件类型`);
      continue;
    }
    count++;
    const extension = extname(entry.name).toLowerCase();
    if (!textExtensions.has(extension)) continue;
    const content = await readFile(path, "utf8");
    if (credentials.some((pattern) => pattern.test(content)))
      issues.push(`${display}：疑似含有私钥或访问令牌`);
    if (/sourceMappingURL\s*=\s*data:/i.test(content))
      issues.push(`${display}：不允许发布内联源码映射`);
    if (extension === ".html") issues.push(...htmlIssues(content, display));
    if (extension === ".json") {
      try {
        if (personalBackup(JSON.parse(content)))
          issues.push(`${display}：疑似个人工作区备份，不允许公开发布`);
      } catch (cause) {
        if (!(cause instanceof SyntaxError)) throw cause;
        issues.push(`${display}：JSON 格式不正确`);
      }
    }
  }
  return count;
}
function assertIssues(issues) {
  if (issues.length)
    throw new Error(
      `发布资源检查未通过：\n${issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
}
export async function auditSource(root, publicDir = join(root, "public")) {
  const issues = htmlIssues(
    await readFile(join(root, "index.html"), "utf8"),
    "index.html",
  );
  const files = publicDir ? await scan(publicDir, "public", issues) : 0;
  assertIssues(issues);
  return { files };
}
export async function auditOutput(directory) {
  const issues = htmlIssues(
    await readFile(join(directory, "index.html"), "utf8"),
    "output/index.html",
  );
  const files = await scan(directory, "output", issues);
  assertIssues(issues);
  return { files };
}
export function publicationGuard() {
  let config;
  return {
    name: "aide-publication-guard",
    apply: "build",
    enforce: "pre",
    configResolved(resolved) {
      config = resolved;
    },
    async buildStart() {
      if (config.build.sourcemap)
        throw new Error(
          "私用站点禁止开启生产源码映射，请保持 build.sourcemap: false。",
        );
      await auditSource(config.root, config.publicDir || false);
    },
    // public 会由 Vite 原样复制，必须连同最终产物一起检查；失败时构建退出非零。
    async writeBundle(options) {
      await auditOutput(
        options.dir || resolve(config.root, config.build.outDir),
      );
    },
  };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== "--out-dir" || !args[1]))
    throw new Error(
      "用法：node scripts/audit-publication.mjs [--out-dir 发布目录]",
    );
  const root = fileURLToPath(new URL("../", import.meta.url));
  const source = await auditSource(root);
  const output = args.length ? await auditOutput(resolve(args[1])) : undefined;
  console.log(
    `发布资源检查通过：public ${source.files} 个文件${output ? `，产物 ${output.files} 个文件` : ""}。仅检查本地文件，未发布站点。`,
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((cause) => {
    console.error(
      cause instanceof Error ? cause.message : "发布资源检查失败。",
    );
    process.exitCode = 1;
  });
}
