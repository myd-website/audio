import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { posix } from "node:path";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";

const require = createRequire(import.meta.url);
const vue = require("vue");
function evaluate(source, resolve = require) {
  const { outputText } = ts.transpileModule(
    source.replaceAll("import.meta.env.BASE_URL", '"/audio/"'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  );
  const exports = {};
  new Function("require", "exports", outputText)(resolve, exports);
  return exports;
}
function load(path) {
  if (path.endsWith(".json"))
    return {
      default: JSON.parse(
        readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
      ),
    };
  return evaluate(
    readFileSync(new URL(`../src/${path}.ts`, import.meta.url), "utf8"),
    (id) =>
      id.startsWith(".")
        ? load(posix.normalize(`${posix.dirname(path)}/${id}`))
        : require(id),
  );
}
const api = () => load("modules/study/services/learningNotes");
const guides = load("modules/study/domain/lessonGuides");
const readings = load("modules/study/domain/openReadings");
const pack = (subject = "chinese") =>
  JSON.parse(
    readFileSync(
      new URL(`../public/courses/notes/v1/${subject}.json`, import.meta.url),
      "utf8",
    ),
  );
const book = (patch = {}) => ({
  id: "test-book",
  title: "新教材-小学语文统编版四年级上册",
  subject: "chinese",
  grade: 4,
  volume: "upper",
  edition: "统编版",
  revision: "新教材",
  ...patch,
});
const lesson = (title = "1 观潮") => ({
  id: title,
  title,
  chapterIds: [],
  type: "national_lesson",
});
function environment(t) {
  const original = globalThis.fetch;
  t.after(() => (globalThis.fetch = original));
}

test("正式资料保留 193 个小学主题、188 份研究笔记、真实来源及分层许可", () => {
  const service = api();
  let notes = 0;
  for (const [subject, count] of [
    ["chinese", 55],
    ["math", 101],
    ["english", 37],
  ]) {
    const data = service.decodeNotesPack(pack(subject), subject);
    assert.equal(data.topics.length, count);
    notes += data.topics.filter((topic) => topic.note).length;
    assert.ok(data.topics.every((topic) => topic.gradeEnd <= 6));
  }
  assert.equal(notes, 188);
  const source = readFileSync(
    new URL("../public/courses/notes/v1/SOURCE.md", import.meta.url),
    "utf8",
  );
  assert.match(source, /ODbL 1.0/);
  assert.match(source, /CC BY-SA 4.0/);
  assert.match(source, /AI 撰写/);
  assert.match(source, new RegExp(service.NOTES_COMMIT));
});

test("缺字段、重复主题、错误学科/版本及损坏教材映射拒绝作为有效笔记", () => {
  const service = api();
  for (const mutate of [
    (data) => data.topics.push(data.topics[0]),
    (data) => (data.topics[0].note = { summary: "不完整" }),
    (data) => (data.subject = "math"),
    (data) => (data.commit = "main"),
    (data) => (data.books[0].id = "其他教材"),
    (data) => (data.topics[0].gradeEnd = 9),
  ]) {
    const data = pack();
    mutate(data);
    assert.throws(() => service.decodeNotesPack(data, "chinese"));
  }
});

test("观潮与繁星仅对应统编版四年级上册，不把课号或同名其他年级强行匹配", () => {
  assert.equal(guides.findLessonGuide(book(), lesson()).title, "观潮");
  assert.equal(guides.findLessonGuide(book(), lesson("2* 繁星")).title, "繁星");
  assert.equal(guides.findLessonGuide(book({ grade: 3 }), lesson()), undefined);
  assert.equal(
    guides.findLessonGuide(book({ volume: "lower" }), lesson("繁星")),
    undefined,
  );
  assert.equal(
    guides.findLessonGuide(book({ edition: "其他版本" }), lesson()),
    undefined,
  );
  assert.equal(guides.lessonTitle("20以内退位减法"), "20以内退位减法");
  assert.equal(guides.lessonTitle("10以内加减法"), "10以内加减法");
  const result = api().relatedTopics(pack(), book(), lesson(), "第一单元");
  assert.equal(result.topics.length, 3);
  assert.match(result.label, /相关/);
  assert.ok(result.topics.some((topic) => topic.id === "mt_read-mark"));
});

test("按新旧教材、年级册次和单元区分参考资料，PEP 不套用精通版", () => {
  const service = api();
  const chinese = pack();
  const result = service.relatedTopics(
    chinese,
    book(),
    lesson("4 一个豆荚里的五粒豆"),
    "第二单元",
  );
  assert.ok(result.topics.some((topic) => topic.id === "mt_read-question"));
  assert.match(result.label, /本单元/);
  const repeated = service.relatedTopics(
    chinese,
    book(),
    lesson("语文园地"),
    "第二单元",
  );
  assert.ok(
    repeated.topics.some((topic) => topic.id === "mt_read-question"),
    "重复课名应优先匹配章节，不能误选第一单元",
  );
  assert.equal(
    service.relatedTopics(
      pack("english"),
      book({ subject: "english", title: "小学英语精通版四年级上册" }),
      lesson(),
      "Unit 1",
    ).topics.length,
    0,
  );
  const math = pack("math");
  const mathBook = book({
    subject: "math",
    edition: "人教版",
    grade: 1,
    volume: "upper",
    title: "小学数学人教版一年级上册",
  });
  const newer = service.relatedTopics(
    math,
    mathBook,
    lesson("数一数"),
    "第一单元",
  );
  const older = service.relatedTopics(
    math,
    { ...mathBook, revision: "旧教材" },
    lesson("数一数"),
    "第一单元",
  );
  assert.notDeepEqual(
    newer.topics.map((topic) => topic.id),
    older.topics.map((topic) => topic.id),
  );
  assert.equal(
    service.relatedTopics(
      math,
      { ...mathBook, grade: 6, revision: "新教材" },
      lesson(),
      "第一单元",
    ).topics.length,
    0,
  );
});

test("11 首古诗保留原作，现代课文不返回假全文；开源课件九步内容可在站内阅读", () => {
  const poems = readings.poemsForLesson(
    book({ grade: 1, volume: "lower" }),
    lesson("7 静夜思"),
    "",
    pack(),
  );
  assert.equal(poems.length, 1);
  assert.equal(poems[0].author, "李白");
  assert.match(poems[0].paragraphs.join(""), /舉頭望明月/);
  assert.deepEqual(
    readings.poemsForLesson(book(), lesson("2 繁星"), "第一单元", pack()),
    [],
  );
  assert.deepEqual(
    readings.poemsForLesson(book({ subject: "math" }), lesson("静夜思"), ""),
    [],
  );
  const slides = readings.openCourseSlides("mt_read-mark");
  assert.equal(slides.length, 9);
  assert.ok(slides.some((slide) => slide.body.includes("巷口有个修伞的老人")));
  assert.ok(slides.every((slide) => !/<br|<b>/.test(slide.body)));
  assert.equal(readings.openCourseSlides("unknown"), undefined);
});

test("本地资料请求使用站点子路径，成功缓存；取消与 HTTP/HTML/损坏资料不伪装成功", async (t) => {
  environment(t);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json(pack());
  };
  const service = api();
  const first = await service.loadNotesPack("chinese");
  assert.equal(await service.loadNotesPack("chinese"), first);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/audio/courses/notes/v1/chinese.json");
  assert.equal(calls[0].options.credentials, "omit");
  for (const response of [
    new Response("错误", { status: 500 }),
    new Response("<html>page</html>", {
      headers: { "content-type": "text/html" },
    }),
    new Response("{", { headers: { "content-type": "application/json" } }),
  ]) {
    globalThis.fetch = async () => response;
    await assert.rejects(api().loadNotesPack("chinese"));
  }
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = () => assert.fail("已取消不应发请求");
  await assert.rejects(service.loadNotesPack("chinese", controller.signal), {
    name: "AbortError",
  });
  await assert.rejects(service.loadNotesPack("toString"), /不支持/);
});

