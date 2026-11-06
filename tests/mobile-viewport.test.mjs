import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const vue = require("vue");
const { outputText } = ts.transpileModule(
  readFileSync(
    new URL("../src/shared/composables/useMobileViewport.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
);
const module = { exports: {} };
new Function("require", "exports", outputText)(require, module.exports);

function events() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
    emit: (name) => listeners.get(name)?.(),
  };
}

function mount(t, { visualViewport = true } = {}) {
  const previous = { window: globalThis.window, document: globalThis.document };
  const frames = new Map();
  let frameId = 0;
  const scrolls = [];
  const viewport = { ...events(), height: 800, offsetTop: 0, scale: 1 };
  const window = {
    ...events(),
    innerHeight: 800,
    innerWidth: 390,
    visualViewport: visualViewport ? viewport : undefined,
    requestAnimationFrame(handler) {
      frames.set(++frameId, handler);
      return frameId;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
    getComputedStyle: (node) => node.style,
    scrollY: 0,
    scrollBy(options) {
      scrolls.push(options);
      this.scrollY += options.top;
    },
  };
  const document = {
    ...events(),
    body: {},
    documentElement: {},
    activeElement: null,
    querySelectorAll: () => [],
  };
  Object.assign(globalThis, { window, document });
  const renderer = vue.createRenderer({
    createElement: () => ({}),
    insert() {},
    remove() {},
    patchProp() {},
  });
  let model;
  const app = renderer.createApp({
    setup() {
      model = module.exports.useMobileViewport();
      return () => vue.h("div");
    },
  });
  app.mount({});
  let mounted = true;
  function unmount() {
    if (!mounted) return;
    app.unmount();
    mounted = false;
    assert.equal(frames.size, 0);
    assert.equal(
      window.listeners.size + document.listeners.size + viewport.listeners.size,
      0,
    );
  }
  t.after(() => {
    unmount();
    Object.assign(globalThis, previous);
  });
  async function flush() {
    const pending = [...frames.values()];
    frames.clear();
    await Promise.all(pending.map((handler) => handler()));
    await vue.nextTick();
  }
  function node(top, height, parent = document.body, style = {}) {
    const element = {
      parentElement: parent,
      style: { overflowY: "visible", position: "static", ...style },
      clientTop: 0,
      clientHeight: height,
      scrollHeight: height,
      scrollTop: 0,
      getBoundingClientRect() {
        let shifted = top - window.scrollY;
        let ancestor = this.parentElement;
        while (ancestor && ancestor !== document.body) {
          shifted -= ancestor.scrollTop;
          ancestor = ancestor.parentElement;
        }
        return { top: shifted, bottom: shifted + height, height };
      },
      contains(child) {
        while (child) {
          if (child === this) return true;
          child = child.parentElement;
        }
        return false;
      },
    };
    return element;
  }
  function focus(
    top,
    height = 48,
    {
      form,
      parent,
      excluded = false,
      contentEditable = false,
      legacy = false,
    } = {},
  ) {
    const input = node(top, height, parent);
    input.matches = (selector) =>
      selector.startsWith(":disabled") ? excluded : !contentEditable;
    input.isContentEditable = contentEditable;
    input.closest = (selector) =>
      selector === "form" ? form : legacy ? {} : null;
    document.activeElement = input;
    document.emit("focusin");
    return input;
  }
  return {
    model,
    window,
    document,
    viewport,
    frames,
    scrolls,
    flush,
    focus,
    node,
    unmount,
  };
}

test("键盘覆盖页面时露出短表单及提交按钮，并提供准确的弹层偏移", async (t) => {
  const env = mount(t);
  await env.flush();
  const form = env.node(500, 180);
  const input = env.focus(520, 48, { form });
  env.viewport.height = 460;
  env.viewport.emit("resize");
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, true);
  assert.deepEqual(env.model.viewportStyle.value, {
    "--aide-visible-height": "460px",
    "--aide-keyboard-offset": "340px",
  });
  assert.equal(env.scrolls.length, 1);
  assert.equal(form.getBoundingClientRect().bottom, 440);
  assert.ok(input.getBoundingClientRect().top >= 16);
});

test("窗口与可视视口一起压缩时识别键盘，不重复抬高弹层", async (t) => {
  const env = mount(t);
  await env.flush();
  env.focus(620);
  env.window.innerHeight = env.viewport.height = 440;
  env.window.emit("resize");
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, true);
  assert.equal(env.model.viewportStyle.value["--aide-keyboard-offset"], "0px");
  assert.equal(env.document.activeElement.getBoundingClientRect().bottom, 420);
});

test("无 VisualViewport 时仍按缩小后的窗口自动滚动，收起后恢复", async (t) => {
  const env = mount(t, { visualViewport: false });
  await env.flush();
  env.focus(700);
  env.window.innerHeight = 400;
  env.window.emit("resize");
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, true);
  assert.equal(env.document.activeElement.getBoundingClientRect().bottom, 380);
  env.document.activeElement = null;
  env.window.innerHeight = 800;
  env.window.emit("resize");
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, false);
  assert.equal(env.model.viewportStyle.value["--aide-visible-height"], "800px");
  assert.equal(env.model.viewportStyle.value["--aide-keyboard-offset"], "0px");
  assert.equal(env.scrolls.length, 1, "收起键盘不强行重置阅读位置");
});

