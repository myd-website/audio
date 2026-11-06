import { createHash, randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// 这些是官网页面使用的公开目录文件，不是有接入承诺的开放平台 API。
// 仅同步标题、分类、章节及资源标识；不获取正文、视频、课件或登录凭证。
export const SOURCE =
  "https://s-file-1.ykt.cbern.com.cn/zxx/ndrs/national_lesson/teachingmaterials/version/data_version.json";
const BASE = "https://s-file-1.ykt.cbern.com.cn/zxx";
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const subjects = { 语文: "chinese", 数学: "math", 英语: "english" };
const grades = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"];
const resourceTypes = new Set([
  "national_lesson",
  "elite_lesson",
  "teaching_lesson",
]);
const id = (value) => typeof value === "string" && uuid.test(value);
function text(value, limit = 300) {
  if (typeof value !== "string" || !value.trim() || value.length > limit)
    throw new Error("官方目录的文本字段缺失或超出长度限制。");
  return value.trim();
}
export function safeSourceUrl(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !["s-file-1.ykt.cbern.com.cn", "s-file-2.ykt.cbern.com.cn"].includes(
      url.hostname,
    ) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !/^\/zxx\/(?:ndrs\/national_lesson\/teachingmaterials\/(?:version\/data_version|part_\d+|[0-9a-f-]{36}\/resources\/(?:parts|part_\d+))|ndrv2\/national_lesson\/trees\/[0-9a-f-]{36})\.json$/i.test(
      url.pathname,
    )
  )
    throw new Error("拒绝请求非官方课程目录地址。");
  return url.href;
}
export async function fetchSource(value) {
  const url = safeSourceUrl(value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "error",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok)
      throw new Error(`官方课程目录响应异常（${response.status}）。`);
    if (!response.headers.get("content-type")?.includes("json"))
      throw new Error("官方课程目录未返回 JSON。");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("官方课程目录响应为空。");
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        size += chunk.byteLength;
        if (size > 8_000_000)
          throw new Error("单份课程目录超过 8MB，已停止同步。");
        chunks.push(chunk);
      }
    } finally {
      await reader.cancel();
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } finally {
    clearTimeout(timer);
  }
}
export function normalizeBooks(partitions) {
  const result = new Map();
  for (const partition of partitions) {
    if (!Array.isArray(partition) || partition.length > 10000)
      throw new Error("官方教材目录结构发生变化。");
    for (const row of partition) {
      if (!row || !Array.isArray(row.tag_list))
        throw new Error("官方教材分类缺失。");
      const tags = new Map(
        row.tag_list.filter(Boolean).map((tag) => [tag.tag_dimension_id, tag]),
      );
      const name = (dimension) => tags.get(dimension)?.tag_name;
      const subject = subjects[name("zxxxk")];
      const grade = grades.indexOf(name("zxxnj")) + 1;
      const edition = name("zxxbb");
      if (
        row.status !== "ONLINE" ||
        name("zxxxd") !== "小学" ||
        !subject ||
        !grade
      )
        continue;
      if (
        (subject === "chinese" && edition !== "统编版") ||
        (subject !== "chinese" && !edition?.startsWith("人教版"))
      )
        continue;
      const volume = { 上册: "upper", 下册: "lower" }[name("zxxcc")];
      if (!volume || !id(row.id))
        throw new Error("官方教材的册次或标识不完整。");
      const revision = name("zxxxjjc") || "未标注新旧";
      const tagPath = ["zxxxd", "zxxnj", "zxxxk", "zxxbb", "zxxcc", "zxxxjjc"]
        .map((dimension) => tags.get(dimension)?.tag_id)
        .filter(Boolean);
      if (
        tagPath.length < 5 ||
        !tagPath.every(
          (tag) => typeof tag === "string" && /^[\w-]{1,100}$/.test(tag),
        )
      )
        throw new Error("官方目录分类标识无效。");
      const book = {
        id: row.id,
        title: text(row.title),
        subject,
        grade,
        volume,
        edition: text(edition, 100),
        revision: text(revision, 40),
        tagPath,
      };
      if (
        result.has(book.id) &&
        JSON.stringify(result.get(book.id)) !== JSON.stringify(book)
      )
        throw new Error("官方目录包含冲突的教材标识。");
      result.set(book.id, book);
    }
  }
  if (!result.size || result.size > 200)
    throw new Error("匹配的教材数量异常，未更新现有目录。");
  return [...result.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export function normalizeDetails(book, rawChapters, resourceParts) {
  const chapters = [],
    chapterIds = new Set();
  function walk(nodes, parentId = "", depth = 0) {
    if (!Array.isArray(nodes) || depth > 12)
      throw new Error("官方章节树结构异常。");
    for (const node of nodes) {
      if (node.custom_properties?.hidden === true) continue;
      if (!id(node.id) || chapterIds.has(node.id) || chapters.length >= 2000)
        throw new Error("官方章节标识重复或无效。");
      chapterIds.add(node.id);
      chapters.push({ id: node.id, title: text(node.title), parentId });
      if (node.child_nodes != null) walk(node.child_nodes, node.id, depth + 1);
    }
  }
  walk(rawChapters);
  const lessons = new Map();
  for (const part of resourceParts) {
    if (!Array.isArray(part) || part.length > 10000)
      throw new Error("官方课程条目结构异常。");
    for (const row of part) {
      if (row.status !== "ONLINE" || !resourceTypes.has(row.resource_type_code))
        continue;
      if (!id(row.id) || !Array.isArray(row.chapter_ids))
        throw new Error("官方课程标识或章节缺失。");
      // 未识别的资源类型不生成猜测链接；无章节的课程仍在“全部单元”中可见。
      const lesson = {
        id: row.id,
        title: text(row.title),
        type: row.resource_type_code,
        chapterIds: [
          ...new Set(
            row.chapter_ids.filter((chapter) => chapterIds.has(chapter)),
          ),
        ],
      };
      const previous = lessons.get(lesson.id);
      if (previous) {
        if (previous.title !== lesson.title || previous.type !== lesson.type)
          throw new Error("官方课程条目存在标识冲突。");
        previous.chapterIds = [
          ...new Set([...previous.chapterIds, ...lesson.chapterIds]),
        ];
      } else lessons.set(lesson.id, lesson);
    }
  }
  return {
    version: 1,
    bookId: book.id,
    chapters,
    lessons: [...lessons.values()],
  };
}
async function atomicWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, value, { flag: "wx" });
  await rename(temporary, path);
}
export async function syncCatalog({
  outputDir,
  get = fetchSource,
  progress = () => {},
}) {
  const manifest = await get(SOURCE);
  if (
    manifest?.module !== "national_lesson" ||
    !["string", "number"].includes(typeof manifest.module_version) ||
    !Array.isArray(manifest.urls) ||
    !manifest.urls.length ||
    manifest.urls.length > 16
  )
    throw new Error("官方课程版本清单结构异常。");
  const partitions = [];
  for (const url of manifest.urls) {
    safeSourceUrl(url);
    partitions.push(await get(url));
  }
  const books = normalizeBooks(partitions),
    files = [];
  for (const [index, book] of books.entries()) {
    const tree = await get(
      `${BASE}/ndrv2/national_lesson/trees/${book.id}.json`,
    );
    const parts = await get(
      `${BASE}/ndrs/national_lesson/teachingmaterials/${book.id}/resources/parts.json`,
    );
    if (!Array.isArray(parts) || parts.length > 16)
      throw new Error("官方课程分片清单异常。");
    const resources = [];
    for (const part of parts) {
      const url = safeSourceUrl(part);
      if (
        !new URL(url).pathname.startsWith(
          `/zxx/ndrs/national_lesson/teachingmaterials/${book.id}/resources/`,
        )
      )
        throw new Error("课程分片与当前教材不匹配。");
      resources.push(await get(url));
    }
    const details = normalizeDetails(book, tree, resources);
    const content = JSON.stringify(details, null, 2) + "\n";
    const hash = createHash("sha256")
      .update(content)
      .digest("hex")
      .slice(0, 16);
    book.file = `${book.id}-${hash}.json`;
    book.lessonCount = details.lessons.length;
    book.chapterCount = details.chapters.length;
    files.push({ name: book.file, content });
    progress({
      completed: index + 1,
      total: books.length,
      title: book.title,
      lessons: book.lessonCount,
    });
  }
  // 全部远端数据成功且通过校验后才发布。带内容哈希的分片不会覆盖旧目录引用。
  const catalog = {
    version: 1,
    source: SOURCE,
    syncedAt: new Date().toISOString(),
    sourceVersion: String(manifest.module_version),
    books,
  };
  for (const file of files)
    await atomicWrite(join(outputDir, file.name), file.content);
  await atomicWrite(
    join(outputDir, "index.json"),
    JSON.stringify(catalog, null, 2) + "\n",
  );
  return catalog;
}
if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const outputDir = fileURLToPath(
    new URL("../public/courses/smartedu/v1/", import.meta.url),
  );
  syncCatalog({
    outputDir,
    progress: ({ completed, total, lessons }) =>
      console.log(`课程目录 ${completed}/${total} · ${lessons} 节`),
  })
    .then((catalog) =>
      console.log(`已更新 ${catalog.books.length} 个册次的官方课程目录。`),
    )
    .catch((cause) => {
      console.error(cause instanceof Error ? cause.message : "课程同步失败。");
      process.exitCode = 1;
    });
}
