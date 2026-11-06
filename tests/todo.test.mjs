import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";

const require = createRequire(import.meta.url);
const vue = require("vue");

// 使用实际 Vue 响应式和组件生命周期，离线检查交互，不引入新的测试依赖。
function loadModule(source, overrides = {}) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  });
  const exports = {};
  const localRequire = (id) => overrides[id] ?? require(id);
  new Function("require", "exports", outputText)(localRequire, exports);
  return exports;
}

const todoModule = loadModule(
  await readFile(
    new URL("../src/components/todo/useTodoList.ts", import.meta.url),
    "utf8",
  ),
);
const {
  useTodoList,
  TODO_STORAGE_KEY: key,
  TODO_TITLE_LIMIT: limit,
} = todoModule;
const keyboardModule = loadModule(
  await readFile(
    new URL("../src/components/todo/useTodoKeyboard.ts", import.meta.url),
    "utf8",
  ),
);
const { descriptor } = parse(
  await readFile(
    new URL("../src/components/todo/TodoBoard.vue", import.meta.url),
    "utf8",
  ),
);
const componentSource = compileScript(descriptor, {
  id: "todo-regression",
}).content;

function memoryStorage(raw = null) {
  return {
    raw,
    writes: 0,
    failRead: false,
    failWrite: false,
    getItem(storageKey) {
      assert.equal(storageKey, key);
      if (this.failRead) throw new Error("storage disabled");
      return this.raw;
    },
    setItem(storageKey, value) {
      assert.equal(storageKey, key);
      if (this.failWrite) throw new Error("quota exceeded");
      this.raw = value;
      this.writes++;
    },
  };
}

function snapshot(model) {
  return JSON.parse(JSON.stringify(model.items.value));
}