test("长表单优先当前输入框，考虑可视视口顶部平移", async (t) => {
  const env = mount(t);
  const input = env.focus(600, 48, { form: env.node(50, 1000) });
  env.viewport.height = 300;
  env.viewport.offsetTop = 90;
  await env.flush();
  assert.equal(input.getBoundingClientRect().bottom, 370);
  assert.equal(
    env.model.viewportStyle.value["--aide-keyboard-offset"],
    "410px",
  );
  input.getBoundingClientRect = () => ({ top: 10, bottom: 58, height: 48 });
  env.document.emit("focusin");
  await env.flush();
  assert.equal(env.scrolls.at(-1).top, -96);
});

test("弹层表单内部滚动，背景页面不移动", async (t) => {
  const env = mount(t);
  const popup = env.node(40, 380, undefined, { position: "fixed" });
  const sheet = env.node(40, 380, popup, { overflowY: "auto" });
  sheet.scrollHeight = 1000;
  const form = env.node(60, 900, sheet);
  const input = env.focus(700, 48, { form, parent: form });
  env.viewport.height = 460;
  await env.flush();
  assert.equal(input.getBoundingClientRect().bottom, 420);
  assert.equal(sheet.scrollTop, 328);
  assert.equal(env.scrolls.length, 0);
});

test("尺寸合并处理，手动平移可视区域不会反复拉回焦点", async (t) => {
  const env = mount(t);
  await env.flush();
  const input = env.focus(600);
  env.viewport.height = 460;
  env.viewport.emit("resize");
  env.viewport.emit("resize");
  assert.equal(env.frames.size, 1);
  await env.flush();
  assert.equal(env.scrolls.length, 1);
  input.getBoundingClientRect = () => ({ top: 700, bottom: 748, height: 48 });
  env.viewport.offsetTop = 20;
  env.viewport.emit("scroll");
  await env.flush();
  assert.equal(env.scrolls.length, 1);
  assert.equal(
    env.model.viewportStyle.value["--aide-keyboard-offset"],
    "320px",
  );
});

test("等待布局更新后才测量，切换焦点或卸载取消迟到滚动", async (t) => {
  const env = mount(t);
  env.viewport.height = 400;
  env.focus(600);
  const firstFrame = [...env.frames.values()][0];
  env.frames.clear();
  const pending = firstFrame();
  env.focus(200);
  await pending;
  await env.flush();
  assert.equal(env.scrolls.length, 0);
  env.focus(700);
  const lastFrame = [...env.frames.values()][0];
  env.frames.clear();
  const last = lastFrame();
  env.unmount();
  await last;
  assert.equal(env.scrolls.length, 0);
});

test("响应式弹层布局完成后测量，避免按键盘弹出前的坐标过度滚动", async (t) => {
  const env = mount(t);
  const input = env.focus(700);
  env.viewport.height = 400;
  const stop = vue.watch(env.model.viewportStyle, () => {
    input.getBoundingClientRect = () => ({ top: 100, bottom: 148, height: 48 });
  });
  await env.flush();
  stop();
  assert.equal(env.scrolls.length, 0);
});

test("硬件键盘下仍避让底部操作栏，不把页面导航遮挡误认为软键盘", async (t) => {
  const env = mount(t);
  env.focus(700);
  env.document.querySelectorAll = () => [env.node(680, 80)];
  await env.flush();
  assert.equal(env.document.activeElement.getBoundingClientRect().bottom, 668);
  assert.equal(env.model.keyboardOpen.value, false);
});

test("缩放、只读及非文字控件不触发滚动，已可见输入保持稳定", async (t) => {
  const env = mount(t);
  env.focus(700, 48, { excluded: true });
  env.viewport.height = 400;
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, false);
  assert.equal(env.scrolls.length, 0);
  env.focus(700);
  env.viewport.scale = 2;
  await env.flush();
  assert.deepEqual(env.model.viewportStyle.value, {});
  assert.equal(env.scrolls.length, 0);
  env.viewport.scale = 1;
  env.focus(100);
  await env.flush();
  assert.equal(env.scrolls.length, 0);
});

test("超高编辑区域顶部可见，contenteditable 支持避让", async (t) => {
  const env = mount(t);
  env.viewport.height = 300;
  const input = env.focus(500, 500, { contentEditable: true });
  await env.flush();
  assert.equal(input.getBoundingClientRect().top, 16);
});

test("旋转后重新记录窗口基准，旧待办不重复滚动", async (t) => {
  const env = mount(t);
  await env.flush();
  env.window.innerWidth = 800;
  env.window.innerHeight = env.viewport.height = 390;
  env.focus(700, 48, { legacy: true });
  await env.flush();
  assert.equal(env.model.keyboardOpen.value, false);
  assert.equal(env.scrolls.length, 0);
});
