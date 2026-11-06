import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { posix } from "node:path";
import test from "node:test";
import ts from "typescript";
import { compileScript, parse } from "vue/compiler-sfc";
const require = createRequire(import.meta.url),
  vue = require("vue"),
  vueRouter = require("vue-router");
const { code: invitationCode } = require("../src/config/invitation.json");
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
function load(path, overrides = {}, cache = new Map()) {
  if (cache.has(path)) return cache.get(path);
  if (path.endsWith(".json"))
    return {
      default: JSON.parse(
        readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8"),
      ),
    };
  const source = readFileSync(
    new URL(`../src/${path}.ts`, import.meta.url),
    "utf8",
  )
    .replaceAll("import.meta.env.BASE_URL", '"/audio/"')
    .replaceAll("import.meta.env.DEV", "false");
  const result = evaluate(
    source,
    (id) =>
      overrides[id] ??
      (id.startsWith("@/")
        ? load(id.slice(2), overrides, cache)
        : id.startsWith(".")
          ? load(
              posix.normalize(`${posix.dirname(path)}/${id}`),
              overrides,
              cache,
            )
          : require(id)),
  );
  cache.set(path, result);
  return result;
}
function environment(t) {
  const previous = {
    window: globalThis.window,
    fetch: globalThis.fetch,
    sessionStorage: globalThis.sessionStorage,
    document: globalThis.document,
  };
  globalThis.window = { setTimeout, clearTimeout };
  t.after(() => Object.assign(globalThis, previous));
}
function mount(t, file, overrides = {}, props = {}) {
  const { descriptor } = parse(
    readFileSync(new URL(`../src/${file}.vue`, import.meta.url), "utf8"),
  );
  const component = evaluate(
    compileScript(descriptor, { id: file }).content,
    (id) =>
      overrides[id] ?? (id.endsWith(".vue") ? { default: {} } : require(id)),
  ).default;
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
  let model,
    mounted = true;
  const app = renderer.createApp({
    setup() {
      model = component.setup(props, { expose() {} });
      return () => vue.h("div");
    },
  });
  app.mount({});
  const unmount = () => {
    if (mounted) app.unmount();
    mounted = false;
  };
  t.after(unmount);
  return { model, unmount };
}
test("日常计算支持优先级、括号、负数和精确小数，计算过程按顺序输出", () => {
  const { evaluateExpression: calc } = load("modules/study/domain/expression");
  for (const [expression, expected] of [
    ["0.1+0.2", "0.3"],
    ["1÷3×3", "1"],
    ["(12+8)×3", "60"],
    ["2+3*4", "14"],
    ["−2×(3+4)", "−14"],
    ["（.5+.25）÷3", "0.25"],
    ["8÷2÷2", "2"],
  ])
    assert.equal(calc(expression).answer, expected, expression);
  assert.deepEqual(calc("2+3*4").steps, ["3 × 4 = 12", "2 + 12 = 14"]);
  assert.equal(calc("1/3").approximate, true);
  assert.equal(calc("1/3").answer, "0.3333333333");
});
test("日常计算拒绝除零、代码、缺失运算符、超长和超深输入", () => {
  const { evaluateExpression: calc } = load("modules/study/domain/expression");
  for (const value of [
    "",
    "1/0",
    "1/(2-2)",
    "2(3)",
    "1 2",
    "1+",
    "(1+2",
    "alert(1)",
    "1234567890123",
    ".1234567",
    "1".repeat(161),
    "(".repeat(25) + "1" + ")".repeat(25),
  ])
    assert.throws(() => calc(value), value);
});
test("手机计算器正负号可切回、退格和清空有效", (t) => {
  const { model } = mount(t, "modules/study/components/PocketCalculator", {
    "../domain/expression": load("modules/study/domain/expression"),
  });
  for (const key of ["2", "+", "3", "±"]) model.key(key);
  model.calculate();
  assert.equal(model.result.value.answer, "−1");
  model.key("±");
  model.calculate();
  assert.equal(model.result.value.answer, "5");
  model.key("⌫");
  assert.equal(model.expression.value, "2+");
  model.key("C");
  assert.equal(model.expression.value, "");
});
test("科学计算保留整数幂、开方、阶乘、百分数与科学记数法的精确值", () => {
  const { evaluateExpression: calc } = load("modules/study/domain/expression");
  for (const [expression, answer] of [
    ["2^3^2", "512"],
    ["-2^2", "−4"],
    ["(-2)^2", "4"],
    ["2^-3", "0.125"],
    ["2^(-2^2)", "0.0625"],
    ["sqrt(9/16)", "0.75"],
    ["√(4)+abs(-3)", "5"],
    ["0!+5!", "121"],
    ["2^3!", "64"],
    ["200*10%", "20"],
    ["1e3+2E-2", "1000.02"],
    ["2x3+4X5", "26"],
    ["(1/3)^-1", "3"],
    ["1E-100", "1e-100"],
    ["-1E-11", "−1e-11"],
    ["sqrt(1E-100)", "1e-50"],
  ]) {
    const result = calc(expression);
    assert.equal(result.answer, answer, expression);
    assert.equal(result.approximate, false, expression);
  }
});
test("科学函数支持角度与弧度，近似状态和过程正确传递", () => {
  const { evaluateExpression: calc } = load("modules/study/domain/expression");
  for (const [expression, expected, angleMode] of [
    ["sin(30)+cos(60)", 1, "deg"],
    ["sin(-90)", -1, "deg"],
    ["cos(90)", 0, "deg"],
    ["tan(45)", 1, "deg"],
    ["asin(.5)+acos(.5)", 90, "deg"],
    ["atan(1)", 45, "deg"],
    ["sin(pi/2)", 1, "rad"],
    ["cos(π)", -1, "rad"],
    ["asin(1)", Math.PI / 2, "rad"],
    ["ln(e)", 1, "deg"],
    ["log(1000)", 3, "deg"],
    ["exp(1)", Math.E, "deg"],
    ["sqrt(2)^2", 2, "deg"],
    ["2^.5", Math.SQRT2, "deg"],
    ["1/(pi*1E100)", 1 / (Math.PI * 1e100), "deg"],
  ]) {
    const result = calc(expression, { angleMode });
    const actual = Number(result.answer.replace("−", "-"));
    assert.ok(
      Math.abs(actual - expected) <=
        Math.max(1e-110, Math.abs(expected) * 1e-9),
      `${expression}: ${actual}`,
    );
    assert.equal(result.approximate, true, expression);
  }
  const result = calc("sin(30)+2");
  assert.match(result.steps[0], /sin\(30\).*DEG.*≈/);
  assert.match(result.steps[1], /≈ 2.5$/);
  assert.deepEqual(calc("1/3").steps, ["1 ÷ 3 = (1/3)"]);
  assert.match(calc("exp(-100)").answer, /e-/);
});
test("科学计算拒绝定义域错误、溢出、无定义角度和非白名单代码", () => {
  const { evaluateExpression: calc } = load("modules/study/domain/expression");
  for (const expression of [
    "sqrt(-1)",
    "ln(0)",
    "log(-1)",
    "asin(2)",
    "acos(-2)",
    "asin(1+1E-100)",
    "tan(90)",
    "tan(-270)",
    "0^-1",
    "0^0",
    "(-2)^.5",
    "(-1)!",
    "1.5!",
    "101!",
    "sin(90)!",
    "2^1001",
    "1e101",
    "1e-101",
    "exp(1000)",
    "exp(-1000)",
    "exp(-500)^2",
    "exp(-500)*exp(-500)",
    "pi/(sin(0))",
    "sin()",
    "sin 30",
    "pow(2,3)",
    "Math.sin(0)",
    "constructor(1)",
    "sin(30",
    "2pi",
    "2sin(30)",
    "2**3",
    "sqrt(".repeat(25) + "1" + ")".repeat(25),
    "-".repeat(25) + "1",
    "2^".repeat(25) + "1",
  ])
    assert.throws(() => calc(expression), expression);
  assert.throws(() => calc("tan(pi/2)", { angleMode: "rad" }), /无定义/);
  assert.ok(calc("100!").answer.length > 100);
  assert.equal(calc("tan(89.999999)").approximate, true);
});
test("科学键盘可以输入函数，角度和算式变化清除旧结果，正负号作用于完整操作数", async (t) => {
  const { model } = mount(t, "modules/study/components/PocketCalculator", {
    "../domain/expression": load("modules/study/domain/expression"),
  });
  model.scientific.value = true;
  for (const key of ["sin(", "3", "0", ")"]) model.key(key);
  model.calculate();
  assert.equal(model.result.value.answer, "0.5");
  model.angleMode.value = "rad";
  assert.equal(model.result.value, undefined);
  model.calculate();
  assert.notEqual(model.result.value.answer, "0.5");
  model.expression.value = "2+sqrt(9)";
  assert.equal(model.result.value, undefined);
  model.key("±");
  model.calculate();
  assert.equal(model.result.value.answer, "−1");
  model.key("±");
  assert.equal(model.expression.value, "2+sqrt(9)");
  for (const value of [
    "2+1E-2",
    "2+π",
    "2+(3+4)",
    "3!",
    "10%",
    "√(4)",
    "2x(3+4)",
  ]) {
    model.expression.value = value;
    model.key("±");
    model.key("±");
    assert.equal(model.expression.value, value);
  }
  model.expression.value = "1".repeat(159);
  model.key("sin(");
  assert.equal(model.expression.value.length, 159);
  assert.match(model.error.value, /160/);
  await vue.nextTick();
});
test("科学键盘在光标处插入、替换选区、退格和清空", async (t) => {
  const { model } = mount(t, "modules/study/components/PocketCalculator", {
    "../domain/expression": load("modules/study/domain/expression"),
  });
  const input = {
    selectionStart: 2,
    selectionEnd: 2,
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
  };
  model.expressionInput.value = input;
  model.expression.value = "2+3";
  model.key("sin(");
  await vue.nextTick();
  assert.equal(model.expression.value, "2+sin(3");
  assert.equal(input.selectionStart, 6);
  input.selectionStart = 2;
  input.selectionEnd = 6;
  model.key("sqrt(");
  await vue.nextTick();
  assert.equal(model.expression.value, "2+sqrt(3");
  model.key("⌫");
  await vue.nextTick();
  assert.equal(model.expression.value, "2+sqrt3");
  model.key("C");
  await vue.nextTick();
  assert.equal(model.expression.value, "");
  assert.equal(input.selectionStart, 0);
});
const onlineMath = {
  code: 200,
  timu: "小明有6本书，小红有3本书。小明的书是小红的3倍吗？",
  daan: "不是，小明的书是小红的2倍。",
  jiexi: "6 ÷ 3 = 2，所以不是3倍。",
};
test("本地数学四类题型在各年级边界数字下给出正确答案，保留旧题号语义", () => {
  const { mathQuestion } = load("modules/study/domain/questions", {
    "@/shared/lib/random": {
      randomInt: (max) => max - 1,
      shuffle: (items) => [...items],
    },
  });
  const answers = [
    ["18", "81", "9", "90", "19.8", "11/6"],
    ["9", "9", "9", "9", "99", "11"],
    ["18", "81", "81", "81", "9801", "121"],
    ["9", "909", "36", "9009", "980.1", "1.1"],
  ];
  for (let grade = 1; grade <= 6; grade++) {
    const topics = new Set();
    for (let variant = 0; variant < 4; variant++) {
      const question = mathQuestion(grade, variant);
      assert.equal(question.expected, answers[variant][grade - 1]);
      assert.ok(question.prompt && question.explanation);
      assert.ok(question.id.startsWith(`math:${variant ? "v2" : "v1"}:`));
      topics.add(question.topic);
    }
    assert.equal(topics.size, 4);
  }
});
test("新增本地词汇题答案唯一，混合题组保留基础专项并补充五道词汇题", () => {
  const { supplementalQuestions } = load("modules/study/domain/supplemental");
  const { questions } = load("modules/study/domain/questions");
  for (const subject of ["chinese", "english"])
    for (let grade = 1; grade <= 6; grade++) {
      const pool = supplementalQuestions(subject, grade);
      assert.ok(pool.length >= 12);
      assert.equal(
        new Set(pool.map((question) => question.id)).size,
        pool.length,
      );
      for (const question of pool) {
        assert.equal(new Set(question.options).size, 4);
        assert.equal(
          question.options.filter((option) => option === question.expected)
            .length,
          1,
        );
        assert.ok(question.explanation);
      }
      const group = questions(subject, grade);
      assert.equal(group.length, 10);
      assert.equal(
        group.filter((question) => question.id.includes(":v1:")).length,
        5,
      );
      assert.equal(
        group.filter((question) => question.id.includes(":v2:")).length,
        5,
      );
    }
});
test("数学每轮请求一道在线综合题并补齐年级题；语文英语直接使用本地题库", async (t) => {
  environment(t);
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.ok(url.startsWith("https://cn.apihz.cn/api/zici/shuxuex.php?"));
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
    return { ok: true, json: async () => onlineMath };
  };
  for (let grade = 1; grade <= 6; grade++) {
    const practice = load("modules/study/services/practice");
    const result = await practice.loadPracticeQuestions("math", grade);
    assert.equal(result.source, "mixed");
    assert.equal(result.questions.length, 10);
    assert.equal(new Set(result.questions.map((q) => q.id)).size, 10);
    assert.equal(result.questions[0].prompt, onlineMath.timu);
    assert.ok(practice.isSelfCheckQuestion(result.questions[0]));
    assert.ok(result.questions.every((q) => q.grade === grade));
    assert.ok(
      result.questions.slice(1).every((q) => !practice.isSelfCheckQuestion(q)),
    );
    assert.match(result.notice, /不分年级/);
  }
  const practice = load("modules/study/services/practice");
  for (const subject of ["chinese", "english"]) {
    const result = await practice.loadPracticeQuestions(subject, 6);
    assert.equal(result.source, "local");
    assert.equal(result.questions.length, 10);
  }
  await assert.rejects(practice.loadPracticeQuestions("math", 7), /年级/);
  await assert.rejects(practice.loadPracticeQuestions("bad", 1), /学科/);
  assert.equal(calls, 6);
});
test("在线题目校验持久化字段，题号稳定，错误或缺字段时自动回退本地", async (t) => {
  environment(t);
  const { normalizeMathQuestion } = load("modules/study/services/practice");
  const first = normalizeMathQuestion(onlineMath, 6);
  assert.equal(first.id, normalizeMathQuestion(onlineMath, 1).id);
  assert.notEqual(
    first.id,
    normalizeMathQuestion({ ...onlineMath, daan: "另一个答案" }, 6).id,
  );
  const workspace = load("shared/lib/workspace");
  const data = workspace.emptyWorkspace();
  data.attempts.push({
    id: "attempt",
    questionId: first.id,
    subject: first.subject,
    grade: first.grade,
    question: first.prompt,
    answer: "不是",
    expected: first.expected,
    explanation: first.explanation,
    correct: true,
    at: "2026-11-04T10:00:00Z",
  });
  assert.equal(
    workspace.decodeWorkspace(JSON.stringify(data)).attempts[0].questionId,
    first.id,
  );
  for (const failure of [
    async () => {
      throw new TypeError("network");
    },
    async () => ({ ok: false, status: 429 }),
    async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("JSON");
      },
    }),
    ...[
      null,
      [],
      { code: 400 },
      { code: 200 },
      { ...onlineMath, daan: "" },
      { ...onlineMath, timu: "题".repeat(1001) },
      { ...onlineMath, daan: "答".repeat(201) },
      { ...onlineMath, jiexi: "解".repeat(2001) },
    ].map((payload) => async () => ({ ok: true, json: async () => payload })),
  ]) {
    globalThis.fetch = failure;
    const practice = load("modules/study/services/practice");
    const result = await practice.loadPracticeQuestions("math", 6);
    assert.equal(result.source, "local");
    assert.equal(result.questions.length, 10);
    assert.ok(result.questions.every((q) => !practice.isSelfCheckQuestion(q)));
    assert.match(result.notice, /自动使用本地/);
  }
});
test("在线出题五秒超时回退，重复开始受频次保护，取消不触发回退", async (t) => {
  environment(t);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return { ok: true, json: async () => onlineMath };
  };
  const practice = load("modules/study/services/practice");
  await practice.loadPracticeQuestions("math", 6);
  const limited = await practice.loadPracticeQuestions("math", 6);
  assert.equal(calls, 1);
  assert.equal(limited.source, "local");
  assert.match(limited.notice, /频繁/);
  window.setTimeout = (callback, delay) =>
    setTimeout(callback, delay === 5000 ? 1 : delay);
  let signal;
  globalThis.fetch = async (_url, options) =>
    new Promise((_, reject) => {
      signal = options.signal;
      signal.addEventListener(
        "abort",
        () => reject(new DOMException("aborted", "AbortError")),
        { once: true },
      );
    });
  const timeout = await load(
    "modules/study/services/practice",
  ).loadPracticeQuestions("math", 6);
  assert.equal(signal.aborted, true);
  assert.equal(timeout.source, "local");
  assert.match(timeout.notice, /超时/);
  const controller = new AbortController();
  let localCalls = 0;
  const cancelled = load("modules/study/services/practice", {
    "../domain/questions": {
      questions() {
        localCalls++;
        return [];
      },
    },
  });
  globalThis.fetch = async () => {
    controller.abort();
    throw new TypeError("network");
  };
  await assert.rejects(
    cancelled.loadPracticeQuestions("math", 6, controller.signal),
    { name: "AbortError" },
  );
  await assert.rejects(
    cancelled.loadPracticeQuestions("math", 6, controller.signal),
    { name: "AbortError" },
  );
  assert.equal(localCalls, 0);
});
function mountStudy(t, loadQuestions) {
  let beforeLeave;
  const toasts = [];
  const store = vue.reactive({
    ready: true,
    fail: false,
    data: { preferences: { grade: 6 }, attempts: [] },
    addAttempt(attempt) {
      if (this.fail) throw new Error("保存失败");
      this.data.attempts.push(attempt);
    },
  });
  const practice = load("modules/study/services/practice");
  const mounted = mount(t, "modules/study/pages/StudyPage", {
    "vue-router": {
      useRoute: () => ({ query: {} }),
      onBeforeRouteLeave: (callback) => {
        beforeLeave = callback;
      },
    },
    vant: {
      showToast: (text) => toasts.push(text),
      showConfirmDialog: async () => {},
    },
    "../domain/questions": load("modules/study/domain/questions"),
    "../services/practice": {
      ...practice,
      loadPracticeQuestions: loadQuestions ?? practice.loadPracticeQuestions,
    },
    "@/shared/lib/workspace": load("shared/lib/workspace"),
    "@/shared/stores/workspace": { useWorkspaceStore: () => store },
    "@/shared/lib/feedback": {
      message: (error) => error.message,
      act(action) {
        try {
          action();
          return true;
        } catch (error) {
          toasts.push(error.message);
          return false;
        }
      },
    },
  });
  return { ...mounted, store, toasts, beforeLeave: () => beforeLeave() };
}
test("在线综合题自行核对后才记录结果，保存失败可重试，复习不联网且保留自评方式", async (t) => {
  environment(t);
  globalThis.fetch = async () => ({ ok: true, json: async () => onlineMath });
  const { model, store, toasts } = mountStudy(t);
  model.subject.value = "math";
  await vue.nextTick();
  await model.start();
  assert.equal(model.quiz.value.length, 10);
  assert.equal(model.selfCheck.value, true);
  model.saveAnswer(true);
  assert.equal(store.data.attempts.length, 0);
  model.answer.value = "不是";
  model.submit();
  assert.equal(model.selfCheckRevealed.value, true);
  assert.equal(store.data.attempts.length, 0);
  model.next();
  assert.equal(model.position.value, 0);
  store.fail = true;
  model.saveAnswer(false);
  assert.equal(store.data.attempts.length, 0);
  assert.equal(model.submitted.value, null);
  assert.match(toasts[0], /保存失败/);
  store.fail = false;
  model.saveAnswer(false);
  model.saveAnswer(false);
  assert.equal(store.data.attempts.length, 1);
  assert.equal(model.results.value.length, 1);
  assert.equal(model.wrong.value.length, 1);
  model.next();
  assert.equal(model.selfCheck.value, false);
  assert.equal(model.selfCheckRevealed.value, false);
  model.answer.value = model.current.value.expected;
  model.submit();
  assert.equal(store.data.attempts.length, 2);
  assert.equal(model.submitted.value.correct, true);
  await model.end();
  model.mode.value = "review";
  await vue.nextTick();
  globalThis.fetch = async () => {
    throw new Error("复习不应联网");
  };
  await model.start();
  assert.equal(model.quiz.value.length, 1);
  assert.equal(model.selfCheck.value, true);
  model.answer.value = "不是，是2倍";
  model.submit();
  model.saveAnswer(true);
  assert.equal(model.wrong.value.length, 0);
});
test("加载练习时阻止重复开始，切换学科、年级、模式和离开后丢弃迟到题目", async (t) => {
  environment(t);
  const pending = [];
  const { model, beforeLeave, unmount } = mountStudy(
    t,
    (_subject, _grade, signal) =>
      new Promise((resolve) => pending.push({ signal, resolve })),
  );
  const { questions } = load("modules/study/domain/questions");
  const result = {
    questions: questions("math", 6),
    source: "local",
    notice: "本地",
  };
  const first = model.start();
  await model.start();
  assert.equal(pending.length, 1);
  for (const [field, value] of [
    ["subject", "math"],
    ["grade", 5],
    ["mode", "review"],
  ]) {
    model[field].value = value;
    await vue.nextTick();
    assert.equal(pending.at(-1).signal.aborted, true);
    pending.at(-1).resolve(result);
    if (field === "subject") await first;
    assert.equal(model.quiz.value.length, 0);
    if (field !== "mode") {
      void model.start();
    }
  }
  model.mode.value = "practice";
  await vue.nextTick();
  const leaving = model.start();
  await beforeLeave();
  assert.equal(pending.at(-1).signal.aborted, true);
  pending.at(-1).resolve(result);
  await leaving;
  assert.equal(model.quiz.value.length, 0);
  const last = model.start();
  unmount();
  assert.equal(pending.at(-1).signal.aborted, true);
  pending.at(-1).resolve(result);
  await last;
  assert.equal(model.quiz.value.length, 0);
});
const hanzi = {
  code: 200,
  data: {
    拼音: ["lè", "yuè"],
    释义: [["快乐。"], ["音乐。"]],
    组词: [["快乐"], ["音乐"]],
    读音: ["https://example.com/le.mp3", "javascript:alert(1)"],
    部首: ["丿"],
    笔画: 5,
    结构: "单一结构",
    GIF: "https://example.com/le.gif",
    PNG: "http://example.com/le.png",
    近义词: ["欢", "笑", "欢", "", null],
    反义词: ["哀", "忧"],
    更多: "乐是多音字。\n不同读音有不同含义。",
    百科: "http://baike.baidu.com/view/123.htm?forcehttps=1",
  },
};
const english = [
  {
    word: "apple",
    meanings: [
      {
        partOfSpeech: "noun",
        definitions: [{ definition: "A fruit.", example: "an apple" }],
      },
    ],
    phonetics: [{ text: "/ˈæpəl/", audio: "https://example.com/apple.mp3" }],
    sourceUrls: ["javascript:alert(1)", "https://example.com/apple"],
    license: { name: "CC BY-SA", url: "https://example.com/license" },
  },
];
function localResponse(url) {
  assert.ok(url.startsWith("/audio/dictionaries/v1/"), url);
  return {
    ok: true,
    json: async () =>
      JSON.parse(
        readFileSync(
          new URL(`../public/${url.slice("/audio/".length)}`, import.meta.url),
          "utf8",
        ),
      ),
  };
}
test("恢复词库分片数量、字节和清单一致，四类均使用真实数据", async (t) => {
  environment(t);
  const manifest = JSON.parse(
    readFileSync(
      new URL("../public/dictionaries/v1/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const [kind, stats] of Object.entries(manifest.datasets)) {
    const path = new URL(`../public/dictionaries/v1/${kind}/`, import.meta.url),
      files = readdirSync(path);
    assert.equal(files.length, 128);
    let count = 0,
      bytes = 0,
      max = 0;
    for (const file of files) {
      const raw = readFileSync(new URL(file, path));
      const data = JSON.parse(raw);
      assert.equal(data.kind, kind);
      count += data.entries.length;
      bytes += raw.length;
      max = Math.max(max, raw.length);
    }
    assert.equal(count, stats.entries);
    assert.equal(bytes, stats.bytes);
    assert.equal(max, stats.maxShardBytes);
  }
  globalThis.fetch = async (url) => localResponse(url);
  const dictionary = load("modules/study/services/dictionary");
  for (const [kind, query] of [
    ["character", "学"],
    ["word", "学习"],
    ["word", "快乐"],
    ["idiom", "画蛇添足"],
    ["english", "APPLE"],
  ]) {
    const found = await dictionary.lookupLocal(kind, query);
    assert.ok(found.exact);
    assert.equal(found.entries[0].term, query.toLowerCase());
  }
  const prefix = await dictionary.lookupLocal("idiom", "一心");
  assert.ok(prefix.entries.length > 1);
});
test("汉字默认在线，英语主动切换才查接口；多音字分组正确且过滤不安全链接", async (t) => {
  environment(t);
  const dictionary = load("modules/study/services/dictionary"),
    calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    assert.equal(options.credentials, "omit");
    return {
      ok: true,
      json: async () => (url.includes("hanzi") ? hanzi : english),
    };
  };
  const chinese = await dictionary.lookupDictionary("character", "乐");
  assert.equal(chinese.source, "online");
  assert.equal(chinese.entries[1].definition, "音乐。");
  assert.deepEqual(chinese.entries[1].related, ["音乐"]);
  assert.equal(chinese.entries[1].audio, undefined);
  assert.equal(chinese.entries[0].structure, "单一结构");
  assert.equal(
    chinese.entries[0].strokeAnimation,
    "https://example.com/le.gif",
  );
  assert.equal(chinese.entries[0].characterImage, "https://example.com/le.png");
  assert.deepEqual(chinese.entries[0].synonyms, ["欢", "笑"]);
  assert.deepEqual(chinese.entries[0].antonyms, ["哀", "忧"]);
  assert.match(chinese.entries[0].extraInfo, /不同读音/);
  assert.equal(
    chinese.entries[0].encyclopedia,
    "https://baike.baidu.com/view/123.htm?forcehttps=1",
  );
  assert.equal(
    chinese.entries[1].strokeAnimation,
    chinese.entries[0].strokeAnimation,
  );
  const result = await dictionary.lookupDictionary(
    "english",
    "APPLE",
    undefined,
    undefined,
    { onlineFirst: true },
  );
  assert.equal(result.source, "online");
  assert.equal(result.entries[0].pronunciation, "/ˈæpəl/");
  assert.equal(result.entries[0].source, "https://example.com/apple");
  assert.equal(calls.length, 2);
  assert.ok(calls.every((url) => url.startsWith("https:")));
});
test("汉字可选资料缺失或格式错误不影响释义，图片及百科拒绝不安全链接", () => {
  const { normalizeCharacterEntries } = load(
    "modules/study/services/dictionary",
  );
  const [missing] = normalizeCharacterEntries(
    {
      code: 200,
      data: {
        拼音: ["lè"],
        释义: [["快乐。"]],
      },
    },
    "乐",
  );
  assert.equal(missing.definition, "快乐。");
  assert.equal(missing.strokeAnimation, undefined);
  assert.equal(missing.characterImage, undefined);
  assert.equal(missing.structure, undefined);
  assert.deepEqual(missing.synonyms, []);
  for (const unsafe of [
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "file:///tmp/le.gif",
    "https://user:password@example.com/le.gif",
    "https://example.com/" + "a".repeat(4096),
  ]) {
    const [entry] = normalizeCharacterEntries(
      {
        ...hanzi,
        data: {
          ...hanzi.data,
          GIF: unsafe,
          PNG: unsafe,
          百科: unsafe,
          结构: {},
          更多: [],
          近义词: {},
          反义词: [null, 1, ""],
        },
      },
      "乐",
    );
    assert.equal(entry.strokeAnimation, undefined);
    assert.equal(entry.characterImage, undefined);
    assert.equal(entry.encyclopedia, undefined);
    assert.equal(entry.structure, undefined);
    assert.equal(entry.extraInfo, undefined);
    assert.deepEqual(entry.synonyms, []);
    assert.deepEqual(entry.antonyms, []);
    assert.equal(entry.definition, "快乐。");
  }
});
test("书写动图失败后切换静态图，全部失败可重试，换字清理失败状态", async (t) => {
  const dictionary = load("modules/study/services/dictionary");
  const entry = dictionary.normalizeCharacterEntries(hanzi, "乐")[0];
  const props = vue.reactive({ entry });
  const { model } = mount(
    t,
    "modules/study/components/DictionaryCharacterDetails",
    {},
    props,
  );
  assert.equal(model.imageUrl.value, entry.strokeAnimation);
  assert.equal(model.animated.value, true);
  assert.deepEqual(model.facts.value, [
    { label: "部首", value: "丿" },
    { label: "笔画", value: "5" },
    { label: "结构", value: "单一结构" },
  ]);
  assert.equal(model.wordGroups.value.length, 2);
  model.imageError({ target: { currentSrc: entry.strokeAnimation } });
  assert.equal(model.imageUrl.value, entry.characterImage);
  assert.equal(model.animated.value, false);
  model.imageError({ target: { src: entry.characterImage } });
  assert.equal(model.imageUrl.value, undefined);
  assert.equal(model.hasImages.value, true);
  model.failedImages.value = [];
  assert.equal(model.imageUrl.value, entry.strokeAnimation);
  model.imageError({ target: { currentSrc: entry.strokeAnimation } });
  props.entry = {
    term: "学",
    pronunciation: "xué",
    definition: "学习。",
    characterImage: "https://example.com/xue.png",
  };
  await vue.nextTick();
  assert.equal(model.imageUrl.value, props.entry.characterImage);
  model.imageError({ target: { currentSrc: entry.characterImage } });
  assert.equal(model.imageUrl.value, props.entry.characterImage);
  props.entry = { term: "学", pronunciation: "xué", definition: "学习。" };
  await vue.nextTick();
  assert.equal(model.hasImages.value, false);
  assert.equal(model.hasDetails.value, false);
});
test("英汉默认直接查中文词库，保留音标、英文解释和词形，不请求英文接口", async (t) => {
  environment(t);
  const dictionary = load("modules/study/services/dictionary"),
    calls = [],
    stages = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return localResponse(url);
  };
  for (const [query, chinese] of [
    [" APPLE ", "苹果"],
    ["school", "学校"],
    ["friend", "朋友"],
    ["happy", "快乐"],
  ]) {
    const result = await dictionary.lookupDictionary(
      "english",
      query,
      undefined,
      (stage) => stages.push(stage),
    );
    assert.equal(result.query, query.trim().toLowerCase());
    assert.equal(result.source, "local");
    assert.ok(result.exact);
    const entry = result.entries[0];
    assert.equal(entry.term, result.query);
    assert.ok(entry.definition.includes(chinese));
    assert.ok(entry.pronunciation);
    assert.ok(entry.english);
    assert.ok(entry.forms);
    assert.match(result.notice, /中文释义/);
  }
  const prefix = await dictionary.lookupDictionary("english", "app");
  assert.ok(prefix.entries.some((entry) => entry.term === "apple"));
  const missing = await dictionary.lookupDictionary(
    "english",
    "zzzzzznotaword",
  );
  assert.deepEqual(missing.entries, []);
  assert.equal(missing.exact, 0);
  assert.ok(
    calls.every((url) => url.startsWith("/audio/dictionaries/v1/english/")),
  );
  assert.deepEqual(stages, ["local", "local", "local", "local"]);
});
test("英汉词库加载失败明确报错，不以在线英文结果替代中文释义", async (t) => {
  environment(t);
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    return { ok: false, status: 503 };
  };
  await assert.rejects(
    load("modules/study/services/dictionary").lookupDictionary(
      "english",
      "apple",
    ),
    /本地词库请求失败（503）/,
  );
  assert.equal(calls.length, 1);
  assert.ok(calls[0].startsWith("/audio/dictionaries/v1/english/"));
});
test("接口 HTTP、网络、JSON、业务及格式错误自动回退本地", async (t) => {
  environment(t);
  for (const failure of [
    async () => ({ ok: false, status: 403 }),
    async () => {
      throw new TypeError("network");
    },
    async () => ({
      ok: true,
      json: async () => {
        throw new SyntaxError("json");
      },
    }),
    async () => ({ ok: true, json: async () => ({ code: 500 }) }),
    async () => ({ ok: true, json: async () => ({ code: 200, data: {} }) }),
  ]) {
    const dictionary = load("modules/study/services/dictionary"),
      calls = [],
      stages = [];
    globalThis.fetch = async (url) => {
      calls.push(url);
      return url.startsWith("https:") ? failure() : localResponse(url);
    };
    const found = await dictionary.lookupDictionary(
      "character",
      "学",
      undefined,
      (stage) => stages.push(stage),
    );
    assert.equal(found.source, "local");
    assert.equal(found.entries[0].term, "学");
    assert.match(found.notice, /自动切换/);
    assert.equal(calls.length, 2);
    assert.deepEqual(stages, ["online", "local"]);
  }
});
test("主动查询在线英语时，八秒超时、404 或空结果回退英汉词库；双端未收录如实返回", async (t) => {
  environment(t);
  window.setTimeout = (callback, delay) =>
    setTimeout(callback, delay === 8000 ? 1 : delay);
  let signal;
  globalThis.fetch = async (url, options) =>
    url.startsWith("https:")
      ? new Promise((_, reject) => {
          signal = options.signal;
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        })
      : localResponse(url);
  const timed = await load(
    "modules/study/services/dictionary",
  ).lookupDictionary("english", "apple", undefined, undefined, {
    onlineFirst: true,
  });
  assert.equal(signal.aborted, true);
  assert.equal(timed.source, "local");
  assert.match(timed.notice, /超时/);
  window.setTimeout = setTimeout;
  for (const response of [
    { status: 404 },
    { ok: true, json: async () => [] },
  ]) {
    const dictionary = load("modules/study/services/dictionary");
    globalThis.fetch = async (url) =>
      url.startsWith("https:") ? response : localResponse(url);
    const found = await dictionary.lookupDictionary(
      "english",
      "apple",
      undefined,
      undefined,
      { onlineFirst: true },
    );
    assert.equal(found.source, "local");
    assert.match(found.notice, /未收录/);
    assert.deepEqual(
      (
        await dictionary.lookupDictionary(
          "english",
          "zzzzzznotaword",
          undefined,
          undefined,
          { onlineFirst: true },
        )
      ).entries,
      [],
    );
  }
});
test("取消不触发本地回退，非法输入不发请求，本地取消不返回旧结果", async (t) => {
  environment(t);
  const dictionary = load("modules/study/services/dictionary"),
    controller = new AbortController();
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    controller.abort();
    throw new TypeError("network");
  };
  await assert.rejects(
    dictionary.lookupDictionary("character", "学", controller.signal),
    { name: "AbortError" },
  );
  await assert.rejects(
    dictionary.lookupDictionary("character", "学", controller.signal),
    { name: "AbortError" },
  );
  await assert.rejects(dictionary.lookupDictionary("english", "../bad"));
  assert.equal(calls, 1);
  const local = new AbortController();
  globalThis.fetch = async (url) => {
    if (url.startsWith("https:")) return { status: 404 };
    local.abort();
    return localResponse(url);
  };
  await assert.rejects(
    dictionary.lookupDictionary("english", "apple", local.signal),
    { name: "AbortError" },
  );
});
test("接口和本地同时失败明确报错；词语和成语不向需密钥的接口发请求", async (t) => {
  environment(t);
  const dictionary = load("modules/study/services/dictionary");
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(
    dictionary.lookupDictionary("character", "学"),
    /在线.*本地.*503/,
  );
  globalThis.fetch = async (url) => localResponse(url);
  for (const [kind, query] of [
    ["word", "快乐"],
    ["idiom", "一心"],
  ]) {
    const found = await dictionary.lookupDictionary(kind, query);
    assert.equal(found.source, "local");
    assert.ok(found.entries.length);
    assert.doesNotMatch(found.notice, /错误|失败/);
  }
});
function mountDictionary(t, lookupDictionary) {
  const route = vue.reactive({ query: { kind: "character" } });
  const mounted = mount(t, "modules/study/pages/DictionaryPage", {
    "vue-router": {
      useRoute: () => route,
      useRouter: () => ({ replace() {} }),
    },
    "../services/dictionary": {
      ...load("modules/study/services/dictionary"),
      lookupDictionary,
    },
    "@/shared/lib/feedback": { message: (error) => error.message },
    "@/modules/music/stores/player": { usePlayerStore: () => ({ pause() {} }) },
    "../components/DictionaryCharacterDetails.vue": { default: {} },
  });
  return { ...mounted, route };
}
test("英汉页面默认中文，支持切换在线英文和返回中文，新查询仍使用英汉词库", async (t) => {
  environment(t);
  const dictionary = load("modules/study/services/dictionary");
  let onlineCalls = 0;
  globalThis.fetch = async (url) => {
    if (!url.startsWith("https:")) return localResponse(url);
    onlineCalls++;
    return { ok: true, json: async () => english };
  };
  const { model, route } = mountDictionary(t, dictionary.lookupDictionary);
  route.query.kind = "english";
  await vue.nextTick();
  assert.equal(model.selected.value.name, "英汉词典");
  await model.search("APPLE");
  assert.equal(onlineCalls, 0);
  assert.equal(model.source.value, "local");
  assert.match(model.entries.value[0].definition, /苹果/);
  await model.search(model.submitted.value, true);
  assert.equal(onlineCalls, 1);
  assert.equal(model.source.value, "online");
  assert.match(model.entries.value[0].definition, /A fruit/);
  assert.match(model.notice.value, /切回英汉释义/);
  assert.ok(model.entries.value[0].audio);
  await model.search(model.submitted.value);
  assert.match(model.entries.value[0].definition, /苹果/);
  await model.search("school");
  assert.equal(onlineCalls, 1);
  assert.equal(model.source.value, "local");
  assert.match(model.entries.value[0].definition, /学校/);
  globalThis.fetch = async () => {
    throw new TypeError("network");
  };
  await model.search("apple", true);
  assert.equal(model.source.value, "local");
  assert.match(model.notice.value, /自动切换/);
  assert.match(model.entries.value[0].definition, /苹果/);
});
test("字典显示来源与回退原因，切换类型和卸载取消请求，迟到结果不覆盖", async (t) => {
  const pending = [];
  const { model, route, unmount } = mountDictionary(
    t,
    (_kind, query, signal, onStage) =>
      new Promise((resolve) =>
        pending.push({ query, signal, onStage, resolve }),
      ),
  );
  const first = model.search("学"),
    second = model.search("数");
  assert.equal(pending[0].signal.aborted, true);
  pending[1].resolve({
    entries: [{ term: "数" }],
    exact: 1,
    source: "local",
    notice: "已自动切换",
  });
  await second;
  pending[0].onStage("online");
  pending[0].resolve({
    entries: [{ term: "学" }],
    exact: 1,
    source: "online",
    notice: "",
  });
  await first;
  assert.equal(model.entries.value[0].term, "数");
  assert.equal(model.source.value, "local");
  assert.equal(model.notice.value, "已自动切换");
  const third = model.search("乐");
  route.query.kind = "english";
  await vue.nextTick();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve({ entries: [{ term: "乐" }] });
  await third;
  assert.deepEqual(model.entries.value, []);
  assert.equal(model.source.value, undefined);
  const fourth = model.search("apple");
  unmount();
  assert.equal(pending[3].signal.aborted, true);
  pending[3].resolve({ entries: [{ term: "apple" }] });
  await fourth;
  assert.deepEqual(model.entries.value, []);
});
function mountMusic(t, searchMusic = async () => []) {
  const player = { queue: [], stop() {}, pause() {}, current: null },
    toasts = [];
  return {
    ...mount(t, "modules/music/pages/MusicPage", {
      "vue-router": { useRouter: () => ({ push() {} }) },
      vant: {
        showToast: (value) => toasts.push(value),
        showConfirmDialog: async () => {},
      },
      "../stores/player": { usePlayerStore: () => player },
      "../services/source": {
        searchMusic,
        SOURCE_SITE: "https://www.qqmp3.vip/",
      },
      "../services/localFiles": { listLocal: async () => [] },
      "@/shared/stores/workspace": {
        useWorkspaceStore: () => ({ data: { favorites: [] } }),
      },
      "@/shared/lib/feedback": { message: (error) => error.message },
      "@/shared/services/download": {},
    }),
    toasts,
  };
}
test("默认音乐搜索明确显示关键词和原站入口，复制动作有效", async (t) => {
  let calls = 0;
  const { model, toasts } = mountMusic(t, async () => {
    calls++;
    return [];
  });
  model.keyword.value = "晴天";
  await model.search();
  assert.equal(calls, 0);
  assert.equal(model.tab.value, "online");
  assert.equal(model.sourceVisible.value, true);
  assert.equal(model.sourceSearchTerm.value, "晴天");
  const previous = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  let copied;
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async (value) => {
          copied = value;
        },
      },
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "navigator", previous);
    else delete globalThis.navigator;
  });
  await model.copyKeyword();
  assert.equal(copied, "晴天");
  assert.match(toasts.at(-1), /已复制/);
});
test("音乐接口 403 自动显示原站入口，保留失败原因和关键词，后续不重复请求接口", async (t) => {
  let calls = 0;
  const { model } = mountMusic(t, async () => {
    calls++;
    throw new Error("音源拒绝了请求（403）");
  });
  model.searchMode.value = "api";
  await vue.nextTick();
  model.keyword.value = "晴天";
  await model.search();
  await vue.nextTick();
  assert.match(model.sourceSearchFailure.value, /403/);
  assert.equal(model.busy.value, false);
  assert.equal(model.tab.value, "online");
  assert.equal(model.sourceVisible.value, true);
  assert.equal(model.searchMode.value, "source");
  assert.equal(model.sourceSearchTerm.value, "晴天");
  model.keyword.value = "天使的翅膀";
  await model.search();
  assert.equal(calls, 1);
  assert.equal(model.sourceSearchTerm.value, "天使的翅膀");
  assert.equal(model.sourceSearchFailure.value, "");
});
test("音乐接口返回途中修改输入，失败时仍保留本次查询词，离开后失败不跳页", async (t) => {
  let reject;
  const { model } = mountMusic(
    t,
    () =>
      new Promise((_, fail) => {
        reject = fail;
      }),
  );
  model.searchMode.value = "api";
  await vue.nextTick();
  model.keyword.value = "天使的翅膀";
  const pending = model.search();
  model.keyword.value = "晴天";
  reject(new TypeError("Failed to fetch"));
  await pending;
  await vue.nextTick();
  assert.equal(model.sourceSearchTerm.value, "天使的翅膀");
  assert.equal(model.keyword.value, "晴天");
  assert.match(model.sourceSearchFailure.value, /Failed to fetch/);

  model.searchMode.value = "api";
  await vue.nextTick();
  const next = model.search();
  model.tab.value = "local";
  await vue.nextTick();
  reject(new Error("迟到的失败"));
  await next;
  assert.equal(model.tab.value, "local");
  assert.equal(model.sourceSearchFailure.value, "");
});
test("音乐切换页签取消接口请求，过期结果不能覆盖原站搜索", async (t) => {
  let resolve, signal;
  const { model } = mountMusic(t, (_, currentSignal) => {
    signal = currentSignal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  model.searchMode.value = "api";
  await vue.nextTick();
  model.keyword.value = "晴天";
  const pending = model.search();
  model.useSourceSearch();
  await vue.nextTick();
  resolve([{ id: "old" }]);
  await pending;
  assert.equal(signal.aborted, true);
  assert.equal(model.tab.value, "online");
  assert.deepEqual(model.results.value, []);
});
function profileSession(t, initial = []) {
  environment(t);
  const { createPinia, setActivePinia } = require("pinia");
  const values = new Map(initial);
  const session = {
    fail: false,
    getItem: (key) => values.get(key) ?? null,
    setItem(key, value) {
      if (session.fail) throw new Error("存储失败");
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
  };
  globalThis.sessionStorage = session;
  const profiles = load("shared/lib/profiles");
  const { useProfileStore } = load("shared/stores/profile");
  function reload() {
    setActivePinia(createPinia());
    const store = useProfileStore();
    t.after(() => store.$dispose());
    return store;
  }
  return {
    profiles,
    values,
    session,
    reload,
    useProfileStore,
    store: reload(),
  };
}
test("邀请码必填且区分大小写；两个档案独立验证，刷新保留，退出重验", (t) => {
  const { store, profiles, values, reload } = profileSession(t);
  assert.equal(store.current, null);
  assert.throws(() => store.requireCurrent(), /选择/);
  for (const id of ["one", "two"]) {
    assert.throws(() => store.select(id), /请输入邀请码/);
    assert.throws(
      () => store.select(id, `${invitationCode}-incorrect`),
      /邀请码错误/,
    );
    if (invitationCode.toUpperCase() !== invitationCode)
      assert.throws(
        () => store.select(id, invitationCode.toUpperCase()),
        /邀请码错误/,
      );
    assert.equal(values.size, 0);
  }
  store.select("one", ` ${invitationCode} `);
  assert.equal(store.current, null, "当前文档不能提前切换档案绑定");
  const first = reload();
  assert.equal(first.requireCurrent(), "one");
  assert.equal(first.isVerified("one"), true);
  assert.equal(first.isVerified("two"), false);
  assert.throws(() => first.select("two"), /请输入邀请码/);
  first.select("two", invitationCode);
  const second = reload();
  assert.equal(second.requireCurrent(), "two");
  second.select("one");
  assert.equal(reload().requireCurrent(), "one");
  assert.deepEqual(JSON.parse(values.get(profiles.PROFILE_SESSION_KEY)), {
    current: "one",
    verified: ["one", "two"],
  });
  second.exit();
  assert.equal(reload().current, null);
  assert.throws(() => reload().select("one"), /请输入邀请码/);
});
test("旧版选择、损坏或伪造格式不放行；存储失败不保留验证或更改原会话", (t) => {
  const { store, session, values, profiles, reload } = profileSession(t, [
    ["aide:profile:session:v1", "one"],
  ]);
  assert.equal(store.current, null);
  for (const raw of [
    "{broken",
    "null",
    '"one"',
    JSON.stringify({ current: "one", verified: ["two"] }),
    JSON.stringify({ current: "one", verified: ["one", "other"] }),
  ]) {
    values.set(profiles.PROFILE_SESSION_KEY, raw);
    assert.equal(reload().current, null);
  }
  values.delete(profiles.PROFILE_SESSION_KEY);
  session.fail = true;
  assert.throws(() => store.select("one", invitationCode), /存储失败/);
  assert.equal(store.isVerified("one"), false);
  assert.equal(values.has(profiles.PROFILE_SESSION_KEY), false);
  session.fail = false;
  store.select("one", invitationCode);
  const before = values.get(profiles.PROFILE_SESSION_KEY);
  session.fail = true;
  assert.throws(() => store.select("two", invitationCode), /存储失败/);
  assert.equal(values.get(profiles.PROFILE_SESSION_KEY), before);
  assert.equal(store.isVerified("two"), false);
  session.getItem = () => {
    throw new Error("禁止存储");
  };
  const failed = reload();
  assert.equal(failed.current, null);
  assert.match(failed.error, /浏览器存储/);
});
test("档案弹层空值和错误不跳页，取消清空，中文输入不误提交，成功仅进入一次", (t) => {
  const { store, profiles, values, session } = profileSession(t);
  let reloads = 0,
    replaced = "";
  window.location = {
    href: "https://example.test/audio/#/profiles",
    reload: () => reloads++,
  };
  window.history = {
    replaceState: (_, __, url) => {
      replaced = url;
    },
  };
  const { model } = mount(t, "modules/account/pages/ProfilesPage", {
    "@/shared/lib/profiles": profiles,
    "@/shared/stores/profile": { useProfileStore: () => store },
    "@/shared/lib/feedback": { message: (error) => error.message },
  });
  const click = { currentTarget: { focus() {} } };
  model.choose("one", click);
  assert.equal(model.open.value, true);
  model.confirm();
  assert.match(model.invitationError.value, /请输入邀请码/);
  model.invitation.value = `${invitationCode}-incorrect`;
  model.confirm();
  assert.match(model.invitationError.value, /邀请码错误/);
  assert.equal(reloads, 0);
  assert.equal(values.size, 0);
  model.cancel();
  assert.equal(model.open.value, false);
  assert.equal(model.invitation.value, "");
  assert.equal(model.invitationError.value, "");
  model.choose("two", click);
  model.invitation.value = invitationCode;
  model.composing.value = true;
  model.confirm();
  assert.equal(values.size, 0);
  model.composing.value = false;
  session.fail = true;
  model.confirm();
  assert.match(model.invitationError.value, /存储失败/);
  assert.equal(model.invitation.value, invitationCode);
  assert.equal(reloads, 0);
  session.fail = false;
  model.confirm();
  model.confirm();
  assert.equal(reloads, 1);
  assert.equal(model.invitation.value, "");
  assert.equal(new URL(replaced).hash, "#/today");
  assert.equal(
    JSON.parse(values.get(profiles.PROFILE_SESSION_KEY)).current,
    "two",
  );
});
test("未验证直接访问所有业务、兼容和未知路由均回档案页，验证后可访问", async (t) => {
  const { store, reload, useProfileStore } = profileSession(t);
  const { default: router } = load("app/router/index", {
    "@/modules/account/pages/ProfilesPage.vue": { default: {} },
    "@/shared/stores/profile": { useProfileStore },
    "vue-router": {
      ...vueRouter,
      createWebHashHistory: () => vueRouter.createMemoryHistory("/"),
      createRouter: (options) =>
        vueRouter.createRouter({
          ...options,
          routes: options.routes.map((route) =>
            route.component
              ? { ...route, component: { render: () => null } }
              : route,
          ),
        }),
    },
  });
  const paths = [
    "/",
    "/today",
    "/study",
    "/study/courses",
    "/study/dictionary",
    "/calculator",
    "/music",
    "/music/tools",
    "/planner",
    "/planner/legacy",
    "/fun",
    "/settings",
    "/address/list",
    "/address/edit",
    "/chat/list",
    "/home",
    "/maths",
    "/audio",
    "/musicList",
    "/todoList",
    "/luckdraw",
    "/unknown",
  ];
  for (const path of paths) {
    await router.push(path);
    assert.equal(router.currentRoute.value.path, "/profiles", path);
  }
  store.select("one", invitationCode);
  reload();
  for (const path of ["/today", "/study", "/music", "/settings", "/profiles"]) {
    await router.push(path);
    assert.equal(router.currentRoute.value.path, path);
  }
});
test("退出先经过离开保护，取消不退出，存储失败不假报成功", async (t) => {
  environment(t);
  let reloads = 0,
    exits = 0,
    fail = false,
    allowed = false;
  window.location = { reload: () => reloads++ };
  const router = {
    currentRoute: { value: { path: "/study" } },
    push: async () => {
      if (allowed) router.currentRoute.value.path = "/profiles";
    },
  };
  const toasts = [];
  const { useProfileActions } = load("shared/composables/useProfileActions", {
    "vue-router": { useRouter: () => router },
    "../stores/profile": {
      useProfileStore: () => ({
        exit: () => {
          if (fail) throw new Error("存储失败");
          exits++;
        },
      }),
    },
    "../lib/feedback": { message: (error) => error.message },
    vant: { showToast: (value) => toasts.push(value) },
  });
  const action = useProfileActions();
  await action.exitProfile();
  assert.equal(exits, 0);
  allowed = true;
  fail = true;
  await action.exitProfile();
  assert.equal(exits, 0);
  assert.equal(reloads, 0);
  assert.match(toasts.at(-1), /存储失败/);
  fail = false;
  await action.exitProfile();
  assert.equal(exits, 1);
  assert.equal(reloads, 1);
});
test("档案退出清除选择和验证，不写入另一档案或清除本地数据", (t) => {
  environment(t);
  const { createPinia, setActivePinia } = require("pinia");
  setActivePinia(createPinia());
  const removed = [];
  globalThis.sessionStorage = {
    getItem: () => JSON.stringify({ current: "one", verified: ["one", "two"] }),
    removeItem: (key) => removed.push(key),
  };
  const { useProfileStore } = load("shared/stores/profile");
  const store = useProfileStore();
  t.after(() => store.$dispose());
  store.exit();
  assert.deepEqual(removed, ["aide:profile:session:v2"]);
  assert.equal(store.isVerified("one"), false);
  assert.equal(store.isVerified("two"), false);
  assert.equal(store.requireCurrent(), "one");
});
test("固定缩放仅拦截多指和 Safari 缩放手势，卸载清理监听", (t) => {
  environment(t);
  const listeners = new Map();
  globalThis.document = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const { useFixedScale } = load("shared/composables/useFixedScale");
  const renderer = vue.createRenderer({
    createElement: () => ({}),
    insert() {},
    remove() {},
    patchProp() {},
  });
  const app = renderer.createApp({
    setup() {
      useFixedScale();
      return () => vue.h("div");
    },
  });
  app.mount({});
  let prevented = 0;
  const touchmove = listeners.get("touchmove");
  touchmove({
    touches: [1],
    cancelable: true,
    preventDefault: () => prevented++,
  });
  assert.equal(prevented, 0);
  touchmove({
    touches: [1, 2],
    cancelable: true,
    preventDefault: () => prevented++,
  });
  assert.equal(prevented, 1);
  listeners.get("gesturestart")({
    cancelable: true,
    preventDefault: () => prevented++,
  });
  assert.equal(prevented, 2);
  app.unmount();
  assert.equal(listeners.size, 0);
});
