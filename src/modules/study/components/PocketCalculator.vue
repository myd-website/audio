<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { evaluateExpression, type AngleMode } from "../domain/expression";
const expression = ref("");
const expressionInput = ref<HTMLInputElement>();
const scientific = ref(false);
const angleMode = ref<AngleMode>("deg");
const result = ref<ReturnType<typeof evaluateExpression>>();
const error = ref("");
const keys = [
  "C",
  "(",
  ")",
  "⌫",
  "7",
  "8",
  "9",
  "÷",
  "4",
  "5",
  "6",
  "×",
  "1",
  "2",
  "3",
  "−",
  "±",
  "0",
  ".",
  "+",
];
const scientificKeys = [
  { label: "x²", value: "^2", description: "平方" },
  { label: "xʸ", value: "^", description: "乘方" },
  { label: "√", value: "sqrt(", description: "平方根" },
  { label: "1/x", value: "^(-1)", description: "倒数" },
  { label: "sin", value: "sin(", description: "正弦" },
  { label: "cos", value: "cos(", description: "余弦" },
  { label: "tan", value: "tan(", description: "正切" },
  { label: "π", value: "π", description: "圆周率" },
  { label: "asin", value: "asin(", description: "反正弦" },
  { label: "acos", value: "acos(", description: "反余弦" },
  { label: "atan", value: "atan(", description: "反正切" },
  { label: "e", value: "e", description: "自然常数" },
  { label: "ln", value: "ln(", description: "自然对数" },
  { label: "log", value: "log(", description: "以 10 为底的对数" },
  { label: "eˣ", value: "exp(", description: "自然指数" },
  { label: "|x|", value: "abs(", description: "绝对值" },
  { label: "n!", value: "!", description: "阶乘" },
  { label: "%", value: "%", description: "百分数，除以 100" },
  { label: "EXP", value: "E", description: "科学记数法指数" },
  { label: "x³", value: "^3", description: "立方" },
];
watch(
  [expression, angleMode],
  () => {
    result.value = undefined;
    error.value = "";
  },
  { flush: "sync" },
);
function calculate() {
  try {
    result.value = evaluateExpression(expression.value, {
      angleMode: angleMode.value,
    });
    error.value = "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "计算失败。";
    result.value = undefined;
  }
}
function toggleSign(text: string) {
  // 找到末尾完整操作数，函数、括号和科学记数法一起切换，避免只改指数或函数参数。
  const body = text.replace(/[!%]+$/, "");
  let start = body.length;
  if (body.endsWith(")")) {
    let depth = 0;
    for (let index = body.length - 1; index >= 0; index--) {
      if (body[index] === ")") depth++;
      if (body[index] === "(" && --depth === 0) {
        start = index;
        break;
      }
    }
    const name = /(?:sqrt|sin|cos|tan|asin|acos|atan|ln|log|abs|exp|√)$/.exec(
      body.slice(0, start),
    );
    if (name) start = name.index;
  } else {
    const operand =
      /(?:(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+−-]?\d+)?|π|pi|e)$/.exec(body);
    if (operand) start = operand.index;
  }
  if (start === body.length) return `${text}−`;
  const operand = text.slice(start);
  return (
    text.slice(0, start) +
    (operand.startsWith("(−") && body === text
      ? operand.slice(2, -1)
      : `(−${operand})`)
  );
}
function key(value: string) {
  result.value = undefined;
  error.value = "";
  const start =
    expressionInput.value?.selectionStart ?? expression.value.length;
  const end = expressionInput.value?.selectionEnd ?? start;
  const before = expression.value.slice(0, start);
  const after = expression.value.slice(end);
  let updated: string;
  if (value === "C") updated = "";
  else if (value === "⌫")
    updated = (start === end ? before.slice(0, -1) : before) + after;
  else if (value === "±")
    updated =
      start === end
        ? toggleSign(before) + after
        : before + `(−${expression.value.slice(start, end)})` + after;
  else updated = before + value + after;
  // 超长时拒绝整次输入，不截断函数或括号，也不破坏光标后已有的算式。
  if (updated.length > 160) {
    error.value = "算式最多 160 个字符，请先删减内容。";
    return;
  }
  expression.value = updated;
  const cursor = value === "C" ? 0 : updated.length - after.length;
  void nextTick(() => expressionInput.value?.setSelectionRange(cursor, cursor));
}
</script>
<template>
  <section class="card pocket-calculator">
    <div class="chips calculator-modes" aria-label="计算功能">
      <button
        type="button"
        :class="{ selected: !scientific }"
        :aria-pressed="!scientific"
        @click="scientific = false"
      >
        标准
      </button>
      <button
        type="button"
        :class="{ selected: scientific }"
        :aria-pressed="scientific"
        @click="scientific = true"
      >
        科学
      </button>
    </div>
    <form
      @submit.prevent="calculate"
      @keydown.enter="if ($event.isComposing) $event.preventDefault();"
    >
      <label for="daily-expression">输入算式</label>
      <input
        id="daily-expression"
        ref="expressionInput"
        v-model="expression"
        inputmode="text"
        enterkeyhint="done"
        maxlength="160"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        :aria-invalid="Boolean(error)"
        aria-describedby="calculator-hint"
        :placeholder="
          scientific ? '例如：sin(30) + sqrt(9) + 2^3' : '例如：(12 + 8) × 3'
        "
      />
      <p id="calculator-hint" class="muted">
        {{
          scientific
            ? "函数参数需加括号，乘法请写 ×。log 以 10 为底，ln 以 e 为底，百分数表示除以 100。"
            : "先算括号，再算乘除，最后算加减。支持小数和负数。"
        }}
      </p>
      <template v-if="scientific">
        <div class="chips" aria-label="角度单位">
          <button
            type="button"
            :class="{ selected: angleMode === 'deg' }"
            :aria-pressed="angleMode === 'deg'"
            @click="angleMode = 'deg'"
          >
            DEG 角度
          </button>
          <button
            type="button"
            :class="{ selected: angleMode === 'rad' }"
            :aria-pressed="angleMode === 'rad'"
            @click="angleMode = 'rad'"
          >
            RAD 弧度
          </button>
        </div>
        <div
          class="calculator-keys scientific-keys"
          aria-label="科学计算器键盘"
        >
          <button
            v-for="item in scientificKeys"
            :key="item.label"
            type="button"
            :aria-label="item.description"
            @pointerdown.prevent
            @click="key(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </template>
      <div class="calculator-keys" aria-label="计算器键盘">
        <button
          v-for="item in keys"
          :key="item"
          type="button"
          :aria-label="
            item === '⌫'
              ? '退格'
              : item === 'C'
                ? '清空'
                : item === '±'
                  ? '切换正负号'
                  : item
          "
          @pointerdown.prevent
          @click="key(item)"
        >
          {{ item }}
        </button>
      </div>
      <button class="primary equals" type="submit">计算结果 =</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <div v-if="result" class="calculation-answer" aria-live="polite">
      <p class="muted">{{ result.expression }}</p>
      <strong>{{ result.approximate ? "≈" : "=" }} {{ result.answer }}</strong>
      <p v-if="result.approximate" class="muted">
        当前为近似值，普通结果最多展示 10
        位小数，极小值及极大的科学计算结果使用科学记数法。
      </p>
      <details v-if="result.steps.length" open>
        <summary>按运算顺序看过程</summary>
        <ol>
          <li v-for="(step, index) in result.steps" :key="index">{{ step }}</li>
        </ol>
      </details>
    </div>
  </section>
</template>
<style scoped>
.pocket-calculator {
  max-width: 620px;
  margin: 0 auto;
}
form {
  display: grid;
  gap: 14px;
}
.calculator-modes {
  margin-bottom: 16px;
}
.calculator-keys {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.calculator-keys button {
  min-width: 0;
  min-height: 56px;
  font-size: 22px;
  font-variant-numeric: tabular-nums;
}
.equals {
  width: 100%;
  min-height: 54px;
}
.scientific-keys button {
  min-height: 48px;
  padding: 8px 2px;
  font-size: 17px;
  background: var(--pale);
  color: var(--green);
}
.error {
  margin-top: 16px;
}
.calculation-answer {
  margin-top: 20px;
  padding: 18px;
  border-radius: 14px;
  background: var(--pale);
  overflow-wrap: anywhere;
}
.calculation-answer strong {
  display: block;
  font-size: 32px;
  color: var(--green);
}
details {
  margin-top: 16px;
}
summary {
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
}
ol {
  padding-left: 22px;
}
li {
  margin: 8px 0;
}
</style>
