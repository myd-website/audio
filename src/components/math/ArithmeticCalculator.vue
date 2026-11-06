<template>
  <section class="arithmetic-calculator" aria-label="四则运算计算器">
    <nav class="operation-tabs" aria-label="运算方式">
      <button
        v-for="item in arithmeticOperations"
        :key="item.id"
        type="button"
        :aria-pressed="operation === item.id"
        :class="{ selected: operation === item.id }"
        @click="operation = item.id"
      >
        {{ item.name }} <span>{{ item.symbol }}</span>
      </button>
    </nav>

    <div class="calculator-card">
      <div class="calculator-heading">
        <div>
          <h2>{{ currentOperation.name }}题目</h2>
          <p>输入两个数，看看每一步怎么算</p>
        </div>
        <span class="heading-symbol" aria-hidden="true">{{
          currentOperation.symbol
        }}</span>
      </div>

      <form @submit.prevent="analyze">
        <div class="question-inputs">
          <div class="operand-field">
            <label :for="`${inputId}-left`">{{ operandLabels[0] }}</label>
            <div class="input-control" :class="{ 'has-error': error }">
              <input
                :id="`${inputId}-left`"
                ref="firstInput"
                v-model="left"
                type="text"
                inputmode="decimal"
                enterkeyhint="next"
                maxlength="32"
                autocomplete="off"
                autocapitalize="off"
                :spellcheck="false"
                placeholder="输入数字"
                :aria-invalid="Boolean(error)"
                :aria-describedby="
                  error ? `${inputId}-error` : `${inputId}-hint`
                "
                @keydown.enter.prevent="secondInput?.focus()"
              />
              <button
                class="sign-button"
                type="button"
                aria-label="切换第一个数的正负号"
                :aria-pressed="/^[-−]/.test(left.trim())"
                @pointerdown.prevent
                @click="toggleSign('left')"
              >
                ±
              </button>
            </div>
          </div>
          <span class="question-symbol" aria-hidden="true">{{
            currentOperation.symbol
          }}</span>
          <div class="operand-field">
            <label :for="`${inputId}-right`">{{ operandLabels[1] }}</label>
            <div class="input-control" :class="{ 'has-error': error }">
              <input
                :id="`${inputId}-right`"
                ref="secondInput"
                v-model="right"
                type="text"
                inputmode="decimal"
                enterkeyhint="done"
                maxlength="32"
                autocomplete="off"
                autocapitalize="off"
                :spellcheck="false"
                placeholder="输入数字"
                :aria-invalid="Boolean(error)"
                :aria-describedby="
                  error ? `${inputId}-error` : `${inputId}-hint`
                "
                @keydown.enter.prevent="analyze"
              />
              <button
                class="sign-button"
                type="button"
                aria-label="切换第二个数的正负号"
                :aria-pressed="/^[-−]/.test(right.trim())"
                @pointerdown.prevent
                @click="toggleSign('right')"
              >
                ±
              </button>
            </div>
          </div>
        </div>
        <p :id="`${inputId}-hint`" class="input-hint">
          支持负数、小数，最多 12 位整数和 6 位小数
          <span>键盘没有负号时，点击输入框旁的 ±</span>
        </p>
        <p
          v-if="error"
          :id="`${inputId}-error`"
          class="input-error"
          role="alert"
        >
          {{ error }}
        </p>
        <div class="calculator-actions">
          <button class="analyze-button" type="submit">分析计算过程</button>
          <button class="clear-button" type="button" @click="clear">
            清空
          </button>
        </div>
      </form>

      <div class="example-list">
        <span>试一试</span>
        <button
          v-for="example in examples[operation]"
          :key="example.join(',')"
          type="button"
          @click="useExample(example)"
        >
          {{ example[0] }} {{ currentOperation.symbol }} {{ example[1] }}
        </button>
      </div>

      <div
        ref="resultSummary"
        class="result-summary"
        aria-live="polite"
        aria-atomic="true"
      >
        <template v-if="result">
          <span>计算结果</span>
          <p>
            {{ result.expression }} {{ result.approximate ? "≈" : "=" }}
            <strong>{{ result.answer }}</strong>
          </p>
        </template>
        <p v-else class="empty-result">
          点击“分析计算过程”，查看竖式和详细步骤
        </p>
      </div>
      <CalculationProcess v-if="result" :result="result" />
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  ref,
  shallowRef,
  watch,
} from "vue";
import CalculationProcess from "./CalculationProcess.vue";
import { arithmeticOperations, calculateArithmetic } from "@/utils/arithmetic";
import type {
  ArithmeticOperation,
  CalculationResult,
} from "@/utils/arithmetic";

