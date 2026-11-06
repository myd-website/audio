<template>
  <section class="calculation-process" aria-label="计算过程">
    <div class="process-heading">
      <h3>竖式计算</h3>
      <span>{{ result.approximate ? "近似结果" : "精确结果" }}</span>
    </div>
    <p v-for="note in result.notes" :key="note" class="process-note">
      {{ note }}
    </p>

    <div
      class="vertical-scroll"
      role="region"
      tabindex="0"
      aria-label="竖式，较长时可左右滑动"
    >
      <div
        class="vertical-calculation"
        :class="{ 'division-calculation': result.division }"
      >
        <template v-if="result.division">
          <div class="division-quotient">
            <span
              v-for="(digit, index) in result.division.quotient"
              :key="index"
              class="digit"
              >{{ digit }}</span
            >
            <span v-if="result.approximate" class="division-more">…</span>
          </div>
          <div class="division-heading">
            <span class="division-divisor">{{ result.division.divisor }}</span>
            <span class="division-dividend">
              <span
                v-for="(digit, index) in result.division.dividend"
                :key="index"
                class="digit"
                >{{ digit }}</span
              >
            </span>
          </div>
        </template>
        <div
          v-for="(row, index) in result.rows"
          :key="index"
          class="vertical-row"
          :class="{
            'row-rule': row.rule,
            'row-hint': row.kind === 'hint',
            'row-result': row.kind === 'result',
          }"
        >
          <span class="row-operator">{{ row.operator }}</span>
          <span class="row-digits">
            <span
              v-for="(digit, digitIndex) in row.text"
              :key="digitIndex"
              class="digit"
              >{{ digit }}</span
            >
          </span>
        </div>
      </div>
    </div>
    <p class="vertical-tip">数字较长时，可左右滑动查看完整竖式</p>

    <div class="steps-heading">
      <h3>一步一步看</h3>
      <span>共 {{ result.steps.length }} 步</span>
    </div>
    <ol class="calculation-steps">
      <li v-for="(step, index) in result.steps" :key="index">
        <span class="step-index" aria-hidden="true">{{ index + 1 }}</span>
        <p>{{ step }}</p>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import type { CalculationResult } from "@/utils/arithmetic";

defineProps<{ result: CalculationResult }>();
</script>

<style scoped lang="less">
.calculation-process {
  min-width: 0;
  margin-top: 24px;
  border-top: 1px solid #eee8f1;
  padding-top: 24px;
  color: #342b41;
}

.process-heading,
.steps-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  h3 {
    font-size: 17px;
    font-weight: 600;
  }

  > span {
    font-size: 12px;
    color: #8b719a;
  }
}

.process-note {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.7;
  overflow-wrap: anywhere;
  color: #756980;
}

.vertical-scroll {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #c7b2d4 #f3edf7;
  margin-top: 18px;
  padding: 20px 12px;
  border-radius: 12px;
  background: #fbf8fe;

  &::-webkit-scrollbar {
    display: block;
    height: 5px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 5px;
    background: #c7b2d4;
  }
}

.vertical-calculation {
  width: max-content;
  min-width: 140px;
  margin: 0 auto;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-variant-numeric: tabular-nums;
  font-size: 23px;
  line-height: 1.7;
}

.vertical-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  min-height: 1.7em;
}

.row-operator {
  flex: 0 0 1ch;
  color: #9855bd;
}

.row-digits {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
}

.digit {
  flex: 0 0 1.15ch;
  width: 1.15ch;
  white-space: pre;
  text-align: center;
}

.row-rule {
  border-bottom: 2px solid #a085bb;
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.row-hint .digit {
  color: #b87012;
  // 只缩小字形，保持格宽不变，进位标记才能与下面的数位对齐。
  transform: scale(0.72);
}

.row-result {
  color: #9146be;
  font-weight: 700;
}

.division-quotient {
  position: relative;
  display: flex;
  justify-content: flex-end;
  color: #9146be;
}

.division-calculation {
  // 为循环小数的省略号预留可滚动空间，防止最右侧被裁掉。
  padding-right: 1.15ch;
}

.division-more {
  position: absolute;
  left: 100%;
}

.division-heading {
  display: flex;
  justify-content: flex-end;
}

.division-calculation .row-rule {
  border-bottom: none;

  .row-digits {
    border-bottom: 2px solid #a085bb;
  }
}

.division-divisor {
  padding-right: 0.5ch;
  white-space: nowrap;
}

.division-dividend {
  display: flex;
  border-top: 2px solid #a085bb;
  border-left: 2px solid #a085bb;
}

.vertical-tip {
  margin: 8px 0 22px;
  color: #8b8192;
  font-size: 12px;
  text-align: center;
}

.calculation-steps {
  display: grid;
  gap: 12px;

  li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    background: #faf9fb;
    border-radius: 10px;
  }

  p {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    line-height: 1.8;
    overflow-wrap: anywhere;
  }
}

@media (max-width: 360px) {
  .vertical-scroll {
    padding: 16px 8px;
  }

  .vertical-calculation {
    font-size: 21px;
  }

  .calculation-steps li {
    padding: 10px;
    gap: 8px;
  }
}

.step-index {
  display: grid;
  flex: 0 0 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #f0e4fa;
  color: #8743ab;
  font-size: 12px;
}
</style>
