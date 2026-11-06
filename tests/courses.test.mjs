import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";
import {
  SOURCE,
  normalizeBooks,
  normalizeDetails,
  safeSourceUrl,
  syncCatalog,
} from "../scripts/sync-smartedu-courses.mjs";

const require = createRequire(import.meta.url),
  vue = require("vue");
function evaluate(source, resolve) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)(resolve, exports);
  return exports;
}
function load(path, overrides = {}) {
  const source = readFileSync(
    new URL(`../src/${path}.ts`, import.meta.url),
    "utf8",
  ).replaceAll("import.meta.env.BASE_URL", '"/audio/"');
  return evaluate(
    source,
    (id) =>
      overrides[id] ??
      (id.startsWith("@/")
        ? load(id.slice(2), overrides)
        : id.startsWith(".")
          ? load(posix.normalize(`${posix.dirname(path)}/${id}`), overrides)
          : require(id)),
  );
}
const service = () => load("modules/study/services/courses");
// 以下标识和内容均为隔离测试样例，不会导入正式课程目录。
const bookId = "11111111-1111-1111-1111-111111111111";
const chapterId = "22222222-2222-2222-2222-222222222222";
const childId = "33333333-3333-3333-3333-333333333333";
const lessonId = "44444444-4444-4444-4444-444444444444";
function rawBook(patch = {}) {
  return {
    id: bookId,
    title: "小学数学人教版一年级上册",
    status: "ONLINE",
    tag_list: [
      { tag_dimension_id: "zxxxd", tag_id: "primary", tag_name: "小学" },
      { tag_dimension_id: "zxxnj", tag_id: "grade1", tag_name: "一年级" },
      { tag_dimension_id: "zxxxk", tag_id: "math", tag_name: "数学" },
      { tag_dimension_id: "zxxbb", tag_id: "pep", tag_name: "人教版" },
      { tag_dimension_id: "zxxcc", tag_id: "upper", tag_name: "上册" },
      { tag_dimension_id: "zxxxjjc", tag_id: "new", tag_name: "新教材" },
    ],
    ...patch,
  };
}
const tree = [
  {
    id: chapterId,
    title: "第一单元",
    child_nodes: [{ id: childId, title: "认识数字", child_nodes: null }],
  },
];
const resource = {
  id: lessonId,
  title: "认识数字",
  status: "ONLINE",
  resource_type_code: "national_lesson",
  chapter_ids: [childId],
};
const book = () => ({
  ...normalizeBooks([[rawBook()]])[0],
  file: `${bookId}-1234567890abcdef.json`,
  lessonCount: 1,
  chapterCount: 2,
});
const detail = () => normalizeDetails(book(), tree, [[resource]]);
const catalog = () => ({
  version: 1,
  syncedAt: "2026-11-05T01:00:00Z",
  sourceVersion: "fixture",
  books: [book()],
});

