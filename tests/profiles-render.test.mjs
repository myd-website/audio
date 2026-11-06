import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";

const require = createRequire(import.meta.url);
const { code: invitationCode } = require("../src/config/invitation.json");
const vue = require("vue");
const { Popup } = require("vant");

function component(file, imports) {
  const { descriptor } = parse(
    readFileSync(new URL(`../src/${file}.vue`, import.meta.url), "utf8"),
  );
  // 编译实际模板并挂载真实 Vant Popup，覆盖仅测试 setup 逻辑遗漏的 Teleport 时序。
  const script = compileScript(descriptor, { id: file, inlineTemplate: true });
  const { outputText } = ts.transpileModule(script.content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)(
    (id) => (id === "vue" ? vue : imports[id]),
    exports,
  );
  return exports.default;
}

function mount(t, current = null) {
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
  };
  function node(tag = "", text = "") {
    return {
      tag,
      text,
      children: [],
      parent: null,
      props: {},
      style: {},
      classList: { add() {}, remove() {} },
      addEventListener() {},
      removeEventListener() {},
      removeAttribute() {},
      setAttribute() {},
      focus() {},
    };
  }
  const body = node("body");
  const container = node("app");
  body.children.push(container);
  container.parent = body;
  function walk(root, predicate) {
    if (predicate(root)) return root;
    for (const child of root.children) {
      const found = walk(child, predicate);
      if (found) return found;
    }
  }
  function find(predicate) {
    return walk(body, predicate);
  }
  function text(root = body) {
    return root.text + root.children.map((child) => text(child)).join("");
  }
  function remove(child) {
    if (child.parent) {
      const siblings = child.parent.children;
      siblings.splice(siblings.indexOf(child), 1);
      child.parent = null;
    }
  }
  const errors = [],
    warnings = [],
    targets = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args.map(String).join(" "));
  const renderer = vue.createRenderer({
    createElement: (tag) => node(tag),
    createText: (text) => node("#text", text),
    createComment: (text) => node("#comment", text),
    insert(child, parent, anchor = null) {
      remove(child);
      const index = anchor ? parent.children.indexOf(anchor) : -1;
      parent.children.splice(
        index < 0 ? parent.children.length : index,
        0,
        child,
      );
      child.parent = parent;
    },
    remove,
    setElementText: (node, text) => {
      node.text = text;
      node.children = [];
    },
    setText: (node, text) => {
      node.text = text;
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) =>
      node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
    patchProp: (node, key, _, value) => {
      node.props[key] = value;
    },
    querySelector(selector) {
      const target = find(
        (node) =>
          selector === ".aide-app" &&
          node.props.class?.split(" ").includes("aide-app"),
      );
      targets.push(target ?? null);
      return target ?? null;
    },
  });
  let reloads = 0;
  globalThis.document = {
    body,
    documentElement: { style: {} },
    addEventListener() {},
    removeEventListener() {},
  };
  globalThis.window = {
    location: {
      href: "https://example.test/#/profiles",
      reload: () => reloads++,
    },
    history: { replaceState() {} },
    getComputedStyle: () => ({
      transitionDelay: "0s",
      transitionDuration: "0s",
      animationDelay: "0s",
      animationDuration: "0s",
    }),
  };
  globalThis.requestAnimationFrame = (callback) => queueMicrotask(callback);
  const profile = {
    current,
    error: "",
    isVerified: () => false,
    select(_, code) {
      if (!code.trim()) throw new Error("请输入邀请码");
      if (code.trim() !== invitationCode)
        throw new Error("邀请码错误，请重新输入");
    },
  };
  const player = vue.reactive({ queue: [], expanded: false, stop() {} });
  const route = vue.reactive({
    path: current ? "/today" : "/profiles",
    meta: {},
  });
  const shared = {
    "@/shared/stores/profile": { useProfileStore: () => profile },
    "@/shared/lib/profiles": {
      PROFILES: [
        { id: "one", name: "档案一", description: "第一份记录" },
        { id: "two", name: "档案二", description: "第二份记录" },
      ],
      profileName: (id) => (id === "one" ? "档案一" : "档案二"),
    },
    "@/shared/composables/useProfileActions": {
      useProfileActions: () => ({ exitProfile() {}, exiting: false }),
    },
  };
  const ProfilesPage = component("modules/account/pages/ProfilesPage", {
    ...shared,
    "@/shared/lib/feedback": { message: (error) => error.message },
  });
  const App = component("App", {
    ...shared,
    "vue-router": { useRoute: () => route },
    "@/modules/account/pages/ProfilesPage.vue": { default: ProfilesPage },
    "@/modules/music/components/GlobalPlayer.vue": {
      default: {
        setup: () => () =>
          vue.h(
            Popup,
            { show: player.expanded, teleport: ".aide-app" },
            () => "播放器",
          ),
      },
    },
    "@/modules/music/stores/player": { usePlayerStore: () => player },
    "@/modules/fun/stores/focus": { useFocusStore: () => ({ reset() {} }) },
    "@/shared/stores/workspace": { useWorkspaceStore: () => ({ error: "" }) },
    "@/shared/composables/useMobileViewport": {
      useMobileViewport: () => ({ keyboardOpen: false, viewportStyle: {} }),
    },
    "@/shared/composables/useFixedScale": { useFixedScale() {} },
    vant: { closeDialog() {} },
  });
  const app = renderer.createApp(App);
  app.component("van-popup", Popup);
  app.component("van-icon", { render: () => vue.h("i") });
  app.component("router-link", {
    render() {
      return vue.h("a", null, this.$slots.default?.());
    },
  });
  app.component("router-view", { render: () => vue.h("div", "首页") });
  app.config.errorHandler = (error) => errors.push(error);
  t.after(() => {
    try {
      app.unmount();
    } finally {
      console.warn = originalWarn;
      Object.assign(globalThis, previous);
    }
  });
  app.mount(container);
  return {
    errors,
    warnings,
    targets,
    find,
    text,
    player,
    route,
    reloads: () => reloads,
  };
}

