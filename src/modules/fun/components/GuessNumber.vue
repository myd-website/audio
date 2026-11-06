<script setup lang="ts">
import { computed, ref } from "vue";
import { randomInt } from "@/shared/lib/random";
import GameCelebration from "./GameCelebration.vue";
const limit = ref(100),
  secret = ref(randomInt(100) + 1);
const input = ref(""),
  error = ref("");
const low = ref(1),
  high = ref(100),
  won = ref(false);
const guesses = ref<
  { value: number; hint: string; direction: "high" | "low" | "correct" }[]
>([]);
const lastHint = computed(() =>
  guesses.value.length
    ? guesses.value[guesses.value.length - 1].hint
    : "心里藏了一个数字，来猜猜看。",
);
function restart(max = limit.value) {
  limit.value = max;
  secret.value = randomInt(max) + 1;
  input.value = error.value = "";
  low.value = 1;
  high.value = max;
  guesses.value = [];
  won.value = false;
}
function guess() {
  if (won.value) return;
  error.value = "";
  const text = input.value.trim(),
    value = Number(text);
  if (
    !/^\d+$/.test(text) ||
    !Number.isInteger(value) ||
    value < low.value ||
    value > high.value
  ) {
    error.value = `请输入 ${low.value}～${high.value} 之间的整数。`;
    return;
  }
  const direction =
    value === secret.value ? "correct" : value > secret.value ? "high" : "low";
  const hint =
    direction === "correct"
      ? "就是这个数字，猜中了！"
      : direction === "high"
        ? "有点大了，再小一点 ↓"
        : "有点小了，再大一点 ↑";
  guesses.value.push({ value, hint, direction });
  if (direction === "correct") won.value = true;
  else if (direction === "high") high.value = value - 1;
  else low.value = value + 1;
  input.value = "";
}
</script>
<template>
  <section class="game-card guess-game" aria-labelledby="guess-title">
    <header class="game-heading">
      <div>
        <p class="game-eyebrow">FOLLOW YOUR LITTLE HUNCH</p>
        <h2 id="guess-title">猜猜我在想什么</h2>
        <p class="game-description">范围越来越小，离答案也越来越近。</p>
      </div>
      <span class="game-stamp">?</span>
    </header>
    <div class="game-segments" aria-label="猜数字范围">
      <button
        v-for="max in [100, 1000]"
        :key="max"
        type="button"
        :class="{ selected: limit === max }"
        :aria-pressed="limit === max"
        @click="restart(max)"
      >
        1～{{ max }}{{ max === 100 ? " · 轻松猜" : " · 挑战一下" }}
      </button>
    </div>
    <div class="guess-orbit" :class="{ 'guess-won': won }">
      <span class="orbit-dot" /><strong :key="won ? secret : guesses.length">{{
        won ? secret : "?"
      }}</strong
      ><small>{{ won ? "找到了！" : "一个等待被发现的数字" }}</small>
    </div>
    <div class="guess-hint" aria-live="polite">
      <p class="game-status" :class="{ success: won }">{{ lastHint }}</p>
      <p class="game-footnote">
        {{
          won
            ? `用了 ${guesses.length} 次，直觉和推理都很棒。`
            : `当前范围 ${low}～${high} · 已猜 ${guesses.length} 次`
        }}
      </p>
    </div>
    <form
      class="guess-form"
      @submit.prevent="guess"
      @keydown.enter="if ($event.isComposing) $event.preventDefault();"
    >
      <label class="sr-only" for="guess-input">输入你猜的数字</label
      ><input
        id="guess-input"
        v-model="input"
        inputmode="numeric"
        autocomplete="off"
        maxlength="4"
        :disabled="won"
        :placeholder="`${low}～${high}，你的答案是？`"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? 'guess-error' : undefined"
        @input="error = ''"
      /><button type="submit" class="game-primary" :disabled="won">
        猜一下 <span aria-hidden="true">↗</span>
      </button>
    </form>
    <p v-if="error" id="guess-error" class="game-error" role="alert">
      {{ error }}
    </p>
    <TransitionGroup
      name="guess-history"
      tag="ol"
      class="guess-history"
      aria-label="本局猜测记录"
      ><li
        v-for="item in [...guesses].reverse()"
        :key="item.value"
        :class="item.direction"
      >
        <strong>{{ item.value }}</strong
        ><span>{{
          item.direction === "correct"
            ? "猜中了 ✓"
            : item.direction === "high"
              ? "偏大 ↓"
              : "偏小 ↑"
        }}</span>
      </li></TransitionGroup
    >
    <div class="game-actions">
      <button type="button" @click="restart()">
        <van-icon name="replay" />换个数字</button
      ><span class="game-footnote">无效输入不计次数</span>
    </div>
    <GameCelebration :active="won" />
  </section>
</template>
<style scoped>
.guess-orbit {
  position: relative;
  width: 205px;
  height: 205px;
  margin: 35px auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  border: 1px dashed #c8d3bc;
  border-radius: 50%;
  background: radial-gradient(circle, #eef3e3 0%, #f9faef 62%, transparent 63%);
}
.guess-orbit::after {
  content: "";
  position: absolute;
  inset: 15px;
  border: 1px solid #dce4ce;
  border-radius: 50%;
  pointer-events: none;
}
.orbit-dot {
  position: absolute;
  width: 11px;
  height: 11px;
  background: #d4ae75;
  top: 4px;
  left: 62%;
  border: 3px solid #fffaf0;
  border-radius: 50%;
}
.guess-orbit strong {
  font-size: 64px;
  font-weight: 650;
  color: #5c7c56;
  line-height: 1.2;
  animation: guess-reveal 0.35s ease;
}
.guess-orbit small {
  font-size: 11px;
  color: #7e8971;
  margin-top: 9px;
}
.guess-won {
  background: #e7f0dc;
  border-color: #86aa72;
}
.guess-hint {
  text-align: center;
  margin-bottom: 22px;
}
.guess-hint .game-status {
  margin-bottom: 5px;
}
.guess-form {
  display: flex;
  gap: 10px;
  max-width: 440px;
  margin: auto;
}
.guess-form input {
  flex: 1;
  min-width: 0;
}
.guess-form button {
  flex-shrink: 0;
}
.guess-history {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 24px auto;
  max-width: 480px;
  max-height: 180px;
  overflow-y: auto;
}
.guess-history li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #f2eee4;
}
.guess-history strong {
  font-variant-numeric: tabular-nums;
}
.guess-history span {
  font-size: 11px;
  color: #857b66;
}
.guess-history .correct {
  background: #e0ebd9;
  color: #38674d;
}
.guess-history-enter-active,
.guess-history-move {
  transition: all 0.25s ease;
}
.guess-history-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
@keyframes guess-reveal {
  from {
    opacity: 0;
    transform: scale(0.75) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
@media (max-width: 380px) {
  .guess-form {
    flex-wrap: wrap;
  }
  .guess-form button {
    width: 100%;
  }
}
</style>