function mountBoard(t, storage = memoryStorage()) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const listeners = new Map();
  const viewportListeners = new Map();
  const frames = new Map();
  const scrolls = [];
  let frameId = 0;
  const dialog = { confirm: true, calls: [] };
  globalThis.window = {
    localStorage: storage,
    innerHeight: 800,
    visualViewport: {
      height: 800,
      offsetTop: 0,
      scale: 1,
      addEventListener: (name, handler) => viewportListeners.set(name, handler),
      removeEventListener: (name) => viewportListeners.delete(name),
    },
    requestAnimationFrame: (handler) => {
      frames.set(++frameId, handler);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    scrollBy: (options) => scrolls.push(options),
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  };
  globalThis.document = {
    activeElement: null,
    querySelector: () => null,
    getElementById: () => null,
  };
  const component = loadModule(componentSource, {
    "./useTodoList": todoModule,
    "./useTodoKeyboard": keyboardModule,
    vant: {
      showConfirmDialog: (options) => {
        dialog.calls.push(options);
        return dialog.confirm ? Promise.resolve() : Promise.reject("cancel");
      },
    },
  }).default;
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
  let board;
  const app = renderer.createApp({
    setup() {
      board = component.setup({}, { expose() {} });
      return () => vue.h("div");
    },
  });
  app.mount({});
  t.after(() => {
    app.unmount();
    assert.equal(listeners.size, 0, "卸载后应移除存储监听");
    assert.equal(viewportListeners.size, 0, "卸载后应移除可视区域监听");
    assert.equal(frames.size, 0, "卸载后应取消待执行的滚动");
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  return {
    board,
    storage,
    dialog,
    listeners,
    viewportListeners,
    frames,
    scrolls,
    async flushFrames() {
      const pending = [...frames.values()];
      frames.clear();
      for (const handler of pending) await handler();
    },
  };
}

test("初始不注入示例，新增、编辑、完成、恢复、删除均在重新进入后保留", () => {
  const storage = memoryStorage();
  const model = useTodoList(() => storage);
  assert.equal(model.ready.value, true);
  assert.deepEqual(snapshot(model), []);
  assert.equal(storage.writes, 0);
  assert.equal(model.add("  买牛奶  ").ok, true);
  const id = model.items.value[0].id;
  assert.equal(model.items.value[0].title, "买牛奶");
  assert.equal(model.rename(id, "  买牛奶和面包  ").ok, true);
  assert.equal(model.setCompleted(id, true).ok, true);
  assert.equal(model.completedCount.value, 1);
  const reopened = useTodoList(() => storage);
  assert.deepEqual(snapshot(reopened), [
    { id, title: "买牛奶和面包", completed: true },
  ]);
  assert.equal(reopened.setCompleted(id, false).ok, true);
  assert.equal(reopened.completedCount.value, 0);
  assert.equal(reopened.remove(id).ok, true);
  assert.deepEqual(snapshot(useTodoList(() => storage)), []);
});

test("拒绝空白和超长内容，允许长度边界；错误不改变已保存的任务", () => {
  const storage = memoryStorage();
  const model = useTodoList(() => storage);
  for (const title of ["", " \n\t", "a".repeat(limit + 1)]) {
    assert.equal(model.add(title).ok, false);
  }
  assert.equal(storage.writes, 0);
  assert.equal(model.add("a".repeat(limit)).ok, true);
  const id = model.items.value[0].id;
  const saved = storage.raw;
  assert.equal(model.rename(id, "   ").ok, false);
  assert.equal(model.rename(id, "字".repeat(limit + 1)).ok, false);
  assert.equal(storage.raw, saved);
});

test("连续新增及重新进入后即使时间和随机值相同也不产生重复 ID", () => {
  const originalNow = Date.now;
  const originalRandom = Math.random;
  try {
    Date.now = () => 1000;
    Math.random = () => 0.5;
    const storage = memoryStorage();
    const first = useTodoList(() => storage);
    for (let index = 0; index < 10; index++)
      assert.equal(first.add(`任务 ${index}`).ok, true);
    const reopened = useTodoList(() => storage);
    assert.equal(reopened.add("新任务").ok, true);
    assert.equal(new Set(reopened.items.value.map((item) => item.id)).size, 11);
  } finally {
    Date.now = originalNow;
    Math.random = originalRandom;
  }
});

test("无效 ID 和重复删除不会误删最后一项", () => {
  const storage = memoryStorage();
  const model = useTodoList(() => storage);
  model.add("保留任务");
  const saved = storage.raw;
  assert.equal(model.rename("missing", "改名").ok, false);
  assert.equal(model.setCompleted("missing", true).ok, false);
  assert.equal(model.remove("missing").ok, false);
  assert.equal(storage.raw, saved);
  const id = model.items.value[0].id;
  assert.equal(model.remove(id).ok, true);
  assert.equal(model.remove(id).ok, false);
  assert.deepEqual(snapshot(model), []);
});

test("损坏数据、未知版本、不完整任务或重复 ID 均保留原始存储并阻止写入", () => {
  const valid = { id: "one", title: "原始任务", completed: false };
  const invalid = [
    "{broken",
    "null",
    JSON.stringify({ version: 2, items: [] }),
    JSON.stringify({ version: 1, items: {} }),
    ...[
      [null],
      [{ ...valid, id: 1 }],
      [{ ...valid, completed: "false" }],
      [{ ...valid, title: "  " }],
      [{ ...valid, title: "字".repeat(limit + 1) }],
      [valid, valid],
    ].map((items) => JSON.stringify({ version: 1, items })),
  ];
  for (const raw of invalid) {
    const storage = memoryStorage(raw);
    const model = useTodoList(() => storage);
    assert.equal(model.ready.value, false);
    assert.ok(model.storageError.value);
    assert.equal(model.add("不应覆盖").ok, false);
    assert.equal(storage.writes, 0);
    assert.equal(storage.raw, raw);
  }
});

test("读取失败后可重新读取恢复，访问 localStorage 本身被禁止也有提示", () => {
  const storage = memoryStorage();
  const original = useTodoList(() => storage);
  original.add("原有任务");
  storage.failRead = true;
  const model = useTodoList(() => storage);
  assert.equal(model.ready.value, false);
  storage.failRead = false;
  assert.equal(model.load(), true);
  assert.equal(model.items.value[0].title, "原有任务");
  assert.equal(model.storageError.value, "");
  const denied = useTodoList(() => {
    throw new Error("SecurityError");
  });
  assert.equal(denied.ready.value, false);
  assert.equal(denied.add("不可写入").ok, false);
});

test("写入失败不改变任务或完成计数，恢复后可以重试", () => {
  const storage = memoryStorage();
  const model = useTodoList(() => storage);
  model.add("现有任务");
  const before = snapshot(model);
  const raw = storage.raw;
  const id = model.items.value[0].id;
  storage.failWrite = true;
  assert.equal(model.add("未保存任务").ok, false);
  assert.equal(model.rename(id, "未保存标题").ok, false);
  assert.equal(model.setCompleted(id, true).ok, false);
  assert.equal(model.remove(id).ok, false);
  assert.deepEqual(snapshot(model), before);
  assert.equal(model.completedCount.value, 0);
  assert.equal(storage.raw, raw);
  assert.match(model.storageError.value, /尚未保存/);
  storage.failWrite = false;
  assert.equal(model.setCompleted(id, true).ok, true);
  assert.equal(model.completedCount.value, 1);
  assert.equal(model.storageError.value, "");
});

test("旧标签页写入前检测变化并同步，重试时保留其他页面的任务", () => {
  const storage = memoryStorage();
  const first = useTodoList(() => storage);
  const second = useTodoList(() => storage);
  first.add("其他页面的任务");
  assert.equal(second.add("本页草稿").ok, false);
  assert.match(second.storageError.value, /已同步/);
  assert.equal(second.items.value[0].title, "其他页面的任务");
  assert.equal(second.add("本页草稿").ok, true);
  assert.deepEqual(
    second.items.value.map((item) => item.title),
    ["本页草稿", "其他页面的任务"],
  );
  first.load();
  assert.equal(first.items.value.length, 2);
});

test("页面新增失败保留草稿，中文选词回车不提交，成功后清空并切回全部", (t) => {
  const { board, storage } = mountBoard(t);
  let prevented = false;
  board.guardComposition({
    isComposing: true,
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, true);
  prevented = false;
  board.guardComposition({
    isComposing: false,
    keyCode: 13,
    preventDefault: () => {
      prevented = true;
    },
  });
  assert.equal(prevented, false);
  board.draft.value = "  ";
  board.addTask();
  assert.ok(board.addError.value);
  board.draft.value = " 下班散步 ";
  storage.failWrite = true;
  board.addTask();
  assert.equal(board.draft.value, " 下班散步 ");
  assert.equal(board.items.value.length, 0);
  storage.failWrite = false;
  board.filter.value = "completed";
  board.addTask();
  assert.equal(board.draft.value, "");
  assert.equal(board.addError.value, "");
  assert.equal(board.filter.value, "all");
  assert.equal(board.items.value[0].title, "下班散步");
});

test("页面完成、恢复、筛选与进度一致，保存失败会恢复原生勾选状态", (t) => {
  const { board, storage } = mountBoard(t);
  board.add("任务一");
  board.add("任务二");
  const item = board.items.value[0];
  const target = { checked: true };
  storage.failWrite = true;
  board.toggleTask(item, { target });
  assert.equal(target.checked, false);
  assert.equal(board.progress.value, 0);
  storage.failWrite = false;
  board.toggleTask(item, { target });
  assert.equal(target.checked, true);
  assert.equal(board.progress.value, 50);
  assert.deepEqual(
    board.visibleItems.value.map((task) => task.title),
    ["任务一", "任务二"],
  );
  board.changeFilter("completed");
  assert.equal(board.visibleItems.value.length, 1);
  board.toggleTask(board.visibleItems.value[0], { target });
  assert.equal(board.visibleItems.value.length, 0);
  assert.equal(board.progress.value, 0);
  board.changeFilter("pending");
  assert.equal(board.visibleItems.value.length, 2);
});

test("编辑草稿在保存失败或切换筛选时保留，恢复保存后更新任务", async (t) => {
  const { board, storage } = mountBoard(t);
  board.add("原任务");
  const id = board.items.value[0].id;
  await board.startEdit(board.items.value[0]);
  board.editDraft.value = "修改后的任务";
  board.changeFilter("completed");
  assert.equal(board.filter.value, "all");
  assert.equal(board.editDraft.value, "修改后的任务");
  storage.failWrite = true;
  board.saveEdit();
  assert.equal(board.editingId.value, id);
  assert.equal(board.items.value[0].title, "原任务");
  assert.match(board.editError.value, /尚未保存/);
  storage.failWrite = false;
  board.saveEdit();
  assert.equal(board.editingId.value, null);
  assert.equal(board.items.value[0].title, "修改后的任务");
  await vue.nextTick();
});

test("其他页面更新编辑中的标题会阻止覆盖；外部删除后不会卡住筛选", async (t) => {
  const { board, storage, listeners } = mountBoard(t);
  board.add("原任务");
  const id = board.items.value[0].id;
  await board.startEdit(board.items.value[0]);
  board.editDraft.value = "本页草稿";
  const other = useTodoList(() => storage);
  other.rename(id, "外部修改");
  listeners.get("storage")({ key });
  board.saveEdit();
  assert.match(board.editError.value, /其他页面修改/);
  assert.equal(board.editDraft.value, "本页草稿");
  assert.equal(board.items.value[0].title, "外部修改");
  other.remove(id);
  listeners.get("storage")({ key });
  await vue.nextTick();
  assert.equal(board.editingId.value, null);
  board.changeFilter("pending");
  assert.equal(board.filter.value, "pending");
});

test("取消删除保留任务，确认后才删除，保存失败不会隐藏任务", async (t) => {
  const { board, storage, dialog } = mountBoard(t);
  board.add("要删除的任务");
  const item = board.items.value[0];
  dialog.confirm = false;
  await board.deleteTask(item);
  assert.equal(board.items.value.length, 1);
  assert.equal(board.deleting.value, false);
  dialog.confirm = true;
  storage.failWrite = true;
  await board.deleteTask(item);
  assert.equal(board.items.value.length, 1);
  storage.failWrite = false;
  await board.deleteTask(item);
  assert.equal(board.items.value.length, 0);
  assert.equal(dialog.calls.length, 3);
  assert.match(dialog.calls[0].message, /要删除的任务/);
});

function focusEditor(board, formRect, inputRect = formRect) {
  const input = {
    matches: () => true,
    closest: () => ({ getBoundingClientRect: () => formRect }),
    getBoundingClientRect: () => inputRect,
  };
  board.boardRoot.value = { contains: (element) => element === input };
  document.activeElement = input;
}

test("软键盘压缩可视区域时，滚动露出整个编辑表单并避让底部导航", async (t) => {
  const { board, viewportListeners, scrolls, flushFrames } = mountBoard(t);
  focusEditor(board, { top: 500, bottom: 740, height: 240 });
  window.visualViewport.height = 460;
  document.querySelector = () => ({
    getBoundingClientRect: () => ({ top: 410, bottom: 460 }),
  });
  viewportListeners.get("resize")();
  await flushFrames();
  assert.equal(board.bottomSpace.value, 340);
  assert.deepEqual(scrolls, [{ top: 342, behavior: "auto" }]);
  document.activeElement = null;
  board.scheduleUpdate();
  await flushFrames();
  assert.equal(board.bottomSpace.value, 0);
});

test("横屏空间不足时优先露出输入框，已可见时不滚动，双指缩放不触发避让", async (t) => {
  const { board, scrolls, flushFrames } = mountBoard(t);
  focusEditor(
    board,
    { top: 140, bottom: 380, height: 240 },
    { top: 160, bottom: 208, height: 48 },
  );
  window.visualViewport.height = 180;
  board.scheduleUpdate();
  await flushFrames();
  assert.equal(scrolls[0].top, 40);
  scrolls.length = 0;
  window.visualViewport.height = 800;
  board.scheduleUpdate();
  await flushFrames();
  assert.equal(scrolls.length, 0);
  window.visualViewport.scale = 2;
  window.visualViewport.height = 400;
  board.scheduleUpdate();
  await flushFrames();
  assert.equal(board.bottomSpace.value, 0);
  assert.equal(scrolls.length, 0);
});

test("没有 VisualViewport 时使用窗口高度，连续变化合并处理，卸载清理滚动", async (t) => {
  const { board, frames, scrolls, flushFrames } = mountBoard(t);
  window.visualViewport = undefined;
  window.innerHeight = 400;
  focusEditor(board, { top: 300, bottom: 460, height: 160 });
  board.scheduleUpdate();
  board.scheduleUpdate();
  assert.equal(frames.size, 1);
  await flushFrames();
  assert.equal(board.bottomSpace.value, 0);
  assert.equal(scrolls[0].top, 72);
  board.scheduleUpdate();
  assert.equal(frames.size, 1);
});
