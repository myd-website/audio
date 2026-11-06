import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

function install(target, development = false) {
  const source = readFileSync(
    new URL("../src/shared/lib/browserGuards.ts", import.meta.url),
    "utf8",
  ).replaceAll("import.meta.env.DEV", String(development));
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const exports = {};
  new Function("exports", outputText)(exports);
  exports.installProductionBrowserGuards(target);
}

function keydown(target, values) {
  const event = new Event("keydown", { cancelable: true });
  Object.assign(event, {
    key: "",
    code: "",
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    ...values,
  });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

test("开发环境不注册拦截，F12、检查元素和右键菜单均保持默认行为", () => {
  let registrations = 0;
  const target = new EventTarget();
  const add = target.addEventListener.bind(target);
  target.addEventListener = (...args) => {
    registrations++;
    return add(...args);
  };
  install(target, true);
  assert.equal(registrations, 0);
  assert.equal(keydown(target, { key: "F12" }), false);
  assert.equal(
    keydown(target, { key: "I", ctrlKey: true, shiftKey: true }),
    false,
  );
  const menu = new Event("contextmenu", { cancelable: true });
  target.dispatchEvent(menu);
  assert.equal(menu.defaultPrevented, false);
});

test("非开发环境拦截 F12 和 Windows/Linux 开发者工具快捷键", () => {
  const target = new EventTarget();
  install(target);
  assert.equal(keydown(target, { key: "F12" }), true);
  assert.equal(keydown(target, { key: "Unidentified", code: "F12" }), true);
  for (const key of ["i", "I", "j", "c", "k"])
    assert.equal(
      keydown(target, { key, ctrlKey: true, shiftKey: true }),
      true,
      key,
    );
});

test("macOS 调试和查看源码快捷键按物理键位识别，兼容 Option 字符变化", () => {
  const target = new EventTarget();
  install(target);
  for (const code of ["KeyI", "KeyJ", "KeyC", "KeyK", "KeyU"])
    assert.equal(
      keydown(target, { key: "非英文字符", code, metaKey: true, altKey: true }),
      true,
      code,
    );
  assert.equal(keydown(target, { key: "u", ctrlKey: true }), true);
});

test("非开发环境拦截鼠标和键盘菜单，并停止下游页面监听器", () => {
  const target = new EventTarget();
  install(target);
  let forwarded = 0;
  target.addEventListener("contextmenu", () => forwarded++);
  target.addEventListener("keydown", () => forwarded++);
  const menu = new Event("contextmenu", { cancelable: true });
  target.dispatchEvent(menu);
  assert.equal(menu.defaultPrevented, true);
  assert.equal(keydown(target, { key: "ContextMenu" }), true);
  assert.equal(keydown(target, { key: "F10", shiftKey: true }), true);
  assert.equal(forwarded, 0);
});

test("非开发环境保留输入、复制粘贴、查找、刷新和普通导航快捷键", () => {
  const target = new EventTarget();
  install(target);
  for (const key of ["c", "v", "x", "a", "f", "r", "z"])
    for (const modifier of ["ctrlKey", "metaKey"])
      assert.equal(keydown(target, { key, [modifier]: true }), false);
  for (const key of ["i", "j", "c", "k", "u", "Enter", "Tab", "Escape", "F5"])
    assert.equal(keydown(target, { key }), false, key);
  // AltGr 输入可能同时带 Ctrl/Alt，不应误判为查看源码。
  assert.equal(
    keydown(target, { key: "ú", code: "KeyU", ctrlKey: true, altKey: true }),
    false,
  );
});