const props = withDefaults(
  defineProps<{ initialOperation?: ArithmeticOperation }>(),
  { initialOperation: "add" },
);
const operation = ref<ArithmeticOperation>(props.initialOperation);
const left = ref("");
const right = ref("");
const firstInput = ref<HTMLInputElement>();
const secondInput = ref<HTMLInputElement>();
const resultSummary = ref<HTMLElement>();
const result = shallowRef<CalculationResult | null>(null);
const error = ref("");
const inputId = `arithmetic-${getCurrentInstance()?.uid}`;
const currentOperation = computed(() =>
  arithmeticOperations.find((item) => item.id === operation.value)!,
);
const labels = {
  add: ["加数", "加数"],
  subtract: ["被减数", "减数"],
  multiply: ["被乘数", "乘数"],
  divide: ["被除数", "除数"],
};
const operandLabels = computed(() => labels[operation.value]);
const examples: Record<ArithmeticOperation, [string, string][]> = {
  add: [
    ["58", "67"],
    ["0.1", "0.2"],
  ],
  subtract: [
    ["1000", "286"],
    ["12.5", "3.78"],
    ["3", "8"],
  ],
  multiply: [
    ["23", "14"],
    ["1.2", "0.3"],
  ],
  divide: [
    ["156", "12"],
    ["1", "3"],
  ],
};

// 输入、运算方式改变时立即撤下旧结果，避免把上一次答案误当成本次答案。
watch(
  [left, right, operation],
  () => {
    result.value = null;
    error.value = "";
  },
  { flush: "sync" },
);

async function analyze() {
  result.value = null;
  error.value = "";
  try {
    const calculation = calculateArithmetic(
      left.value,
      right.value,
      operation.value,
    );
    result.value = calculation;
    // 完成后收起软键盘，再把结果带入视区，避免用户在短屏上反复寻找答案。
    firstInput.value?.blur();
    secondInput.value?.blur();
    await nextTick();
    if (result.value === calculation) {
      resultSummary.value?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    }
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : "计算失败，请检查输入后重试。";
  }
}

async function toggleSign(field: "left" | "right") {
  const value = field === "left" ? left : right;
  const input = field === "left" ? firstInput : secondInput;
  const text = value.value.trim();
  value.value = /^[-−]/.test(text)
    ? text.slice(1)
    : `-${text.replace(/^\+/, "")}`;
  await nextTick();
  input.value?.focus({ preventScroll: true });
  input.value?.setSelectionRange(value.value.length, value.value.length);
}

function clear() {
  left.value = "";
  right.value = "";
  result.value = null;
  error.value = "";
  firstInput.value?.focus();
}

function useExample(example: [string, string]) {
  [left.value, right.value] = example;
  analyze();
}
</script>