test("按官方标签匹配人教版、年级、上下册及新旧教材，排除其他版本和下线记录", () => {
  const foreign = rawBook({
    id: childId,
    tag_list: rawBook().tag_list.map((tag) =>
      tag.tag_dimension_id === "zxxbb" ? { ...tag, tag_name: "北师大版" } : tag,
    ),
  });
  const result = normalizeBooks([
    [rawBook(), foreign, rawBook({ id: chapterId, status: "OFFLINE" })],
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].subject, "math");
  assert.equal(result[0].grade, 1);
  assert.equal(result[0].volume, "upper");
  assert.equal(result[0].revision, "新教材");
  assert.throws(
    () => normalizeBooks([[rawBook({ id: "../../other" })]]),
    /标识/,
  );
});
test("章节保留父子关系，合并重复课程关联，隐藏节点与未知类型不生成跳转", () => {
  const hidden = {
    id: lessonId,
    title: "不公开的章节",
    custom_properties: { hidden: true },
  };
  const result = normalizeDetails(
    book(),
    [...tree, hidden],
    [
      [
        resource,
        { ...resource, chapter_ids: [chapterId] },
        { ...resource, id: childId, resource_type_code: "unknown" },
      ],
    ],
  );
  assert.equal(result.chapters.length, 2);
  assert.equal(result.lessons.length, 1);
  assert.deepEqual(
    new Set(result.lessons[0].chapterIds),
    new Set([childId, chapterId]),
  );
  assert.throws(() => normalizeDetails(book(), [...tree, tree[0]], []), /重复/);
});
test("只允许官方 HTTPS 元数据地址，拒绝媒体、任意主机和跨教材的分片", async (t) => {
  assert.equal(safeSourceUrl(SOURCE), SOURCE);
  for (const value of [
    SOURCE.replace("https:", "http:"),
    SOURCE.replace("s-file-1.ykt.cbern.com.cn", "example.com"),
    SOURCE + "?token=private",
    "https://s-file-1.ykt.cbern.com.cn/video.mp4",
    "https://user:password@s-file-1.ykt.cbern.com.cn/zxx/ndrs/national_lesson/teachingmaterials/part_100.json",
  ])
    assert.throws(() => safeSourceUrl(value));
  const outputDir = await mkdtemp(join(tmpdir(), "aide-course-sync-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  await writeFile(join(outputDir, "index.json"), "existing catalog");
  const partUrl = SOURCE.replace("version/data_version", "part_100");
  const get = async (url) =>
    url === SOURCE
      ? { module: "national_lesson", module_version: 1, urls: [partUrl] }
      : url === partUrl
        ? [rawBook()]
        : url.includes("/trees/")
          ? tree
          : [
              SOURCE.replace(
                "version/data_version",
                `${childId}/resources/part_100`,
              ),
            ];
  await assert.rejects(syncCatalog({ outputDir, get }), /不匹配/);
  assert.equal(
    await readFile(join(outputDir, "index.json"), "utf8"),
    "existing catalog",
  );
  assert.deepEqual(await readdir(outputDir), ["index.json"]);
});
test("同步产物与前端校验契约一致，完整成功后才切换目录", async (t) => {
  const outputDir = await mkdtemp(join(tmpdir(), "aide-course-contract-"));
  t.after(() => rm(outputDir, { recursive: true, force: true }));
  const partUrl = SOURCE.replace("version/data_version", "part_100");
  const get = async (url) =>
    url === SOURCE
      ? { module: "national_lesson", module_version: 1, urls: [partUrl] }
      : url === partUrl
        ? [rawBook()]
        : url.includes("/trees/")
          ? tree
          : url.endsWith("/parts.json")
            ? [
                SOURCE.replace(
                  "version/data_version",
                  `${bookId}/resources/part_100`,
                ),
              ]
            : [resource];
  await syncCatalog({ outputDir, get });
  const api = service();
  const result = api.decodeCatalog(
    JSON.parse(await readFile(join(outputDir, "index.json"), "utf8")),
  );
  const content = JSON.parse(
    await readFile(join(outputDir, result.books[0].file), "utf8"),
  );
  assert.equal(
    api.decodeDetails(content, result.books[0]).lessons[0].id,
    lessonId,
  );
});
test("正式快照覆盖语数英全部 1～6 年级上下册，每份课程关联合法且不含媒体或账号数据", async () => {
  const api = service();
  const root = new URL("../public/courses/smartedu/v1/", import.meta.url);
  const data = api.decodeCatalog(
    JSON.parse(await readFile(new URL("index.json", root), "utf8")),
  );
  for (const subject of ["chinese", "math", "english"])
    for (let grade = 1; grade <= 6; grade++)
      for (const volume of ["upper", "lower"])
        assert.ok(
          api.selectBooks(data, subject, grade, volume).length,
          `${subject}/${grade}/${volume}`,
        );
  for (const book of data.books) {
    const raw = await readFile(new URL(book.file, root), "utf8");
    const details = api.decodeDetails(JSON.parse(raw), book);
    assert.doesNotMatch(
      raw,
      /access_token|creator|admins|\.mp4|\.pdf|thumbnails/,
    );
    for (const lesson of details.lessons)
      assert.equal(
        new URL(api.lessonUrl(lesson)).hostname,
        "basic.smartedu.cn",
      );
  }
});
test("单元筛选包括子章节，教材切换不混用英语版本，搜索忽略英文大小写", () => {
  const api = service();
  assert.equal(api.filterLessons(detail(), chapterId, "").length, 1);
  assert.equal(api.filterLessons(detail(), lessonId, "").length, 0);
  assert.equal(api.filterLessons(detail(), "", "不存在").length, 0);
  const content = detail();
  content.lessons[0].title = "Hello, English";
  assert.equal(api.filterLessons(content, "", "HELLO").length, 1);
  assert.equal(api.selectBooks(catalog(), "english", 1, "upper").length, 0);
  assert.equal(api.selectBooks(catalog(), "math", 1, "lower").length, 0);
  assert.throws(
    () => api.decodeDetails({ ...detail(), bookId: childId }, book()),
    /不匹配/,
  );
});
test("课程跳转固定到官方域名，学习计划保留来源且阻止当天重复添加", () => {
  const api = service(),
    lesson = detail().lessons[0];
  const url = new URL(api.lessonUrl(lesson));
  assert.equal(url.pathname, "/syncClassroom/classActivity");
  assert.equal(url.searchParams.get("activityId"), lessonId);
  assert.throws(
    () => api.lessonUrl({ ...lesson, id: "https://evil.example" }),
    /标识/,
  );
  assert.throws(() => api.lessonUrl({ ...lesson, type: "unknown" }), /支持/);
  const task = api.coursePlan(book(), lesson, []);
  assert.equal(task.completed, false);
  assert.ok(task.note.includes(url.href));
  assert.throws(() => api.coursePlan(book(), lesson, [task]), /已经安排/);
});
test("课程加载使用站点子路径，HTTP/HTML/损坏目录明确失败，取消请求不伪装成功", async (t) => {
  const oldFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = oldFetch;
  });
  let requested;
  globalThis.fetch = async (url) => {
    requested = url;
    return new Response(JSON.stringify(catalog()), {
      headers: { "Content-Type": "application/json" },
    });
  };
  await service().loadCourseCatalog();
  assert.equal(requested, "/audio/courses/smartedu/v1/index.json");
  globalThis.fetch = async () => new Response("not found", { status: 404 });
  await assert.rejects(service().loadCourseCatalog(), /404/);
  globalThis.fetch = async () =>
    new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
  await assert.rejects(service().loadCourseCatalog(), /未正确发布/);
  globalThis.fetch = async () =>
    new Response("{}", { headers: { "Content-Type": "application/json" } });
  await assert.rejects(service().loadCourseCatalog(), /目录格式/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(service().loadCourseCatalog(controller.signal), {
    name: "AbortError",
  });
});
test("课程页切换教材取消旧请求，迟到响应和离开后的响应不覆盖当前状态", async (t) => {
  const api = service(),
    route = vue.reactive({
      query: { subject: "math", grade: "1", volume: "upper" },
    });
  const second = {
    ...book(),
    id: childId,
    file: `${childId}-1234567890abcdef.json`,
  };
  const pending = new Map();
  const { descriptor } = parse(
    readFileSync(
      new URL("../src/modules/study/pages/CoursesPage.vue", import.meta.url),
      "utf8",
    ),
  );
  const component = evaluate(
    compileScript(descriptor, { id: "courses-test" }).content,
    (id) =>
      ({
        "vue-router": {
          useRoute: () => route,
          useRouter: () => ({ replace: async () => {} }),
        },
        vant: { showToast() {} },
        "@/shared/stores/workspace": {
          useWorkspaceStore: () => ({
            data: { preferences: { grade: 1 } },
            ready: true,
          }),
        },
        "@/shared/lib/feedback": {
          act: () => true,
          message: (cause) => cause.message,
        },
        "../services/courses": {
          ...api,
          loadCourseCatalog: async () => ({
            ...catalog(),
            books: [book(), second],
          }),
          loadCourseDetails: (book, signal) =>
            new Promise((resolve) => pending.set(book.id, { resolve, signal })),
        },
      })[id] ?? (id.endsWith(".vue") ? { default: {} } : require(id)),
  ).default;
  let model;
  const renderer = vue.createRenderer({
    createElement: () => ({}),
    createText: () => ({}),
    createComment: () => ({}),
    insert() {},
    remove() {},
    setElementText() {},
    setText() {},
    parentNode: () => null,
    nextSibling: () => null,
    patchProp() {},
  });
  const app = renderer.createApp({
    setup() {
      model = component.setup({}, { expose() {} });
      return () => vue.h("div");
    },
  });
  app.mount({});
  t.after(() => app.unmount());
  await vue.nextTick();
  await vue.nextTick();
  const first = pending.get(bookId);
  assert.ok(first);
  model.selectedLesson.value = detail().lessons[0];
  route.query.book = childId;
  await vue.nextTick();
  assert.equal(first.signal.aborted, true);
  assert.equal(model.selectedLesson.value, undefined);
  pending.get(childId).resolve({ ...detail(), bookId: childId });
  await vue.nextTick();
  first.resolve(detail());
  await vue.nextTick();
  assert.equal(model.details.value.bookId, childId);
  model.selectedLesson.value = detail().lessons[0];
  model.loadDetails();
  assert.equal(model.selectedLesson.value, undefined);
  const last = pending.get(childId);
  app.unmount();
  assert.equal(last.signal.aborted, true);
  last.resolve({ ...detail(), bookId: childId });
  await vue.nextTick();
  assert.equal(model.details.value, undefined);
});