test("超大响应与在线错误版本被拒绝，不用不可信正文覆盖本地快照", async (t) => {
  environment(t);
  const service = api();
  globalThis.fetch = async () =>
    new Response("x".repeat(2000001), {
      headers: { "content-type": "application/json" },
    });
  await assert.rejects(service.loadNotesPack("chinese"), /大小上限/);
  let address;
  globalThis.fetch = async (url) => {
    address = url;
    return Response.json({ schemaVersion: 1, records: [] });
  };
  await assert.rejects(service.loadOnlineNotes(pack()), /固定版本/);
  assert.equal(address, service.NOTES_ONLINE);
  assert.ok(address.includes(service.NOTES_COMMIT));
});

test("在线正文只联结现有主题，格式错误、重复和无资料明确失败", () => {
  const service = api(),
    data = pack(),
    topic = data.topics.find((item) => item.note),
    note = topic.note;
  const record = {
    topicId: topic.id,
    pedagogy: note.explanation,
    learn: { summary: note.summary, activities: note.activities },
    assess: {
      task: note.task,
      errors: note.errors,
      levels: note.checks,
      nextMoves: note.next,
    },
  };
  const result = service.decodeOnlineNotes(
    { schemaVersion: 1, records: [record, { ...record, topicId: "unknown" }] },
    data,
  );
  assert.equal(result.size, 1);
  assert.deepEqual(result.get(topic.id), note);
  assert.throws(
    () =>
      service.decodeOnlineNotes(
        { schemaVersion: 1, records: [record, record] },
        data,
      ),
    /不完整/,
  );
  assert.throws(
    () =>
      service.decodeOnlineNotes(
        { schemaVersion: 1, records: [{ topicId: topic.id }] },
        data,
      ),
    /不完整/,
  );
  assert.throws(
    () => service.decodeOnlineNotes({ schemaVersion: 1, records: [] }, data),
    /没有/,
  );
});