test("冷启动点击两个档案可打开真实邀请码弹层，错误提示及取消重开均正常", async (t) => {
  const view = mount(t);
  await vue.nextTick();
  for (const name of ["档案一", "档案二"]) {
    const card = view.find(
      (node) => node.tag === "button" && view.text(node).includes(name),
    );
    card.props.onClick({ currentTarget: card });
    await vue.nextTick();
    assert.equal(view.errors.length, 0, view.errors.map(String).join("\n"));
    assert.ok(view.text().includes(`验证后即可进入${name}`));
    const form = view.find((node) => node.tag === "form");
    form.props.onSubmit({ preventDefault() {} });
    await vue.nextTick();
    assert.equal(
      view.find((node) => node.props.id === "invitation-error")?.text,
      "请输入邀请码",
    );
    const input = view.find((node) => node.props.id === "profile-invitation");
    input.props["onUpdate:modelValue"](`${invitationCode}-incorrect`);
    form.props.onSubmit({ preventDefault() {} });
    await vue.nextTick();
    assert.equal(
      view.find((node) => node.props.id === "invitation-error")?.text,
      "邀请码错误，请重新输入",
    );
    view
      .find((node) => node.tag === "button" && node.text === "取消")
      .props.onClick();
    await vue.nextTick();
  }
  assert.ok(view.targets.length > 0);
  assert.ok(
    view.targets.every(Boolean),
    "Teleport 解析目标时应用容器必须已挂载",
  );
  assert.deepEqual(view.errors, []);
  assert.deepEqual(view.warnings, []);
  assert.equal(view.reloads(), 0);
});

test("已验证会话冷启动后播放器弹层及切回档案页正常挂载", async (t) => {
  const view = mount(t, "one");
  await vue.nextTick();
  view.player.expanded = true;
  await vue.nextTick();
  assert.ok(view.text().includes("播放器"));
  view.route.path = "/profiles";
  await vue.nextTick();
  assert.ok(view.text().includes("今天，谁来使用？"));
  assert.ok(view.targets.every(Boolean));
  assert.deepEqual(view.errors, []);
  assert.deepEqual(view.warnings, []);
});