<style scoped lang="less">
.arithmetic-calculator {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 12px 12px calc(24px + env(safe-area-inset-bottom, 0px));
  text-align: left;
  color: #342b41;
  font-size: 16px;
  line-height: 1.5;

  button,
  input {
    font: inherit;
    box-sizing: border-box;
  }

  button {
    cursor: pointer;
    border: none;
    min-height: 44px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  button:focus-visible {
    outline: 2px solid #9146be;
    outline-offset: 3px;
  }
}

.operation-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 16px;

  button {
    min-width: 0;
    min-height: 44px;
    padding: 10px 4px;
    border-radius: 12px;
    background: #fff5cc;
    color: #765b05;
    font-size: 14px;

    &.selected {
      background: #ffc400;
      color: #473504;
      font-weight: 600;
      box-shadow: 0 4px 12px #ffc40030;
    }

    span {
      margin-left: 4px;
    }
  }
}

.calculator-card {
  min-width: 0;
  padding: 18px 14px;
  border: 1px solid #eee8f1;
  border-radius: 16px;
  background: #fff;
}

.calculator-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;

  > div {
    min-width: 0;
  }

  h2 {
    font-size: 20px;
    font-weight: 600;
  }

  p {
    margin-top: 6px;
    font-size: 13px;
    line-height: 1.6;
    color: #8b8192;
  }
}

.heading-symbol {
  display: grid;
  flex: 0 0 42px;
  height: 42px;
  place-items: center;
  border-radius: 12px;
  color: #9146be;
  background: #f7edfd;
  font-size: 24px;
}

.question-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: end;
  gap: 10px;

  .operand-field {
    min-width: 0;
    font-size: 13px;
    color: #756980;
  }

  label {
    display: block;
    margin-bottom: 6px;
  }

  .input-control {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    padding: 3px;
    border: 1px solid #e0d7e7;
    border-radius: 10px;
    background: #fdfbff;

    &:focus-within {
      border-color: #9146be;
      box-shadow: 0 0 0 2px #9146be18;
    }

    &.has-error {
      border-color: #d44d62;
    }
  }

  input {
    display: block;
    width: 100%;
    min-width: 0;
    flex: 1;
    height: 44px;
    margin: 0;
    padding: 0 8px;
    border: 0;
    border-radius: 6px;
    outline: none;
    background: transparent;
    color: #342b41;
    // 保持实际字号至少 16px，避免 iOS 聚焦输入框时自动放大页面。
    font-size: 18px;
    line-height: 1.4;
    text-align: left;
    text-indent: 0;
    font-variant-numeric: tabular-nums;
    scroll-margin-block: 20px;
  }

  .sign-button {
    flex: 0 0 44px;
    width: 44px;
    border-radius: 7px;
    color: #9146be;
    background: #f0e4fa;
    font-size: 22px;

    &[aria-pressed="true"] {
      color: #fff;
      background: #9146be;
    }
  }
}

.question-symbol {
  padding-bottom: 12px;
  font-size: 22px;
  color: #9146be;
}

.input-hint,
.input-error {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.7;
  color: #8b8192;

  span {
    display: block;
    margin-top: 2px;
  }
}

.input-error {
  color: #bf344d;
}

.calculator-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 80px;
  gap: 10px;
  margin-top: 18px;

  button {
    min-height: 48px;
    padding: 10px;
    border-radius: 10px;
    font-size: 14px;
  }
}

.analyze-button {
  background: #b966de;
  color: #fff;
}

.clear-button {
  background: #f3eef7;
  color: #756980;
}

.example-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  font-size: 12px;
  color: #8b8192;

  button {
    min-height: 44px;
    padding: 7px 9px;
    border-radius: 6px;
    background: #faf6ed;
    color: #846929;
    font-size: 12px;
  }
}

.result-summary {
  scroll-margin-top: 16px;
  margin-top: 22px;
  padding: 16px;
  border-radius: 10px;
  background: #fbf7fe;

  > span {
    display: block;
    margin-bottom: 8px;
    color: #8b719a;
    font-size: 12px;
  }

  p {
    font-size: 17px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }

  strong {
    color: #9146be;
  }

  .empty-result {
    color: #8b8192;
    font-size: 13px;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .question-inputs {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .question-symbol {
    display: none;
  }
}
</style>
