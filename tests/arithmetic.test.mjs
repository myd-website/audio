import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

// 复用项目已有 TypeScript 编译器，测试纯计算模块，无需额外测试依赖或生成文件。
const source = await readFile(
  new URL("../src/utils/arithmetic.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2020,
  },
});
const { calculateArithmetic: calculate } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("精确处理小数、零、负数、前导零和输入格式", () => {
  const cases = [
    ["0.1", "0.2", "add", "0.3"],
    ["12.5", "3.78", "subtract", "8.72"],
    ["3", "8", "subtract", "−5"],
    ["-3", "-8", "subtract", "5"],
    ["-3", "8", "add", "5"],
    ["-3", "-8", "add", "−11"],
    ["0", "0", "subtract", "0"],
    ["0", "123", "multiply", "0"],
    ["0", "-2", "divide", "0"],
    [".5", "5.", "add", "5.5"],
    [" +0002.500 ", "−0.5", "add", "2"],
    ["1.2", "0.3", "multiply", "0.36"],
    ["-1.20", "-0.30", "multiply", "0.36"],
    ["0.000001", "0.000001", "multiply", "0.000000000001"],
    ["999999999999", "999999999999", "multiply", "999999999998000000000001"],
  ];
  for (const [left, right, operation, expected] of cases) {
    const result = calculate(left, right, operation);
    assert.equal(result.answer, expected, `${left} ${operation} ${right}`);
    assert.equal(result.approximate, false);
    assert.ok(result.steps.length);
    assert.ok(result.rows.length);
    assert.match(
      result.steps.at(-1),
      new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("加法展示跨多列的进位，小数点列保持对齐", () => {
  const result = calculate("999", "1", "add");
  assert.equal(result.answer, "1000");
  assert.equal(result.rows[0].kind, "hint");
  assert.equal(result.rows[0].text, "111 ");
  assert.equal(
    result.steps.filter((step) => step.includes("向前一位进 1")).length,
    3,
  );
  const decimal = calculate("0.09", "0.01", "add");
  assert.equal(decimal.answer, "0.1");
  assert.equal(decimal.rows.at(-1).text, "0.10");
  assert.ok(decimal.steps.some((step) => step.includes("百分位")));
});

test("减法解释连续跨零借位，并把小数补齐", () => {
  const simple = calculate("52", "8", "subtract");
  assert.equal(simple.rows[0].text, " · ");
  assert.ok(simple.notes.some((note) => note.includes("借出了 1")));
  const result = calculate("1000", "286", "subtract");
  assert.equal(result.answer, "714");
  assert.equal(
    result.steps.filter((step) => step.includes("向前一位借 1")).length,
    3,
  );
  assert.ok(result.steps.some((step) => step.includes("上一位借走的 1")));
  const decimal = calculate("12.5", "3.78", "subtract");
  assert.equal(decimal.rows.find((row) => row.operator === "−").text, "3.78");
  assert.ok(decimal.rows.some((row) => row.text === "12.50"));
});

test("乘法部分积按数位移动，保留乘数中间的零和乘法进位", () => {
  const result = calculate("23", "104", "multiply");
  assert.equal(result.answer, "2392");
  assert.deepEqual(
    result.rows.slice(2, -1).map((row) => row.text),
    ["92", "0 ", "23  "],
  );
  assert.ok(result.steps[0].includes("进位 1"));
  assert.ok(
    calculate("1.2", "0.3", "multiply").steps.some((step) =>
      step.includes("2 位小数"),
    ),
  );
});

test("长除法支持整除、小数、负号、商中间为零以及补零", () => {
  const cases = [
    ["156", "12", "13"],
    ["1005", "5", "201"],
    ["1", "8", "0.125"],
    ["1", "20", "0.05"],
    ["12.6", "0.3", "42"],
    ["0.12", "3", "0.04"],
    ["-1", "8", "−0.125"],
    ["1", "-8", "−0.125"],
    ["-1", "-8", "0.125"],
  ];
  for (const [left, right, expected] of cases) {
    const result = calculate(left, right, "divide");
    assert.equal(result.answer, expected);
    assert.equal(result.approximate, false);
    assert.match(result.steps.at(-1), /余数为 0/);
  }
  const shifted = calculate("12.6", "0.3", "divide");
  assert.equal(shifted.division.dividend, "126");
  assert.equal(shifted.division.divisor, "3");
  assert.ok(shifted.notes[0].includes("同时乘以 10"));
  const integer = calculate("156", "12", "divide");
  assert.deepEqual(
    integer.rows.map((row) => row.text),
    ["12 ", " 36", " 36", "  0"],
  );
  const fractional = calculate("1", "8", "divide");
  assert.equal(fractional.division.dividend, "1.000");
  assert.equal(fractional.division.quotient, "0.125");
  assert.ok(fractional.steps.some((step) => step.includes("小数第 3 位")));
});

test("不整除时明确标识截取精度，不把非零小数伪装成精确的零", () => {
  const third = calculate("1", "3", "divide");
  assert.equal(third.answer, "0.3333333333…");
  assert.equal(third.approximate, true);
  assert.equal(third.steps.length, 12);
  const tiny = calculate("1", "999999999999", "divide");
  assert.equal(tiny.answer, "0.0000000000…");
  assert.equal(tiny.approximate, true);
});

test("拒绝缺失、非法、超范围输入和零除数", () => {
  for (const invalid of [
    "",
    " ",
    "1e3",
    "Infinity",
    "NaN",
    "1+2",
    "--1",
    "1.2.3",
    "1,000",
    "1000000000000",
    "0.0000001",
  ]) {
    assert.throws(() => calculate(invalid, "1", "add"), /请输入|最多支持/);
    assert.throws(() => calculate("1", invalid, "add"), /请输入|最多支持/);
  }
  for (const zero of ["0", "-0", "0.000", "−0"]) {
    assert.throws(() => calculate("1", zero, "divide"), /除数不能为 0/);
  }
  assert.throws(() => calculate("1", "2", "invalid"), /运算方式/);
});

test("小整数范围的四则运算与独立结果相符", () => {
  for (let left = -12; left <= 12; left++) {
    for (let right = -12; right <= 12; right++) {
      for (const [operation, expected] of [
        ["add", left + right],
        ["subtract", left - right],
        ["multiply", left * right],
      ]) {
        assert.equal(
          calculate(String(left), String(right), operation).answer.replace(
            "−",
            "-",
          ),
          String(expected),
        );
      }
      if (right && left % right === 0) {
        assert.equal(
          calculate(String(left), String(right), "divide").answer.replace(
            "−",
            "-",
          ),
          String(left / right),
        );
      }
    }
  }
});
