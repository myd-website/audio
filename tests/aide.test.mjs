import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { posix } from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { code: invitationCode } = require("../src/config/invitation.json");
const { createPinia, setActivePinia } = require("pinia");
const cache = new Map();
function load(path, overrides = {}) {
  const shared = Object.keys(overrides).length === 0;
  if (shared && cache.has(path)) return cache.get(path);
  if (path.endsWith(".json"))
    return {
      default: JSON.parse(
        readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
      ),
    };
  const source = readFileSync(
    new URL(`../src/${path}.ts`, import.meta.url),
    "utf8",
  ).replaceAll("import.meta.env.DEV", "false");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)(
    (id) =>
      overrides[id] ??
      (id.startsWith("@/")
        ? load(id.slice(2))
        : id.startsWith(".")
          ? load(posix.normalize(`${posix.dirname(path)}/${id}`))
          : require(id)),
    exports,
  );
  if (shared) cache.set(path, exports);
  return exports;
}
const model = load("shared/lib/workspace");
const profiles = load("shared/lib/profiles");
const { useProfileStore } = load("shared/stores/profile");
const primaryKey = profiles.profileWorkspaceKey("one");
const { useWorkspaceStore } = load("shared/stores/workspace");
const study = load("modules/study/domain/questions");
const audio = load("modules/music/domain/audio");
const lyrics = load("modules/music/domain/lyrics");
const source = load("modules/music/services/source");
function setup(t, initial, profileId = "one") {
  const previous = {
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    sessionStorage: globalThis.sessionStorage,
  };
  const values = new Map(initial || []);
  const listeners = new Set();
  const storage = {
    fail: false,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (this.fail) throw new Error("存储空间不足");
      values.set(key, value);
    },
  };
  globalThis.localStorage = storage;
  const session = new Map(
    profileId
      ? [
          [
            profiles.PROFILE_SESSION_KEY,
            JSON.stringify({ current: profileId, verified: ["one", "two"] }),
          ],
        ]
      : [],
  );
  globalThis.sessionStorage = {
    getItem: (key) => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, value),
  };
  globalThis.window = {
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
    setTimeout,
    clearTimeout,
  };
  setActivePinia(createPinia());
  const store = useWorkspaceStore();
  const stores = [store, useProfileStore()];
  t.after(() => {
    stores.forEach((item) => item.$dispose());
    globalThis.sessionStorage = previous.sessionStorage;
    globalThis.window = previous.window;
    globalThis.localStorage = previous.localStorage;
  });
  return {
    store,
    storage,
    values,
    listeners,
    track: (item) => stores.push(item),
  };
}
function task(id = "one") {
  return {
    id,
    title: "读一页书",
    note: "",
    date: "2026-11-04",
    time: "",
    priority: "normal",
    category: "study",
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}

test("本机任务新增、完成、恢复与备份恢复使用同一数据契约", (t) => {
  const { store, storage } = setup(t);
  store.saveTask(task());
  store.toggleTask("one");
  assert.equal(store.data.tasks[0].completed, true);
  assert.ok(store.data.tasks[0].completedAt);
  const backup = storage.getItem(store.storageKey);
  store.toggleTask("one");
  assert.equal(store.data.tasks[0].completedAt, null);
  store.restore(backup);
  assert.equal(store.data.tasks[0].completed, true);
  store.removeTask("one");
  assert.equal(store.data.tasks.length, 0);
});
test("存储写入失败不能改变界面数据，恢复空间后可重试", (t) => {
  const { store, storage } = setup(t);
  store.saveTask(task());
  const raw = storage.getItem(store.storageKey);
  storage.fail = true;
  assert.throws(() => store.toggleTask("one"), /空间/);
  assert.equal(store.data.tasks[0].completed, false);
  assert.equal(storage.getItem(store.storageKey), raw);
  storage.fail = false;
  store.toggleTask("one");
  assert.equal(store.data.tasks[0].completed, true);
});
test("旧待办重复导入不重复，也不编造日期和完成时间", (t) => {
  const raw = JSON.stringify({
    version: 1,
    items: [{ id: "old", title: "旧任务", completed: true }],
  });
  const { store, storage } = setup(t, [["audio:todos:v1", raw]]);
  assert.equal(store.importLegacy(), 1);
  assert.equal(store.importLegacy(), 0);
  const imported = store.data.tasks[0];
  assert.equal(imported.date, "");
  assert.equal(imported.createdAt, null);
  assert.equal(imported.completedAt, null);
  assert.equal(storage.getItem("audio:todos:v1"), raw);
});
test("损坏数据阻止普通写入，用户明确恢复有效备份后可继续操作", (t) => {
  const { store, storage } = setup(t, [[primaryKey, "{broken"]]);
  assert.equal(store.ready, false);
  assert.throws(() => store.saveTask(task()));
  assert.equal(storage.getItem(store.storageKey), "{broken");
  store.restore(JSON.stringify(model.emptyWorkspace()));
  assert.equal(store.ready, true);
  store.saveTask(task());
  assert.equal(store.data.tasks.length, 1);
});
test("其他标签页写入后，旧快照不能覆盖新数据", (t) => {
  const { store, storage } = setup(t);
  store.saveTask(task());
  const other = model.decodeWorkspace(storage.getItem(store.storageKey));
  other.tasks.push(task("two"));
  storage.setItem(store.storageKey, JSON.stringify(other));
  assert.throws(() => store.toggleTask("one"), /其他页面/);
  assert.equal(store.data.tasks.length, 2);
  assert.equal(store.data.tasks[0].completed, false);
  store.toggleTask("one");
  assert.equal(store.data.tasks.length, 2);
});
test("两个档案隔离记录；切换选择后旧异步操作仍绑定原档案", (t) => {
  const { store: first, storage, track } = setup(t);
  first.saveTask(task("first"));
  const originalProfile = useProfileStore();
  originalProfile.select("two");
  assert.equal(originalProfile.requireCurrent(), "one");
  setActivePinia(createPinia());
  const second = useWorkspaceStore();
  track(second);
  track(useProfileStore());
  assert.equal(second.data.tasks.length, 0);
  second.saveTask(task("second"));
  first.toggleTask("first");
  assert.equal(second.data.tasks[0].id, "second");
  assert.equal(second.data.tasks[0].completed, false);
  assert.equal(
    model.decodeWorkspace(storage.getItem(first.storageKey)).tasks[0].completed,
    true,
  );
  assert.notEqual(first.storageKey, second.storageKey);
  assert.notEqual(
    profiles.profileMusicDatabase("one"),
    profiles.profileMusicDatabase("two"),
  );
  second.restore(JSON.stringify(model.emptyWorkspace()));
  assert.equal(
    model.decodeWorkspace(storage.getItem(first.storageKey)).tasks.length,
    1,
  );
});
test("未选择档案时不能写入，损坏档案不能影响另一份", (t) => {
  const { store, storage, track } = setup(t, [[primaryKey, "{broken"]], null);
  assert.equal(store.ready, false);
  assert.throws(() => store.saveTask(task()));
  assert.throws(
    () => store.restore(JSON.stringify(model.emptyWorkspace())),
    /选择/,
  );
  useProfileStore().select("two", invitationCode);
  setActivePinia(createPinia());
  const second = useWorkspaceStore();
  track(second);
  track(useProfileStore());
  assert.equal(second.ready, true);
  second.saveTask(task());
  assert.equal(storage.getItem(primaryKey), "{broken");
});
test("共享旧记录只显式导入到空档案，保留原始数据且不覆盖现有档案", (t) => {
  const old = model.emptyWorkspace();
  old.tasks.push(task("shared"));
  const raw = JSON.stringify(old);
  const { store, storage } = setup(t, [[model.WORKSPACE_KEY, raw]]);
  assert.equal(store.data.tasks.length, 0);
  store.importShared();
  assert.equal(store.data.tasks[0].id, "shared");
  assert.equal(storage.getItem(model.WORKSPACE_KEY), raw);
  assert.throws(() => store.importShared(), /已有记录/);
  assert.equal(storage.getItem(profiles.profileWorkspaceKey("two")), null);
});
test("备份携带档案来源，仍兼容旧备份，拒绝非法档案和过大备份", () => {
  const data = model.emptyWorkspace();
  data.tasks.push(task());
  const backup = profiles.encodeProfileBackup("one", data);
  assert.equal(profiles.decodeProfileBackup(backup).source, "档案一");
  assert.deepEqual(profiles.decodeProfileBackup(backup).data, data);
  assert.equal(
    profiles.decodeProfileBackup(JSON.stringify(data)).source,
    "旧版共享备份",
  );
  assert.throws(() =>
    profiles.decodeProfileBackup(backup.replace('"one"', '"invalid"')),
  );
  assert.throws(() => profiles.profileWorkspaceKey("invalid"));
  assert.throws(
    () => profiles.decodeProfileBackup(" ".repeat(8_000_001)),
    /8MB/,
  );
});
test("音乐读取使用当前档案的数据库，找不到时不会回退到其他档案或共享库", async (t) => {
  const { track } = setup(t);
  const previous = globalThis.indexedDB;
  const opened = [];
  const one = new Blob(["one"], { type: "audio/mpeg" });
  const two = new Blob(["two"], { type: "audio/mpeg" });
  const files = new Map([
    [profiles.profileMusicDatabase("one"), new Map([["local:same", one]])],
    [profiles.profileMusicDatabase("two"), new Map([["local:same", two]])],
  ]);
  // 这里只模拟数据库契约来验证作用域，浏览器事务和配额仍需真机验收。
  globalThis.indexedDB = {
    open(name) {
      opened.push(name);
      const request = {
        result: {
          close() {},
          transaction() {
            const tx = {
              objectStore: () => ({
                get(id) {
                  const result = {
                    result: files.get(name)?.has(id)
                      ? { blob: files.get(name).get(id) }
                      : undefined,
                  };
                  queueMicrotask(() => tx.oncomplete());
                  return result;
                },
              }),
            };
            return tx;
          },
        },
      };
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  };
  t.after(() => {
    globalThis.indexedDB = previous;
  });
  const localFiles = load("modules/music/services/localFiles");
  assert.equal(await (await localFiles.readLocal("local:same")).text(), "one");
  useProfileStore().select("two");
  setActivePinia(createPinia());
  track(useProfileStore());
  assert.equal(await (await localFiles.readLocal("local:same")).text(), "two");
  await assert.rejects(localFiles.readLocal("local:missing"), /不存在/);
  assert.deepEqual(opened, [
    profiles.profileMusicDatabase("one"),
    profiles.profileMusicDatabase("two"),
    profiles.profileMusicDatabase("two"),
  ]);
});
test("备份拒绝非法日期、重复 ID、不可信链接和错误版本", () => {
  for (const mutate of [
    (d) => (d.version = 2),
    (d) => (d.tasks = [task(), task()]),
    (d) => (d.tasks = [{ ...task(), date: "2026-02-30" }]),
    (d) =>
      (d.favorites = [
        {
          id: "qqmp3:1",
          rid: "1",
          name: "歌",
          artist: "人",
          cover: "javascript:alert(1)",
        },
      ]),
    (d) => (d.preferences.grade = 7),
  ]) {
    const data = model.emptyWorkspace();
    mutate(data);
    assert.throws(() => model.decodeWorkspace(JSON.stringify(data)));
  }
  assert.equal(model.validDate("2024-02-29"), true);
  assert.equal(model.validDate("2026-02-29"), false);
  assert.equal(model.safeHttps("https://name:secret@example.com/x"), "");
});
test("小学各学科题目有答案与解析，数学生成覆盖六个年级", () => {
  for (let grade = 1; grade <= 6; grade++)
    for (const subject of ["chinese", "math", "english"]) {
      const list = study.questions(subject, grade);
      assert.ok(list.length >= 5);
      assert.equal(new Set(list.map((q) => q.id)).size, list.length);
      for (const q of list) {
        assert.ok(q.prompt && q.explanation);
        assert.equal(q.grade, grade);
        assert.equal(
          study.correctAnswer(q.expected, q.expected, subject),
          true,
        );
        if (q.options) assert.ok(q.options.includes(q.expected));
      }
    }
  assert.equal(study.correctAnswer("2/4", "1/2", "math"), true);
  assert.equal(study.correctAnswer("0.30", "0.3", "math"), true);
  assert.equal(study.correctAnswer("APPLE", "apple", "english"), true);
  assert.equal(study.correctAnswer("1/0", "1/2", "math"), false);
  assert.equal(study.correctAnswer("1+2", "3", "math"), false);
});
test("歌词解析支持百分秒、毫秒、多时间标签、偏移和纯文本", () => {
  const parsed = lyrics.parseLyrics(
    "[offset:-100]\n[00:01.50][00:03.050]测试行\n[00:02]另一行",
  );
  assert.deepEqual(
    parsed.lines.map((l) => Math.round(l.time * 1000)),
    [1400, 1900, 2950],
  );
  assert.equal(parsed.lines[0].text, "测试行");
  assert.equal(lyrics.parseLyrics("纯文本歌词").plain, "纯文本歌词");
  assert.equal(lyrics.formatTime(NaN), "0:00");
  assert.equal(lyrics.formatTime(125), "2:05");
});
test("裁剪拒绝空片段、越界与过长片段；WAV 头和声道数据真实一致", () => {
  const clip = { start: 0, end: 1, bitrate: 192, fade: true };
  audio.validateClip(60, clip);
  for (const options of [
    { ...clip, end: 0 },
    { ...clip, start: -1 },
    { ...clip, end: 61 },
    { ...clip, bitrate: 999 },
    { ...clip, end: 301 },
  ])
    assert.throws(() =>
      audio.validateClip(600, {
        ...options,
        end: options.end === 61 ? 601 : options.end,
      }),
    );
  const buffer = audio.wavBytes([new Float32Array([-1, 0, 1])], 44100);
  const view = new DataView(buffer);
  assert.equal(Buffer.from(buffer).subarray(0, 4).toString(), "RIFF");
  assert.equal(view.getUint16(22, true), 1);
  assert.equal(view.getUint32(40, true), 6);
  assert.equal(view.getInt16(44, true), -32768);
  assert.equal(view.getInt16(48, true), 32767);
});
test("生产音源请求保留 HTTP 失败、校验结构、去重并过滤不安全下载地址", async (t) => {
  const previous = { fetch: globalThis.fetch, window: globalThis.window };
  globalThis.window = { setTimeout, clearTimeout };
  t.after(() => Object.assign(globalThis, previous));
  globalThis.fetch = async () => ({ ok: false, status: 403 });
  await assert.rejects(source.searchMusic("测试"), /403/);
  for (const code of [403, "403"]) {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ code, msg: "非法访问", data: [] }),
    });
    await assert.rejects(source.searchMusic("测试"), /403.*非法访问/);
  }
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: 200,
      data: [
        { rid: 1, name: "测试歌", artist: "作者" },
        { rid: 1, name: "重复歌" },
        { rid: "bad" },
      ],
    }),
  });
  const found = await source.searchMusic("测试");
  assert.equal(found.length, 1);
  assert.equal(found[0].name, "测试歌");
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      code: 200,
      data: { url: "javascript:alert(1)", lrc: "" },
    }),
  });
  await assert.rejects(source.resolveMusic("1"), /未取得/);
  assert.deepEqual(
    source.downloadOptions([
      "MP3$$javascript:alert(1)",
      "FLAC$$https://example.com/file",
    ]),
    [{ title: "FLAC", url: "https://example.com/file" }],
  );
});
test("实际 Worker 逻辑产生 MP3 帧，三档码率与单双声道均可编码", () => {
  const worker = readFileSync(
    new URL("../src/modules/music/services/mp3.worker.js", import.meta.url),
    "utf8",
  );
  const encoder = readFileSync(
    new URL("../node_modules/lamejs/lame.min.js", import.meta.url),
    "utf8",
  );
  for (const bitrate of [128, 192, 320])
    for (const channelCount of [1, 2]) {
      const messages = [];
      const sandbox = { console };
      sandbox.self = sandbox;
      const context = vm.createContext(sandbox);
      sandbox.importScripts = () => vm.runInContext(encoder, context);
      sandbox.postMessage = (message) => messages.push(message);
      vm.runInContext(worker, context);
      const channels = Array.from(
        { length: channelCount },
        () =>
          Float32Array.from(
            { length: 44100 },
            (_, i) => Math.sin((i * 2 * Math.PI * 440) / 44100) * 0.2,
          ).buffer,
      );
      sandbox.onmessage({
        data: { encoderUrl: "encoder", channels, sampleRate: 44100, bitrate },
      });
      const done = messages.find((m) => m.type === "done");
      assert.ok(done, JSON.stringify(messages.at(-1)));
      const bytes = Buffer.concat(done.chunks.map((b) => Buffer.from(b)));
      assert.ok(bytes.length > bitrate * 100);
      assert.equal(bytes[0], 0xff);
      assert.equal(bytes[1] & 0xe0, 0xe0);
      assert.equal(
        [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320][
          bytes[2] >> 4
        ],
        bitrate,
      );
      assert.equal(bytes[3] >> 6 === 3, channelCount === 1);
    }
});
test("播放器切歌后不被旧解析覆盖，暂停解析时不能突然自动播放", async (t) => {
  const previous = globalThis.Audio;
  const instances = [];
  class FakeAudio {
    src = "";
    currentTime = 0;
    duration = 0;
    paused = true;
    listeners = new Map();
    constructor() {
      instances.push(this);
    }
    addEventListener(name, fn) {
      this.listeners.set(name, fn);
    }
    removeEventListener(name) {
      this.listeners.delete(name);
    }
    getAttribute() {
      return this.src;
    }
    removeAttribute() {
      this.src = "";
    }
    load() {}
    async play() {
      this.paused = false;
    }
    pause() {
      this.paused = true;
      this.listeners.get("pause")?.();
    }
    fire(name) {
      this.listeners.get(name)?.();
    }
  }
  globalThis.Audio = FakeAudio;
  const pending = new Map();
  const { usePlayerStore } = load("modules/music/stores/player", {
    "../services/source": {
      resolveMusic: (rid) =>
        new Promise((resolve) => pending.set(rid, resolve)),
    },
    "../services/localFiles": { readLocal: () => Promise.resolve(new Blob()) },
    "@/shared/lib/feedback": { message: (e) => e.message },
  });
  setActivePinia(createPinia());
  const store = usePlayerStore();
  t.after(() => {
    store.$dispose();
    globalThis.Audio = previous;
  });
  const first = store.play({
    id: "qqmp3:1",
    rid: "1",
    name: "第一首",
    artist: "人",
  });
  const second = store.play({
    id: "qqmp3:2",
    rid: "2",
    name: "第二首",
    artist: "人",
  });
  pending.get("2")({
    url: "https://example.com/2.mp3",
    lrc: "[00:01.00]第二首",
  });
  await second;
  pending.get("1")({
    url: "https://example.com/1.mp3",
    lrc: "[00:01.00]第一首",
  });
  await first;
  assert.equal(instances.length, 1);
  assert.equal(instances[0].src, "https://example.com/2.mp3");
  assert.equal(store.current.rid, "2");
  assert.equal(store.lyrics.lines[0].text, "第二首");
  instances[0].fire("playing");
  assert.equal(store.status, "playing");
  const third = store.play({
    id: "qqmp3:3",
    rid: "3",
    name: "第三首",
    artist: "人",
  });
  store.pause();
  pending.get("3")({ url: "https://example.com/3.mp3", lrc: "" });
  await third;
  assert.equal(store.status, "paused");
  assert.equal(instances[0].src, "");
});