function mountNotes(t, overrides = {}) {
  const service = api();
  const { descriptor } = parse(
    readFileSync(
      new URL(
        "../src/modules/study/components/CourseLearningNotes.vue",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const component = evaluate(
    compileScript(descriptor, { id: "learning-notes" }).content,
    (id) =>
      id === "../services/learningNotes"
        ? {
            ...service,
            loadNotesPack: async (subject) => pack(subject),
            ...overrides,
          }
        : id === "../domain/lessonGuides"
          ? guides
          : id === "../domain/openReadings"
            ? readings
            : id.endsWith(".vue")
              ? { default: {} }
              : require(id),
  ).default;
  const props = vue.reactive({
    book: book(),
    lesson: lesson(),
    chapter: "第一单元",
  });
  const renderer = vue.createRenderer({
    createElement: () => ({}),
    insert() {},
    remove() {},
    patchProp() {},
  });
  let model;
  const app = renderer.createApp({
    setup() {
      model = component.setup(props, { expose() {} });
      return () => vue.h("div");
    },
  });
  app.mount({});
  t.after(() => app.unmount());
  return { model, props, app };
}

test("课程详情直接显示本地笔记和提纲，翻页可用，在线失败保留正文及来源", async (t) => {
  const { model, props } = mountNotes(t, {
    loadOnlineNotes: async () => {
      throw new Error("网络不可用");
    },
  });
  await vue.nextTick();
  await vue.nextTick();
  assert.equal(model.guide.value.title, "观潮");
  assert.ok(model.note.value.summary.length);
  assert.equal(model.source.value, "local");
  assert.ok(model.slides.value.length >= 4);
  const before = model.note.value.summary;
  await model.fetchOnline();
  assert.equal(model.note.value.summary, before);
  assert.equal(model.source.value, "local");
  assert.match(model.onlineError.value, /保留|继续显示本地/);
  model.slideIndex.value = 3;
  props.lesson = lesson("2 繁星");
  await vue.nextTick();
  assert.equal(model.guide.value.title, "繁星");
  assert.equal(model.slideIndex.value, 0);
});

test("在线成功仅改变实际返回笔记的来源；切换学科或卸载后迟到结果不能覆盖", async (t) => {
  let finish, signal;
  const { model, props, app } = mountNotes(t, {
    loadOnlineNotes: async (_, nextSignal) => {
      signal = nextSignal;
      return new Promise((resolve) => (finish = resolve));
    },
  });
  await vue.nextTick();
  await vue.nextTick();
  const fetching = model.fetchOnline();
  const id = model.selectedId.value,
    note = { ...model.note.value, summary: "在线返回的测试笔记" };
  finish(new Map([[id, note]]));
  await fetching;
  assert.equal(model.source.value, "online");
  assert.equal(model.note.value.summary, note.summary);
  model.selectedId.value = model.pack.value.topics.find(
    (topic) => topic.id !== id,
  ).id;
  assert.equal(model.source.value, "local");
  // 清除成功状态，模拟下一次独立读取在用户切换学科前仍未完成。
  model.online.value = new Map();
  const pending = model.fetchOnline();
  props.book = book({ subject: "math", edition: "人教版" });
  await vue.nextTick();
  await vue.nextTick();
  assert.equal(signal.aborted, true);
  finish(new Map([[id, note]]));
  await pending;
  assert.equal(model.pack.value.subject, "math");
  assert.equal(model.online.value.size, 0);
  const last = model.fetchOnline();
  app.unmount();
  assert.equal(signal.aborted, true);
  finish(new Map([[id, note]]));
  await last;
  assert.equal(model.online.value.size, 0);
});
